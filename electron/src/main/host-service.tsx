import express from "express"
import { createServer, type Server } from "http"
import { WebSocketServer, WebSocket } from "ws"
import cors from "cors"
import multer from "multer"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { exec } from "child_process"
import { promisify } from "util"
import type { Identity, Post, ChatMessage, Workspace, WSMessageType } from "../shared/types"

const WORKSPACE_DIR = path.join(process.cwd(), "tailoverlay-workspace")
const execAsync = promisify(exec)

export class HostService {
  private app: express.Application
  private server: Server | null = null
  private wss: WebSocketServer | null = null
  private code: string
  private hostIdentity: Identity
  private workspace: Workspace
  private posts: Post[] = []
  private messages: ChatMessage[] = []
  private clients: Set<WebSocket> = new Set()
  private allowedDevices: string[]

  constructor(code: string, hostIdentity: Identity) {
    this.code = code
    this.hostIdentity = hostIdentity
    this.workspace = {
      code,
      createdAt: new Date().toISOString(),
      hostIdentity,
    }
    // Comma-separated list of allowed device names (match Tailscale device names).
    const envAllow = process.env.TS_ALLOWED_DEVICES
    this.allowedDevices = envAllow
      ? envAllow
          .split(",")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean)
      : ["calvin", "remy-r"]
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware() {
    this.app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    )

    this.app.use(express.json())

    this.app.use((req, res, next) => {
      console.log(`[v0] ${req.method} ${req.path} from ${req.ip}`)
      next()
    })

