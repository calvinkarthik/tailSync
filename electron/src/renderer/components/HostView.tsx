"use client"

import type { Workspace, Identity, Post, ChatMessage } from "../../shared/types"
import { WorkspaceTabs } from "./WorkspaceTabs"
import { ConnectionInfo } from "./ConnectionInfo"

interface HostViewProps {
  workspace: Workspace
  tailnetUrl: string
  identity: Identity
  posts: Post[]
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
  onUploadFile: (file: File) => void
  onDisconnect: () => void
  activePanel: "feed" | "chat" | "connection" | null
  windowVisible: boolean
  onClosePanel: () => void
}

export function HostView({
  workspace,
  tailnetUrl,
  identity,
  posts,
  messages,
  onSendMessage,
  onUploadFile,
  onDisconnect,
  activePanel,
  windowVisible,
  onClosePanel,
}: HostViewProps) {
  const isPanelOpen = activePanel !== null
  const isPanelVisible = isPanelOpen && windowVisible

  return (
    <div className="h-full relative overflow-hidden animate-fade-in">
      <div
        className={`absolute top-0 right-0 h-full w-full ${
          isPanelVisible ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div
          className={`h-full glass flex flex-col panel-slide ${
            isPanelVisible ? "panel-slide-in" : "panel-slide-out"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium capitalize">{activePanel || ""}</span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => window.electronAPI.minimizeWindow()}
                className="p-1.5 rounded-md hover:bg-secondary transition-colors"
                aria-label="Minimize window"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <button
                onClick={() => window.electronAPI.closeWindow()}
                className="p-1.5 rounded-md hover:bg-destructive/20 hover:text-destructive transition-colors"
                aria-label="Close window"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            {activePanel && activePanel !== "connection" && (
              <WorkspaceTabs
                activeTab={activePanel}
                posts={posts}
                messages={messages}
                identity={identity}
                tailnetUrl={tailnetUrl}
                onSendMessage={onSendMessage}
                onUploadFile={onUploadFile}
              />
            )}

            {activePanel === "connection" && (
              <ConnectionInfo
                mode="host"
                workspace={workspace}
                tailnetUrl={tailnetUrl}
                identity={identity}
                onDisconnect={onDisconnect}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
