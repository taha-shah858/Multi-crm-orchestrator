## Phase 1 - Status

### Completed
- Read `Architecture.md` and `mvp.md` in full.
- Inspected the existing Next.js frontend, middleware-based route protection, and HubSpot contact import path.
- Mapped the existing HubSpot route, client, mapper, and normalized contact model.
- Added the PostgreSQL/Prisma foundation for company, users, client accounts, agent assignments, CRM connections, canonical contacts, external-record mappings, and audit logs.
- Added canonical TypeScript models that preserve internal platform IDs separately from provider IDs.
- Added a client-account context and minimal header selector; the agent selects a client account, not a CRM directly.
- Added a server-side request-context boundary, a CRM adapter contract/registry, structured API errors, and structured audit-event logging.
- Preserved the existing HubSpot fetch and mapper by placing them behind the HubSpot adapter and retaining the contacts-import response contract.
- Updated the Next.js 16 route guard from deprecated middleware naming to `proxy.ts`.
- Validated the Prisma schema and generated Prisma Client.
- Created and applied the initial PostgreSQL migration: `20260821153619_init`.
- Verified the database is synchronized with the Prisma schema.
- Fixed the `ThemeContext` light-theme type mismatch and passed the full TypeScript check.

### In Progress
- None. Phase 1 is complete and awaiting review.

### Pending
- Phase 3 and later MVP modules.

### Notes / Decisions
- The existing frontend and HubSpot server-side import are being preserved.
- The active selection is a client account under the authenticated agent's company; it is not a direct CRM selection.
- The existing login remains a development-only bootstrap session. Server routes reject it in production until database-backed authentication is implemented.
- Audit events are structured logs in this phase; the `AuditLog` persistence schema is ready for the repository layer introduced with Phase 2 persistence.
- PostgreSQL is configured through the untracked `.env.local`; the initial migration is applied and Prisma Client has been regenerated.
- No live database, synchronization, interaction, telephony, AI, scheduling, commission, or document functionality is being implemented in Phase 1.

## Phase 2 - Status

### Completed
- Inspected the Phase 1 tenancy, request-context, CRM adapter, and existing HubSpot import foundations before extending them.
- Used the scoped codebase relationship map to trace the contact-import route through the HubSpot client, mapper, and normalized contact contract.
- Added persistent, tenant-scoped manual CRM synchronization through the active client account. The agent syncs the selected client account; they do not select a CRM directly.
- Preserved the existing server-side HubSpot client and mapper behind the established adapter contract.
- Added a `MOCK` CRM adapter and development bootstrap connections for deterministic local verification without changing the HubSpot integration.
- Added `SyncRun` persistence, per-connection result counts, completion/failure states, and an active-client sync-history API.
- Added canonical contact persistence and external-record deduplication using the existing `CrmConnection` and `ExternalRecord` model boundaries.
- Added persistent audit logging for manual sync lifecycle events.
- Updated the existing Leads page's import action to a client-scoped manual sync while preserving the existing UI and the legacy GET import endpoint.
- Created and applied Prisma migration `20260821161429_phase2_sync_engine` and regenerated Prisma Client.
- Verified Prisma schema validation and migration status, the full TypeScript check, and the Next.js production build.

### In Progress
- None. Phase 2 is complete and awaiting review.

### Pending
- Phase 3 and later MVP modules only.

