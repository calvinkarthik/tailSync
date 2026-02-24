"use client"

import { useState } from "react"
import type { Workspace, Identity } from "../mobile-app"

interface ConnectionTabProps {
  workspace: Workspace
  identity: Identity
  hostUrl: string
  wsConnected: boolean
  onDisconnect: () => void
}

export function ConnectionTab({
  workspace,
  identity,
  hostUrl,
  wsConnected,
  onDisconnect,
}: ConnectionTabProps) {
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(workspace.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <div
      className="h-full overflow-y-auto px-4 pt-6 pb-8 flex flex-col gap-4"
      style={{ WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}
    >
      {/* Connection status */}
      <div className="ts-card flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${wsConnected ? "bg-[#22c55e]" : "bg-[#ef4444]"} shrink-0`} />
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            {wsConnected ? "Connected" : "Disconnected"}
          </p>
          <p className="text-xs text-[rgba(255,255,255,0.35)]">
            {wsConnected ? "Real-time sync active" : "Attempting to reconnect..."}
          </p>
        </div>
      </div>

      {/* Workspace code */}
      <div className="ts-card">
        <p className="text-xs text-[rgba(255,255,255,0.4)] font-medium mb-2">Workspace Code</p>
        <button
          type="button"
          onClick={copyCode}
          className="flex items-center gap-3 w-full active:scale-[0.98] transition-transform"
        >
          <span className="text-2xl font-semibold text-white tracking-[0.2em] font-mono tabular-nums">
            {workspace.code}
          </span>
          <span className="text-xs text-[rgba(255,255,255,0.3)] ml-auto">
            {copied ? "Copied" : "Tap to copy"}
          </span>
        </button>
      </div>

      {/* Details */}
      <div className="ts-card flex flex-col gap-4">
        <InfoRow label="Your Device" value={identity.deviceName} />
        <InfoRow label="Host" value={workspace.hostIdentity.deviceName} />
        <InfoRow label="Host Address" value={hostUrl.replace("http://", "")} />
        <InfoRow
          label="Created"
          value={new Date(workspace.createdAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        />
      </div>

      {/* Disconnect */}
      <button
        type="button"
        onClick={onDisconnect}
        className="w-full py-3.5 rounded-xl bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-sm font-semibold active:scale-[0.97] transition-transform duration-100 mt-auto"
      >
        Disconnect
      </button>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[rgba(255,255,255,0.4)]">{label}</span>
      <span className="text-sm text-white font-medium truncate ml-4 text-right">{value}</span>
    </div>
  )
}
