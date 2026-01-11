export interface Workspace {
  code: string
  createdAt: string
  hostIdentity: Identity
}

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

export type WSMessageType =
  | { type: "chat"; data: ChatMessage }
  | { type: "post:new"; data: Post }
  | { type: "presence"; data: { status: "joined" | "left"; identity: Identity } }

export interface TailscaleStatus {
  installed: boolean
  running: boolean
  loggedIn: boolean
  deviceName: string | null
  tailnetName: string | null
  selfIP: string | null
  userEmail: string | null
}

export interface AppState {
  mode: "welcome" | "host" | "join"
  workspace: Workspace | null
  tailnetUrl: string | null
  connectionStatus: "disconnected" | "connecting" | "connected" | "error"
  error: string | null
  tailscaleStatus: TailscaleStatus
}
