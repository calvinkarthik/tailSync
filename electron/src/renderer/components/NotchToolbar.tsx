"use client"

import { useState, useRef, useEffect } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion"

type PanelId = "feed" | "chat" | "connection" | null

interface NotchToolbarProps {
  activePanel: PanelId
  onTogglePanel: (panel: Exclude<PanelId, null>) => void
  onCapture: (caption?: string) => Promise<void>
  windowVisible: boolean
}

const BASE_SIZE = 36
const MAX_SIZE = 48
const SPRING_CONFIG = { mass: 0.1, stiffness: 150, damping: 12 }

interface DockIconProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  onContextMenu?: (e: React.MouseEvent) => void
  isActive?: boolean
  mouseX: any
  disabled?: boolean
}

function DockIcon({ icon, label, onClick, onContextMenu, isActive, mouseX, disabled }: DockIconProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const distance = useMotionValue(Infinity)
  const size = useSpring(BASE_SIZE, SPRING_CONFIG)

  useEffect(() => {
    const handleMouseMove = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const iconCenterX = rect.left + rect.width / 2
      const distanceFromCursor = Math.abs(mouseX.get() - iconCenterX)
      distance.set(distanceFromCursor)
    }

    const unsubscribe = mouseX.on("change", handleMouseMove)
    return unsubscribe
  }, [mouseX, distance])

  useEffect(() => {
    const unsubscribe = distance.on("change", (latest) => {
      const maxDistance = 150
      const newSize = latest < maxDistance
        ? BASE_SIZE + (MAX_SIZE - BASE_SIZE) * (1 - latest / maxDistance)
        : BASE_SIZE
      size.set(newSize)
    })
    return unsubscribe
  }, [distance, size])

  return (
    <div className="dock-icon-slot">
      <motion.button
        ref={ref}
        onClick={onClick}
        onContextMenu={onContextMenu}
        disabled={disabled}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="dock-icon"
        style={{
          width: size,
          height: size,
        }}
        aria-pressed={isActive}
      >
        {icon}
      </motion.button>

      {isActive && (
        <motion.div
          layoutId="active-indicator"
          className="dock-active-bar"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}

      <motion.div
        className="dock-tooltip"
        initial={{ opacity: 0, y: 0 }}
        animate={{
          opacity: isHovered ? 1 : 0,
          y: isHovered ? -10 : 0,
        }}
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.div>
    </div>
  )
}

export function NotchToolbar({ activePanel, onTogglePanel, onCapture, windowVisible }: NotchToolbarProps) {
  const [showCaption, setShowCaption] = useState(false)
  const [caption, setCaption] = useState("")
  const [isCapturing, setIsCapturing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const mouseX = useMotionValue(0)
  const dockRef = useRef<HTMLDivElement>(null)

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

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dockRef.current) return
    const rect = dockRef.current.getBoundingClientRect()
    mouseX.set(e.clientX)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    mouseX.set(Infinity)
  }

  const dockIcons = [
    {
      id: "feed" as const,
      label: "Feed",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="6" r="1.5" />
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="5" cy="18" r="1.5" />
          <line x1="9" y1="6" x2="21" y2="6" />
          <line x1="9" y1="12" x2="21" y2="12" />
          <line x1="9" y1="18" x2="21" y2="18" />
        </svg>
      ),
    },
    {
      id: "chat" as const,
      label: "Chat",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
    },
    {
      id: "connection" as const,
      label: "Info",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    },
    {
      id: "screenshot" as const,
      label: "Snap",
      icon: isCapturing ? (
        <div className="w-5 h-5 border-2 border-current/40 border-t-current rounded-full animate-spin" />
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      ),
    },
  ]

  return (
    <>
      <div className="absolute left-1/2 -translate-x-1/2 z-30" style={{ top: "4px", maxWidth: "98vw" }}>
        <motion.div
          className={`notch-toolbar-shell ${windowVisible ? "notch-toolbar-visible" : "notch-toolbar-hidden"}`}
          animate={{
            height: isHovered ? 72 : 60,
          }}
          transition={SPRING_CONFIG}
        >
          <div
            ref={dockRef}
            className="dock-container"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
          >
            {dockIcons.map((item, index) => (
              <DockIcon
                key={item.id}
                icon={item.icon}
                label={item.label}
                onClick={() => {
                  if (item.id === "screenshot") {
                    handleQuickCapture()
                  } else {
                    onTogglePanel(item.id as "feed" | "chat" | "connection")
                  }
                }}
                onContextMenu={(e: React.MouseEvent) => {
                  if (item.id === "screenshot") {
                    e.preventDefault()
                    setShowCaption(true)
                  }
                }}
                isActive={item.id === activePanel}
                mouseX={mouseX}
                disabled={item.id === "screenshot" && isCapturing}
              />
            ))}
          </div>
        </motion.div>
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
