import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "TailOverlay - Secure Workspace Sharing",
  description: "Cross-platform desktop overlay for secure workspace sharing over Tailscale",
}

export default function Page() {
  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#38bdf8]/20 via-transparent to-[#818cf8]/20" />
        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm mb-8">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Tailscale Integration Prize Submission
          </div>

          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[#38bdf8] to-[#818cf8] flex items-center justify-center">
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-[#0f172a]"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>

          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            TailOverlay
          </h1>
          <p className="text-xl text-white/70 mb-8 max-w-2xl mx-auto">
            A desktop overlay app for secure workspace sharing between two devices over Tailscale. Chat, share files,
            and capture screenshots - all protected by your tailnet.
          </p>

          <div className="flex items-center justify-center gap-4">
            <a
              href="#setup"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#38bdf8] to-[#818cf8] text-[#0f172a] font-semibold hover:opacity-90 transition-opacity"
            >
              Get Started
            </a>
            <a
              href="#features"
              className="px-6 py-3 rounded-xl bg-white/10 border border-white/10 font-semibold hover:bg-white/20 transition-colors"
            >
              View Features
            </a>
          </div>
        </div>
      </div>

      {/* Note about Electron */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200">
          <div className="flex items-start gap-3">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="shrink-0 mt-0.5"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <div>
              <p className="font-medium">This is an Electron Desktop App</p>
              <p className="text-sm text-amber-200/80 mt-1">
                TailOverlay runs as a native desktop application. Download the project files and follow the setup
                instructions below to run it locally.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Features</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ),
              title: "Tailscale-Only Access",
              description: "Workspace is only accessible over your Tailscale tailnet. No public internet exposure.",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              ),
              title: "Real-time Chat",
              description: "Instant messaging with your teammate via WebSocket over the secure tailnet.",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              ),
              title: "Screenshot Capture",
              description: "One-click screenshot sharing with optional captions. Shows up instantly in the feed.",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              ),
              title: "File Sharing",
              description: "Upload and download files directly through the workspace interface.",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              ),
              title: "ACL Enforcement",
              description: "Demonstrate Tailscale ACL-based access control for the hackathon demo.",
            },
            {
              icon: (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              ),
              title: "Funnel Demo Lobby",
              description: "Optional public landing page with QR code for hackathon judges via Tailscale Funnel.",
            },
          ].map((feature, i) => (
            <div key={i} className="p-5 rounded-xl bg-white/5 border border-white/10">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#38bdf8]/20 to-[#818cf8]/20 flex items-center justify-center text-[#38bdf8] mb-3">
                {feature.icon}
              </div>
              <h3 className="font-semibold mb-1">{feature.title}</h3>
              <p className="text-sm text-white/60">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Setup Instructions */}
      <div id="setup" className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-8 text-center">Setup Instructions</h2>

        <div className="space-y-6">
          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-semibold">Prerequisites</h3>
            </div>
            <ul className="ml-11 space-y-2 text-sm text-white/70">
              <li>
                Install{" "}
                <a href="https://nodejs.org/" className="text-[#38bdf8] hover:underline">
                  Node.js 18+
                </a>
              </li>
              <li>
                Install{" "}
                <a href="https://tailscale.com/download" className="text-[#38bdf8] hover:underline">
                  Tailscale
                </a>{" "}
                on both devices
              </li>
              <li>Both devices must be on the same tailnet</li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-semibold">Download & Install</h3>
            </div>
            <div className="ml-11">
              <p className="text-sm text-white/70 mb-3">
                Download the project ZIP from the three-dot menu above, then run:
              </p>
              <pre className="p-3 rounded-lg bg-black/30 font-mono text-sm overflow-x-auto">
                {`cd electron
npm install`}
              </pre>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-semibold">Run the App</h3>
            </div>
            <div className="ml-11">
              <p className="text-sm text-white/70 mb-3">Start in development mode (two terminals):</p>
              <pre className="p-3 rounded-lg bg-black/30 font-mono text-sm overflow-x-auto">
                {`# Terminal 1: Start Vite + TypeScript watch
npm run dev

# Terminal 2: Start Electron
npm start`}
              </pre>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="font-semibold">Host or Join</h3>
            </div>
            <div className="ml-11 text-sm text-white/70 space-y-2">
              <p>
                <strong className="text-white">Host:</strong> Click "Host Workspace" to start. Share the 6-digit code
                and Tailnet URL.
              </p>
              <p>
                <strong className="text-white">Join:</strong> Click "Join Workspace" and enter the host's URL and code.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Architecture */}
      <div className="max-w-4xl mx-auto px-6 py-16 border-t border-white/10">
        <h2 className="text-2xl font-bold mb-8 text-center">Architecture</h2>
        <pre className="p-5 rounded-xl bg-black/30 font-mono text-sm overflow-x-auto text-white/70">
          {`electron/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # Window management, IPC handlers
│   │   ├── preload.ts     # Context bridge
│   │   ├── host-service.ts    # Express + WebSocket server
│   │   └── tailscale-manager.ts  # CLI integration
│   ├── renderer/          # React UI
│   │   ├── App.tsx        # Main component
│   │   └── components/    # UI components
│   └── shared/            # TypeScript types
└── package.json`}
        </pre>
      </div>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-6 py-8 border-t border-white/10 text-center text-sm text-white/50">
        Built for the Tailscale Integration Prize
      </footer>
    </div>
  )
}