    if (!fs.existsSync(WORKSPACE_DIR)) {
      fs.mkdirSync(WORKSPACE_DIR, { recursive: true })
    }
  }

  private setupRoutes() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadsDir = path.join(WORKSPACE_DIR, "uploads")
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true })
        }
        cb(null, uploadsDir)
      },
      filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}-${file.originalname}`
        cb(null, uniqueName)
      },
    })

    const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } })

    this.app.get("/api/health", (req, res) => {
      console.log("[v0] Health check received")
      res.json({ status: "ok", code: this.code })
    })

    this.app.post("/api/create-workspace", (req, res) => {
      console.log("[v0] Create workspace request")
      res.json({ code: this.code })
    })

    this.app.post("/api/join", async (req, res) => {
      const { code } = req.body
      const remoteIp = this.getClientIp(req)
      const callerIdentity = await this.resolveTailscaleIdentity(remoteIp)
      console.log(`[v0] Join request with code: ${code}, expected: ${this.code}, from ${remoteIp}`)

      if (code !== this.code) {
        console.log("[v0] Invalid code - rejecting")
        return res.status(403).json({ error: "Invalid workspace code" })
      }

      if (!callerIdentity) {
        console.log("[v0] Join rejected - unknown Tailscale identity")
        return res
          .status(403)
          .json({ error: "Not on tailnet or Tailscale identity unavailable. Ask host to grant access." })
      }

      if (!this.isAllowedDevice(callerIdentity.deviceName)) {
        console.log(
          `[v0] Join rejected - device ${callerIdentity.deviceName} is not in allowed list: ${this.allowedDevices.join(", ")}`,
        )
        return res.status(403).json({
          error: `Blocked by Tailscale ACL or not allowed. Allowed devices: ${this.allowedDevices.join(", ")}`,
        })
      }

      console.log("[v0] Join successful!")
      res.json({
        workspace: this.workspace,
        posts: this.posts,
        messages: this.messages,
      })
    })

    this.app.get("/api/feed", (req, res) => {
      res.json({ posts: this.posts })
    })

    this.app.post("/api/upload", upload.single("file"), (req, res) => {
      const file = req.file
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" })
      }

      let senderIdentity: Identity
      try {
        senderIdentity = JSON.parse(req.body.identity || "{}")
      } catch {
        senderIdentity = this.hostIdentity
      }

      const post: Post = {
        id: uuidv4(),
        type: req.body.type === "screenshot" ? "screenshot" : "file",
        filename: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        caption: req.body.caption || undefined,
        createdAt: new Date().toISOString(),
        senderIdentity,
        downloadUrl: `/api/download/${file.filename}`,
      }

      this.posts.unshift(post)
      this.broadcast({ type: "post:new", data: post })
      res.json({ post })
    })

    this.app.get("/api/download/:filename", (req, res) => {
      const filePath = path.join(WORKSPACE_DIR, "uploads", req.params.filename)
      if (fs.existsSync(filePath)) {
        res.download(filePath)
      } else {
        res.status(404).json({ error: "File not found" })
      }
    })

    this.app.post("/api/chat", (req, res) => {
      const { text, identity } = req.body

      const message: ChatMessage = {
        id: uuidv4(),
        text,
        createdAt: new Date().toISOString(),
        senderIdentity: identity || this.hostIdentity,
      }

      this.messages.push(message)
      this.broadcast({ type: "chat", data: message })
      res.json({ message })
    })
  }

  private broadcast(message: WSMessageType) {
    const data = JSON.stringify(message)
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    })
  }

  private isAllowedDevice(deviceName: string | undefined | null): boolean {
    if (!deviceName) return false
    return this.allowedDevices.includes(deviceName.toLowerCase())
  }

  private getClientIp(req: express.Request): string {
    const xfwd = (req.headers["x-forwarded-for"] as string) || ""
    const raw = xfwd.split(",")[0].trim() || req.ip || ""
    return raw.replace("::ffff:", "")
  }

  private async resolveTailscaleIdentity(remoteIp: string): Promise<Identity | null> {
    if (!remoteIp) return null

    // Local requests (host machine) map to host identity.
    if (["127.0.0.1", "::1", "localhost"].includes(remoteIp)) {
      return this.hostIdentity
    }

    try {
      const { stdout } = await execAsync("tailscale status --json")
      const status = JSON.parse(stdout)

      // Check peers for matching Tailscale IP.
      const peers = status?.Peer || {}
      for (const peerId of Object.keys(peers)) {
        const peer = peers[peerId]
        const ips: string[] = peer.TailscaleIPs || []
        if (ips.includes(remoteIp)) {
          return {
            deviceName: peer.HostName || peer.Hostinfo?.Hostname || "unknown-device",
            userEmail: status?.User?.[peer.UserID]?.LoginName || null,
            hostname: peer.Hostinfo?.Hostname || peer.HostName || "unknown-device",
          }
        }
      }

      // If no peer match but IP equals selfIP, return host identity.
      const selfIPs: string[] = status?.Self?.TailscaleIPs || []
      if (selfIPs.includes(remoteIp)) {
        return this.hostIdentity
      }
    } catch (err) {
      console.error("[v0] Failed to resolve Tailscale identity:", err)
    }
    return null
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(this.app)
      this.wss = new WebSocketServer({ server: this.server })

      this.wss.on("connection", async (ws, req) => {
        const remoteIp = (req.socket.remoteAddress || "").replace("::ffff:", "")
        const callerIdentity = await this.resolveTailscaleIdentity(remoteIp)

        if (!callerIdentity || !this.isAllowedDevice(callerIdentity.deviceName)) {
          console.log(
            `[v0] WebSocket rejected for ${remoteIp} (${callerIdentity?.deviceName || "unknown"}) - not allowed`,
          )
          ws.close(1008, "Not allowed by Tailscale policy")
          return
        }

        console.log(`[v0] WebSocket connection from ${remoteIp} (${callerIdentity.deviceName})`)
        this.clients.add(ws)
        this.broadcast({
          type: "presence",
          data: { status: "joined", identity: callerIdentity },
        })

        ws.on("message", (data) => {
          try {
            const msg = JSON.parse(data.toString())
            console.log("[v0] WebSocket message:", msg.type)
            if (msg.type === "chat") {
              const chatMessage: ChatMessage = {
                id: uuidv4(),
                text: msg.text,
                createdAt: new Date().toISOString(),
                senderIdentity: msg.identity || this.hostIdentity,
              }
              this.messages.push(chatMessage)
              this.broadcast({ type: "chat", data: chatMessage })
            }
          } catch (err) {
            console.error("[v0] WebSocket message error:", err)
          }
        })

        ws.on("close", () => {
          console.log("[v0] WebSocket disconnected")
          this.clients.delete(ws)
          this.broadcast({
            type: "presence",
            data: { status: "left", identity: this.hostIdentity },
          })
        })
      })

      const os = require("os")
      const interfaces = os.networkInterfaces()
      console.log("[v0] Available network interfaces:")
      Object.keys(interfaces).forEach((name) => {
        interfaces[name]?.forEach((iface: any) => {
          if (iface.family === "IPv4" && !iface.internal) {
            console.log(`[v0]   ${name}: ${iface.address}`)
          }
        })
      })

      this.server.listen(4173, "0.0.0.0", () => {
        console.log("[v0] Host service running on http://0.0.0.0:4173")
        console.log("[v0] Other devices can connect via your Tailscale IP on port 4173")
        resolve()
      })

      this.server.on("error", (err) => {
        console.error("[v0] Server error:", err)
        reject(err)
      })
    })
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close()
        this.wss = null
      }

      if (this.server) {
        this.server.close(() => {
        this.server = null
        resolve()
      })
    } else {
      resolve()
    }
    })
  }
}
