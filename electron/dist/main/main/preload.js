"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    getTailscaleStatus: () => electron_1.ipcRenderer.invoke("get-tailscale-status"),
    getIdentity: () => electron_1.ipcRenderer.invoke("get-identity"),
    startHost: () => electron_1.ipcRenderer.invoke("start-host"),
    stopHost: () => electron_1.ipcRenderer.invoke("stop-host"),
    captureScreenshot: () => electron_1.ipcRenderer.invoke("capture-screenshot"),
    openTailscale: () => electron_1.ipcRenderer.invoke("open-tailscale"),
    minimizeWindow: () => electron_1.ipcRenderer.send("minimize-window"),
    closeWindow: () => electron_1.ipcRenderer.send("close-window"),
    requestTogglePanel: (panel) => electron_1.ipcRenderer.send("request-toggle-panel", panel),
    requestScreenshot: (caption) => electron_1.ipcRenderer.send("request-screenshot", caption),
    setPanelState: (panel) => electron_1.ipcRenderer.send("panel-state", panel),
    onPanelState: (callback) => {
        electron_1.ipcRenderer.on("panel-state", (_event, panel) => callback(panel));
    },
    offPanelState: (callback) => {
        electron_1.ipcRenderer.removeAllListeners("panel-state");
    },
    onNotchTogglePanel: (callback) => {
        electron_1.ipcRenderer.on("notch-toggle-panel", (_event, panel) => callback(panel));
    },
    offNotchTogglePanel: (callback) => {
        electron_1.ipcRenderer.removeAllListeners("notch-toggle-panel");
    },
    onNotchScreenshot: (callback) => {
        electron_1.ipcRenderer.on("notch-screenshot", (_event, caption) => callback(caption));
    },
    offNotchScreenshot: (callback) => {
        electron_1.ipcRenderer.removeAllListeners("notch-screenshot");
    },
    setNotchVisible: (visible) => electron_1.ipcRenderer.send("set-notch-visible", visible),
});
