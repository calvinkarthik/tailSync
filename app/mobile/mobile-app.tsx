"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { ConnectScreen } from "./components/connect-screen"
import { WorkspaceView } from "./components/workspace-view"

export interface Identity {
  deviceName: string
  userEmail: string | null
  hostname: string
}

export interface Post {
  id: string
  type: "screenshot" | "file"
  filename: string
  mimeType: string
  size: number
  caption?: string
  createdAt: string
  senderIdentity: Identity
  downloadUrl: string
}

export interface ChatMessage {
  id: string
  text: string
  createdAt: string
  senderIdentity: Identity
}

export interface Workspace {
  code: string
  createdAt: string
  hostIdentity: Identity
}

export function MobileApp() {
  const [connected, setConnected] = useState(false)
  const [hostUrl, setHostUrl] = useState("")
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [wsConnected, setWsConnected] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const connectWebSocket = useCallback(
    (url: string) => {
      const wsUrl = url.replace(/^http/, "ws") + "/ws"
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        setWsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === "post:new") {
            setPosts((prev) => [msg.data, ...prev])
          } else if (msg.type === "chat") {
            setMessages((prev) => [...prev, msg.data])
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        setWsConnected(false)
      }

      ws.onerror = () => {
        setWsConnected(false)
      }

      wsRef.current = ws
    },
    [],
  )

  const handleConnect = useCallback(
    async (hostAddress: string, code: string, deviceName: string) => {
      const normalizedUrl = hostAddress.startsWith("http")
        ? hostAddress
        : `http://${hostAddress}`
      const baseUrl = normalizedUrl.includes(":") && !normalizedUrl.includes("://")
        ? normalizedUrl
        : normalizedUrl.replace(/:\d+\/?$/, "") + ":4173"
      const finalUrl = normalizedUrl.includes(":4173")
        ? normalizedUrl.replace(/\/$/, "")
        : baseUrl.replace(/\/$/, "")

      const res = await fetch(`${finalUrl}/api/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Connection failed" }))
        throw new Error(err.error || "Connection failed")
      }

      const data = await res.json()
      const ident: Identity = {
        deviceName,
        userEmail: null,
        hostname: deviceName,
      }

      setHostUrl(finalUrl)
      setWorkspace(data.workspace)
      setIdentity(ident)
      setPosts(data.posts || [])
      setMessages(data.messages || [])
      setConnected(true)
      connectWebSocket(finalUrl)
    },
    [connectWebSocket],
  )

  const handleDisconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    setConnected(false)
    setWorkspace(null)
    setIdentity(null)
    setPosts([])
    setMessages([])
    setWsConnected(false)
    setHostUrl("")
  }, [])

  const handleUploadFile = useCallback(
    async (file: File) => {
      if (!identity || !hostUrl) return

      const formData = new FormData()
      formData.append("file", file)
      formData.append("identity", JSON.stringify(identity))
      formData.append("type", "file")

      setUploadProgress(0)

      try {
        const xhr = new XMLHttpRequest()
        xhr.open("POST", `${hostUrl}/api/upload`)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = () => {
          setUploadProgress(null)
        }

        xhr.onerror = () => {
          setUploadProgress(null)
        }

        xhr.send(formData)
      } catch {
        setUploadProgress(null)
      }
    },
    [identity, hostUrl],
  )

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!identity || !hostUrl) return

      await fetch(`${hostUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, identity }),
      })
    },
    [identity, hostUrl],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  if (!connected || !identity || !workspace) {
    return <ConnectScreen onConnect={handleConnect} />
  }

  return (
    <WorkspaceView
      workspace={workspace}
      identity={identity}
      hostUrl={hostUrl}
      posts={posts}
      messages={messages}
      wsConnected={wsConnected}
      uploadProgress={uploadProgress}
      onUploadFile={handleUploadFile}
      onSendMessage={handleSendMessage}
      onDisconnect={handleDisconnect}
    />
  )
}
