# PostgreSQL persistence audit

Checked 2026-10-07 on `codex/auth-validation-integration`, against the local `multicrm` PostgreSQL database (`public` schema).

## Conclusion and limits

The application's main operational modules have PostgreSQL persistence paths and existing records. It would be inaccurate to say that everything visible in the app is stored in PostgreSQL: the agent home dashboard is explicitly labeled as a sample-data preview, its add-CRM and refresh controls only change local state, and the Multi-CRM visualization's Sync Clusters button only animates. There is also a broken ClickUp sync URL in the Sales Operations UI.

This was a read-only live database inspection plus a source audit of pages, routes, services and models. Database queries ran in read-only transactions. No user records were created, updated or deleted, no external synchronization was triggered, and no email/call was sent. This does not independently prove every UI mutation by submitting it and reloading it. Existing test/demo rows cannot establish successful live provider operation.

## Database verification

- All 38 current Prisma models have their corresponding tables and scalar columns in PostgreSQL; no missing model tables or columns were found.
- All local migration files are recorded as successfully applied; no pending local migrations were found.
- Inspected 115 database foreign-key relationships: no orphan references or organization mismatches across references where both tables have organization IDs were found. This is a stored-data check, not a complete authorization audit.
- Two additional tables (`AuthOAuthAttempt`, `SignupChallenge`) and migration `20261001120000_verified_self_signup` exist in the shared database but are outside this checkout's Prisma schema/migration files. They appear to be earlier branch history. They were preserved. Schema alignment here means current models/columns are present, not that the database has no additional historical schema.
- Data belongs to separate agencies. Records from `acme`, `axelB2bsales`, and `Zenith Sales Agency` should not appear as one common workspace.

## Saved records at the audit snapshot

Counts include all agencies and existing development/test data, not only the signed-in user's records.

| Area | PostgreSQL models and counts | Save path checked |
| --- | --- | --- |
| Accounts/access | Organization 7; User 11; AuthSession 21; ClientAccount 10; ClientAssignment 12 | Auth and member services; admin user/client/assignment endpoints |
| Signup/invitations | WorkspaceInvitation 1; EmailVerificationToken 1 | OTP hashes/pending signup data stored before verification; accepted invite becomes User and consumed invitation is deleted; sessions created at explicit login |
| Agency CRM | Contact 69; Deal 39; CrmCompany 14; CrmOwner 2; ExternalRecord 129; CrmPipeline 2; CrmPipelineStage 12 | Contact import/sync, HubSpot sales sync, contact/company/deal create/update services |
| Timeline/communications | Interaction 80; CommunicationIdentity 2 | Manual log creation, dispatch status writes, Twilio inbound/status webhook writes |
| Analysis/scripts | LeadAnalysis 22; SalesScript 23 | Analysis creation/corrections and generated/manual script save/update |
| Commissions | CommissionRecord 23; CommissionLedgerEntry 47 | Manual/closed-deal commission creation, payment and adjustment ledger writes |
| Time Audit | TimeLog 37; TimeTrackingSession 1; 2 of 12 assignments have a client hourly rate | Tracking heartbeat/stop/pause and manual log writes; hourly rates persisted on ClientAssignment; expected pay calculated from stored rate and time |
| Scheduling | Appointment 26; CalendarConnection 2 | Confirmed local meeting persisted before remote sync; scheduling AI agreement saved as Interaction metadata; connection tokens stored encrypted |
| Documents | Document 41: 22 text documents and 19 uploaded-file rows | Generate/manual/edit/PDF upload services write content/file bytes to PostgreSQL |
| Client handoff/agent CRM | DealHandoff 6; ClientCrmRecord 36; AgentClickUpRecord 5 | Handoff/import/update and ClickUp tracking services |
| Connections/traceability | CrmConnection 8; IntegrationCredential 5; SyncRun 104; AuditLog 964 | Connection/credential writes, sync history and audit events |

Junction tables for contact/deal/interaction/company links also contain records and were included in the table/foreign-key inspection.

## Concrete gaps and qualifications