### Notes / Decisions
- Manual synchronization is the Phase 2 automation failsafe: it is an explicit agent action and produces a persisted run record for every connected CRM of the selected client account.
- A failed provider run is recorded independently, allowing other connections for the same client account to complete; an all-failed request returns a structured sync error.
- HubSpot remains server-side only. Live HubSpot execution was not performed because it requires a valid configured provider credential; the build, database migration, and deterministic mock-provider path were verified locally.
- No Phase 3 CRM-management UI, interactions, telephony, AI, scheduling, commission, or document work was started.
- Regression fix: moved the shared dashboard shell into the existing `(dashboard)` route group and restored an auth-only shell in `(auth)`, so unmatched routes no longer render inside dashboard navigation while all dashboard URLs remain unchanged.
- Regression fix: aligned the root CSS and document color scheme with the `lumina` light default used by `ThemeProvider`, eliminating the dark-to-light hydration flash for the default theme.
- Regression verification: TypeScript and the production build pass; the generated public route manifest contains all nine sidebar destinations. Local browser HTTP verification could not be launched because this environment blocks background-process startup.
- Phase 2 sync bug fix: on a fresh development database, the import route wrote its first audit log before the tenant bootstrap/access check. The audit foreign keys therefore failed and the API returned the generic unexpected-error response. The route now prepares the active client context before its first audit write.
- Phase 2 sync verification: the Atlas client exists, the development agent is assigned, and it has a connected `MOCK` connection with a registered adapter. First sync created two contacts/external records; a second sync updated those records without duplicates; sync history contains both completed runs.
- Failed-provider verification: an unavailable provider produces the safe message "This CRM provider is not available yet." and records a failed sync run. Unhandled API errors now log their message and stack with the request ID on the server for diagnosis without exposing them to the frontend.
- Phase 2 persistence/UI fix: added `GET /api/contacts`, which returns canonical contacts scoped to the current agent and selected client account. Leads now loads this persisted data on mount, after each sync, and whenever the active client changes; it no longer uses temporary seed leads or sync-response-only state.
- Phase 2 client-context fix: the account selector now writes the active-client cookie synchronously and exposes a ready state before dependent data reads begin. Leads guards against stale in-flight reads so rapid account changes cannot overwrite the current client's directory.
- PostgreSQL verification: Prisma is connected to database `multicrm`, schema `public`, on the local PostgreSQL server (`::1`, port `5432`). At verification time, `Contact` and `ExternalRecord` each contained 14 rows, `SyncRun` 5 rows, and `AuditLog` 20 rows; Atlas and Northstar contacts remained isolated (2 and 12 rows respectively).
- Persistence verification: a fresh process read Atlas contacts and sync history successfully after prior syncs, confirming persistence across process restart. TypeScript and production builds pass. Browser-server startup remains blocked by this environment, so route handlers were exercised directly with the same request cookies and headers they receive at runtime.
- Post-MVP Phase 2 outbound-sync refinement: canonical contacts can now be edited from the existing Unified Leads record detail view. `PATCH /api/contacts/:id` enforces organization and active-client ownership, persists the canonical edit first, then writes a mapped HubSpot contact through `ExternalRecord(connectionId, externalId)`. `POST /api/contacts/:id/sync` is the manual retry failsafe and never alters the local record.
- HubSpot's adapter contract now has an explicit contact-write capability. The HubSpot adapter performs server-side `PATCH /crm/v3/objects/contacts/:id`; writes create a `SyncRun`, update the mapping's `lastSyncedAt` on success, and persist audit events for local edits plus outbound success/failure. Provider failures retain the canonical edit and return a retryable, safe message.
- Connection credential refinement: HubSpot now resolves the selected `CrmConnection.encryptedAccessToken` as a server-only `env:HUBSPOT..._ACCESS_TOKEN` reference, rather than reading a global token implicitly. The development Northstar connection is backfilled to `env:HUBSPOT_ACCESS_TOKEN`; production/client-specific connections can use a distinct reference such as `env:HUBSPOT_NORTHSTAR_ACCESS_TOKEN`. No token value is sent to or stored by the frontend.
- Verification: migration `20260822141433_phase2_outbound_contact_sync` applied, Prisma Client regenerated, `tsc --noEmit`, Prisma migration status, and production build passed. Cross-client PATCH was rejected with `CONTACT_NOT_FOUND`; a real Northstar HubSpot PATCH reached HubSpot using its selected connection and returned 403 because the configured private-app token lacks the required contact write scope. The local canonical edit was retained, a failed outbound `SyncRun`/audit was recorded with a retryable safe message, and the test record was restored from HubSpot. Grant HubSpot contact-write scope to complete the live success/retry verification.

## Phase 3 - Status

### Completed
- Added canonical, tenant- and client-account-scoped `Interaction` persistence for calls, SMS, emails, notes, and CRM activities.
- Added `GET` and `POST /api/interactions`; manual interaction creation is audited and validates the active client context and optional contact ownership.
- Extended the existing Aggregation Timeline to read persisted interactions for the selected client account and refresh on client changes.
- Added the manual interaction logging failsafe in the Timeline UI for call, SMS, email, note, and CRM-activity records.
- Created and applied Prisma migration `20260821171956_phase3_interactions` and regenerated Prisma Client.
- Verified manual interaction creation and tenant isolation: an Atlas note appeared in Atlas's timeline and was absent from Northstar's.
- Passed `tsc --noEmit` and the Next.js production build.

### In Progress
- None. Phase 3 is complete and awaiting review.

### Pending
- Phase 4 and later MVP modules only.

### Notes / Decisions
- Phase 3 persists and aggregates manual interaction records; external telephony/SMS delivery remains explicitly deferred to Phase 4.
- Phase 3 correction: the Timeline is now explicitly an interaction-history surface, not a system/connector-health timeline. It presents customer calls, SMS, emails, notes, and CRM activities by contact and timestamp; technical telemetry remains outside this module.
- The manual interaction failsafe allows CALL, SMS, EMAIL, NOTE, and CRM_ACTIVITY records and can associate them with a contact from the active client account.
- Correction verification: a manual outbound CALL was persisted, linked to an Atlas contact, labeled `MANUAL`, returned first in Atlas's chronological interaction feed, and was absent from Northstar. TypeScript and the production build pass.
- Phase 3 UI correction: replaced the Timeline's native prompt-based interaction logger with an in-app modal that follows the existing card, panel, form, and modal styling.
- The modal loads contacts only from the active client's existing `/api/contacts` route, supports name, email, and company search, and displays no internal database IDs. Selecting a contact sends its opaque ID to the unchanged `POST /api/interactions` API; account-level records remain available through “Use account only.”
- Removed the remaining native Timeline alert in favor of inline feedback. `tsc --noEmit` and the production build pass; a direct authenticated active-client contacts-route check returned Atlas's persisted contacts for the modal.
- Dashboard layout correction: the shared client-account header now owns `--dashboard-header-height`, the dashboard shell uses a viewport-bounded scroll region for short viewports, and page content flows below the header without page-specific offsets.
- Added the shared `.dashboard-overlay` boundary for dashboard drawers and full-screen modals. Timeline, Leads, Calendar, Dialer, and dashboard overlays begin below the header; the header has a higher stacking layer (`60` versus overlay `30`). TypeScript and the production build pass.

## Phase 4 - Status

