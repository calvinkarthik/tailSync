import { contextBridge, ipcRenderer } from "electron"

contextBridge.exposeInMainWorld("electronAPI", {
  getTailscaleStatus: () => ipcRenderer.invoke("get-tailscale-status"),
  getIdentity: () => ipcRenderer.invoke("get-identity"),
  startHost: () => ipcRenderer.invoke("start-host"),
  stopHost: () => ipcRenderer.invoke("stop-host"),
  captureScreenshot: () => ipcRenderer.invoke("capture-screenshot"),
  openTailscale: () => ipcRenderer.invoke("open-tailscale"),
  minimizeWindow: () => ipcRenderer.send("minimize-window"),
  closeWindow: () => ipcRenderer.send("close-window"),
  requestTogglePanel: (panel: "feed" | "chat" | "connection") => ipcRenderer.send("request-toggle-panel", panel),
  requestScreenshot: (caption?: string) => ipcRenderer.send("request-screenshot", caption),
  setPanelState: (panel: "feed" | "chat" | "connection" | null) => ipcRenderer.send("panel-state", panel),
  onPanelState: (callback: (panel: "feed" | "chat" | "connection" | null) => void) => {
    ipcRenderer.on("panel-state", (_event, panel) => callback(panel))
  },
  offPanelState: (callback: (panel: "feed" | "chat" | "connection" | null) => void) => {
    ipcRenderer.removeAllListeners("panel-state")
  },
  onNotchTogglePanel: (callback: (panel: "feed" | "chat" | "connection") => void) => {
    ipcRenderer.on("notch-toggle-panel", (_event, panel) => callback(panel))
  },
  offNotchTogglePanel: (callback: (panel: "feed" | "chat" | "connection") => void) => {
    ipcRenderer.removeAllListeners("notch-toggle-panel")
  },
  onNotchScreenshot: (callback: (caption?: string) => void) => {
    ipcRenderer.on("notch-screenshot", (_event, caption) => callback(caption))
  },
  offNotchScreenshot: (callback: (caption?: string) => void) => {
    ipcRenderer.removeAllListeners("notch-screenshot")
  },
  onWindowVisibility: (callback: (visible: boolean) => void) => {
    ipcRenderer.on("window-visibility", (_event, visible) => callback(visible))
  },
  offWindowVisibility: (callback: (visible: boolean) => void) => {
    ipcRenderer.removeAllListeners("window-visibility")
  },
  setNotchVisible: (visible: boolean) => ipcRenderer.send("set-notch-visible", visible),
  moveWindowRight: () => ipcRenderer.send("move-window-right"),
  moveWindowCenter: () => ipcRenderer.send("move-window-center"),
  setWindowMode: (mode: "welcome" | "host" | "join") => ipcRenderer.send("set-window-mode", mode),
})
