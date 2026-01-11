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
})
