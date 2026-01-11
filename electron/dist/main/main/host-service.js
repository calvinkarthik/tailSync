"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HostService = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const ws_1 = require("ws");
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uuid_1 = require("uuid");
const child_process_1 = require("child_process");
const util_1 = require("util");
const WORKSPACE_DIR = path_1.default.join(process.cwd(), "tailoverlay-workspace");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class HostService {
    app;
    server = null;
    wss = null;
    code;
    hostIdentity;
    workspace;
    posts = [];
    messages = [];
    clients = new Set();
    allowedDevices;
    constructor(code, hostIdentity) {
        this.code = code;
        this.hostIdentity = hostIdentity;
        this.workspace = {
            code,
            createdAt: new Date().toISOString(),
            hostIdentity,
        };
        // Comma-separated list of allowed device names (match Tailscale device names).
        const envAllow = process.env.TS_ALLOWED_DEVICES;
        this.allowedDevices = envAllow
            ? envAllow
                .split(",")
                .map((d) => d.trim().toLowerCase())
                .filter(Boolean)
            : ["calvin", "remy-r"];
        this.app = (0, express_1.default)();
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use((0, cors_1.default)({
            origin: "*",
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
        }));
        this.app.use(express_1.default.json());
        this.app.use((req, res, next) => {
            console.log(`[v0] ${req.method} ${req.path} from ${req.ip}`);
            next();
        });
        if (!fs_1.default.existsSync(WORKSPACE_DIR)) {
            fs_1.default.mkdirSync(WORKSPACE_DIR, { recursive: true });
        }
    }
    setupRoutes() {
        const storage = multer_1.default.diskStorage({
            destination: (req, file, cb) => {
                const uploadsDir = path_1.default.join(WORKSPACE_DIR, "uploads");
                if (!fs_1.default.existsSync(uploadsDir)) {
                    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
                }
                cb(null, uploadsDir);
            },
            filename: (req, file, cb) => {
                const uniqueName = `${(0, uuid_1.v4)()}-${file.originalname}`;
                cb(null, uniqueName);
            },
        });
        const upload = (0, multer_1.default)({ storage, limits: { fileSize: 50 * 1024 * 1024 } });
        this.app.get("/api/health", (req, res) => {
            console.log("[v0] Health check received");
            res.json({ status: "ok", code: this.code });
        });
        this.app.post("/api/create-workspace", (req, res) => {
            console.log("[v0] Create workspace request");
            res.json({ code: this.code });
        });
        this.app.post("/api/join", async (req, res) => {
            const { code } = req.body;
            const remoteIp = this.getClientIp(req);
            const callerIdentity = await this.resolveTailscaleIdentity(remoteIp);
            console.log(`[v0] Join request with code: ${code}, expected: ${this.code}, from ${remoteIp}`);
            if (code !== this.code) {
                console.log("[v0] Invalid code - rejecting");
                return res.status(403).json({ error: "Invalid workspace code" });
            }
            if (!callerIdentity) {
                console.log("[v0] Join rejected - unknown Tailscale identity");
                return res
                    .status(403)
                    .json({ error: "Not on tailnet or Tailscale identity unavailable. Ask host to grant access." });
            }
            if (!this.isAllowedDevice(callerIdentity.deviceName)) {
                console.log(`[v0] Join rejected - device ${callerIdentity.deviceName} is not in allowed list: ${this.allowedDevices.join(", ")}`);
                return res.status(403).json({
                    error: `Blocked by Tailscale ACL or not allowed. Allowed devices: ${this.allowedDevices.join(", ")}`,
                });
            }
            console.log("[v0] Join successful!");
            res.json({
                workspace: this.workspace,
                posts: this.posts,
                messages: this.messages,
            });
        });
        this.app.get("/api/feed", (req, res) => {
            res.json({ posts: this.posts });
        });
        this.app.post("/api/upload", upload.single("file"), (req, res) => {
            const file = req.file;
            if (!file) {
                return res.status(400).json({ error: "No file uploaded" });
            }
            let senderIdentity;
            try {
                senderIdentity = JSON.parse(req.body.identity || "{}");
            }
            catch {
                senderIdentity = this.hostIdentity;
            }
            const post = {
                id: (0, uuid_1.v4)(),
                type: req.body.type === "screenshot" ? "screenshot" : "file",
                filename: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                caption: req.body.caption || undefined,
                createdAt: new Date().toISOString(),
                senderIdentity,
                downloadUrl: `/api/download/${file.filename}`,
            };
            this.posts.unshift(post);
            this.broadcast({ type: "post:new", data: post });
            res.json({ post });
        });
        this.app.get("/api/download/:filename", (req, res) => {
            const filePath = path_1.default.join(WORKSPACE_DIR, "uploads", req.params.filename);
            if (fs_1.default.existsSync(filePath)) {
                res.download(filePath);
            }
            else {
                res.status(404).json({ error: "File not found" });
            }
        });
        this.app.post("/api/chat", (req, res) => {
            const { text, identity } = req.body;
            const message = {
                id: (0, uuid_1.v4)(),
                text,
                createdAt: new Date().toISOString(),
                senderIdentity: identity || this.hostIdentity,
            };
            this.messages.push(message);
            this.broadcast({ type: "chat", data: message });
            res.json({ message });
        });
    }
    broadcast(message) {
        const data = JSON.stringify(message);
        this.clients.forEach((client) => {
            if (client.readyState === ws_1.WebSocket.OPEN) {
                client.send(data);
            }
        });
    }
    isAllowedDevice(deviceName) {
        if (!deviceName)
            return false;
        return this.allowedDevices.includes(deviceName.toLowerCase());
    }
    getClientIp(req) {
        const xfwd = req.headers["x-forwarded-for"] || "";
        const raw = xfwd.split(",")[0].trim() || req.ip || "";
        return raw.replace("::ffff:", "");
    }
    async resolveTailscaleIdentity(remoteIp) {
        if (!remoteIp)
            return null;
        // Local requests (host machine) map to host identity.
        if (["127.0.0.1", "::1", "localhost"].includes(remoteIp)) {
            return this.hostIdentity;
        }
        try {
            const { stdout } = await execAsync("tailscale status --json");
            const status = JSON.parse(stdout);
            // Check peers for matching Tailscale IP.
            const peers = status?.Peer || {};
            for (const peerId of Object.keys(peers)) {
                const peer = peers[peerId];
                const ips = peer.TailscaleIPs || [];
                if (ips.includes(remoteIp)) {
                    return {
                        deviceName: peer.HostName || peer.Hostinfo?.Hostname || "unknown-device",
                        userEmail: status?.User?.[peer.UserID]?.LoginName || null,
                        hostname: peer.Hostinfo?.Hostname || peer.HostName || "unknown-device",
                    };
                }
            }
            // If no peer match but IP equals selfIP, return host identity.
            const selfIPs = status?.Self?.TailscaleIPs || [];
            if (selfIPs.includes(remoteIp)) {
                return this.hostIdentity;
            }
        }
        catch (err) {
            console.error("[v0] Failed to resolve Tailscale identity:", err);
        }
        return null;
    }
    async start() {
        return new Promise((resolve, reject) => {
            this.server = (0, http_1.createServer)(this.app);
            this.wss = new ws_1.WebSocketServer({ server: this.server });
            this.wss.on("connection", async (ws, req) => {
                const remoteIp = (req.socket.remoteAddress || "").replace("::ffff:", "");
                const callerIdentity = await this.resolveTailscaleIdentity(remoteIp);
                if (!callerIdentity || !this.isAllowedDevice(callerIdentity.deviceName)) {
                    console.log(`[v0] WebSocket rejected for ${remoteIp} (${callerIdentity?.deviceName || "unknown"}) - not allowed`);
                    ws.close(1008, "Not allowed by Tailscale policy");
                    return;
                }
                console.log(`[v0] WebSocket connection from ${remoteIp} (${callerIdentity.deviceName})`);
                this.clients.add(ws);
                this.broadcast({
                    type: "presence",
                    data: { status: "joined", identity: callerIdentity },
                });
                ws.on("message", (data) => {
                    try {
                        const msg = JSON.parse(data.toString());
                        console.log("[v0] WebSocket message:", msg.type);
                        if (msg.type === "chat") {
                            const chatMessage = {
                                id: (0, uuid_1.v4)(),
                                text: msg.text,
                                createdAt: new Date().toISOString(),
                                senderIdentity: msg.identity || this.hostIdentity,
                            };
                            this.messages.push(chatMessage);
                            this.broadcast({ type: "chat", data: chatMessage });
                        }
                    }
                    catch (err) {
                        console.error("[v0] WebSocket message error:", err);
                    }
                });
                ws.on("close", () => {
                    console.log("[v0] WebSocket disconnected");
                    this.clients.delete(ws);
                    this.broadcast({
                        type: "presence",
                        data: { status: "left", identity: this.hostIdentity },
                    });
                });
            });
            const os = require("os");
            const interfaces = os.networkInterfaces();
            console.log("[v0] Available network interfaces:");
            Object.keys(interfaces).forEach((name) => {
                interfaces[name]?.forEach((iface) => {
                    if (iface.family === "IPv4" && !iface.internal) {
                        console.log(`[v0]   ${name}: ${iface.address}`);
                    }
                });
            });
            this.server.listen(4173, "0.0.0.0", () => {
                console.log("[v0] Host service running on http://0.0.0.0:4173");
                console.log("[v0] Other devices can connect via your Tailscale IP on port 4173");
                resolve();
            });
            this.server.on("error", (err) => {
                console.error("[v0] Server error:", err);
                reject(err);
            });
        });
    }
    async stop() {
        return new Promise((resolve) => {
            if (this.wss) {
                this.wss.close();
                this.wss = null;
            }
            if (this.server) {
                this.server.close(() => {
                    this.server = null;
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
}
exports.HostService = HostService;
