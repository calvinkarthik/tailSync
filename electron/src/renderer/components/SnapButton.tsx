"use client"

import { useState } from "react"

interface SnapButtonProps {
  onCapture: (caption?: string) => void
}

export function SnapButton({ onCapture }: SnapButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [caption, setCaption] = useState("")
  const [isCapturing, setIsCapturing] = useState(false)

  const handleCapture = async () => {
    setIsCapturing(true)
    await onCapture(caption || undefined)
    setIsCapturing(false)
    setShowModal(false)
    setCaption("")
  }

  const handleQuickCapture = async () => {
    setIsCapturing(true)
    await onCapture()
    setIsCapturing(false)
  }

  return (
    <>
      {/* Floating action button */}
      <div className="absolute bottom-4 right-4 flex flex-col items-end gap-2">
        <button
          onClick={() => setShowModal(true)}
          onContextMenu={(e) => {
            e.preventDefault()
            handleQuickCapture()
          }}
          disabled={isCapturing}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-accent shadow-lg shadow-primary/30 flex items-center justify-center text-primary-foreground transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          title="Click for caption, right-click for quick capture"
        >
          {isCapturing ? (
            <div className="w-6 h-6 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </button>
        <span className="text-[10px] text-muted-foreground">SNAP</span>
      </div>

      {/* Caption modal */}
      {showModal && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
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
                  setShowModal(false)
                  setCaption("")
                }}
                className="flex-1 py-2.5 rounded-lg border border-border text-foreground hover:bg-secondary transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleCapture}
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