### Completed
- Inspected the active-client context, canonical Interaction model, development tenant bootstrap, and existing Dialer before implementing the VoIP & SMS Identity Gateway.
- Added tenant- and client-account-scoped `CommunicationIdentity` persistence, including provider, brand-safe display label, outgoing phone number, enabled state, and default selection.
- Added `GET /api/communications/identities` and `POST /api/communications/dispatch`. Both enforce the current agent's active-client access and keep provider credentials server-side.
- Added a provider boundary that dispatches SMS and configured calls through Twilio when a `TWILIO` identity and server configuration are available; the development bootstrap provides deterministic `MOCK` identities for local verification.
- Reused canonical `Interaction` records for every call/SMS and added persisted audit events for automated dispatch and manual fallback logging.
- Replaced the Dialer’s static brand-routing controls with the active-client identity gateway UI. Agents can search active-client contacts, select an outgoing identity by label/number, enter a number manually, place/send through the gateway, or use manual `tel:`/SMS fallback while logging the same canonical interaction.
- Created and applied Prisma migration `20260821180250_phase4_communication_identity` and regenerated Prisma Client.
- Verified the identities API, mock automated CALL, manual SMS fallback, persisted interactions, audit entries, and Atlas/Northstar isolation through the route handlers.
- Passed `tsc --noEmit`, the Next.js production build, Prisma migration status, and whitespace validation.

### In Progress
- None. Phase 4 is complete and awaiting review.

### Pending
- Phase 5 and later MVP modules only.

### Notes / Decisions
- Twilio requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and, for outbound calls, `TWILIO_VOICE_URL`; these are read only in the server-side communication service and are never returned to the frontend.
- Without a configured Twilio identity, the client-scoped MOCK identity still creates a persisted communication interaction for local verification. Agents can always use the explicit manual dial/SMS fallback when automated dispatch is unavailable.
- External delivery identifiers and selected identity metadata are retained on the canonical Interaction, allowing the Phase 3 unified timeline to continue serving as the single communication history.

## Phase 5 - Status

### Completed
- Inspected the completed client context, persisted contacts/interactions, and existing Copilot presentation before replacing its out-of-scope prototype behavior with the Phase 5 analysis workflow.
- Added canonical, tenant- and client-account-scoped `LeadAnalysis` persistence linked optionally to a contact and/or existing interaction.
- Added `GET`/`POST /api/lead-analyses` and `PATCH /api/lead-analyses/:id`. Routes enforce active-client access, persist analyses, and audit both creation and manual correction.
- Added a server-side, deterministic and interpretable rules-engine analysis baseline that extracts budget, timeline, requirements, intent signals, objections, lead score, temperature, and deal probability from transcripts.
- Replaced the Copilot prototype with an active-client workspace for pasted transcript intake or existing-interaction intake, generated assessment review, editable results/score, and saved analysis history.
- Created and applied Prisma migration `20260822101409_phase5_ai_intelligence` and regenerated Prisma Client.
- Verified route-level transcript analysis, field extraction, manual score/assessment correction, audit creation, and Atlas/Northstar isolation.
- Passed `tsc --noEmit`, the Next.js production build, Prisma migration status, and whitespace validation.

### In Progress
- None. Phase 5 is complete and awaiting review.

### Pending
- Phase 6 and later MVP modules only.

### Notes / Decisions
- The implemented analysis baseline is an explicit rules engine rather than a claimed external LLM. It is deterministic, server-side, and designed to be replaced or supplemented by a provider adapter later without changing the Copilot API or UI contract.
- Every generated field, score, temperature, probability, and summary remains editable. Saving a correction sets `isManualOverride` and creates a persisted audit record.
- Phase 6 Sales Script Architect, including script generation and messaging templates, was intentionally not started.

## Phase 6 - Status

### Completed
- Inspected the completed Phase 5 Copilot, canonical contact/interaction context, and lead-analysis data before implementing the Sales Script Architect as a dedicated dashboard workspace.
- Added tenant- and client-account-scoped `SalesScript` persistence linked optionally to a contact and lead analysis, with channel, origin, template key, context snapshot, and manual-override state.
- Added `GET`/`POST /api/scripts`, `POST /api/scripts/generate`, `GET /api/scripts/templates`, and `PATCH /api/scripts/:id` with active-client authorization and persisted audit logging.
- Added server-side context retrieval from the active brand, selected contact, recent interactions, and optional Phase 5 lead analysis; generated CALL, SMS, and EMAIL content is saved as an editable script.
- Added three reusable templates: discovery follow-up, value check-in, and objection-handling call.
- Added a dedicated `/scripts` workspace and sidebar entry that provides context selectors, template generation, a complete manual editor, save/edit flows, and a client-scoped saved-script library.
- Created and applied Prisma migration `20260822112949_phase6_sales_scripts` and regenerated Prisma Client.
- Verified generated and manual scripts, generated active-brand content, manual edit persistence, audit records, and Atlas/Northstar isolation through route handlers.
- Passed `tsc --noEmit`, production build, Prisma migration status, and whitespace validation.
- Phase 6 tenant-isolation correction: Script Architect now clears client-scoped workspace state immediately when the active client changes, aborts the prior account's requests, and accepts list, generation, or save responses only when their request version and client account still match the current selection.
- Re-verified `GET /api/scripts` directly for Northstar and Atlas: each response returned only its active client account's persisted scripts (zero cross-tenant rows). Persisted script records remain correctly partitioned between Atlas and Northstar, with audit events intact.

### In Progress
- None. Phase 6 is complete and awaiting review.

### Pending
- Phase 7 and later MVP modules only.

### Notes / Decisions
- Script generation is a deterministic, server-side context/template engine so the output remains explainable and provider-independent. It can be replaced or augmented by an external model provider later without changing the API or editor contract.
- Generated scripts are never sent automatically. Agents can edit every field, write a fully manual script, and save corrections; edits are marked as manual overrides and audited.
- The Script Architect keeps its existing UI; the correction is limited to client-change request lifecycle and stale-response protection.
- Phase 7 workflow and calendar scheduling was intentionally deferred until its dedicated phase.

## Phase 7 - Status

