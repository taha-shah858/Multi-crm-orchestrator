# UI, Gemini and backend integration

Historical integration branch: `codex/ui-ai-backend-integration`. This report records the original integration; use [current architecture](architecture.md) and [status](PROJECT_ALIGNMENT_AUDIT.md) for the maintained baseline.

Sources at integration: `codex/consolidated-modules` at `5302e58` and `origin/release/multiCRM_orchestrator` at `758b189`. Local branch retention was subsequently superseded by user-authorized cleanup.

The release branch's light UI, typography, navigation, cards, login/signup presentation and AI Copilot are adopted. Its calendar presentation is connected to the consolidated Google/Outlook/Calendly services, provider connections, invitation confirmation, ownership controls, retry/refresh and event-type manager. The shell still mounts active time tracking. Commission pages retain currency-specific totals, CSV filters and tracked-time corrections. Client CRM selection still uses Zoho; agency HubSpot ownership remains stable when switching clients. Twilio phone-bridge and timeline callbacks remain available.

Prisma still uses PostgreSQL and `DATABASE_URL`. No Supabase SDK, Supabase authentication or Supabase data migration is introduced. Optional `DIRECT_URL` can point migrations at a direct PostgreSQL connection; if absent, migrations use `DATABASE_URL`. No database credentials are copied from another branch.

Gemini uses server-only `GEMINI_API_KEY`; optional `GEMINI_MODEL` overrides the colleague's default `gemini-2.5-flash`. For a new Google AI project, choose a currently available model from https://ai.google.dev/gemini-api/docs/models; access to older 2.5 models can be restricted. Generation requests JSON output with a 20-second request timeout. Successful output is persisted as `GEMINI`; missing credentials, provider failures and invalid output use the existing `RULES_ENGINE` fallback and are labeled accordingly in Copilot. Manual edits remain available. The additive migration introduces the `GEMINI` enum value; existing records are preserved. Historical mislabeled analysis records are not retroactively changed.

Native setup: run `npx prisma migrate deploy`, `npx prisma generate`, set Gemini credentials privately in the server environment and restart the app. Docker setup is documented separately. The integration did not include the separate `email-setup` authentication features; later local branch consolidation superseded the former protection of `new`.

Automated acceptance: CRM boundary safety, commissions, reconciliation, active time, calendar providers, Twilio and Gemini checks, plus TypeScript and production build. Provider requests in integration tests are controlled; no real messages, invitations or transcripts are sent.

At integration time the inherited home dashboard was a labeled sample-data preview; a subsequent dashboard/ClickUp change replaced it with database-backed metrics and navigation. The global header no longer asserts a fixed pipeline value or unverified sync status. Live module pages retain their backend connections. The original targeted lint comparison found 14 inherited errors and no new error signatures; that count is historical, not a current lint certification.

Browser acceptance with disposable PostgreSQL fixtures: role-based sign-in, active time tracking, manual meeting create/edit/confirm and month view, calendar isolation across two assigned clients, rule-based analysis when Gemini is disabled, saved manual correction after reload and analysis isolation across clients. External invitations, calls and live Gemini requests were not made. Copilot's save action accurately describes saving an assessment; it does not claim to update external CRM fields.

Admin browser acceptance: existing session sign-in, actual tracked company time, commission date filters/currency-ledger columns, HubSpot/Zoho authorization controls and client-owned Twilio number assignment controls load in the new UI. No browser console errors were observed in this workflow.
