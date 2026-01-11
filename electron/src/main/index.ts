import {
  app,
  BrowserWindow,
  ipcMain,
  desktopCapturer,
  screen,
  Tray,
  Menu,
  globalShortcut,
  nativeImage,
} from "electron"
import path from "path"
import { HostService } from "./host-service"
import { TailscaleManager } from "./tailscale-manager"

let mainWindow: BrowserWindow | null = null
let hostService: HostService | null = null
let tailscaleManager: TailscaleManager | null = null
let tray: Tray | null = null
let isQuitting = false

const GLOBAL_HOTKEY = "Control+Shift+Space"
const trayIcon = nativeImage.createFromDataURL(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALklEQVR42u3OIQEAAAgDsFchLbFPDMzE/DLbfoqAgICAgICAgICAgICAgMB34ABtOJiX/H8dCQAAAABJRU5ErkJggg==",
)

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged

function createWindow() {
  if (mainWindow) {
    showWindow()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea
  const windowWidth = 420
  const windowHeight = 640

  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.round(screenX + (screenWidth - windowWidth) / 2),
    y: Math.round(screenY + (screenHeight - windowHeight) / 2),
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

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault()
      hideWindow()
    } else {
      mainWindow = null
    }
  })

  mainWindow.on("minimize", (event) => {
    event.preventDefault()
    hideWindow()
  })

  mainWindow.on("show", () => {
    mainWindow?.setSkipTaskbar(false)
  })
}

function showWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  mainWindow.setSkipTaskbar(false)
  mainWindow.show()
  mainWindow.focus()
}

function hideWindow() {
  if (!mainWindow) return
  mainWindow.hide()
  mainWindow.setSkipTaskbar(true)
}

function toggleWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }

  if (mainWindow.isVisible()) {
    hideWindow()
  } else {
    showWindow()
  }
}

function createTray() {
  tray = new Tray(trayIcon)
  tray.setToolTip("TailOverlay")
  const menu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: showWindow,
    },
    {
      label: "Hide",
      click: hideWindow,
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true
        app.quit()
      },
    },
  ])
  tray.setContextMenu(menu)
  tray.on("click", showWindow)
}

function registerGlobalHotkey() {
  const registered = globalShortcut.register(GLOBAL_HOTKEY, () => {
    toggleWindow()
  })

  if (!registered) {
    console.warn(`Global hotkey ${GLOBAL_HOTKEY} failed to register`)
  }
}

app.whenReady().then(() => {
  createWindow()
  createTray()
  registerGlobalHotkey()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && isQuitting) {
    app.quit()
  }
})

app.on("activate", () => {
  showWindow()
})

app.on("before-quit", () => {
  isQuitting = true
})

app.on("will-quit", () => {
  globalShortcut.unregisterAll()
  tray?.destroy()
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
