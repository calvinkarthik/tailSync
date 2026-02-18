import express from "express"
import { createServer, type Server, type IncomingMessage } from "http"
import { WebSocketServer, WebSocket } from "ws"
import cors from "cors"
import multer from "multer"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import { exec } from "child_process"
import { promisify } from "util"
import type { Identity, JoinRequest, Post, ChatMessage, Workspace, WSMessageType } from "../shared/types"

const WORKSPACE_DIR = path.join(process.cwd(), "tailoverlay-workspace")
const execAsync = promisify(exec)

type PendingJoin = {
  id: string
  identity: Identity
  identityKey: string
  requestedAt: string
  requestedAtMs: number
}

type CompletedJoin = {
  identityKey: string
  completedAtMs: number
}

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
  private members: Map<string, Identity> = new Map()
  private pendingRequests: Map<string, PendingJoin> = new Map()
  private pendingByIdentity: Map<string, string> = new Map()
  private approvedRequests: Map<string, CompletedJoin> = new Map()
  private deniedRequests: Map<string, CompletedJoin> = new Map()
  private readonly pendingTtlMs = 10 * 60 * 1000
  private readonly completedTtlMs = 5 * 60 * 1000

  constructor(code: string, hostIdentity: Identity) {
    this.code = code
    this.hostIdentity = hostIdentity
    this.workspace = {
      code,
      createdAt: new Date().toISOString(),
      hostIdentity,
    }
    this.members.set(this.identityKey(hostIdentity), hostIdentity)
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

    this.app.post("/api/join-request", async (req, res) => {
      const { code } = req.body
      const remoteIp = this.getClientIp(req)
      this.cleanupExpiredRequests()

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

      const identityKey = this.identityKey(callerIdentity)

      if (this.members.has(identityKey)) {
        console.log("[v0] Join approved - already a member")
        return res.json({
          status: "approved",
          workspace: this.workspace,
          posts: this.posts,
          messages: this.messages,
        })
      }

      const existingRequestId = this.pendingByIdentity.get(identityKey)
      if (existingRequestId && this.pendingRequests.has(existingRequestId)) {
        console.log("[v0] Join pending - request already exists")
        return res.json({ status: "pending", requestId: existingRequestId })
      }

      const requestId = uuidv4()
      const requestedAt = new Date().toISOString()
      this.pendingRequests.set(requestId, {
        id: requestId,
        identity: callerIdentity,
        identityKey,
        requestedAt,
        requestedAtMs: Date.now(),
      })
      this.pendingByIdentity.set(identityKey, requestId)

      const joinRequest: JoinRequest = {
        id: requestId,
        identity: callerIdentity,
        requestedAt,
      }

      console.log("[v0] Join pending - awaiting host approval")
      this.broadcast({ type: "join:request", data: joinRequest })
      return res.json({ status: "pending", requestId })
    })

    this.app.get("/api/join-status/:requestId", async (req, res) => {
      const { requestId } = req.params
      const remoteIp = this.getClientIp(req)
      this.cleanupExpiredRequests()

      const callerIdentity = await this.resolveTailscaleIdentity(remoteIp)
      if (!callerIdentity) {
        return res
          .status(403)
          .json({ error: "Not on tailnet or Tailscale identity unavailable. Ask host to grant access." })
      }

      const identityKey = this.identityKey(callerIdentity)

      const pending = this.pendingRequests.get(requestId)
      if (pending) {
        if (pending.identityKey !== identityKey) {
          return res.status(403).json({ error: "Join request not authorized for this device" })
        }
        return res.json({ status: "pending" })
      }

      const approved = this.approvedRequests.get(requestId)
      if (approved) {
        if (approved.identityKey !== identityKey) {
          return res.status(403).json({ error: "Join request not authorized for this device" })
        }
        return res.json({
          status: "approved",
          workspace: this.workspace,
          posts: this.posts,
          messages: this.messages,
        })
      }

      const denied = this.deniedRequests.get(requestId)
      if (denied) {
        if (denied.identityKey !== identityKey) {
          return res.status(403).json({ error: "Join request not authorized for this device" })
        }
        return res.json({ status: "denied" })
      }

      return res.status(404).json({ error: "Join request not found" })
    })

    this.app.post("/api/join-approve", (req, res) => {
      if (!this.isLocalRequest(req)) {
        return res.status(403).json({ error: "Forbidden" })
      }

      const { requestId } = req.body || {}
      if (!requestId || typeof requestId !== "string") {
        return res.status(400).json({ error: "requestId is required" })
      }

      const pending = this.pendingRequests.get(requestId)
      if (!pending) {
        return res.status(404).json({ error: "Join request not found" })
      }

      this.pendingRequests.delete(requestId)
      this.pendingByIdentity.delete(pending.identityKey)
      this.members.set(pending.identityKey, pending.identity)
      this.approvedRequests.set(requestId, { identityKey: pending.identityKey, completedAtMs: Date.now() })
      return res.json({ ok: true })
    })

    this.app.post("/api/join-deny", (req, res) => {
      if (!this.isLocalRequest(req)) {
        return res.status(403).json({ error: "Forbidden" })
      }

      const { requestId } = req.body || {}
      if (!requestId || typeof requestId !== "string") {
        return res.status(400).json({ error: "requestId is required" })
      }

      const pending = this.pendingRequests.get(requestId)
      if (!pending) {
        return res.status(404).json({ error: "Join request not found" })
      }

      this.pendingRequests.delete(requestId)
      this.pendingByIdentity.delete(pending.identityKey)
      this.deniedRequests.set(requestId, { identityKey: pending.identityKey, completedAtMs: Date.now() })
      return res.json({ ok: true })
    })

    this.app.get("/api/feed", async (req, res) => {
      const identity = await this.requireMember(req, res)
      if (!identity) {
        return
      }
      res.json({ posts: this.posts })
    })

    this.app.post("/api/upload", upload.single("file"), async (req, res) => {
      const callerIdentity = await this.requireMember(req, res)
      if (!callerIdentity) {
        return
      }
      const file = req.file
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" })
      }

      const senderIdentity = callerIdentity

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

    this.app.get("/api/download/:filename", async (req, res) => {
      const identity = await this.requireMember(req, res)
      if (!identity) {
        return
      }
      const filePath = path.join(WORKSPACE_DIR, "uploads", req.params.filename)
      if (fs.existsSync(filePath)) {
        res.download(filePath)
      } else {
        res.status(404).json({ error: "File not found" })
      }
    })

    this.app.post("/api/chat", async (req, res) => {
      const callerIdentity = await this.requireMember(req, res)
      if (!callerIdentity) {
        return
      }
      const { text } = req.body

      const message: ChatMessage = {
        id: uuidv4(),
        text,
        createdAt: new Date().toISOString(),
        senderIdentity: callerIdentity,
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

  private identityKey(identity: Identity): string {
    const key = identity.userEmail || identity.deviceName || identity.hostname
    return key.toLowerCase()
  }

  private normalizeIp(raw: string): string {
    let cleaned = raw.trim().replace("::ffff:", "")
    if (cleaned.startsWith("[") && cleaned.includes("]")) {
      cleaned = cleaned.slice(1, cleaned.indexOf("]"))
    }
    if (/^\d+\.\d+\.\d+\.\d+:\d+$/.test(cleaned)) {
      cleaned = cleaned.split(":")[0]
    }
    return cleaned
  }

  private getClientIp(req: express.Request): string {
    const xfwd = (req.headers["x-forwarded-for"] as string) || ""
    const raw = xfwd.split(",")[0].trim() || req.ip || ""
    return this.normalizeIp(raw)
  }

  private getWsClientIp(req: IncomingMessage): string {
    const xfwd = (req.headers["x-forwarded-for"] as string) || ""
    const raw = xfwd.split(",")[0].trim() || req.socket.remoteAddress || ""
    return this.normalizeIp(raw)
  }

  private isLocalRequest(req: express.Request): boolean {
    const ip = this.getClientIp(req)
    return ["127.0.0.1", "::1", "localhost"].includes(ip)
  }

  private async requireMember(req: express.Request, res: express.Response): Promise<Identity | null> {
    const remoteIp = this.getClientIp(req)
    const identity = await this.resolveTailscaleIdentity(remoteIp)
    if (!identity) {
      res.status(403).json({ error: "Not on tailnet or Tailscale identity unavailable." })
      return null
    }
    const identityKey = this.identityKey(identity)
    if (!this.members.has(identityKey)) {
      res.status(403).json({ error: "Not approved to access this workspace." })
      return null
    }
    return identity
  }

  private cleanupExpiredRequests() {
    const now = Date.now()
    for (const [requestId, pending] of this.pendingRequests.entries()) {
      if (now - pending.requestedAtMs > this.pendingTtlMs) {
        this.pendingRequests.delete(requestId)
        this.pendingByIdentity.delete(pending.identityKey)
      }
    }

    for (const [requestId, completed] of this.approvedRequests.entries()) {
      if (now - completed.completedAtMs > this.completedTtlMs) {
        this.approvedRequests.delete(requestId)
      }
    }

    for (const [requestId, completed] of this.deniedRequests.entries()) {
      if (now - completed.completedAtMs > this.completedTtlMs) {
        this.deniedRequests.delete(requestId)
      }
    }
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
        const remoteIp = this.getWsClientIp(req)
        const callerIdentity = await this.resolveTailscaleIdentity(remoteIp)

        if (!callerIdentity) {
          console.log(`[v0] WebSocket rejected for ${remoteIp} (unknown) - not allowed`)
          ws.close(1008, "Not allowed by Tailscale policy")
          return
        }

        const identityKey = this.identityKey(callerIdentity)
        if (!this.members.has(identityKey)) {
          console.log(
            `[v0] WebSocket rejected for ${remoteIp} (${callerIdentity?.deviceName || "unknown"}) - not allowed`,
          )
          ws.close(1008, "Not allowed by Tailscale policy")
          return
        }

        console.log(`[v0] WebSocket connection from ${remoteIp} (${callerIdentity.deviceName})`)
        const wsIdentity = callerIdentity
        this.clients.add(ws)
        this.broadcast({
          type: "presence",
          data: { status: "joined", identity: wsIdentity },
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
                senderIdentity: wsIdentity,
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
            data: { status: "left", identity: wsIdentity },
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
