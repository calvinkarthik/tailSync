"use client"

import { useState } from "react"

interface ConnectScreenProps {
  onConnect: (hostAddress: string, code: string, deviceName: string) => Promise<void>
}

export function ConnectScreen({ onConnect }: ConnectScreenProps) {
  const [deviceName, setDeviceName] = useState("")
  const [hostAddress, setHostAddress] = useState("")
  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deviceName.trim() || !hostAddress.trim() || !code.trim()) return

    setError(null)
    setLoading(true)

    try {
      await onConnect(hostAddress.trim(), code.trim(), deviceName.trim())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ts-screen flex flex-col items-center justify-center px-6">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-10">
        <div className="ts-logo-glow">
          <svg width="48" height="48" viewBox="0 0 100 100" fill="none">
            <rect width="100" height="100" rx="22" fill="#5b2ad6" />
            <path
              d="M30 65V40L50 28L70 40V65L50 77L30 65Z"
              stroke="white"
              strokeWidth="4"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="50" cy="52" r="8" fill="white" fillOpacity="0.9" />
          </svg>
        </div>
        <h1 className="text-[22px] font-semibold tracking-tight text-white">
          tailSync
        </h1>
        <p className="text-sm text-[rgba(255,255,255,0.45)] text-center">
          Connect to your workspace
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="deviceName" className="text-xs font-medium text-[rgba(255,255,255,0.5)] pl-1">
            Device Name
          </label>
          <input
            id="deviceName"
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="My iPhone"
            autoComplete="off"
            autoCapitalize="words"
            className="ts-input"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="hostAddress" className="text-xs font-medium text-[rgba(255,255,255,0.5)] pl-1">
            Host Address
          </label>
          <input
            id="hostAddress"
            type="text"
            value={hostAddress}
            onChange={(e) => setHostAddress(e.target.value)}
            placeholder="100.x.x.x"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            inputMode="url"
            className="ts-input"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="code" className="text-xs font-medium text-[rgba(255,255,255,0.5)] pl-1">
            Workspace Code
          </label>
          <input
            id="code"
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            inputMode="numeric"
            maxLength={6}
            autoComplete="off"
            className="ts-input ts-input-code"
          />
        </div>

        {error && (
          <p className="text-sm text-[#ef4444] text-center px-2 py-2 rounded-lg bg-[rgba(239,68,68,0.08)]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !deviceName.trim() || !hostAddress.trim() || code.length < 6}
          className="ts-btn-primary mt-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Connecting...
            </span>
          ) : (
            "Connect"
          )}
        </button>
      </form>
    </div>
  )
}