### Completed
- Inspected the placeholder Calendar Planner, the active-client request context, canonical interactions, and the Phase 6 dependency graph before implementing workflow and scheduling.
- Added canonical `Appointment` persistence scoped to organization and active client account, optionally linked to a contact and the interaction that initiated the scheduling workflow.
- Added appointment status, source, provider, external-mapping fields, tenant indexes, and audit actions through migration `20260822115547_phase7_workflow_scheduling`; regenerated Prisma Client.
- Added `GET /api/calendar/events`, `POST /api/calendar/schedule`, and `PATCH /api/calendar/events/:id`. All enforce active-client access, create/edit/cancel persisted appointments, and return safe errors.
- Added deterministic, server-side scheduling-intent detection over canonical interactions. It proposes a scheduling candidate only; an agent must explicitly select date/time and create the appointment.
- Added a calendar provider adapter boundary with a functioning local `MOCK` adapter and a no-dependency `MANUAL` calendar fallback. Google and Outlook have explicit server-side adapter slots and safely direct the agent to the manual fallback until configured.
- Replaced the Calendar Planner's sample-only state with the persisted active-client schedule, intent candidates, contact-name search, agent-confirmed scheduling modal, meeting edits, confirmation status, and cancellation controls while preserving the existing dashboard design system.
- Added client-change request cancellation and stale-response protection so an outgoing client calendar response cannot render over the newly selected client.
- Verified a scheduling-language interaction produced an Atlas intent candidate; a MOCK appointment was created with `INTENT_DETECTED`, confirmed, cancelled, and audited. A separate manual appointment persisted across a fresh process, and neither appointment was visible or mutable through Northstar.
- Passed `tsc --noEmit`, Prisma migration status, production build, and whitespace validation.
- Phase 7 frontend refinement: restored the Calendar Planner's visual scheduling experience with persisted appointments rendered in interactive Day, Week, and Month grids. Clicking a slot starts the existing manual schedule flow; clicking an appointment opens the existing edit/confirm/cancel flow.
- Scheduling signals are now a compact secondary panel beside the primary calendar canvas, and the explanatory implementation banner was removed from the user-facing page. TypeScript and the production build pass.

### In Progress
- None. Phase 7 is complete and awaiting review.

### Pending
- Phase 8 and later MVP modules only.

### Notes / Decisions
- Scheduling intent is deliberately advisory. The manual date/time modal is the required failsafe and remains available even when intent detection finds nothing or an external provider is unavailable.
- The MVP's local calendar integration uses a persisted MOCK adapter; provider credentials and live Google/Outlook integrations are intentionally deferred until their server-side adapters are configured.
- Phase 8 commissions and sales operations was not started.

## Phase 8 - Status

### Completed
- Inspected the Phase 7 calendar, active-client boundary, existing telemetry presentation, and the MVP financial/operations requirements before implementing Sales Operations.
- Added canonical, tenant- and active-client-scoped `Deal`, `CommissionRecord`, `CommissionLedgerEntry`, and `TimeLog` persistence with source deal, contact, user, status, currency, manual-override, and reconciliation relationships.
- Added and applied Prisma migration `20260822122711_phase8_sales_operations`; regenerated Prisma Client.
- Added `GET`/`POST /api/commissions`, `PATCH /api/commissions/:id`, `GET`/`POST /api/time-logs`, and `PATCH /api/time-logs/:id`. All enforce active-client access, keep accounting rules server-side, and return safe errors.
- Added manual off-platform closed-deal entry, expected/received commission tracking, payment and expected-payout adjustment ledger entries, derived payment status, and persisted audit events.
- Added manually created and corrected account time logs with contact validation and audit events.
- Added `/operations` and a Sales Operations sidebar entry. The workspace uses the established glass/card system with a polished reconciliation hierarchy, payout metrics, traceable ledger rows, compact time ledger, contact-name selection, composed empty states, and CSV reconciliation export.
- Verified an Atlas off-platform deal, partial payment, expected-payout correction, and corrected 90-minute time log. The persisted summary showed expected `100000`, received `60000`, and pending `40000` cents; a fresh process read both records successfully. Northstar could neither read nor update the Atlas commission.
- Passed `tsc --noEmit`, Prisma migration status, production build, and whitespace validation.

### In Progress
- None. Phase 8 is complete and awaiting review.

### Pending
- Phase 9 and later MVP modules only.

### Notes / Decisions
- Financial amounts are stored as integer cents to avoid floating-point reconciliation errors; formatted currency is presentation-only.
- Initial Phase 8 records are explicitly manual/off-platform. Payment and adjustment ledger entries are the manual failsafe and remain auditable; CRM-originated deal ingestion can be added later without changing the canonical data model.
- Time logs are currently manually entered/corrected because the existing integrations do not supply a reliable duration signal. The model leaves room for measured automated sources later.
- Phase 9 document and proposal generation was not started.

## Phase 9 - Status

