"use client"

import type React from "react"
import { useState } from "react"
import type { TailscaleStatus } from "../../shared/types"
import { TailscaleStatusPanel } from "./TailscaleStatusPanel"
import { SetupGuide } from "./DemoModeGuide"

interface WelcomeScreenProps {
  tailscaleStatus: TailscaleStatus
  onStartHost: () => void
  onJoin: (tailnetUrl: string, code: string) => void
  error: string | null
  isConnecting: boolean
}

export function WelcomeScreen({ tailscaleStatus, onStartHost, onJoin, error, isConnecting }: WelcomeScreenProps) {
  const [joinMode, setJoinMode] = useState(false)
  const [tailnetUrl, setTailnetUrl] = useState("")
  const [code, setCode] = useState("")
  const [showSetupGuide, setShowSetupGuide] = useState(false)

  const canConnect = tailscaleStatus.running && tailscaleStatus.loggedIn

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (tailnetUrl && code) {
      let normalizedUrl = tailnetUrl.trim()

      // If user just enters an IP or hostname without protocol, add http://
      if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
        // If it looks like a Tailscale IP (100.x.x.x), use http
        if (/^100\.\d+\.\d+\.\d+/.test(normalizedUrl)) {
          normalizedUrl = `http://${normalizedUrl}`
        } else {
          // Otherwise assume https for .ts.net domains
          normalizedUrl = `https://${normalizedUrl}`
        }
      }

      // Add port 4173 if no port specified and not using https
      if (!normalizedUrl.includes(":4173") && !normalizedUrl.includes(":443") && normalizedUrl.startsWith("http://")) {
        normalizedUrl = `${normalizedUrl}:4173`
      }

      onJoin(normalizedUrl, code.trim())
    }
  }

  if (showSetupGuide) {
    return <SetupGuide onBack={() => setShowSetupGuide(false)} />
  }

  return (
    <div className="h-full flex flex-col p-4 animate-fade-in">
      <TailscaleStatusPanel status={tailscaleStatus} />

      {!joinMode ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <div className="text-center mb-4">
            <h2 className="text-xl font-semibold mb-1">Welcome</h2>
            <p className="text-sm text-muted-foreground">Share your workspace securely over Tailscale</p>
          </div>

          {error && (
            <div className="w-full p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
              {error}
            </div>
          )}

          <button
            onClick={onStartHost}
            disabled={!canConnect || isConnecting}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                Host Workspace
              </>
            )}
          </button>

          <button
            onClick={() => setJoinMode(true)}
            disabled={!canConnect}
            className="w-full py-3 px-4 rounded-xl bg-secondary text-secondary-foreground font-medium transition-all hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Join Workspace
          </button>

          <button
            onClick={() => setShowSetupGuide(true)}
            className="mt-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View Tailscale Setup Guide
          </button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col animate-fade-in">
          <button
            onClick={() => setJoinMode(false)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          <h2 className="text-lg font-semibold mb-4">Join Workspace</h2>

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleJoinSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Host Address</label>
              <input
                type="text"
                value={tailnetUrl}
                onChange={(e) => setTailnetUrl(e.target.value)}
                placeholder="100.x.x.x or device.tailnet.ts.net"
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the host's Tailscale IP (e.g., 100.64.0.1) or MagicDNS name
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Workspace Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-center text-lg tracking-widest"
              />
            </div>

            <button
              type="submit"
              disabled={!tailnetUrl || !code || isConnecting}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect"
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
