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
  clipboard,
  type NativeImage,
  type Event,
} from "electron"
import path from "path"
import { spawn } from "child_process"
import { HostService } from "./host-service"
import { TailscaleManager } from "./tailscale-manager"

let mainWindow: BrowserWindow | null = null
let notchWindow: BrowserWindow | null = null
let hostService: HostService | null = null
let tailscaleManager: TailscaleManager | null = null
let tray: Tray | null = null
let isQuitting = false
let notchShouldBeVisible = false
let hideAnimationTimer: NodeJS.Timeout | null = null
let windowMoveTimer: NodeJS.Timeout | null = null
let currentMode: "welcome" | "host" | "join" = "welcome"
let fixedWindowSize: { width: number; height: number } | null = null

const GLOBAL_HOTKEY = "Control+Shift+Space"
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged
const WINDOW_HIDE_ANIMATION_MS = 300
const WINDOW_SHOW_ANIMATION_MS = 420
const MAIN_WINDOW_WIDTH = 420
const MAIN_WINDOW_HEIGHT = 640
const trayFallbackIcon = nativeImage.createFromDataURL(
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALklEQVR42u3OIQEAAAgDsFchLbFPDMzE/DLbfoqAgICAgICAgICAgICAgMB34ABtOJiX/H8dCQAAAABJRU5ErkJggg==",
)

const getAppIconPath = () => {
  if (process.platform === "win32") {
    return isDev
      ? path.join(app.getAppPath(), "build", "icon.ico")
      : path.join(process.resourcesPath, "build", "icon.ico")
  }
  return isDev
    ? path.join(app.getAppPath(), "build", "icon-512.png")
    : path.join(process.resourcesPath, "build", "icon-512.png")
}

const getAppIcon = () => {
  const icon = nativeImage.createFromPath(getAppIconPath())
  return icon.isEmpty() ? trayFallbackIcon : icon
}

const getTrayIcon = () => {
  const iconPath = isDev
    ? path.join(app.getAppPath(), "tailSync-Regular.png")
    : path.join(process.resourcesPath, "tailSync-Regular.png")
  const image = nativeImage.createFromPath(iconPath)
  return image.isEmpty() ? trayFallbackIcon : image
}

function createWindow() {
  if (mainWindow) {
    showWindow()
    return
  }

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea

  mainWindow = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    x: Math.round(screenX + (screenWidth - MAIN_WINDOW_WIDTH) / 2),
    y: Math.round(screenY + (screenHeight - MAIN_WINDOW_HEIGHT) / 2),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: false,
    icon: getAppIcon(),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  })
  const { width, height } = mainWindow.getBounds()
  fixedWindowSize = { width, height }
  mainWindow.setMinimumSize(width, height)
  mainWindow.setMaximumSize(width, height)

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

  mainWindow.on("before-closed" as any, (event: Event) => {
    event.preventDefault()
    hideWindow()
  })

  mainWindow.on("show", () => {
    mainWindow?.setSkipTaskbar(false)
  })
}

function createNotchWindow() {
  if (notchWindow) return

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, x: screenX, y: screenY } = primaryDisplay.workArea
  const windowWidth = 420
  const windowHeight = 80

  notchWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: Math.round(screenX + (screenWidth - windowWidth) / 2),
    y: Math.round(screenY + 8),
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    focusable: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  })

  if (isDev) {
    notchWindow.loadURL("http://localhost:5173/?window=notch")
  } else {
    notchWindow.loadFile(path.join(__dirname, "../renderer/index.html"), { query: { window: "notch" } })
  }

  notchWindow.on("closed", () => {
    notchWindow = null
  })
}

function positionMainWindowRight() {
  if (!mainWindow) return
  if (windowMoveTimer) {
    clearInterval(windowMoveTimer)
    windowMoveTimer = null
  }
  if (!fixedWindowSize) return
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea
  const windowBounds = mainWindow.getBounds()
  const margin = 20

  mainWindow.setBounds(
    {
      width: fixedWindowSize.width,
      height: fixedWindowSize.height,
      x: Math.round(screenX + screenWidth - fixedWindowSize.width - margin),
      y: Math.round(screenY + (screenHeight - fixedWindowSize.height) / 2),
    },
    false,
  )
}