### Completed
- Inspected the Phase 8 deal/commission context, Phase 5 lead analyses, Phase 6 scripts, Phase 7 appointments, and active-client request boundary before implementing the Document & Proposal Generator.
- Added canonical, tenant- and active-client-scoped `Document` persistence with optional contact, lead-analysis, deal, user, generated-context snapshot, draft/final status, manual-override state, and PostgreSQL-backed PDF bytes for uploaded source proposals.
- Added and applied Prisma migration `20260822124628_phase9_documents`; regenerated Prisma Client.
- Added `GET`/`POST /api/documents`, `POST /api/documents/generate`, `PATCH /api/documents/:id`, `POST /api/documents/upload`, and authenticated `GET /api/documents/:id/download`.
- Added deterministic server-side generation for proposals, follow-up emails, and follow-up messages using only the active client’s brand, optional contact, lead-analysis requirements/timeline, and deal context. Generated documents are always saved as drafts for review.
- Added manual document creation and editing, agent replacement of generated content, final-status control, PDF upload validation (PDF only, up to 5 MB), persistent file storage, and download support.
- Added `/documents` and a Documents & Proposals sidebar entry. The workspace preserves the existing design system while providing one-click draft types, context selectors, contact-name search, full manual editor, upload workflow, saved document library, and explicit review checkpoint.
- Verified an Atlas generated brand-aware proposal, manual follow-up, final manual override, PDF upload/download, persisted records across a fresh process, audit events, and Atlas/Northstar isolation. Northstar could not read or patch Atlas documents.
- Passed `tsc --noEmit`, Prisma migration status, production build, and whitespace validation.

### In Progress
- None. Phase 9 is complete and awaiting review.

### Pending
- Phase 10 end-to-end integration and system testing only.

### Notes / Decisions
- The document generator is a deterministic server-side template engine. It makes the source context visible through the resulting draft without representing an unconfigured external AI provider.
- Generated content is never sent automatically. Manual creation, editing, source-PDF upload, and finalization are the required agent-controlled failsafes.
- PDFs are stored in PostgreSQL for the MVP with a strict 5 MB limit. A production deployment can move this field to private object storage without changing the client/API contract.
- Phase 10 was not started.

## Phase 10 - Status

### Completed
- Read `Architecture.md`, `MVP.md`, and `MVP_PROGRESS.md` in full and treated the completed Phase 1–9 implementation as the system under test.
- Mapped the cross-module flow from active client account through CRM sync, canonical contacts, interactions, lead analyses, scripts, appointments, deals/commissions, time logs, documents, and audit records.
- Added the focused repeatable `npm run test:system` check. It exercises the authenticated App Router handlers against the configured development PostgreSQL database without deleting existing data, then supports a fresh-process persistence read with `node scripts/phase10-system-test.cjs --verify <marker>`.
- Verified the end-to-end workflow for Atlas: manual CRM sync, persisted contact consumption, manual interaction, manual communication fallback, lead analysis, generated-and-edited script, scheduling/confirmation, manual closed deal and ledger payment, corrected time log, generated-and-reviewed proposal, and uploaded/downloaded PDF.
- Verified Atlas and Northstar server-side isolation for contacts, sync results, interactions, analyses, scripts, appointments, commissions, time logs, and documents. Cross-client reads are absent; attempted cross-client creates and updates return safe, structured 404/422 errors.
- Added canonical relationship validation so a lead analysis cannot attach an interaction to a different contact; scripts inherit a linked analysis contact and reject mismatches; documents reject inconsistent contact/analysis/deal combinations and infer a valid linked contact when one is supplied by the selected context.
- Corrected Copilot interaction selection to use the interaction's canonical contact ID rather than matching first/last names.
- Added active-client request-version guards and immediate state clearing to Dialer, Copilot, Timeline, and the Leads manual-sync flow so a late response from the prior account cannot overwrite the newly selected client's workspace.
- Corrected commission-ledger audit records to identify the actual `CommissionLedgerEntry`, not the parent `CommissionRecord`; the system test verifies this canonical audit link.
- Verified persistence with a separate Node process after creation. The confirmed marker `phase10-1787406590439` was readable after process restart across contacts, interactions, analyses, scripts, appointments, commissions, time logs, documents, and sync history.
- Verified Prisma schema validation, migration status, Prisma Client generation, `tsc --noEmit`, and two clean production builds. All nine migrations are applied to PostgreSQL database `multicrm`, schema `public`.
- Performed authenticated production route smoke checks for `/`, `/integrations`, `/leads`, `/dialer`, `/timeline`, `/copilot`, `/scripts`, `/telemetry`, `/calendar`, `/operations`, `/documents`, and `/multi-crm`: every route returned 200, remained on its requested URL, and rendered its expected page content.

### In Progress
- None. All ten MVP phases are complete and awaiting review.

### Pending
- Post-MVP refinements only; do not begin them automatically.

### Notes / Decisions
- PostgreSQL inspection confirmed tenant-partitioned development data. At the final check, Northstar had 12 contacts/12 external records and Atlas had 2 contacts/2 external records; all later canonical entities also remained independently scoped by `clientAccountId`.
- `npm run lint` was run but does not currently pass because of existing repository-wide frontend lint violations and an unscoped lint command that exceeded the command timeout. Broader legacy lint remediation is not required for MVP functionality and was not expanded in this phase.
- A `pg` deprecation warning appears during the direct concurrent handler system runner. Its trace terminates inside Prisma 7.9.1's `@prisma/adapter-pg` transaction implementation (`PgTransaction.performIO`); the end-to-end test, persistence read, TypeScript check, and production build remain successful. Track adapter/driver compatibility for a future dependency upgrade.
- The production smoke check is route/content-level HTTP verification. A browser-rendered visual QA pass remains appropriate before release, especially for responsive interactions and client switching, but no route 404 or shared-layout regression was found.
- Existing provider boundaries remain intentional: HubSpot/MOCK CRM, MOCK/manual communication and calendar flows, and deterministic server-side rules/template engines are verified; live Twilio, Google/Outlook Calendar, additional CRMs, email providers, and external LLMs were not added.
- Post-MVP refinements recorded: editable canonical lead fields with optional CRM write-back; Admin/Manager versus Agent RBAC for company-wide operations/commissions/reconciliation; final product distinction between client analytics/telemetry and internal sales operations; live provider connections; and complete server-backed authentication replacing the development bootstrap session.

