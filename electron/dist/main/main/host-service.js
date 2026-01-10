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
const WORKSPACE_DIR = path_1.default.join(process.cwd(), "tailoverlay-workspace");
class HostService {
    app;
    server = null;
    wss = null;
    demoServer = null;
    code;
    hostIdentity;
    workspace;
    posts = [];
    messages = [];
    clients = new Set();
    constructor(code, hostIdentity) {
        this.code = code;
        this.hostIdentity = hostIdentity;
        this.workspace = {
            code,
            createdAt: new Date().toISOString(),
            hostIdentity,
        };
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
        this.app.post("/api/join", (req, res) => {
            const { code } = req.body;
            console.log(`[v0] Join request with code: ${code}, expected: ${this.code}`);
            if (code !== this.code) {
                console.log("[v0] Invalid code - rejecting");
                return res.status(403).json({ error: "Invalid workspace code" });
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
    async start() {
        return new Promise((resolve, reject) => {
            this.server = (0, http_1.createServer)(this.app);
            this.wss = new ws_1.WebSocketServer({ server: this.server });
            this.wss.on("connection", (ws, req) => {
                console.log(`[v0] WebSocket connection from ${req.socket.remoteAddress}`);
                this.clients.add(ws);
                this.broadcast({
                    type: "presence",
                    data: { status: "joined", identity: this.hostIdentity },
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
            this.stopDemoLobby();
        });
    }
    startDemoLobby(port, tailnetUrl) {
        const QRCode = require("qrcode");
        const demoApp = (0, express_1.default)();
        demoApp.get("/demo", async (req, res) => {
            let qrCodeSvg = "";
            try {
                qrCodeSvg = await QRCode.toString(tailnetUrl, { type: "svg" });
            }
            catch (err) {
                console.error("QR generation error:", err);
            }
            res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>TailOverlay Demo Lobby</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              padding: 20px;
            }
            .card {
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 24px;
              padding: 40px;
              text-align: center;
              max-width: 400px;
            }
            .logo {
              width: 64px;
              height: 64px;
              background: linear-gradient(135deg, #38bdf8, #818cf8);
              border-radius: 16px;
              margin: 0 auto 20px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            h1 { font-size: 28px; margin-bottom: 8px; }
            .status {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              padding: 8px 16px;
              background: rgba(34, 197, 94, 0.2);
              border-radius: 100px;
              color: #22c55e;
              font-size: 14px;
              margin-bottom: 24px;
            }
            .status::before {
              content: '';
              width: 8px;
              height: 8px;
              background: #22c55e;
              border-radius: 50%;
              animation: pulse 2s infinite;
            }
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
            .qr {
              background: white;
              padding: 16px;
              border-radius: 16px;
              margin-bottom: 24px;
            }
            .qr svg { width: 200px; height: 200px; }
            .url {
              font-family: monospace;
              font-size: 12px;
              color: rgba(255, 255, 255, 0.6);
              word-break: break-all;
            }
            .note {
              margin-top: 20px;
              font-size: 13px;
              color: rgba(255, 255, 255, 0.5);
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <h1>TailOverlay</h1>
            <div class="status">Workspace Running</div>
            <div class="qr">${qrCodeSvg}</div>
            <p class="url">${tailnetUrl}</p>
            <p class="note">
              This is a read-only demo lobby.<br>
              The actual workspace is private over Tailscale.
            </p>
          </div>
        </body>
        </html>
      `);
        });
        this.demoServer = (0, http_1.createServer)(demoApp);
        this.demoServer.listen(port, "0.0.0.0", () => {
            console.log(`Demo lobby running on http://0.0.0.0:${port}/demo`);
        });
    }
    stopDemoLobby() {
        if (this.demoServer) {
            this.demoServer.close();
            this.demoServer = null;
        }
    }
}
exports.HostService = HostService;
