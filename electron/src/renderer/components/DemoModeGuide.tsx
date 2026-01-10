"use client"

interface SetupGuideProps {
  onBack: () => void
}

export function SetupGuide({ onBack }: SetupGuideProps) {
  return (
    <div className="h-full flex flex-col p-4 animate-fade-in">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <h2 className="text-lg font-semibold mb-2">Tailscale Setup Guide</h2>
      <p className="text-sm text-muted-foreground mb-4">Get both devices ready to connect over your tailnet</p>

      <div className="space-y-4 flex-1 overflow-y-auto">
        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
              1
            </div>
            <h3 className="font-medium">Install & Sign In</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            Install <a href="https://tailscale.com/download" className="text-primary underline">Tailscale</a> on both devices and sign in. Make sure the client says it’s connected.
          </p>
        </div>

        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
              2
            </div>
            <h3 className="font-medium">Verify Connection</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            On each device run: <span className="font-mono text-foreground">tailscale status</span>. Confirm both devices show the same tailnet and have a <span className="font-mono">100.x.x.x</span> IP.
          </p>
        </div>

        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
              3
            </div>
            <h3 className="font-medium">Host Device: Start & Share</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            Click <span className="font-mono text-foreground">Host Workspace</span>. Share your Tailscale IP (e.g.,{" "}
            <span className="font-mono text-foreground">100.xx.xx.xx</span>) and the 6-digit code with your teammate.
          </p>
        </div>

        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
              4
            </div>
            <h3 className="font-medium">Join Device: Connect</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            Enter the host’s IP and code, then connect. If it fails, try:{" "}
            <span className="font-mono text-foreground">curl http://100.xx.xx.xx:4173/api/health</span> to confirm
            reachability.
          </p>
        </div>

        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold">
              5
            </div>
            <h3 className="font-medium">Troubleshooting</h3>
          </div>
          <ul className="text-sm text-muted-foreground ml-8 list-disc list-inside space-y-1">
            <li>Both devices must be logged into the same tailnet.</li>
            <li>Allow port 4173 on the host firewall if prompted.</li>
            <li>Restart Tailscale if you don’t see a 100.x IP.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
