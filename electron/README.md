# TailOverlay

A cross-platform desktop overlay app for secure workspace sharing over Tailscale.

## Features

- **Secure Workspace Sharing**: Host or join workspaces over your Tailscale tailnet
- **Real-time Chat**: Communicate with your teammate instantly
- **Screenshot Capture**: One-click screenshot sharing with optional captions
- **File Sharing**: Upload and download files directly in the workspace
- **ACL Enforcement**: Demonstrates Tailscale ACL-based access control
- **Funnel Demo Lobby**: Optional public landing page for hackathon judges

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Tailscale](https://tailscale.com/download) installed and logged in
- Both devices must be on the same Tailscale tailnet

## Installation

```bash
cd electron
npm install
```

## Development

```bash
# Start in development mode
npm run dev

# In another terminal, start Electron
npm start
```

## Building

```bash
# Build for production
npm run build

# Package as distributable
npm run package
```

## Usage

### Hosting a Workspace

1. Ensure Tailscale is running and you're logged in
2. Click "Host Workspace"
3. Share the 6-digit code and Tailnet URL with your teammate
4. Start chatting, sharing files, and taking screenshots!

### Joining a Workspace

1. Ensure Tailscale is running and you're logged in
2. Click "Join Workspace"
3. Enter the host's Tailnet URL and 6-digit code
4. Connect and start collaborating!

### ACL Demo

To demonstrate Tailscale ACL enforcement:

1. In the Tailscale admin console, create an ACL rule that blocks the joiner from accessing port 4173 on the host
2. Attempt to join - you'll see an "ACL blocked" error
3. Update the ACL to allow access
4. Join successfully - demonstrating that Tailscale ACLs control access

### Funnel Demo Lobby

When hosting, you can enable the "Public Demo Lobby" toggle. This uses Tailscale Funnel to expose a read-only landing page with a QR code that judges can scan. The actual workspace content remains private over the tailnet.

## Architecture

```
electron/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # App entry, window management, IPC
│   │   ├── preload.ts  # Context bridge for renderer
│   │   ├── host-service.ts    # Express + WebSocket server
│   │   └── tailscale-manager.ts  # Tailscale CLI integration
│   ├── renderer/       # React UI
│   │   ├── App.tsx     # Main app component
│   │   └── components/ # UI components
│   └── shared/         # Shared TypeScript types
└── package.json
```

## Tailscale Integration

- **Tailscale Serve**: The host service binds to localhost:4173 and is exposed via `tailscale serve` to create a private HTTPS URL accessible only within the tailnet.
- **Tailscale Funnel**: Optionally exposes a demo lobby page publicly for judges.
- **Identity**: Extracts device name and user email from `tailscale status --json`.

## Tech Stack

- **Electron**: Cross-platform desktop framework
- **React**: UI framework
- **TypeScript**: Type-safe JavaScript
- **Express**: HTTP API server
- **WebSocket**: Real-time communication
- **Tailwind CSS v4**: Styling