function positionMainWindowCenter() {
  if (!mainWindow) return
  if (windowMoveTimer) {
    clearInterval(windowMoveTimer)
    windowMoveTimer = null
  }
  if (!fixedWindowSize) return
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea
  const windowBounds = mainWindow.getBounds()

  mainWindow.setBounds(
    {
      width: fixedWindowSize.width,
      height: fixedWindowSize.height,
      x: Math.round(screenX + (screenWidth - fixedWindowSize.width) / 2),
      y: Math.round(screenY + (screenHeight - fixedWindowSize.height) / 2),
    },
    false,
  )
}

function animateWindowFromBottom() {
  if (!mainWindow) return
  if (windowMoveTimer) {
    clearInterval(windowMoveTimer)
    windowMoveTimer = null
  }
  if (!fixedWindowSize) return

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea
  const targetX = Math.round(screenX + (screenWidth - fixedWindowSize.width) / 2)
  const targetY = Math.round(screenY + (screenHeight - fixedWindowSize.height) / 2)
  const startY = Math.round(screenY + screenHeight + 20)

  mainWindow.setBounds(
    {
      width: fixedWindowSize.width,
      height: fixedWindowSize.height,
      x: targetX,
      y: startY,
    },
    false,
  )

  const startTime = Date.now()
  windowMoveTimer = setInterval(() => {
    const elapsed = Date.now() - startTime
    const t = Math.min(1, elapsed / WINDOW_SHOW_ANIMATION_MS)
    const eased = 1 - Math.pow(1 - t, 3)
    const currentY = Math.round(startY + (targetY - startY) * eased)
    mainWindow?.setPosition(targetX, currentY)
    if (t >= 1) {
      clearInterval(windowMoveTimer as NodeJS.Timeout)
      windowMoveTimer = null
    }
  }, 16)
}

function animateWindowToBottom(onDone: () => void) {
  if (!mainWindow) return
  if (windowMoveTimer) {
    clearInterval(windowMoveTimer)
    windowMoveTimer = null
  }
  if (!fixedWindowSize) return

  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea
  const windowBounds = mainWindow.getBounds()
  const startX = windowBounds.x
  const startY = windowBounds.y
  const targetX = Math.round(screenX + (screenWidth - fixedWindowSize.width) / 2)
  const targetY = Math.round(screenY + screenHeight + 20)

  if (startX !== targetX) {
    mainWindow.setBounds(
      {
        width: fixedWindowSize.width,
        height: fixedWindowSize.height,
        x: targetX,
        y: startY,
      },
      false,
    )
  }

  const startTime = Date.now()
  windowMoveTimer = setInterval(() => {
    const elapsed = Date.now() - startTime
    const t = Math.min(1, elapsed / WINDOW_HIDE_ANIMATION_MS)
    const eased = t * t * t
    const currentY = Math.round(startY + (targetY - startY) * eased)
    mainWindow?.setBounds(
      {
        width: fixedWindowSize.width,
        height: fixedWindowSize.height,
        x: targetX,
        y: currentY,
      },
      false,
    )
    if (t >= 1) {
      clearInterval(windowMoveTimer as NodeJS.Timeout)
      windowMoveTimer = null
      onDone()
    }
  }, 16)
}

function showWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }
  if (hideAnimationTimer) {
    clearTimeout(hideAnimationTimer)
    hideAnimationTimer = null
  }
  mainWindow.setSkipTaskbar(false)
  if (currentMode === "welcome") {
    animateWindowFromBottom()
  }
  mainWindow.show()
  mainWindow.focus()
  mainWindow.webContents.send("window-visibility", true)

  // Keep notch visibility in sync with the main window
  if (notchWindow) {
    if (notchShouldBeVisible) {
      notchWindow.show()
      notchWindow.webContents.send("window-visibility", true)
    } else {
      notchWindow.hide()
    }
  }
}

