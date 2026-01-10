import express from "express"
import { createServer, type Server } from "http"
import { WebSocketServer, WebSocket } from "ws"
import multer from "multer"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import type { Identity, Post, ChatMessage, Workspace, WSMessageType } from "../shared/types"

const WORKSPACE_DIR = path.join(process.cwd(), "tailoverlay-workspace")

export class HostService {
  private app: express.Application
  private server: Server | null = null
  private wss: WebSocketServer | null = null
  private demoServer: Server | null = null
  private code: string
  private hostIdentity: Identity
  private workspace: Workspace
  private posts: Post[] = []
  private messages: ChatMessage[] = []
  private clients: Set<WebSocket> = new Set()

  constructor(code: string, hostIdentity: Identity) {
    this.code = code
    this.hostIdentity = hostIdentity
    this.workspace = {
      code,
      createdAt: new Date().toISOString(),
      hostIdentity,
    }
    this.app = express()
    this.setupMiddleware()
    this.setupRoutes()
  }

  private setupMiddleware() {
    this.app.use(express.json())

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

    this.app.post("/api/create-workspace", (req, res) => {
      res.json({ code: this.code })
    })

    this.app.post("/api/join", (req, res) => {
      const { code } = req.body

      if (code !== this.code) {
        return res.status(403).json({ error: "Invalid workspace code" })
      }

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

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = createServer(this.app)
      this.wss = new WebSocketServer({ server: this.server })

      this.wss.on("connection", (ws) => {
        this.clients.add(ws)
        this.broadcast({
          type: "presence",
          data: { status: "joined", identity: this.hostIdentity },
        })

        ws.on("message", (data) => {
          try {
            const msg = JSON.parse(data.toString())
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
            console.error("WebSocket message error:", err)
          }
        })

        ws.on("close", () => {
          this.clients.delete(ws)
          this.broadcast({
            type: "presence",
            data: { status: "left", identity: this.hostIdentity },
          })
        })
      })

      this.server.listen(4173, "0.0.0.0", () => {
        console.log("Host service running on http://0.0.0.0:4173")
        console.log("Other devices can connect via your Tailscale IP on port 4173")
        resolve()
      })

      this.server.on("error", reject)
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

      this.stopDemoLobby()
    })
  }

  startDemoLobby(port: number, tailnetUrl: string) {
    const QRCode = require("qrcode")
    const demoApp = express()

    demoApp.get("/demo", async (req, res) => {
      let qrCodeSvg = ""
      try {
        qrCodeSvg = await QRCode.toString(tailnetUrl, { type: "svg" })
      } catch (err) {
        console.error("QR generation error:", err)
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
      `)
    })

    this.demoServer = createServer(demoApp)
    this.demoServer.listen(port, "0.0.0.0", () => {
      console.log(`Demo lobby running on http://0.0.0.0:${port}/demo`)
    })
  }

  stopDemoLobby() {
    if (this.demoServer) {
      this.demoServer.close()
      this.demoServer = null
    }
  }
}
