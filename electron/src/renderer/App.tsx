"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { WelcomeScreen } from "./components/WelcomeScreen"
import { HostView } from "./components/HostView"
import { JoinView } from "./components/JoinView"
import type { AppState, TailscaleStatus, Identity, Post, ChatMessage, JoinRequest } from "../shared/types"

declare global {
  interface Window {
    electronAPI: {
      getTailscaleStatus: () => Promise<TailscaleStatus>
      getIdentity: () => Promise<Identity>
      startHost: () => Promise<{ code: string; tailnetUrl: string; identity: Identity }>
      stopHost: () => Promise<void>
      captureScreenshot: () => Promise<{ buffer: string; filename: string }>
      openTailscale: () => void
      minimizeWindow: () => void
      closeWindow: () => void
      requestTogglePanel: (panel: "feed" | "chat" | "connection") => void
      requestScreenshot: (caption?: string) => void
      setPanelState: (panel: "feed" | "chat" | "connection" | null) => void
      onPanelState: (callback: (panel: "feed" | "chat" | "connection" | null) => void) => void
      offPanelState: (callback?: (panel: "feed" | "chat" | "connection" | null) => void) => void
      onNotchTogglePanel: (callback: (panel: "feed" | "chat" | "connection") => void) => void
      offNotchTogglePanel: (callback?: (panel: "feed" | "chat" | "connection") => void) => void
      onNotchScreenshot: (callback: (caption?: string) => void) => void
      offNotchScreenshot: (callback?: (caption?: string) => void) => void
      onWindowVisibility: (callback: (visible: boolean) => void) => void
      offWindowVisibility: (callback?: (visible: boolean) => void) => void
      setNotchVisible: (visible: boolean) => void
      moveWindowRight: () => void
      moveWindowCenter: () => void
      setWindowMode: (mode: "welcome" | "host" | "join") => void
    }
  }
}

