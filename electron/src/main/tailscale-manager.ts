import { spawn, exec } from "child_process"
import { promisify } from "util"
import type { TailscaleStatus, Identity } from "../shared/types"

const execAsync = promisify(exec)

export class TailscaleManager {
  private serveProcess: ReturnType<typeof spawn> | null = null
  private cachedStatus: TailscaleStatus | null = null

  async getStatus(): Promise<TailscaleStatus> {
    try {
      const { stdout } = await execAsync("tailscale status --json")
      const status = JSON.parse(stdout)

      const tailscaleIPs = status.Self?.TailscaleIPs || []
      // Prefer IPv4 (100.x) address for peer connections
      const ipv4 = tailscaleIPs.find((ip: string) => ip.includes("."))

      const result: TailscaleStatus = {
        installed: true,
        running: true,
        loggedIn: status.BackendState === "Running",
        deviceName: status.Self?.HostName || null,
        tailnetName: status.MagicDNSSuffix || null,
        selfIP: ipv4 || tailscaleIPs[0] || null,
        userEmail: status.Self?.UserID ? await this.getUserEmail(status.Self.UserID) : null,
      }

      this.cachedStatus = result
      return result
    } catch (error) {
      // Check if Tailscale is installed but not running
      try {
        await execAsync("which tailscale || where tailscale")
        return {
          installed: true,
          running: false,
          loggedIn: false,
          deviceName: null,
          tailnetName: null,
          selfIP: null,
          userEmail: null,
        }
      } catch {
        return {
          installed: false,
          running: false,
          loggedIn: false,
          deviceName: null,
          tailnetName: null,
          selfIP: null,
          userEmail: null,
        }
      }
    }
  }

  private async getUserEmail(userId: number): Promise<string | null> {
    try {
      const { stdout } = await execAsync("tailscale status --json")
      const status = JSON.parse(stdout)
      // The user info is in the User map
      const user = status.User?.[userId]
      return user?.LoginName || null
    } catch {
      return null
    }
  }

  async getIdentity(): Promise<Identity> {
    const status = this.cachedStatus || (await this.getStatus())
    const hostname = require("os").hostname()

    return {
      deviceName: status.deviceName || hostname,
      userEmail: status.userEmail,
      hostname,
    }
  }

  async startServe(port: number): Promise<string> {
    // First, get the device name for the URL
    const status = await this.getStatus()
    if (!status.running || !status.loggedIn) {
      throw new Error("Tailscale is not running or not logged in")
    }

    // Stop any existing serve
    await this.stopServe()

    return new Promise((resolve, reject) => {
      // Run tailscale serve
      this.serveProcess = spawn("tailscale", ["serve", "--bg", `http://127.0.0.1:${port}`], {
        stdio: ["ignore", "pipe", "pipe"],
      })

      let output = ""

      this.serveProcess.stdout?.on("data", (data) => {
        output += data.toString()
      })

      this.serveProcess.stderr?.on("data", (data) => {
        output += data.toString()
      })

      // Give it a moment to start and then construct the URL
      setTimeout(async () => {
        const freshStatus = await this.getStatus()
        if (freshStatus.deviceName && freshStatus.tailnetName) {
          const url = `https://${freshStatus.deviceName}.${freshStatus.tailnetName}`
          resolve(url)
        } else {
          reject(new Error("Could not determine tailnet URL"))
        }
      }, 2000)

      this.serveProcess.on("error", (err) => {
        reject(new Error(`Failed to start Tailscale Serve: ${err.message}`))
      })
    })
  }

  async stopServe(): Promise<void> {
    try {
      await execAsync("tailscale serve --bg off")
    } catch {
      // Ignore errors
    }
    if (this.serveProcess) {
      this.serveProcess.kill()
      this.serveProcess = null
    }
  }
}
