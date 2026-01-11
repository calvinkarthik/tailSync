"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const host_service_1 = require("./host-service");
const tailscale_manager_1 = require("./tailscale-manager");
let mainWindow = null;
let notchWindow = null;
let hostService = null;
let tailscaleManager = null;
let tray = null;
let isQuitting = false;
let notchShouldBeVisible = false;
const GLOBAL_HOTKEY = "Control+Shift+Space";
const isDev = process.env.NODE_ENV === "development" || !electron_1.app.isPackaged;
const trayFallbackIcon = electron_1.nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALklEQVR42u3OIQEAAAgDsFchLbFPDMzE/DLbfoqAgICAgICAgICAgICAgMB34ABtOJiX/H8dCQAAAABJRU5ErkJggg==");
const getAppIconPath = () => {
    if (process.platform === "win32") {
        return isDev
            ? path_1.default.join(electron_1.app.getAppPath(), "build", "icon.ico")
            : path_1.default.join(process.resourcesPath, "build", "icon.ico");
    }
    return isDev
        ? path_1.default.join(electron_1.app.getAppPath(), "build", "icon-512.png")
        : path_1.default.join(process.resourcesPath, "build", "icon-512.png");
};
const getAppIcon = () => {
    const icon = electron_1.nativeImage.createFromPath(getAppIconPath());
    return icon.isEmpty() ? trayFallbackIcon : icon;
};
const getTrayIcon = () => {
    const iconPath = isDev
        ? path_1.default.join(electron_1.app.getAppPath(), "tailSync-Regular.png")
        : path_1.default.join(process.resourcesPath, "tailSync-Regular.png");
    const image = electron_1.nativeImage.createFromPath(iconPath);
    return image.isEmpty() ? trayFallbackIcon : image;
};
function createWindow() {
    if (mainWindow) {
        showWindow();
        return;
    }
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea;
    const windowWidth = 420;
    const windowHeight = 640;
    mainWindow = new electron_1.BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        x: Math.round(screenX + (screenWidth - windowWidth) / 2),
        y: Math.round(screenY + (screenHeight - windowHeight) / 2),
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        resizable: false,
        skipTaskbar: false,
        icon: getAppIcon(),
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path_1.default.join(__dirname, "preload.js"),
        },
    });
    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
        mainWindow.webContents.openDevTools({ mode: "detach" });
    }
    else {
        mainWindow.loadFile(path_1.default.join(__dirname, "../renderer/index.html"));
    }
    tailscaleManager = new tailscale_manager_1.TailscaleManager();
    mainWindow.on("close", (event) => {
        if (!isQuitting) {
            event.preventDefault();
            hideWindow();
        }
        else {
            mainWindow = null;
        }
    });
    mainWindow.on("minimize", (event) => {
        event.preventDefault();
        hideWindow();
    });
    mainWindow.on("show", () => {
        mainWindow?.setSkipTaskbar(false);
    });
}
function createNotchWindow() {
    if (notchWindow)
        return;
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width: screenWidth, x: screenX, y: screenY } = primaryDisplay.workArea;
    const windowWidth = 420;
    const windowHeight = 80;
    notchWindow = new electron_1.BrowserWindow({
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
            preload: path_1.default.join(__dirname, "preload.js"),
        },
    });
    if (isDev) {
        notchWindow.loadURL("http://localhost:5173/?window=notch");
    }
    else {
        notchWindow.loadFile(path_1.default.join(__dirname, "../renderer/index.html"), { query: { window: "notch" } });
    }
    notchWindow.on("closed", () => {
        notchWindow = null;
    });
}
function positionMainWindowRight() {
    if (!mainWindow)
        return;
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea;
    const windowBounds = mainWindow.getBounds();
    const margin = 20;
    mainWindow.setPosition(Math.round(screenX + screenWidth - windowBounds.width - margin), Math.round(screenY + (screenHeight - windowBounds.height) / 2));
}
function positionMainWindowCenter() {
    if (!mainWindow)
        return;
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight, x: screenX, y: screenY } = primaryDisplay.workArea;
    const windowBounds = mainWindow.getBounds();
    mainWindow.setPosition(Math.round(screenX + (screenWidth - windowBounds.width) / 2), Math.round(screenY + (screenHeight - windowBounds.height) / 2));
}
function showWindow() {
    if (!mainWindow) {
        createWindow();
        return;
    }
    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }
    mainWindow.setSkipTaskbar(false);
    mainWindow.show();
    mainWindow.focus();
    // Keep notch visibility in sync with the main window
    if (notchWindow) {
        if (notchShouldBeVisible) {
            notchWindow.show();
        }
        else {
            notchWindow.hide();
        }
    }
}
function hideWindow() {
    if (!mainWindow)
        return;
    mainWindow.hide();
    mainWindow.setSkipTaskbar(true);
    // Hide the notch whenever the main window hides (e.g., screenshot or hotkey)
    notchWindow?.hide();
}
function toggleWindow() {
    if (!mainWindow) {
        createWindow();
        return;
    }
    if (mainWindow.isVisible()) {
        hideWindow();
    }
    else {
        showWindow();
    }
}
function createTray() {
    tray = new electron_1.Tray(getTrayIcon());
    tray.setToolTip("TailOverlay");
    const menu = electron_1.Menu.buildFromTemplate([
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
                isQuitting = true;
                electron_1.app.quit();
            },
        },
    ]);
    tray.setContextMenu(menu);
    tray.on("click", showWindow);
}
function registerGlobalHotkey() {
    const registered = electron_1.globalShortcut.register(GLOBAL_HOTKEY, () => {
        toggleWindow();
    });
    if (!registered) {
        console.warn(`Global hotkey ${GLOBAL_HOTKEY} failed to register`);
    }
}
electron_1.app.whenReady().then(() => {
    if (process.platform === "win32") {
        electron_1.app.setAppUserModelId("com.tailoverlay.app");
    }
    createWindow();
    createNotchWindow();
    createTray();
    registerGlobalHotkey();
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin" && isQuitting) {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    showWindow();
});
electron_1.app.on("before-quit", () => {
    isQuitting = true;
});
electron_1.app.on("will-quit", () => {
    electron_1.globalShortcut.unregisterAll();
    tray?.destroy();
    notchWindow?.destroy();
});
// IPC Handlers
electron_1.ipcMain.handle("get-tailscale-status", async () => {
    if (!tailscaleManager)
        return null;
    return tailscaleManager.getStatus();
});
electron_1.ipcMain.handle("get-identity", async () => {
    if (!tailscaleManager)
        return null;
    return tailscaleManager.getIdentity();
});
electron_1.ipcMain.handle("start-host", async () => {
    if (!tailscaleManager)
        throw new Error("Tailscale manager not initialized");
    const identity = await tailscaleManager.getIdentity();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    hostService = new host_service_1.HostService(code, identity);
    await hostService.start();
    // Start Tailscale Serve
    const magicDnsUrl = await tailscaleManager.startServe(4173);
    const status = await tailscaleManager.getStatus();
    const tailscaleIpUrl = status.selfIP ? `http://${status.selfIP}:4173` : magicDnsUrl;
    return { code, tailnetUrl: tailscaleIpUrl, identity };
});
electron_1.ipcMain.handle("stop-host", async () => {
    if (hostService) {
        await hostService.stop();
        hostService = null;
    }
    if (tailscaleManager) {
        await tailscaleManager.stopServe();
    }
});
electron_1.ipcMain.handle("capture-screenshot", async () => {
    if (!mainWindow) {
        throw new Error("Window not ready for screenshot");
    }
    const wasVisible = mainWindow.isVisible();
    if (wasVisible) {
        hideWindow();
    }
    try {
        const image = await captureWithSnippingTool();
        if (wasVisible) {
            // Let the OS overlay finish before showing our window again
            setTimeout(showWindow, 150);
        }
        return {
            buffer: image.toPNG().toString("base64"),
            filename: `screenshot-${Date.now()}.png`,
        };
    }
    catch (err) {
        if (wasVisible) {
            setTimeout(showWindow, 150);
        }
        throw err;
    }
});
electron_1.ipcMain.handle("open-tailscale", async () => {
    const { shell } = await Promise.resolve().then(() => __importStar(require("electron")));
    // Try to open Tailscale app
    if (process.platform === "darwin") {
        shell.openExternal("tailscale://");
    }
    else if (process.platform === "win32") {
        shell.openExternal("tailscale://");
    }
    else {
        shell.openExternal("https://tailscale.com/download");
    }
});
electron_1.ipcMain.on("minimize-window", () => {
    mainWindow?.minimize();
});
electron_1.ipcMain.on("close-window", () => {
    mainWindow?.close();
});
async function captureWithSnippingTool() {
    // Windows: trigger Snipping Tool overlay so the user can select a region; image ends up on the clipboard.
    if (process.platform === "win32") {
        const before = electron_1.clipboard.readImage();
        const beforeData = before.isEmpty() ? null : before.toDataURL();
        (0, child_process_1.spawn)("explorer.exe", ["ms-screenclip:"], {
            windowsHide: true,
            stdio: "ignore",
        });
        return new Promise((resolve, reject) => {
            const start = Date.now();
            const timeoutMs = 45000;
            const poll = setInterval(() => {
                const img = electron_1.clipboard.readImage();
                if (!img.isEmpty()) {
                    const data = img.toDataURL();
                    if (!beforeData || data !== beforeData) {
                        clearInterval(poll);
                        resolve(img);
                    }
                }
                if (Date.now() - start > timeoutMs) {
                    clearInterval(poll);
                    reject(new Error("Screenshot canceled or timed out"));
                }
            }, 300);
        });
    }
    // Non-Windows fallback: capture primary display.
    const sources = await electron_1.desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1920, height: 1080 },
    });
    if (sources.length === 0)
        throw new Error("No screen sources found");
    return sources[0].thumbnail;
}
electron_1.ipcMain.on("set-notch-visible", (_event, visible) => {
    notchShouldBeVisible = visible;
    if (!notchWindow) {
        createNotchWindow();
    }
    if (!notchWindow)
        return;
    // Only show the notch if the main window is visible; otherwise keep it hidden
    if (visible && mainWindow?.isVisible()) {
        notchWindow.show();
    }
    else {
        notchWindow.hide();
    }
});
electron_1.ipcMain.on("request-toggle-panel", (_event, panel) => {
    mainWindow?.webContents.send("notch-toggle-panel", panel);
});
electron_1.ipcMain.on("request-screenshot", (_event, caption) => {
    mainWindow?.webContents.send("notch-screenshot", caption);
});
electron_1.ipcMain.on("panel-state", (_event, panel) => {
    notchWindow?.webContents.send("panel-state", panel);
});
electron_1.ipcMain.on("move-window-right", () => {
    positionMainWindowRight();
});
electron_1.ipcMain.on("move-window-center", () => {
    positionMainWindowCenter();
});
