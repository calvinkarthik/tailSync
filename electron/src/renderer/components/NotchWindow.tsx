"use client"

import { useEffect, useState } from "react"
import { NotchToolbar } from "./NotchToolbar"

type PanelId = "feed" | "chat" | "connection" | null

export function NotchWindow() {
  const [activePanel, setActivePanel] = useState<PanelId>(null)
  const [windowVisible, setWindowVisible] = useState(true)

  useEffect(() => {
    const handlePanelState = (panel: PanelId) => {
      setActivePanel(panel)
    }

    window.electronAPI.onPanelState(handlePanelState)
    return () => {
      window.electronAPI.offPanelState(handlePanelState)
    }
  }, [])

  useEffect(() => {
    const handleVisibility = (visible: boolean) => {
      setWindowVisible(visible)
    }

    window.electronAPI.onWindowVisibility(handleVisibility)
    return () => {
      window.electronAPI.offWindowVisibility(handleVisibility)
    }
  }, [])

  const handleTogglePanel = (panel: Exclude<PanelId, null>) => {
    window.electronAPI.requestTogglePanel(panel)
  }

  const handleCapture = async (caption?: string) => {
    window.electronAPI.requestScreenshot(caption)
  }

  return (
    <div className="h-full w-full relative">
      <NotchToolbar
        activePanel={activePanel}
        onTogglePanel={handleTogglePanel}
        onCapture={handleCapture}
        windowVisible={windowVisible}
      />
    </div>
  )
}