## Post-MVP Stage 1 - Status

### Completed
- Read the architecture, MVP, completed implementation state, and post-MVP plan before starting Stage 1.
- Preserved the existing canonical-contact write-back implementation and its HubSpot adapter boundary; supported CRM fields remain first name, last name, email, phone, and company only.
- Extended Unified Leads to load the active client account's persisted lead analyses alongside canonical contacts, attach each contact's latest analysis, and show real lead score, temperature, deal probability, budget, timeline, summary, intent, requirements, objections, and manual-override state.
- Added an in-app assessment editor in the existing Leads design system. It reuses `PATCH /api/lead-analyses/:id`, marks the saved assessment as a manual override, and preserves the existing audit trail without writing internal AI fields to HubSpot.
- Kept CRM contact editing and HubSpot retry controls separate from internal assessment editing, so an agent can explicitly choose the appropriate manual control.
- Verified authenticated active-client contacts and analyses responses for Northstar (12 contacts, 1 analysis) and Atlas (2 contacts, 6 analyses); every contact-linked analysis belonged to its selected client account.
- Passed `tsc --noEmit`, production build, and whitespace validation.
- Corrected the Stage 1 dashboard API-response regression in Dialer, Sales Script Architect, and Calendar Planner. Their nested API endpoints now return JSON after a fresh server start, unknown `/api/*` paths return the standard JSON 404 contract, and each affected client validates `response.ok` and `content-type` before parsing JSON so failures appear as in-app feedback.
- Verified authenticated JSON responses for `/api/communications/identities`, `/api/scripts/templates`, `/api/calendar/events`, `/api/contacts`, and `/api/scripts`; verified JSON 401 for an unauthenticated API request and JSON 404 for an unknown API path. Passed `tsc --noEmit`, production build, the Phase 10 system test, and its fresh-process persistence check (`phase10-1789748872686`).

### In Progress
- None. Stage 1 is complete and awaiting review.

### Pending
- Stage 2 - Authentication & RBAC and later post-MVP stages only.

### Notes / Decisions
- The latest persisted analysis per contact is the assessment shown in Unified Leads; complete analysis history remains available in Copilot.
- AI analysis is intentionally a platform-owned/manual-override assessment, not a HubSpot contact property. Only the established canonical contact fields participate in HubSpot write-back.
- Bidirectional data behavior remains: HubSpot manual import updates canonical contacts without duplicate mappings; local canonical edits attempt an outbound HubSpot PATCH and retain local changes with an auditable retry on provider failure.
- The configured Northstar HubSpot token can read contacts but previously returned 403 on PATCH because it lacks `crm.objects.contacts.write`. Grant that scope and use the existing Leads "Save & Sync HubSpot" / "Retry HubSpot" controls to complete the live provider-success test; no credentials are exposed to the frontend.
- Regression root cause: the existing live `next dev` process had a stale nested App Router route table. It served Next's HTML 404 document for valid nested API routes even though their route files were present in the generated route manifest. `proxy.ts` explicitly excludes `/api`, so this was not an authentication, RBAC, redirect, or active-client failure. Restarting the server restored those handlers; the JSON fallback and client boundary make this failure mode safe and visible if it recurs.

## Post-MVP Stage 2 - Status

### Completed
- Read `Architecture.md`, `MVP.md`, `MVP_PROGRESS.md`, and `POST_MVP_PLAN.md` in full before starting the authentication and RBAC work. Used the existing dependency graph to trace session, proxy, active-client, API, and dashboard boundaries.
- Replaced the development/browser bootstrap identity with PostgreSQL-backed `AuthSession` records. Passwords use salted Node `scrypt` hashes; session tokens are random, stored only as SHA-256 hashes, use secure HTTP-only cookies, and expire after seven days.
- Added real JSON auth endpoints: `POST /api/auth/signup`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, and validated `POST /api/auth/client-account`. Signup creates an active organization administrator and a first client account; client selection is always validated server-side.
- Updated every existing domain API route to await the persisted request context. The request boundary verifies the active user, account status, organization, role, and selected-client access before any domain service query runs.
- Replaced the static demo client selector with the authenticated user’s assigned client accounts. Agents can select only assigned active clients; Admins and Managers can select active clients in their organization. Client selection now uses a server-set cookie instead of a browser-writable authority boundary.
- Implemented server-enforced Admin/Manager access to company-wide dashboard data: agents, client coverage, all commissions, time logs, sync runs, and audit events. Added admin-only user create/update APIs, including client assignment validation and audit entries.
- Restricted the existing client Operations API for Sales Agents to records they created themselves. Admins and Managers retain company/client-level visibility. This is enforced in the service layer, not just hidden in the UI.
- Added `/admin` using the established design system for company analytics, operations reconciliation, team/client coverage, and telemetry/audit activity. Removed Telemetry & Logs from agent navigation and redirected the legacy `/telemetry` route to the elevated admin workspace.
- Added and applied Prisma migration `20260918120000_post_mvp_stage2_auth_rbac`; regenerated Prisma Client. Updated the system runner to use a genuine stored test session rather than the retired bootstrap cookie.
- Verified production HTTP signup creates an `ADMIN` and assigned first client; an Admin can create an assigned `AGENT`; that Agent can sign in and sees only its assigned client; and the Agent receives structured `403 FORBIDDEN` from `/api/admin/dashboard`.
- Passed Prisma migration status, `npx tsc --noEmit`, `npm run build`, `npm run test:system`, and fresh-process persistence verification for marker `phase10-1789750358468`.

### In Progress
- None. Stage 2 is complete and awaiting review.

### Pending
- Stage 3 - UI / UX Refinement and later post-MVP stages only.

