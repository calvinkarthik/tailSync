"use client"

import { useState } from "react"

type PanelId = "feed" | "chat" | "connection" | null

interface NotchToolbarProps {
  activePanel: PanelId
  onTogglePanel: (panel: Exclude<PanelId, null>) => void
  onCapture: (caption?: string) => Promise<void>
  windowVisible: boolean
}

export function NotchToolbar({ activePanel, onTogglePanel, onCapture, windowVisible }: NotchToolbarProps) {
  const [showCaption, setShowCaption] = useState(false)
  const [caption, setCaption] = useState("")
  const [isCapturing, setIsCapturing] = useState(false)

  const handleQuickCapture = async () => {
    if (isCapturing) return
    setIsCapturing(true)
    try {
      await onCapture()
    } finally {
      setIsCapturing(false)
    }
  }

  const handleCaptionCapture = async () => {
    if (isCapturing) return
    setIsCapturing(true)
    try {
      await onCapture(caption || undefined)
      setShowCaption(false)
      setCaption("")
    } finally {
      setIsCapturing(false)
    }
  }

  const panelButtonClass = (panel: Exclude<PanelId, null>) =>
    `w-11 h-11 rounded-full flex items-center justify-center transition-colors notch-button ${
      activePanel === panel ? "notch-button-active" : ""
    }`

  return (
    <>
      <div className="absolute left-1/2 -translate-x-1/2 z-30" style={{ top: "17px" }}>
        <div
          className={`notch-toolbar-shell ${windowVisible ? "notch-toolbar-visible" : "notch-toolbar-hidden"}`}
        >
          <div className="glass-light notch-toolbar rounded-full px-3.5 py-2.5 shadow-lg flex items-center gap-2.5">
          <button
            onClick={() => onTogglePanel("feed")}
            className={panelButtonClass("feed")}
            aria-pressed={activePanel === "feed"}
            title="Feed"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="5" cy="6" r="1.5" />
              <circle cx="5" cy="12" r="1.5" />
              <circle cx="5" cy="18" r="1.5" />
              <line x1="9" y1="6" x2="21" y2="6" />
              <line x1="9" y1="12" x2="21" y2="12" />
              <line x1="9" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <button
            onClick={() => onTogglePanel("chat")}
            className={panelButtonClass("chat")}
            aria-pressed={activePanel === "chat"}
            title="Chat"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
          </button>
          <button
            onClick={() => onTogglePanel("connection")}
            className={panelButtonClass("connection")}
            aria-pressed={activePanel === "connection"}
            title="Connection"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 007.07 0l2.83-2.83a5 5 0 10-7.07-7.07L10 5" />
              <path d="M14 11a5 5 0 01-7.07 0L4.1 8.17a5 5 0 017.07-7.07L14 3" />
            </svg>
          </button>
          <button
            onClick={handleQuickCapture}
            onContextMenu={(e) => {
              e.preventDefault()
              setShowCaption(true)
            }}
            disabled={isCapturing}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors notch-button ${
              isCapturing ? "opacity-60" : ""
            }`}
            title="Screenshot (click to snap, right-click for caption)"
          >
            {isCapturing ? (
              <div className="w-4 h-4 border-2 border-muted-foreground/40 border-t-muted-foreground rounded-full animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </button>

          </div>
        </div>
      </div>

      {showCaption && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in z-40">
          <div className="glass-light rounded-2xl p-4 w-full max-w-sm animate-slide-in">
            <h3 className="font-semibold mb-3">Add Caption (Optional)</h3>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's this screenshot about?"
              className="w-full px-3 py-2.5 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCaption(false)
                  setCaption("")
                }}
                className="flex-1 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCaptionCapture}
                disabled={isCapturing}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-primary to-accent text-primary-foreground font-medium transition-all hover:opacity-90 disabled:opacity-50 text-sm flex items-center justify-center gap-2"
              >
                {isCapturing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Capturing...
                  </>
                ) : (
                  "Capture"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