const initialState: AppState = {
  mode: "welcome",
  workspace: null,
  tailnetUrl: null,
  connectionStatus: "disconnected",
  error: null,
  pendingApproval: false,
  tailscaleStatus: {
    installed: false,
    running: false,
    loggedIn: false,
    deviceName: null,
    tailnetName: null,
    selfIP: null,
    userEmail: null,
  },
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState)
  const [identity, setIdentity] = useState<Identity | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [hostWs, setHostWs] = useState<WebSocket | null>(null)
  const [pendingJoinRequests, setPendingJoinRequests] = useState<JoinRequest[]>([])
  const [activePanel, setActivePanel] = useState<"feed" | "chat" | "connection" | null>(null)
  const [windowVisible, setWindowVisible] = useState(true)
  const joinPollAbortRef = useRef<(() => void) | null>(null)

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
    const interval = setInterval(checkStatus, 10000) // Reduced from 5s to 10s
    return () => clearInterval(interval)
  }, [])

  // Cleanup WebSocket connections on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close()
      }
      if (hostWs) {
        hostWs.close()
      }
    }
  }, [ws, hostWs])

  const handleStartHost = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, connectionStatus: "connecting", error: null, pendingApproval: false }))

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
        pendingApproval: false,
      }))
      setIdentity(result.identity)
      setPendingJoinRequests([])
      setActivePanel("connection")

      // Subscribe to local host WebSocket so the host receives guest chat/posts
      const websocket = new WebSocket("ws://127.0.0.1:4173/ws")
      websocket.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === "chat") {
          setMessages((prev) => [...prev, message.data])
        } else if (message.type === "post:new") {
          setPosts((prev) => [message.data, ...prev])
        } else if (message.type === "join:request") {
          setPendingJoinRequests((prev) => {
            if (prev.some((req) => req.id === message.data.id)) {
              return prev
            }
            return [...prev, message.data]
          })
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
        pendingApproval: false,
      }))
    }
  }, [])

  const connectToWorkspace = useCallback(
    (data: any, tailnetUrl: string) => {
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
          pendingApproval: false,
        }))
        setPosts(data.posts || [])
        setMessages(data.messages || [])
        setActivePanel("connection")
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
          pendingApproval: false,
        }))
      }

      websocket.onclose = () => {
        setState((prev) => ({
          ...prev,
          connectionStatus: "disconnected",
          pendingApproval: false,
        }))
      }

      setWs(websocket)
    },
    [setState],
  )

  const pollJoinStatus = useCallback(
    async (tailnetUrl: string, requestId: string) => {
      let aborted = false
      joinPollAbortRef.current = () => {
        aborted = true
      }

      const maxAttempts = 120
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        if (aborted) {
          return
        }

        await new Promise((resolve) => setTimeout(resolve, 1000))

        if (aborted) {
          return
        }

        const response = await fetch(`${tailnetUrl}/api/join-status/${requestId}`)
        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data?.error || "Failed to check join status")
        }

        if (data.status === "pending") {
          continue
        }

        if (data.status === "denied") {
          throw new Error("Join request denied by host")
        }

        if (data.status === "approved") {
          connectToWorkspace(data, tailnetUrl)
          return
        }

        throw new Error("Unexpected join status response")
      }

      throw new Error("Join request timed out")
    },
    [connectToWorkspace],
  )

  const handleJoin = useCallback(
    async (tailnetUrl: string, code: string) => {
      try {
        setState((prev) => ({ ...prev, connectionStatus: "connecting", error: null, pendingApproval: false }))

        if (joinPollAbortRef.current) {
          joinPollAbortRef.current()
          joinPollAbortRef.current = null
        }

        const response = await fetch(`${tailnetUrl}/api/join-request`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok) {
          throw new Error(data?.error || "Failed to join workspace")
        }

        if (data.status === "approved") {
          connectToWorkspace(data, tailnetUrl)
          return
        }

        if (data.status === "pending" && data.requestId) {
          setState((prev) => ({ ...prev, pendingApproval: true }))
          await pollJoinStatus(tailnetUrl, data.requestId)
          return
        }

        throw new Error("Unexpected join response")
      } catch (err: any) {
        setState((prev) => ({
          ...prev,
          connectionStatus: "error",
          error: err.message || "Failed to join workspace",
          pendingApproval: false,
        }))
      } finally {
        joinPollAbortRef.current = null
      }
    },
    [connectToWorkspace, pollJoinStatus],
  )

  const handleDisconnect = useCallback(async () => {
    let didReset = false
    const resetToWelcome = () => {
      if (didReset) return
      didReset = true
      setState({ ...initialState })
      setIdentity(null)
      setPosts([])
      setMessages([])
      setPendingJoinRequests([])
    }

    try {
      if (ws) {
        ws.close()
        setWs(null)
      }

      if (hostWs) {
        hostWs.close()
        setHostWs(null)
      }

      if (joinPollAbortRef.current) {
        joinPollAbortRef.current()
        joinPollAbortRef.current = null
      }

      // Immediately snap back to the welcome screen so the UI never gets stuck
      resetToWelcome()

      if (state.mode === "host") {
        const stopHostPromise = window.electronAPI.stopHost()
        stopHostPromise.catch((err) => console.error("stopHost error:", err))

        await Promise.race([stopHostPromise, new Promise<void>((resolve) => setTimeout(resolve, 1000))])
      }
    } catch (err) {
      console.error("Disconnect error:", err)
    } finally {
      // Force-reset UI back to welcome immediately
      resetToWelcome()
      setActivePanel(null)

      // Refresh tailscale status in the background
      try {
        const status = await window.electronAPI.getTailscaleStatus()
        setState((prev) => ({ ...prev, tailscaleStatus: status }))
      } catch (err) {
        console.error("Failed to refresh Tailscale status:", err)
      }
    }
  }, [ws, hostWs, state.mode])

  const handleApproveJoin = useCallback(async (requestId: string) => {
    try {
      await fetch("http://127.0.0.1:4173/api/join-approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      })
    } catch (err) {
      console.error("Failed to approve join request:", err)
    } finally {
      setPendingJoinRequests((prev) => prev.filter((req) => req.id !== requestId))
    }
  }, [])

  const handleDenyJoin = useCallback(async (requestId: string) => {
    try {
      await fetch("http://127.0.0.1:4173/api/join-deny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId }),
      })
    } catch (err) {
      console.error("Failed to deny join request:", err)
    } finally {
      setPendingJoinRequests((prev) => prev.filter((req) => req.id !== requestId))
    }
  }, [])

  const handleScreenshot = useCallback(async (caption?: string) => {
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
  }, [identity, state.mode, state.tailnetUrl, hostWs])

  useEffect(() => {
    const handleTogglePanel = (panel: "feed" | "chat" | "connection") => {
      setActivePanel((prev) => (prev === panel ? null : panel))
    }
    const handleNotchScreenshot = (caption?: string) => {
      handleScreenshot(caption)
    }

    window.electronAPI.onNotchTogglePanel(handleTogglePanel)
    window.electronAPI.onNotchScreenshot(handleNotchScreenshot)

    return () => {
      window.electronAPI.offNotchTogglePanel(handleTogglePanel)
      window.electronAPI.offNotchScreenshot(handleNotchScreenshot)
    }
  }, [handleScreenshot])

  useEffect(() => {
    const handleVisibility = (visible: boolean) => {
      setWindowVisible(visible)
    }

    window.electronAPI.onWindowVisibility(handleVisibility)
    return () => {
      window.electronAPI.offWindowVisibility(handleVisibility)
    }
  }, [])

  useEffect(() => {
    window.electronAPI.setPanelState(activePanel)
  }, [activePanel])

  useEffect(() => {
    const shouldShow = state.mode === "host" || state.mode === "join"
    window.electronAPI.setNotchVisible(shouldShow)
    if (!shouldShow) {
      setActivePanel(null)
    }
  }, [state.mode])

  useEffect(() => {
    if (state.mode === "host" || state.mode === "join") {
      window.electronAPI.moveWindowRight()
    } else {
      window.electronAPI.moveWindowCenter()
    }
    window.electronAPI.setWindowMode(state.mode)
  }, [state.mode])


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

  const rootClassName = `h-full flex flex-col rounded-2xl overflow-hidden ${state.mode === "welcome" ? "glass" : ""
    }`

  return (
    <div className={rootClassName}>
      <div className="flex-1 overflow-hidden">
        {state.mode === "welcome" && (
          <WelcomeScreen
            tailscaleStatus={state.tailscaleStatus}
            onStartHost={handleStartHost}
            onJoin={handleJoin}
            error={state.error}
            isConnecting={state.connectionStatus === "connecting"}
            pendingApproval={state.pendingApproval}
            windowVisible={windowVisible}
          />
        )}

        {state.mode === "host" && (
          <HostView
            workspace={state.workspace!}
            tailnetUrl={state.tailnetUrl!}
            identity={identity!}
            posts={posts}
            messages={messages}
            pendingJoinRequests={pendingJoinRequests}
            onApproveJoin={handleApproveJoin}
            onDenyJoin={handleDenyJoin}
            onSendMessage={handleSendMessage}
            onUploadFile={handleUploadFile}
            onDisconnect={handleDisconnect}
            activePanel={activePanel}
            windowVisible={windowVisible}
            onClosePanel={() => setActivePanel(null)}
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
            activePanel={activePanel}
            windowVisible={windowVisible}
            onClosePanel={() => setActivePanel(null)}
          />
        )}
      </div>
    </div>
  )
}