### Notes / Decisions
- Session lookup is database-backed on every protected request so suspension and role changes take effect without trusting browser claims. The proxy remains an optimistic navigation guard; the API request context is authoritative.
- Authentication cookies are HTTP-only. The active client account remains server-validated even if a browser attempts to alter its cookie value.
- Managers have company-wide read access to the admin workspace but user creation, role changes, and assignment changes remain Admin-only.
- The legacy development operator account no longer bypasses authentication. Use the signup screen to create a real administrator account; the Admin control center provides company visibility, while the protected Admin user APIs create users and manage their assignments.
- No Stage 3 visual-polish work or external-provider work was started.

## Post-MVP Stage 2 RBAC Workspace Correction - Status

### Completed
- Corrected the Stage 2 workspace architecture so Admin/Manager and Agent users no longer share a dashboard layout or sidebar. Existing Agent routes now live in the `(agent)` route group, while `/admin` and its child routes live in the independent `(admin)` route group.
- Added server-rendered workspace guards backed by the existing PostgreSQL `AuthSession` lookup. Unauthenticated page requests go to `/login`; `ADMIN`/`MANAGER` users are routed to `/admin`; `AGENT` users are routed to `/`; stale or browser-authored role claims are never trusted.
- Moved `ClientAccountProvider`, the client selector, and the existing Agent shell entirely into the Agent layout. The Agent sidebar now contains only Home, Leads, Dialer, Timeline, Copilot, Scripts, Calendar, My Sales Operations, Documents, and the existing Agent integration tools; it has no Admin entry.
- Added a dedicated responsive Admin shell and navigation for Dashboard, Agents / Team, Client Accounts, Assignments, Company Sales Operations, Commissions / Reconciliation, Business Analytics, Integrations / Sync Health, and Audit Logs.
- Preserved and reused the Stage 2 Admin service authorization boundary. `AGENT` requests to Admin APIs return JSON `403 FORBIDDEN`; `MANAGER` access is company-wide but read-only for access administration; user, assignment, and client-account mutations remain `ADMIN`-only.
- Added Admin UI controls and organization-scoped APIs for creating team members, assigning Agents to client accounts, creating client accounts, and changing client-account status. Added auditable `CLIENT_ACCOUNT_CREATED` and `CLIENT_ACCOUNT_UPDATED` actions through migration `20260918173000_stage2_workspace_separation`.
- Kept all Agent module URLs and functionality intact: Leads, HubSpot sync, Timeline, Dialer, Copilot, Script Architect, Calendar, Sales Operations, Documents, Integrations, and active-client switching remain in the Agent workspace.
- Corrected login/signup routing and language: login uses the server-returned role to enter the correct workspace; signup provisions a company Administrator and opens `/admin`; authenticated visits to auth pages are redirected by the server-backed role.
- Added a required role dropdown to both authentication screens. Login reveals the credential form only after choosing Admin / Manager or Sales Agent, sends the intended workspace to the server, and creates a session only when that selection matches the persisted user role.
- Added role-aware signup paths. Company Administrators can self-register a new company; Sales Agents are directed to use credentials provisioned from Admin Workspace → Agents / Team. The signup API independently rejects Agent self-registration so an unaffiliated user cannot join a company or bypass client assignments.
- Verified the role-selection contract over the production HTTP server: missing role returned 422; Admin-as-Agent and Agent-as-Admin attempts returned 403 without session cookies; correct Admin, Manager, and Agent logins returned 200 and opened their respective workspaces; Agent self-signup returned 422. Both `/login` and `/signup` rendered their expected role options.
- Explicit production HTTP authorization tests passed: Admin `/` redirected to `/admin`, Admin pages/APIs returned 200, Agent `/` returned 200, Agent direct `/admin/agents` returned 307 to `/`, Agent direct Admin API returned 403, forged unassigned-client access returned 403, cross-company user mutation returned 404, and cross-company assignment returned 422.
- Restart verification passed: persisted Admin and Agent credentials retained their roles, workspace access, API authorization, and Agent assignment count after a full production-server restart. The two temporary test organizations were then removed from PostgreSQL.
- Production route smoke passed for `/`, `/integrations`, `/leads`, `/dialer`, `/timeline`, `/copilot`, `/scripts`, `/calendar`, `/operations`, `/documents`, and `/multi-crm` as an Agent. Every preserved route returned 200, the rendered Agent shell contained no Admin navigation, and `/admin` redirected back to `/`.
- Passed Prisma schema validation, migration deployment, Prisma Client generation, `npx tsc --noEmit`, `npm run test:system`, production build, route-manifest inspection, and whitespace validation.

### In Progress
- None. The Stage 2 RBAC architecture correction is complete and awaiting review.

### Pending
- Post-MVP Stage 3 UI / UX Refinement and later stages only. Do not begin automatically.

### Notes / Decisions
- Route groups organize the separate workspaces without changing established Agent URLs. `/admin/*` is the only Admin page namespace.
- Page authorization is enforced in server layouts using the same database-backed session and role helpers used by authentication. API authorization remains independently enforced in the Admin service, so hiding navigation is never treated as a security boundary.
- Admin/Manager pages do not mount or depend on active-client state. Their queries are scoped by `organizationId`; Agent domain requests continue to require an assigned active client and Agent operational queries continue to filter by `userId` where appropriate.
- The role dropdown is a workspace choice, not an authorization claim. Authorization continues to come exclusively from the database-backed user and session; a mismatched dropdown selection is denied before session creation.
- The legacy `/telemetry` Agent URL now returns Agents to `/`; telemetry, sync health, and audit activity are available only inside the protected Admin workspace.
- No Stage 3 visual redesign or external-provider implementation was started.