function hideWindow(animate = true) {
  if (!mainWindow) return
  if (!animate) {
    mainWindow.hide()
    mainWindow.setSkipTaskbar(true)
    // Hide the notch whenever the main window hides (e.g., screenshot or hotkey)
    notchWindow?.hide()
    return
  }

  mainWindow.webContents.send("window-visibility", false)
  notchWindow?.webContents.send("window-visibility", false)

  if (hideAnimationTimer) {
    clearTimeout(hideAnimationTimer)
  }

  if (currentMode === "welcome") {
    animateWindowToBottom(() => {
      mainWindow?.hide()
      mainWindow?.setSkipTaskbar(true)
      notchWindow?.hide()
    })
    return
  }

  hideAnimationTimer = setTimeout(() => {
    mainWindow?.hide()
    mainWindow?.setSkipTaskbar(true)
    // Hide the notch whenever the main window hides (e.g., screenshot or hotkey)
    notchWindow?.hide()
    hideAnimationTimer = null
  }, WINDOW_HIDE_ANIMATION_MS)
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
  tray = new Tray(getTrayIcon())
  tray.setToolTip("TailOverlay")
  const menu = Menu.buildFromTemplate([
    {
      label: "Open",
      click: showWindow,
    },
    {
      label: "Hide",
      click: () => hideWindow(),
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
  if (process.platform === "win32") {
    app.setAppUserModelId("com.tailoverlay.app")
  }
  createWindow()
  createNotchWindow()
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
  notchWindow?.destroy()
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
  if (!mainWindow) {
    throw new Error("Window not ready for screenshot")
  }

  const wasVisible = mainWindow.isVisible()
  if (wasVisible) {
    hideWindow(false)
  }

  try {
    const image = await captureWithSnippingTool()
    if (wasVisible) {
      // Let the OS overlay finish before showing our window again
      setTimeout(showWindow, 150)
    }
    return {
      buffer: image.toPNG().toString("base64"),
      filename: `screenshot-${Date.now()}.png`,
    }
  } catch (err) {
    if (wasVisible) {
      setTimeout(showWindow, 150)
    }
    throw err
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

async function captureWithSnippingTool(): Promise<NativeImage> {
  // Windows: trigger Snipping Tool overlay so the user can select a region; image ends up on the clipboard.
  if (process.platform === "win32") {
    const before = clipboard.readImage()
    const beforeData = before.isEmpty() ? null : before.toDataURL()

    spawn("explorer.exe", ["ms-screenclip:"], {
      windowsHide: true,
      stdio: "ignore",
    })

    return new Promise((resolve, reject) => {
      const start = Date.now()
      const timeoutMs = 45000
      const poll = setInterval(() => {
        const img = clipboard.readImage()
        if (!img.isEmpty()) {
          const data = img.toDataURL()
          if (!beforeData || data !== beforeData) {
            clearInterval(poll)
            resolve(img)
          }
        }
        if (Date.now() - start > timeoutMs) {
          clearInterval(poll)
          reject(new Error("Screenshot canceled or timed out"))
        }
      }, 300)
    })
  }

  // Non-Windows fallback: capture primary display.
  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: 1920, height: 1080 },
  })
  if (sources.length === 0) throw new Error("No screen sources found")
  return sources[0].thumbnail
}

ipcMain.on("set-notch-visible", (_event, visible: boolean) => {
  notchShouldBeVisible = visible
  if (!notchWindow) {
    createNotchWindow()
  }
  if (!notchWindow) return

  // Only show the notch if the main window is visible; otherwise keep it hidden
  if (visible && mainWindow?.isVisible()) {
    notchWindow.show()
  } else {
    notchWindow.hide()
  }
})

ipcMain.on("request-toggle-panel", (_event, panel: "feed" | "chat" | "connection") => {
  mainWindow?.webContents.send("notch-toggle-panel", panel)
})

ipcMain.on("request-screenshot", (_event, caption?: string) => {
  mainWindow?.webContents.send("notch-screenshot", caption)
})

ipcMain.on("panel-state", (_event, panel: "feed" | "chat" | "connection" | null) => {
  notchWindow?.webContents.send("panel-state", panel)
})

ipcMain.on("move-window-right", () => {
  positionMainWindowRight()
})

ipcMain.on("move-window-center", () => {
  positionMainWindowCenter()
})

ipcMain.on("set-window-mode", (_event, mode: "welcome" | "host" | "join") => {
  currentMode = mode
})
