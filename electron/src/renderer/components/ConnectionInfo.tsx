"use client"

import { useState } from "react"
import type { Workspace, Identity } from "../../shared/types"

interface ConnectionInfoProps {
  mode: "host" | "join"
  workspace: Workspace
  tailnetUrl: string
  identity: Identity
  onDisconnect: () => void
}

export function ConnectionInfo({
  mode,
  workspace,
  tailnetUrl,
  identity,
  onDisconnect,
}: ConnectionInfoProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const formatTailnetDisplay = (url: string) => {
    let cleaned = url.trim()
    cleaned = cleaned.replace(/^https?:\/\//i, "")
    cleaned = cleaned.replace(/:\d+$/, "")
    // Drop any trailing path if present
    const slashIndex = cleaned.indexOf("/")
    if (slashIndex !== -1) {
      cleaned = cleaned.slice(0, slashIndex)
    }
    return cleaned
  }

  const tailnetDisplay = formatTailnetDisplay(tailnetUrl)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="h-full flex flex-col px-4 pb-4 pt-0 overflow-y-auto">
      {/* Status badge */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full animate-pulse ${mode === "host" ? "bg-success" : "bg-primary"}`} />
        <span className="text-sm font-medium">{mode === "host" ? "Hosting Workspace" : "Connected to Workspace"}</span>
      </div>

      {/* Connection details */}
      <div className="space-y-3">
        {mode === "host" && (
          <div className="glass-panel rounded-xl p-3">
            <label className="text-xs text-muted-foreground mb-1 block">Workspace Code</label>
            <div className="flex items-center justify-between">
              <span className="font-mono text-2xl font-bold tracking-widest">{workspace.code}</span>
              <button
                onClick={() => copyToClipboard(workspace.code, "code")}
                className="p-2 rounded-lg hover:bg-secondary transition-colors"
              >
                {copied === "code" ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-success"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="glass-panel rounded-xl p-3">
          <label className="text-xs text-muted-foreground mb-1 block">Tailnet URL</label>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-mono truncate">{tailnetDisplay}</span>
            <button
              onClick={() => copyToClipboard(tailnetDisplay, "url")}
              className="p-2 rounded-lg hover:bg-secondary transition-colors shrink-0"
            >
              {copied === "url" ? (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-success"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="glass-panel rounded-xl p-3">
          <label className="text-xs text-muted-foreground mb-1 block">Your Identity</label>
          <p className="text-sm font-medium">{identity.deviceName}</p>
          {identity.userEmail && <p className="text-xs text-muted-foreground">{identity.userEmail}</p>}
        </div>

        {mode === "host" && (
          <div className="glass-panel rounded-xl p-3">
            <label className="text-xs text-muted-foreground mb-1 block">Host</label>
            <p className="text-sm font-medium">{workspace.hostIdentity.deviceName}</p>
            {workspace.hostIdentity.userEmail && (
              <p className="text-xs text-muted-foreground">{workspace.hostIdentity.userEmail}</p>
            )}
          </div>
        )}
      </div>

      {/* Disconnect button */}
      <div className="mt-auto pt-4">
        <button
          onClick={onDisconnect}
          className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
        >
          {mode === "host" ? "Stop Hosting" : "Disconnect"}
        </button>
      </div>
    </div>
  )
}
