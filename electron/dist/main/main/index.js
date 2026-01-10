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
const host_service_1 = require("./host-service");
const tailscale_manager_1 = require("./tailscale-manager");
let mainWindow = null;
let hostService = null;
let tailscaleManager = null;
const isDev = process.env.NODE_ENV === "development" || !electron_1.app.isPackaged;
function createWindow() {
    const primaryDisplay = electron_1.screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    mainWindow = new electron_1.BrowserWindow({
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
}
electron_1.app.whenReady().then(createWindow);
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if (electron_1.BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
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
        await tailscaleManager.stopFunnel();
    }
});
electron_1.ipcMain.handle("enable-funnel", async () => {
    if (!tailscaleManager || !hostService)
        throw new Error("Host not running");
    // Start the demo lobby server on a separate port
    const demoPort = 4174;
    const funnelUrl = await tailscaleManager.startFunnel(demoPort);
    hostService.startDemoLobby(demoPort, funnelUrl);
    return funnelUrl;
});
electron_1.ipcMain.handle("disable-funnel", async () => {
    if (!tailscaleManager)
        return;
    await tailscaleManager.stopFunnel();
    if (hostService) {
        hostService.stopDemoLobby();
    }
});
electron_1.ipcMain.handle("capture-screenshot", async () => {
    const sources = await electron_1.desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1920, height: 1080 },
    });
    if (sources.length === 0)
        throw new Error("No screen sources found");
    const primarySource = sources[0];
    const image = primarySource.thumbnail.toPNG();
    return {
        buffer: image.toString("base64"),
        filename: `screenshot-${Date.now()}.png`,
    };
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