## Post-MVP Stage 2.5 - Status

### Completed
- Read `Architecture.md`, `MVP.md`, `MVP_PROGRESS.md`, `POST_MVP_PLAN.md`, and `STAGE_2.5_INTEGRATION_FRAMEWORK.md` completely; inspected the existing RBAC boundaries, HubSpot adapter, contact synchronization, database mappings, and both Integration Hub surfaces before changing them.
- Used the existing provider registry and adapter contract rather than duplicating HubSpot logic. Generalized it to `IntegrationAdapter` capabilities while preserving HubSpot contact list/PATCH behavior and the MOCK adapter.
- Refactored the existing `CrmConnection` table in place into Prisma `IntegrationConnection` (retaining the physical table and IDs) with `COMPANY`, `CLIENT_ACCOUNT`, and `USER` ownership, provider-account metadata, scopes, connection timestamps, last-sync state, and safe error status.
- Added separate `IntegrationCredential` and `OAuthState` persistence. OAuth access/refresh tokens use server-only AES-256-GCM authenticated encryption; OAuth state is random, SHA-256 hashed at rest, expires after ten minutes, is one-time use, and is bound to company, ownership target, and initiating user.
- Added and applied migration `20260919120000_stage2_5_integration_framework` to PostgreSQL database `multicrm`, schema `public`; regenerated Prisma Client. Existing HubSpot/MOCK connection IDs, 14 `ExternalRecord` mappings, and prior `SyncRun` history were preserved.
- Implemented HubSpot OAuth authorization and callback, minimal contact read/write scopes, code exchange, encrypted per-connection credential storage, proactive token refresh, refresh-failure state/audit handling, and token revocation against HubSpot's current `2026-03` OAuth endpoints.
- Kept a narrowly isolated server-only compatibility path for the existing `env:HUBSPOT_ACCESS_TOKEN` reference so working contact sync is not interrupted before manual OAuth reauthorization. Completing OAuth replaces that connection credential with encrypted per-connection tokens.
- Added authenticated JSON APIs: `GET /api/integrations`, `POST /api/integrations/hubspot/connect`, `GET /api/integrations/hubspot/callback`, `DELETE /api/integrations/:id`, and `POST /api/integrations/:id/sync`, `/retry`, and `/disconnect`.
- Enforced ownership and RBAC server-side: Agents see only company services, their own user connections, and the selected assigned client's connections; stale/non-active client integration actions are rejected; Agents cannot disconnect client/company integrations; Admin/Manager access remains organization-scoped and can manage company/client connections.
- Added `allowAgentIntegrationManagement` as an explicit client-account permission and an Admin Client Accounts control for it. Agents can initiate client HubSpot OAuth only when assigned and explicitly permitted.
- Replaced the simulated Agent Integration Hub with real persisted status, provider-account information, last sync/error display, OAuth connect/reconnect, Sync, and Retry controls. Added real Admin/Manager integration ownership selection, connection listing, sync/retry, and disconnect controls while preserving the existing design system.
- Unified direct Integration Hub sync/retry with the existing canonical contact persistence service. Sync updates `lastSyncAt`/status, creates `SyncRun` and audit records, preserves duplicate prevention through `ExternalRecord`, and retains local-first outbound failure/retry behavior.
- Expanded the system runner to handle server-only module boundaries and verify credential encryption, JSON authentication failures, credential redaction, active-client connection isolation, Agent connect/disconnect restrictions, retry, live HubSpot inbound contact synchronization, duplicate prevention, and live outbound PATCH through the existing provider ID mapping.
- Passed Prisma validation and migration deployment, Prisma Client generation, `npx tsc --noEmit`, focused ESLint checks, `npm run test:system`, `git diff --check`, and `npm run build`. The production route manifest includes every new integration endpoint and both Agent/Admin Integration Hub pages.

### In Progress
- None. Stage 2.5 implementation is complete and stopped for manual OAuth testing/review.

### Pending
- Configure a HubSpot public app and complete the first browser OAuth consent using the exact callback URL before removing the temporary development-token compatibility reference.
- Stage 3 UI/UX Refinement only after explicit approval. Twilio, Calendar, AI, and additional CRM providers remain unstarted.

### Notes / Decisions
- Required local server configuration is `HUBSPOT_CLIENT_ID`, `HUBSPOT_CLIENT_SECRET`, `HUBSPOT_REDIRECT_URI=http://localhost:3000/api/integrations/hubspot/callback`, and a stable 32-byte base64 or 64-character hex `INTEGRATION_ENCRYPTION_KEY`. Values belong only in `.env.local`/deployment secrets and must never be committed.
- HubSpot OAuth requests only `crm.objects.contacts.read` and `crm.objects.contacts.write`. Provider tokens and credential metadata never enter browser state, API responses, logs, or client-readable cookies.
- Company- and user-owned connections are supported by the generic framework, but contact synchronization remains intentionally limited to client-owned CRM connections because canonical contacts belong to a selected client account.
- Existing HubSpot contact APIs remain `/crm/v3/objects/contacts`; only the OAuth token lifecycle uses HubSpot's current date-versioned `/oauth/2026-03/*` endpoints.
- The repository-wide `npm run lint` command exceeded the execution timeout without output. A focused ESLint run over all Stage 2.5 implementation files passed; two pre-existing `react-hooks/set-state-in-effect` violations remain in unrelated legacy sections of `AdminWorkspacePage.tsx` when that whole file is linted.
- The known Prisma `@prisma/adapter-pg` deprecation warning still appears after successful system tests; no Stage 2.5 test failed because of it.
