# Post-MVP Development Plan

## Stage 1 — Lead & CRM Refinement
- Expose AI fields in Unified Leads
- Make appropriate fields editable
- Sync supported canonical fields to HubSpot
- Preserve manual override + audit trail
- Verify bidirectional synchronization

## Stage 2 — Authentication & RBAC
- Replace development/bootstrap authentication
- Roles: Admin/Manager and Sales Agent
- Agent sees assigned clients and own operational data
- Admin/Manager sees company-wide agents, commissions,
  reconciliation and operations
- Enforce permissions server-side, not only in UI
- move telemetry and logs from the current client side to admin panel
- create dashboards for analytics and operations in admin panel

### Stage 2 workspace correction — completed
- Authentication now routes `ADMIN` and `MANAGER` users to a dedicated Admin workspace and `AGENT` users to a dedicated Agent workspace.
- Agent and Admin pages use separate App Router route groups, server-protected layouts, and separate navigation shells.
- Login and signup require an explicit Admin / Manager or Sales Agent selection before showing the relevant form. Login verifies the selection against the persisted server role; public signup remains Administrator-only and Agent accounts are provisioned inside the Admin workspace.
- The Agent workspace has no Admin navigation. Direct Agent requests to Admin pages redirect to the Agent workspace, and Admin APIs return structured `403 FORBIDDEN` responses.
- The Admin workspace contains company dashboard, team, client accounts, assignments, sales operations, commissions/reconciliation, analytics, integrations/sync health, and audit-log sections.
- Client-account context is mounted only in the Agent workspace. Agent client access and operational ownership remain server-enforced; Admin queries remain organization-scoped.
- Stage 3 was not started as part of this correction.

## Stage 2.5 — Generic Integration Framework & HubSpot OAuth

### Status — implementation complete; awaiting live OAuth review
- Added generic `COMPANY`, `CLIENT_ACCOUNT`, and `USER` integration ownership with server-enforced company, assignment, role, and active-client checks.
- Separated provider credentials from connection metadata and protected OAuth tokens with server-only AES-256-GCM encryption.
- Added short-lived, hashed, one-time OAuth state bound to the initiating session and ownership target.
- Added HubSpot OAuth authorization, callback, encrypted credential persistence, proactive access-token refresh, revocation, status/error handling, and audit events using the current date-versioned OAuth endpoints.
- Preserved the existing `ExternalRecord` mappings and inbound/outbound HubSpot contact adapter. A clearly isolated server-only `env:HUBSPOT_ACCESS_TOKEN` compatibility reference keeps the already configured development connection working until it is reauthorized through OAuth.
- Replaced the simulated Agent Integration Hub with real client-scoped connection status, Sync, and Retry controls. Added company-wide Admin/Manager connection management and an Admin-controlled permission for assigned agents to initiate client OAuth.
- Added structured integration APIs for listing, connecting, callback handling, sync, retry, and disconnect. Credential fields are never returned.
- Verified migration, credential encryption round-trip, credential redaction, Agent active-client isolation, forbidden Agent disconnect, inbound duplicate prevention, live HubSpot outbound PATCH, TypeScript, focused lint, system tests, and production build.
- Live OAuth consent requires the operator to configure `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_REDIRECT_URI`, and `INTEGRATION_ENCRYPTION_KEY`, then complete the browser flow from the Integration Hub.
- Twilio, Calendar providers, AI providers, and additional CRMs were not started.

## Stage 3 — UI / UX Refinement
- Full visual QA
- Fix stale-state/client-switch issues
- Remove developer-oriented UI
- Restore/polish Calendar experience
- Clearly distinguish Business Analytics from Sales Operations
- Preserve existing design system

## Stage 4 — Real Integrations
- HubSpot: already working for contacts
- Twilio
- Google/Outlook Calendar
- Real LLM provider
- Optional second CRM after core integrations are stable

## Stage 5 — Final System QA
Test complete flow:

CRM Contact
→ Unified Leads
→ Interaction
→ AI Analysis
→ CRM Update
→ Sales Script
→ Appointment
→ Proposal
→ Deal
→ Commission
→ Reconciliation / Analytics

Verify:
- tenant isolation
- persistence
- RBAC
- manual failsafes
- provider failures
- audit logs
- production build
