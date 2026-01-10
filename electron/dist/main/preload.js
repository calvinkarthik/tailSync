"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("electronAPI", {
    getTailscaleStatus: () => electron_1.ipcRenderer.invoke("get-tailscale-status"),
    getIdentity: () => electron_1.ipcRenderer.invoke("get-identity"),
    startHost: () => electron_1.ipcRenderer.invoke("start-host"),
    stopHost: () => electron_1.ipcRenderer.invoke("stop-host"),
    enableFunnel: () => electron_1.ipcRenderer.invoke("enable-funnel"),
    disableFunnel: () => electron_1.ipcRenderer.invoke("disable-funnel"),
    captureScreenshot: () => electron_1.ipcRenderer.invoke("capture-screenshot"),
    openTailscale: () => electron_1.ipcRenderer.invoke("open-tailscale"),
    minimizeWindow: () => electron_1.ipcRenderer.send("minimize-window"),
    closeWindow: () => electron_1.ipcRenderer.send("close-window"),
});
