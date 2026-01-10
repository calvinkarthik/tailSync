import { app, BrowserWindow, ipcMain, desktopCapturer, screen } from "electron"
import path from "path"
import { HostService } from "./host-service"
import { TailscaleManager } from "./tailscale-manager"

let mainWindow: BrowserWindow | null = null
let hostService: HostService | null = null
let tailscaleManager: TailscaleManager | null = null

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged

function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width: 420,
    height: 640,
    x: screenWidth - 440,
    y: 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  })

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173")
    mainWindow.webContents.openDevTools({ mode: "detach" })
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"))
  }

  tailscaleManager = new TailscaleManager()
}

app.whenReady().then(createWindow)

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit()
  }
})

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// IPC Handlers

ipcMain.handle("get-tailscale-status", async () => {
  if (!tailscaleManager) return null
  return tailscaleManager.getStatus()
})

ipcMain.handle("get-identity", async () => {
  if (!tailscaleManager) return null
  return tailscaleManager.getIdentity()
})

ipcMain.handle("start-host", async () => {
  if (!tailscaleManager) throw new Error("Tailscale manager not initialized")

  const identity = await tailscaleManager.getIdentity()
  const code = Math.floor(100000 + Math.random() * 900000).toString()

  hostService = new HostService(code, identity)
  await hostService.start()

  // Start Tailscale Serve
  const magicDnsUrl = await tailscaleManager.startServe(4173)
  const status = await tailscaleManager.getStatus()
  const tailscaleIpUrl = status.selfIP ? `http://${status.selfIP}:4173` : magicDnsUrl

  return { code, tailnetUrl: tailscaleIpUrl, identity }
})

ipcMain.handle("stop-host", async () => {
  if (hostService) {
    await hostService.stop()
    hostService = null
  }
  if (tailscaleManager) {
    await tailscaleManager.stopServe()
    await tailscaleManager.stopFunnel()
  }
})

ipcMain.handle("enable-funnel", async () => {
  if (!tailscaleManager || !hostService) throw new Error("Host not running")

  // Start the demo lobby server on a separate port
  const demoPort = 4174
  const funnelUrl = await tailscaleManager.startFunnel(demoPort)
  hostService.startDemoLobby(demoPort, funnelUrl)

  return funnelUrl
})

ipcMain.handle("disable-funnel", async () => {
  if (!tailscaleManager) return
  await tailscaleManager.stopFunnel()
  if (hostService) {
    hostService.stopDemoLobby()
  }
})

ipcMain.handle("capture-screenshot", async () => {
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 1920, height: 1080 },
  })

  if (sources.length === 0) throw new Error("No screen sources found")

  const primarySource = sources[0]
  const image = primarySource.thumbnail.toPNG()

  return {
    buffer: image.toString("base64"),
    filename: `screenshot-${Date.now()}.png`,
  }
})

ipcMain.handle("open-tailscale", async () => {
  const { shell } = await import("electron")
  // Try to open Tailscale app
  if (process.platform === "darwin") {
    shell.openExternal("tailscale://")
  } else if (process.platform === "win32") {
    shell.openExternal("tailscale://")
  } else {
    shell.openExternal("https://tailscale.com/download")
  }
})

ipcMain.on("minimize-window", () => {
  mainWindow?.minimize()
})

ipcMain.on("close-window", () => {
  mainWindow?.close()
})
