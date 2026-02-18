# TailOverlay

A cross-platform desktop overlay app for secure workspace sharing over Tailscale. Built for the Tailscale integration hackathon prize.

## Overview

TailOverlay creates a private, secure workspace between exactly TWO devices connected on a Tailscale tailnet. The workspace includes:
- **Real-time Chat** - Instant messaging between devices
- **File Sharing** - Upload and download files directly in the workspace
- **Screenshot Capture** - One-click screenshot sharing with optional captions into a shared feed

**Primary Goal**: Tailscale is ESSENTIAL, not optional. The workspace host service is accessible ONLY over Tailscale, and the project supports a demo where an ACL blocks/unblocks access to demonstrate Tailscale's security model.

## Features

- **Secure Workspace Sharing**: Host or join workspaces exclusively over your Tailscale tailnet
- **ACL Enforcement Demo**: Demonstrates Tailscale ACL-based access control (block/unblock)
- **Identity Integration**: Displays Tailscale identity (device name + user email) on messages

## Requirements

- [Node.js](https://nodejs.org/) v20.19+ or v22.12+
- [Tailscale](https://tailscale.com/download) installed and logged in
- Both devices must be on the same Tailscale tailnet

## Installation

```bash
cd electron
npm install
```

## Development

```bash
# Terminal 1 - Start TypeScript compiler and Vite
npm run dev

# Terminal 2 - Start Electron (after "Found 0 errors" appears)
npm start
```

## Architecture

```
electron/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry, window management, IPC handlers
│   │   ├── preload.ts           # Context bridge for secure renderer access
│   │   ├── host-service.tsx     # Express + WebSocket server (port 4173)
│   │   └── tailscale-manager.ts # Tailscale CLI integration (serve)
│   ├── renderer/                # React UI
│   │   ├── App.tsx              # Main app component with state management
│   │   └── components/          # UI components (WelcomeScreen, ChatTab, etc.)
│   └── shared/                  # Shared TypeScript types
│       └── types.ts             # Post, ChatMessage, Workspace types
└── package.json
```

## Tailscale Integration

### How It Works

1. **Host Service**: Runs on `localhost:4173` (HTTP)
2. **Tailscale Serve**: Exposes the host service as a private HTTPS URL within your tailnet

### API Endpoints (Host Service)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/create-workspace` | POST | Creates workspace, returns 6-digit code |
| `/api/join-request` | POST | Request to join with `{ code }`, returns approved or pending |
| `/api/join-status/:requestId` | GET | Poll join request status |
| `/api/join-approve` | POST | Host approves a pending join request |
| `/api/join-deny` | POST | Host denies a pending join request |
| `/api/feed` | GET | Returns list of posts (screenshots/files) |
| `/api/upload` | POST | Multipart upload for files/screenshots |
| `/api/health` | GET | Health check with current workspace code |
| `/ws` | WebSocket | Real-time events (chat, posts, presence, join requests) |

### WebSocket Message Types

- `chat` - `{ text, senderIdentity, ts }`
- `post:new` - `{ post }` for new screenshot/file
- `presence` - `{ status }` for join/leave events
- `join:request` - `{ id, identity, requestedAt }` for pending join requests

## Usage

### Hosting a Workspace

1. Ensure Tailscale is running and you're logged in
2. Launch the app and click **"Host Workspace"**
3. The app will:
   - Start the host service on port 4173
   - Generate a 6-digit code
   - Run `tailscale serve` to create a private HTTPS URL
4. Share the **6-digit code** and **Tailscale IP** (starts with `100.`) with your teammate
5. Start chatting, sharing files, and taking screenshots!

### Joining a Workspace

1. Ensure Tailscale is running and you're logged in
2. Launch the app and click **"Join Workspace"**
3. Enter the host's **Tailscale IP** (e.g., `100.64.0.5`) and **6-digit code**
4. Click Connect and wait for the host to approve your request
5. Once approved, start collaborating!

### Testing Connection

On the guest device, test connectivity before using the app:

```bash
# Replace with host's Tailscale IP
curl http://100.x.x.x:4173/api/health
```

Should return: `{"status":"ok","code":"123456"}`

## ACL + Identity Enforcement (Hackathon Requirement)

The host service on **port 4173** is only reachable over Tailscale. Access is enforced in two layers:

- **Tailnet ACLs (optional demo)**: `tailscale-acl.json` can restrict which devices may reach `tag:tailoverlay-host:4173`.
- **App-level approval**: the host verifies the caller's Tailscale identity (via `tailscale status --json`) and requires host approval before access is granted.

### Apply the ACL

1. Edit `tailscale-acl.json` with your real device names/emails if they differ.
2. Tag the host device: `tailscale up --advertise-tags=tag:tailoverlay-host`.
3. Apply the ACL in the Tailscale admin console or via the Admin API using `tailscale-acl.json`.

### Demo flow (two devices)

1. With the ACL applied and host tagged, start the app on the host (device Calvin).
2. Join from device Remy-r and approve the request in the host UI.
3. To show enforcement, temporarily remove `device:Remy-r` from the ACL and re-apply -> join fails with *"Not on tailnet or Tailscale identity unavailable."*
4. Re-add `device:Remy-r` and approve again -> join succeeds.

## Identity

TailOverlay extracts identity from `tailscale status --json`:
- **Device Name**: Your machine's Tailscale hostname
- **User Email**: Your Tailscale account email

This identity appears on all chat messages and posts for attribution.

## Data Model

```typescript
interface Workspace {
  code: string;        // 6-digit numeric code
  createdAt: number;
}

interface Post {
  id: string;
  type: "screenshot" | "file";
  filename: string;
  mimeType: string;
  size: number;
  caption?: string;
  createdAt: number;
  senderIdentity: string;
  downloadUrl: string;
}

interface ChatMessage {
  id: string;
  text: string;
  createdAt: number;
  senderIdentity: string;
}
```

## Tech Stack

- **Electron** - Cross-platform desktop framework
- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Express** - HTTP API server
- **WebSocket (ws)** - Real-time communication
- **Tailwind CSS** - Styling

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Devices don't see each other | Run `tailscale status` on both - ensure same tailnet |
| "tailscale: command not found" | Add Tailscale to PATH or use full path |
| Connection refused | Check host service is running, firewall allows port 4173 |
| Join fails with ACL error | Update Tailscale ACLs to allow access |

## License

MIT

