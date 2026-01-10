"use client"

interface DemoModeGuideProps {
  onBack: () => void
}

export function DemoModeGuide({ onBack }: DemoModeGuideProps) {
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

      <h2 className="text-lg font-semibold mb-2">ACL Demo Guide</h2>
      <p className="text-sm text-muted-foreground mb-4">Demonstrate Tailscale ACL enforcement to judges</p>

      <div className="space-y-4 flex-1 overflow-y-auto">
        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-destructive/20 text-destructive flex items-center justify-center text-sm font-bold">
              1
            </div>
            <h3 className="font-medium">Block Access via ACL</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            In your Tailscale admin console, add an ACL rule that denies the joiner device access to port 4173 on the
            host.
          </p>
          <div className="mt-2 ml-8 p-2 rounded bg-background/50 font-mono text-xs overflow-x-auto">
            <pre>{`"acls": [
  {
    "action": "deny",
    "src": ["joiner-device"],
    "dst": ["host-device:4173"]
  }
]`}</pre>
          </div>
        </div>

        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-warning/20 text-warning flex items-center justify-center text-sm font-bold">
              2
            </div>
            <h3 className="font-medium">Attempt to Join</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            On the joiner device, try to connect to the workspace. You should see the error:
          </p>
          <div className="mt-2 ml-8 p-2 rounded bg-destructive/10 border border-destructive/20 text-destructive text-xs">
            "Blocked by Tailscale ACL or not on tailnet. Ask host to grant access."
          </div>
        </div>

        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center text-sm font-bold">
              3
            </div>
            <h3 className="font-medium">Allow Access via ACL</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-8">Update the ACL to allow the joiner access:</p>
          <div className="mt-2 ml-8 p-2 rounded bg-background/50 font-mono text-xs overflow-x-auto">
            <pre>{`"acls": [
  {
    "action": "accept",
    "src": ["joiner-device"],
    "dst": ["host-device:4173"]
  }
]`}</pre>
          </div>
        </div>

        <div className="glass-light rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold">
              4
            </div>
            <h3 className="font-medium">Connect Successfully</h3>
          </div>
          <p className="text-sm text-muted-foreground ml-8">
            The joiner can now connect to the workspace. This demonstrates that Tailscale ACLs control access to the
            protected service.
          </p>
        </div>
      </div>
    </div>
  )
}
