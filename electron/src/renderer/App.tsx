"use client"

import { useState, useEffect } from "react"
import { WelcomeScreen } from "./components/WelcomeScreen"
import { HostView } from "./components/HostView"
import { JoinView } from "./components/JoinView"
import { TitleBar } from "./components/TitleBar"
import { SnapButton } from "./components/SnapButton"
import type { AppState, TailscaleStatus, Identity, Post, ChatMessage } from "../shared/types"

declare global {
  interface Window {
    electronAPI: {
      getTailscaleStatus: () => Promise<TailscaleStatus>
      getIdentity: () => Promise<Identity>
      startHost: () => Promise<{ code: string; tailnetUrl: string; identity: Identity }>
      stopHost: () => Promise<void>
      enableFunnel: () => Promise<string>
      disableFunnel: () => Promise<void>
      captureScreenshot: () => Promise<{ buffer: string; filename: string }>
      openTailscale: () => void
      minimizeWindow: () => void
      closeWindow: () => void
    }
  }
}

const initialState: AppState = {
  mode: "welcome",
  workspace: null,
  tailnetUrl: null,
  connectionStatus: "disconnected",
  error: null,
  tailscaleStatus: {
    installed: false,
    running: false,
    loggedIn: false,
    deviceName: null,
    tailnetName: null,
    selfIP: null,
    userEmail: null,
  },
  funnelEnabled: false,
  funnelUrl: null,
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [hostWs, setHostWs] = useState<WebSocket | null>(null)

  // Check Tailscale status on mount and periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const status = await window.electronAPI.getTailscaleStatus()
        setState((prev) => ({ ...prev, tailscaleStatus: status }))

        if (status.running && status.loggedIn) {
          const id = await window.electronAPI.getIdentity()
          setIdentity(id)
        }
      } catch (err) {
        console.error("Failed to get Tailscale status:", err)
      }
    }

    checkStatus()
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleStartHost = async () => {
    try {
      setState((prev) => ({ ...prev, connectionStatus: "connecting", error: null }))

      const result = await window.electronAPI.startHost()

      setState((prev) => ({
        ...prev,
        mode: "host",
        workspace: {
          code: result.code,
          createdAt: new Date().toISOString(),
          hostIdentity: result.identity,
        },
        tailnetUrl: result.tailnetUrl,
        connectionStatus: "connected",
      }))
      setIdentity(result.identity)

      // Subscribe to local host WebSocket so the host receives guest chat/posts
      const websocket = new WebSocket("ws://127.0.0.1:4173/ws")
      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === "chat") {
          setMessages((prev) => [...prev, message.data])
        } else if (message.type === "post:new") {
          setPosts((prev) => [message.data, ...prev])
        }
      }
      websocket.onclose = () => setHostWs(null)
      websocket.onerror = () => setHostWs(null)
      setHostWs(websocket)
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        connectionStatus: "error",
        error: err.message || "Failed to start host",
      }))
    }
  }

  const handleJoin = async (tailnetUrl: string, code: string) => {
    try {
      setState((prev) => ({ ...prev, connectionStatus: "connecting", error: null }))

      // Try to join the workspace
      const response = await fetch(`${tailnetUrl}/api/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error("Invalid workspace code")
        }
        throw new Error("Blocked by Tailscale ACL or not on tailnet. Ask host to grant access.")
      }

      const data = await response.json()

      // Connect WebSocket (support both HTTPS MagicDNS and HTTP 100.x IPs)
      const wsUrl = tailnetUrl.startsWith("https://")
        ? tailnetUrl.replace("https://", "wss://") + "/ws"
        : tailnetUrl.replace("http://", "ws://") + "/ws"
      const websocket = new WebSocket(wsUrl)

      websocket.onopen = () => {
        setState((prev) => ({
          ...prev,
          mode: "join",
          workspace: data.workspace,
          tailnetUrl,
          connectionStatus: "connected",
        }))
        setPosts(data.posts || [])
        setMessages(data.messages || [])
      }

      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === "chat") {
          setMessages((prev) => [...prev, message.data])
        } else if (message.type === "post:new") {
          setPosts((prev) => [message.data, ...prev])
        }
      }

      websocket.onerror = () => {
        setState((prev) => ({
          ...prev,
          connectionStatus: "error",
          error: "WebSocket connection failed",
        }))
      }

      websocket.onclose = () => {
        setState((prev) => ({
          ...prev,
          connectionStatus: "disconnected",
        }))
      }

      setWs(websocket)
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        connectionStatus: "error",
        error: err.message || "Failed to join workspace",
      }))
    }
  }

  const handleDisconnect = async () => {
    if (ws) {
      ws.close()
      setWs(null)
    }

    if (hostWs) {
      hostWs.close()
      setHostWs(null)
    }

    if (state.mode === "host") {
      await window.electronAPI.stopHost()
    }

    setState(initialState)
    setPosts([])
    setMessages([])

    // Re-check tailscale status
    const status = await window.electronAPI.getTailscaleStatus()
    setState((prev) => ({ ...prev, tailscaleStatus: status }))
  }

  const handleToggleFunnel = async () => {
    try {
      if (state.funnelEnabled) {
        await window.electronAPI.disableFunnel()
        setState((prev) => ({ ...prev, funnelEnabled: false, funnelUrl: null }))
      } else {
        const funnelUrl = await window.electronAPI.enableFunnel()
        setState((prev) => ({ ...prev, funnelEnabled: true, funnelUrl }))
      }
    } catch (err: any) {
      console.error("Funnel toggle error:", err)
    }
  }

  const handleScreenshot = async (caption?: string) => {
    try {
      const { buffer, filename } = await window.electronAPI.captureScreenshot()

      // Convert base64 to blob
      const byteCharacters = atob(buffer)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: "image/png" })

      // Upload
      const formData = new FormData()
      formData.append("file", blob, filename)
      formData.append("type", "screenshot")
      formData.append("identity", JSON.stringify(identity))
      if (caption) formData.append("caption", caption)

      const uploadUrl = state.mode === "host" ? "http://127.0.0.1:4173/api/upload" : `${state.tailnetUrl}/api/upload`

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (state.mode === "host" && (!hostWs || hostWs.readyState !== WebSocket.OPEN)) {
        setPosts((prev) => [data.post, ...prev])
      }
    } catch (err) {
      console.error("Screenshot error:", err)
    }
  }

  const handleSendMessage = async (text: string) => {
    try {
      if (state.mode === "host") {
        const response = await fetch("http://127.0.0.1:4173/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, identity }),
        })
        const data = await response.json()
        if (!hostWs || hostWs.readyState !== WebSocket.OPEN) {
          // If WebSocket isn't connected, append manually; otherwise rely on broadcast to avoid duplicates
          setMessages((prev) => [...prev, data.message])
        }
      } else if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "chat", text, identity }))
      }
    } catch (err) {
      console.error("Send message error:", err)
    }
  }

  const handleUploadFile = async (file: File) => {
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "file")
      formData.append("identity", JSON.stringify(identity))

      const uploadUrl = state.mode === "host" ? "http://127.0.0.1:4173/api/upload" : `${state.tailnetUrl}/api/upload`

      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (state.mode === "host" && (!hostWs || hostWs.readyState !== WebSocket.OPEN)) {
        setPosts((prev) => [data.post, ...prev])
      }
    } catch (err) {
      console.error("Upload error:", err)
    }
  }

  return (
    <div className="h-full flex flex-col rounded-2xl overflow-hidden glass">
      <TitleBar />

      <div className="flex-1 overflow-hidden">
        {state.mode === "welcome" && (
          <WelcomeScreen
            tailscaleStatus={state.tailscaleStatus}
            onStartHost={handleStartHost}
            onJoin={handleJoin}
            error={state.error}
            isConnecting={state.connectionStatus === "connecting"}
          />
        )}

        {state.mode === "host" && (
          <HostView
            workspace={state.workspace!}
            tailnetUrl={state.tailnetUrl!}
            identity={identity!}
            posts={posts}
            messages={messages}
            funnelEnabled={state.funnelEnabled}
            funnelUrl={state.funnelUrl}
            onToggleFunnel={handleToggleFunnel}
            onSendMessage={handleSendMessage}
            onUploadFile={handleUploadFile}
            onDisconnect={handleDisconnect}
          />
        )}

        {state.mode === "join" && (
          <JoinView
            workspace={state.workspace!}
            tailnetUrl={state.tailnetUrl!}
            identity={identity!}
            posts={posts}
            messages={messages}
            onSendMessage={handleSendMessage}
            onUploadFile={handleUploadFile}
            onDisconnect={handleDisconnect}
          />
        )}
      </div>

      {(state.mode === "host" || state.mode === "join") && <SnapButton onCapture={handleScreenshot} />}
    </div>
  )
}
