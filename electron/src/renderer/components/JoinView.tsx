"use client"

import { useState } from "react"
import type { Workspace, Identity, Post, ChatMessage } from "../../shared/types"
import { WorkspaceTabs } from "./WorkspaceTabs"
import { ConnectionInfo } from "./ConnectionInfo"

interface JoinViewProps {
  workspace: Workspace
  tailnetUrl: string
  identity: Identity
  posts: Post[]
  messages: ChatMessage[]
  onSendMessage: (text: string) => void
  onUploadFile: (file: File) => void
  onDisconnect: () => void
}

export function JoinView({
  workspace,
  tailnetUrl,
  identity,
  posts,
  messages,
  onSendMessage,
  onUploadFile,
  onDisconnect,
}: JoinViewProps) {
  const [activeTab, setActiveTab] = useState<"feed" | "chat" | "connection">("feed")

  return (
    <div className="h-full flex flex-col animate-fade-in">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {(["feed", "chat", "connection"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        <WorkspaceTabs
          activeTab={activeTab}
          posts={posts}
          messages={messages}
          identity={identity}
          tailnetUrl={tailnetUrl}
          onSendMessage={onSendMessage}
          onUploadFile={onUploadFile}
        />

        {activeTab === "connection" && (
          <ConnectionInfo
            mode="join"
            workspace={workspace}
            tailnetUrl={tailnetUrl}
            identity={identity}
            onDisconnect={onDisconnect}
          />
        )}
      </div>
    </div>
  )
}
