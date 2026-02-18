# multiple-tailscale-accounts - 2026-02-18

Summary
- Support multiple Tailscale accounts in the same tailnet with host-approved workspace access.
- Keep traffic tailnet-only and enforce workspace membership in the app.
- Single active workspace and in-memory state only.

Scope
- Replace join flow with join-request and host approval.
- Enforce membership on API and WebSocket access.
- Add host UI to approve or deny join requests.

API Changes
- POST /api/join-request -> returns approved workspace data or pending request id.
- GET /api/join-status/:requestId -> returns pending, approved, or denied.
- POST /api/join-approve -> host approves a pending request.
- POST /api/join-deny -> host denies a pending request.

Data Flow
- Guest submits code to /api/join-request.
- Host receives join request via WebSocket event.
- Host approves or denies in the UI.
- Guest polls /api/join-status until approved or denied.

UI Changes
- Join screen shows a waiting-for-approval state.
- Host connection panel shows pending join requests with Approve and Deny actions.

State and Storage
- Workspace members and pending requests are stored in memory.
- State resets when the host app restarts.

Testing Checklist
- Guest can request join with valid code.
- Host sees join request and can approve.
- Guest joins after approval and receives workspace data.
- Host denial results in guest error.
- Non-members cannot access upload, chat, feed, or WebSocket.

Assumptions
- All users are in the same tailnet.
- Tailscale is installed and logged in on each device.
- No public exposure is allowed.
