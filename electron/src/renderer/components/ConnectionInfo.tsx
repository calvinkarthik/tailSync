"use client"

import { useState } from "react"
import type { Workspace, Identity } from "../../shared/types"

interface ConnectionInfoProps {
  mode: "host" | "join"
  workspace: Workspace
  tailnetUrl: string
  identity: Identity
  funnelEnabled?: boolean
  funnelUrl?: string | null
  onToggleFunnel?: () => void
  onDisconnect: () => void
}

export function ConnectionInfo({
  mode,
  workspace,
  tailnetUrl,
  identity,
  funnelEnabled,
  funnelUrl,
  onToggleFunnel,
  onDisconnect,
}: ConnectionInfoProps) {
  const [copied, setCopied] = useState<string | null>(null)

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="h-full flex flex-col p-4 overflow-y-auto">
      {/* Status badge */}
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full animate-pulse ${mode === "host" ? "bg-success" : "bg-primary"}`} />
        <span className="text-sm font-medium">{mode === "host" ? "Hosting Workspace" : "Connected to Workspace"}</span>
      </div>

      {/* Connection details */}
      <div className="space-y-3">
        {mode === "host" && (
          <div className="glass-light rounded-xl p-3">
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

        <div className="glass-light rounded-xl p-3">
          <label className="text-xs text-muted-foreground mb-1 block">Tailnet URL</label>
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm font-mono truncate">{tailnetUrl}</span>
            <button
              onClick={() => copyToClipboard(tailnetUrl, "url")}
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

        <div className="glass-light rounded-xl p-3">
          <label className="text-xs text-muted-foreground mb-1 block">Your Identity</label>
          <p className="text-sm font-medium">{identity.deviceName}</p>
          {identity.userEmail && <p className="text-xs text-muted-foreground">{identity.userEmail}</p>}
        </div>

        {mode === "host" && (
          <div className="glass-light rounded-xl p-3">
            <label className="text-xs text-muted-foreground mb-1 block">Host</label>
            <p className="text-sm font-medium">{workspace.hostIdentity.deviceName}</p>
            {workspace.hostIdentity.userEmail && (
              <p className="text-xs text-muted-foreground">{workspace.hostIdentity.userEmail}</p>
            )}
          </div>
        )}
      </div>

      {/* Funnel toggle (host only) */}
      {mode === "host" && onToggleFunnel && (
        <div className="mt-4 glass-light rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium">Public Demo Lobby</p>
              <p className="text-xs text-muted-foreground">Enable Tailscale Funnel for judges</p>
            </div>
            <button
              onClick={onToggleFunnel}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                funnelEnabled ? "bg-success" : "bg-muted"
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  funnelEnabled ? "left-7" : "left-1"
                }`}
              />
            </button>
          </div>
          {funnelEnabled && funnelUrl && (
            <div className="pt-2 border-t border-border">
              <label className="text-xs text-muted-foreground mb-1 block">Demo Lobby URL</label>
              <div className="flex items-center gap-2">
                <span className="flex-1 text-xs font-mono truncate text-primary">{funnelUrl}/demo</span>
                <button
                  onClick={() => copyToClipboard(`${funnelUrl}/demo`, "funnel")}
                  className="p-1.5 rounded-lg hover:bg-secondary transition-colors shrink-0"
                >
                  {copied === "funnel" ? (
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-success"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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
