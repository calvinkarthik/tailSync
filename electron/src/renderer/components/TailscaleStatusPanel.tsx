"use client"
import type { TailscaleStatus } from "../../shared/types"

interface TailscaleStatusPanelProps {
  status: TailscaleStatus
}

export function TailscaleStatusPanel({ status }: TailscaleStatusPanelProps) {
  const items = [
    {
      label: "Tailscale Installed",
      ok: status.installed,
      action: !status.installed ? () => window.electronAPI.openTailscale() : undefined,
      actionLabel: "Install",
    },
    {
      label: "Tailscale Running",
      ok: status.running,
      action: status.installed && !status.running ? () => window.electronAPI.openTailscale() : undefined,
      actionLabel: "Launch",
    },
    {
      label: "Logged In",
      ok: status.loggedIn,
    },
  ]

  return (
    <div className="glass-light rounded-xl p-3 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${status.loggedIn ? "bg-success" : "bg-warning"} animate-pulse`} />
        <span className="text-sm font-medium">Tailscale Status</span>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              {item.ok ? (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-success"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-warning"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
            </div>
            {item.action && (
              <button
                onClick={item.action}
                className="px-2 py-0.5 text-xs rounded bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
              >
                {item.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>

      {status.loggedIn && status.userEmail && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            Signed in as <span className="text-primary">{status.userEmail}</span>
          </p>
          {status.deviceName && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Device: <span className="text-foreground">{status.deviceName}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
