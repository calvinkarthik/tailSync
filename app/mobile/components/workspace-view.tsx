"use client"

import { useState } from "react"
import type { Workspace, Identity, Post, ChatMessage } from "../mobile-app"
import { FilesTab } from "./files-tab"
import { ChatTab } from "./chat-tab"
import { ConnectionTab } from "./connection-tab"

interface WorkspaceViewProps {
  workspace: Workspace
  identity: Identity
  hostUrl: string
  posts: Post[]
  messages: ChatMessage[]
  wsConnected: boolean
  uploadProgress: number | null
  onUploadFile: (file: File) => void
  onSendMessage: (text: string) => void
  onDisconnect: () => void
}

type Tab = "files" | "chat" | "connection"

export function WorkspaceView({
  workspace,
  identity,
  hostUrl,
  posts,
  messages,
  wsConnected,
  uploadProgress,
  onUploadFile,
  onSendMessage,
  onDisconnect,
}: WorkspaceViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>("files")

  const unreadChat = 0 // Could track unread count later

  return (
    <div className="ts-screen flex flex-col">
      {/* Upload progress bar */}
      {uploadProgress !== null && (
        <div className="absolute top-0 left-0 right-0 z-50 h-1 bg-[rgba(255,255,255,0.05)]">
          <div
            className="h-full bg-[#5b2ad6] transition-all duration-200 ease-out"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-[max(12px,env(safe-area-inset-top))] pb-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center gap-2.5">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? "bg-[#22c55e]" : "bg-[#ef4444]"}`} />
          <h1 className="text-base font-semibold text-white truncate">
            tailSync
          </h1>
        </div>
        <span className="text-xs text-[rgba(255,255,255,0.35)] font-mono tabular-nums">
          {workspace.code}
        </span>
      </header>

      {/* Tab content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className={activeTab === "files" ? "h-full" : "hidden"}>
          <FilesTab
            posts={posts}
            hostUrl={hostUrl}
            onUploadFile={onUploadFile}
          />
        </div>
        <div className={activeTab === "chat" ? "h-full" : "hidden"}>
          <ChatTab
            messages={messages}
            identity={identity}
            onSendMessage={onSendMessage}
          />
        </div>
        <div className={activeTab === "connection" ? "h-full" : "hidden"}>
          <ConnectionTab
            workspace={workspace}
            identity={identity}
            hostUrl={hostUrl}
            wsConnected={wsConnected}
            onDisconnect={onDisconnect}
          />
        </div>
      </main>

      {/* Bottom tab bar */}
      <nav className="flex items-stretch border-t border-[rgba(255,255,255,0.06)] bg-[rgba(5,5,10,0.95)] backdrop-blur-xl pb-[max(8px,env(safe-area-inset-bottom))]">
        <TabButton
          active={activeTab === "files"}
          onClick={() => setActiveTab("files")}
          label="Files"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
        />
        <TabButton
          active={activeTab === "chat"}
          onClick={() => setActiveTab("chat")}
          label="Chat"
          badge={unreadChat > 0 ? unreadChat : undefined}
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          }
        />
        <TabButton
          active={activeTab === "connection"}
          onClick={() => setActiveTab("connection")}
          label="Status"
          icon={
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          }
        />
      </nav>
    </div>
  )
}

function TabButton({
  active,
  onClick,
  label,
  icon,
  badge,
}: {
  active: boolean
  onClick: () => void
  label: string
  icon: React.ReactNode
  badge?: number
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 pt-2 pb-1 min-h-[52px] relative transition-colors duration-150 active:scale-[0.97] ${
        active
          ? "text-[#5b2ad6]"
          : "text-[rgba(255,255,255,0.35)]"
      }`}
    >
      <div className="relative">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[#5b2ad6] text-[10px] font-semibold text-white flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}