1. **Agent home is a preview.** `src/app/(agent)/page.tsx` contains static statistics, activity and CRM statuses. It has an explicit preview banner. `handleConnectNewCrm` appends an entry to React state after a timeout; it does not store credentials or create a database connection. Force Sync only animates. Use the actual Integrations module for persisted connections until this page is connected to live data.
2. **Multi-CRM Sync Clusters is visual only.** `src/app/(agent)/multi-crm/page.tsx` uses a two-second timeout and makes no API request. It does not write SyncRun or synchronize CRM records.
3. **Sales Operations ClickUp sync buttons call a missing route.** Both single and batch handlers in `src/app/(agent)/operations/page.tsx` call `/api/agent-sales/sync`. The implemented handlers are POST `/api/agent-sales` and POST `/api/agent-sales/[dealId]/sync`. The catch-all returns a JSON 404 for the requested missing URL. The batch endpoint returns `results`, while the current UI expects `syncedCount`/`failedCount`; connecting the URL alone will not fix the batch summary.
4. **Saved does not mean synchronized externally.** All six handoffs are recorded as SYNCED. Of five ClickUp tracking records, three are SYNCED and two FAILED. Of 26 appointments, two Google meetings are SYNCED, three Calendly meetings are FAILED, and 21 manual/mock meetings are LOCAL_ONLY. Failed remote operations therefore have retained local records, but provider success is not universal.
5. **Some existing data is development/sample data.** There are 19 MOCK appointments, MOCK identities/connections/interactions and records belonging to the development workspace. All 22 stored lead analyses report RULES_ENGINE; there are no stored GEMINI analyses in this snapshot. Persistence exists, but these rows do not verify live Gemini or Twilio. There are no stored TWILIO interactions or identities in this snapshot. The uploaded-file rows total only 303 bytes; their existence is not proof of valid real proposal PDFs.
6. **Unsaved input is temporary.** Text being typed, unsubmitted corrections, modal state and filters live in React state. The calendar script is saved only when analysis successfully finds meeting agreement; failures/no agreement retain text on the current page, not as a durable PostgreSQL draft. CoPilot transcript files are read in the browser; a completed analysis stores the transcript, not necessarily the original uploaded file. Saved documents/scripts/analyses have actual database writes.
7. **Some state is intentionally not a database record.** Theme and timer pause preference are in localStorage. Selected client/session identifiers are browser cookies backed by database users/sessions/assignments. Expected pay, dashboard/report aggregates and downloadable CSV files are calculated from persisted data rather than stored as separate duplicate records. Script template definitions are static source constants; created scripts are persisted. SMTP/Resend credentials are server environment configuration, not application database records.
8. **Historical/expired auth rows remain.** At inspection, 20 sessions and one verification record had expired. Authentication checks reject expired sessions/codes, but a retention cleanup task is separate from storing/rejecting them. Consumed invitation/code deletion is intentional, so their absence after success does not indicate lost registration.

## Recommended next work

Follow-up implemented on 2026-10-07: the agent home preview was replaced with a database-backed dashboard and real module navigation. The ClickUp buttons now call the implemented single/batch endpoints and display `SYNCED`, correct counts and partial-confirmation outcomes. See the latest progress entry in `PROJECT_ALIGNMENT_AUDIT.md`. Per the user's instruction, Sync Clusters remains unchanged. The findings above describe the audit snapshot before these fixes.

Fix the ClickUp URL and batch response contract first, then replace or remove preview-only CRM controls and connect home metrics to tenant-scoped database queries. Add durable draft saving if pasted transcripts must survive reload/provider failure. Review failed external sync records separately, without treating local persistence as provider success. Keep historical tables/data until branch compatibility and retention are deliberately addressed.

For full end-to-end certification, use isolated disposable test fixtures and verify each UI create/edit operation by reading it back after reload, including provider failure/retry and cross-client access. This audit did not perform those writes against real user data.

Graphify was consulted as a dependency locator; the installed CLI/interpreter was unavailable, so existing graph nodes were inspected with Node and current source was used as the authority. The graph predates recent integration work.
