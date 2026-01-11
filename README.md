# tailSync

A secure mini-workspace built on your tailnet.

tailSync is a two-device collaboration workspace that runs as a desktop app. It supports:
- **Realtime chat**
- **File sharing**
- **One-click screenshots + captions** posted into a shared feed  
…and is designed to be **Tailscale-first** (tailnet-only access + ACL demo).

---

## Features

- **Feed**: timeline of shared files + screenshots
- **Chat**: realtime messages over WebSockets
- **Screenshot**: capture + optional caption → instantly appears in feed
- **Connection panel**: host/join details + status (and clear errors when blocked)

---

## Tech Stack

Electron, Node.js, TypeScript, React, Vite, Tailwind CSS, Express, WebSocket (ws), Multer, Docker, Docker Compose, Tailscale, Tailscale Serve, Tailscale ACLs, Tailscale Funnel

---

## Requirements

- **Node.js** (LTS recommended)
- **npm**
- **Tailscale** installed + logged in (for tailnet connectivity)
- Two devices (Host + Joiner) connected to the **same tailnet**

> If you’re only testing locally on one machine, you can still run the app, but the intended demo is two devices over Tailscale.

---

## Quick Start (Dev)

> Main startup flow (as requested):  
> `cd electron`, `npm install`, then split terminals and run `npm run dev` + `npm start`.

### 1) Install dependencies

```bash
cd electron
npm install
