"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TailscaleManager = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class TailscaleManager {
    serveProcess = null;
    funnelProcess = null;
    cachedStatus = null;
    async getStatus() {
        try {
            const { stdout } = await execAsync("tailscale status --json");
            const status = JSON.parse(stdout);
            const tailscaleIPs = status.Self?.TailscaleIPs || [];
            // Prefer IPv4 (100.x) address for peer connections
            const ipv4 = tailscaleIPs.find((ip) => ip.includes("."));
            const result = {
                installed: true,
                running: true,
                loggedIn: status.BackendState === "Running",
                deviceName: status.Self?.HostName || null,
                tailnetName: status.MagicDNSSuffix || null,
                selfIP: ipv4 || tailscaleIPs[0] || null,
                userEmail: status.Self?.UserID ? await this.getUserEmail(status.Self.UserID) : null,
            };
            this.cachedStatus = result;
            return result;
        }
        catch (error) {
            // Check if Tailscale is installed but not running
            try {
                await execAsync("which tailscale || where tailscale");
                return {
                    installed: true,
                    running: false,
                    loggedIn: false,
                    deviceName: null,
                    tailnetName: null,
                    selfIP: null,
                    userEmail: null,
                };
            }
            catch {
                return {
                    installed: false,
                    running: false,
                    loggedIn: false,
                    deviceName: null,
                    tailnetName: null,
                    selfIP: null,
                    userEmail: null,
                };
            }
        }
    }
    async getUserEmail(userId) {
        try {
            const { stdout } = await execAsync("tailscale status --json");
            const status = JSON.parse(stdout);
            // The user info is in the User map
            const user = status.User?.[userId];
            return user?.LoginName || null;
        }
        catch {
            return null;
        }
    }
    async getIdentity() {
        const status = this.cachedStatus || (await this.getStatus());
        const hostname = require("os").hostname();
        return {
            deviceName: status.deviceName || hostname,
            userEmail: status.userEmail,
            hostname,
        };
    }
    async startServe(port) {
        // First, get the device name for the URL
        const status = await this.getStatus();
        if (!status.running || !status.loggedIn) {
            throw new Error("Tailscale is not running or not logged in");
        }
        // Stop any existing serve
        await this.stopServe();
        return new Promise((resolve, reject) => {
            // Run tailscale serve
            this.serveProcess = (0, child_process_1.spawn)("tailscale", ["serve", "--bg", `http://127.0.0.1:${port}`], {
                stdio: ["ignore", "pipe", "pipe"],
            });
            let output = "";
            this.serveProcess.stdout?.on("data", (data) => {
                output += data.toString();
            });
            this.serveProcess.stderr?.on("data", (data) => {
                output += data.toString();
            });
            // Give it a moment to start and then construct the URL
            setTimeout(async () => {
                const freshStatus = await this.getStatus();
                if (freshStatus.deviceName && freshStatus.tailnetName) {
                    const url = `https://${freshStatus.deviceName}.${freshStatus.tailnetName}`;
                    resolve(url);
                }
                else {
                    reject(new Error("Could not determine tailnet URL"));
                }
            }, 2000);
            this.serveProcess.on("error", (err) => {
                reject(new Error(`Failed to start Tailscale Serve: ${err.message}`));
            });
        });
    }
    async stopServe() {
        try {
            await execAsync("tailscale serve --bg off");
        }
        catch {
            // Ignore errors
        }
        if (this.serveProcess) {
            this.serveProcess.kill();
            this.serveProcess = null;
        }
    }
    async startFunnel(port) {
        const status = await this.getStatus();
        if (!status.running || !status.loggedIn) {
            throw new Error("Tailscale is not running or not logged in");
        }
        return new Promise((resolve, reject) => {
            this.funnelProcess = (0, child_process_1.spawn)("tailscale", ["funnel", "--bg", `${port}`], {
                stdio: ["ignore", "pipe", "pipe"],
            });
            setTimeout(async () => {
                const freshStatus = await this.getStatus();
                if (freshStatus.deviceName && freshStatus.tailnetName) {
                    // Funnel URLs use the same format
                    const url = `https://${freshStatus.deviceName}.${freshStatus.tailnetName}`;
                    resolve(url);
                }
                else {
                    reject(new Error("Could not determine funnel URL"));
                }
            }, 2000);
            this.funnelProcess.on("error", (err) => {
                reject(new Error(`Failed to start Tailscale Funnel: ${err.message}`));
            });
        });
    }
    async stopFunnel() {
        try {
            await execAsync("tailscale funnel --bg off");
        }
        catch {
            // Ignore errors
        }
        if (this.funnelProcess) {
            this.funnelProcess.kill();
            this.funnelProcess = null;
        }
    }
}
exports.TailscaleManager = TailscaleManager;
