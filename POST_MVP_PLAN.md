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
- 

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