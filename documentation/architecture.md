# Current architecture

Reviewed against the `realbranch` source on 2026-10-12. This describes implemented structure, not a promise that every required integration has passed live acceptance. See the [requirements](PROJECT_REQUIREMENTS.md) and [alignment audit](PROJECT_ALIGNMENT_AUDIT.md) for product obligations and remaining work.

## Runtime and repository

One Next.js 16.2.10 application runs both the React 19 frontend and the server API. TypeScript domain services use Prisma 7 with the PostgreSQL driver adapter. There is no separate NestJS service, Redis instance, BullMQ worker, Supabase authentication, or event bus in the current runtime.

```text
Browser: React pages and client components
        ↓ same-origin HTTP / server-rendered layouts
Next.js route handlers and server authorization
        ↓
Domain services in src/lib
        ├── Prisma + PostgreSQL: canonical records, credentials, audit/status
        └── Provider clients: HubSpot, Zoho, ClickUp, Twilio,
                              Google/Outlook/Calendly, Gemini/OpenAI, email
```

| Location | Responsibility |
| --- | --- |
| `src/app/(auth)` | Admin signup and role-aware login |
| `src/app/(admin)` | Agency administration, assignments, integration management and reporting |
| `src/app/(agent)` | Agent workspace and assigned-client context |
| `src/app/api` | Authenticated JSON APIs, OAuth callbacks and signed Twilio callbacks |
| `src/lib/auth`, `src/lib/members` | Passwords, database sessions, access checks, invitations and password recovery |
| `src/lib/integrations` | CRM adapter registry, OAuth, encrypted credentials and connection ownership |
| `src/lib/sync`, `src/lib/client-crm`, `src/lib/handoff`, `src/lib/agent-crm` | Agency import/writeback, client CRM records, closed-sale handoffs and ClickUp tracking |
| `src/lib/communications`, `src/lib/interactions` | Gateway dispatch, signed callbacks and persisted timeline |
| `src/lib/ai`, `src/lib/scripts`, `src/lib/documents` | Analysis, editable scripts and document storage |
| `src/lib/calendar`, `src/lib/operations` | Scheduling, provider synchronization, commissions, time and reports |
| `prisma/schema.prisma`, `prisma/migrations` | Relational models and schema migrations |
| `scripts` | Regression checks and explicit maintenance utilities |

The schema currently declares 40 Prisma models, including staged Zoho connection requests. Operational data, PDF bytes, hashed sessions, sync status and audit events are stored in PostgreSQL. Theme, unsubmitted form input and some timer preferences remain browser state. Reports calculate totals from persisted records; they are not separate copies of the financial ledger.

## Ownership and provider routing

| System | Owner and purpose |
| --- | --- |
| HubSpot | Agency/company CRM; supplies the shared Unified Lead Directory |
| Zoho | Selected client's CRM; receives relevant closed-sale handoffs and supported client updates |
| ClickUp | Signed-in agent's CRM/work tracker; mirrors the agent's closed-sale tracking |
| Google, Outlook, Calendly | Agent calendar accounts; meetings are attributed to the active client |
| Twilio | Configured account credentials and client-assigned communication numbers; selected identity determines client attribution |

Switching clients must keep the same agency HubSpot directory. It changes the operational client context, not agency ownership or the agent's ClickUp account. Imported provider IDs live in mappings and provider metadata, separately from local IDs. ActiveCampaign remains registered for legacy compatibility; it is not the planned client CRM. Provider enum names alone do not prove an adapter exists.

See [the registry](../src/lib/integrations/registry.ts), [request context](../src/lib/auth/request-context.ts), and [client connection resolution](../src/lib/client-crm/connection.ts).

## Authentication and boundaries

The app uses salted scrypt password hashes and random opaque session cookies backed by hashed tokens in `AuthSession`. Sessions are checked server-side, including role and active account status. `src/proxy.ts` performs optimistic redirects; API and layout checks provide authoritative access control.

Current public signup creates an admin workspace only after email OTP confirmation. Agents currently join through admin provisioning/invitations. Independent public agent signup, name-only approval and Google signup/sign-in remain product gaps. Calendar OAuth is separate from app authentication.

Password recovery uses hashed, expiring, single-use reset tokens. Reset, consumption, session revocation and audit writes are transactional. SMTP or Resend supplies email delivery; explicit development logging is a local fallback when no delivery provider is configured.

Service queries enforce organization, client assignment, ownership and role boundaries. Database foreign keys ensure parent existence, but do not replace scoped authorization. The application does not rely on PostgreSQL row-level security for tenant isolation.

## Integrations and consistency

Zoho onboarding now supports [client connection invitations](zoho-client-connection-invitations.md). Direct and invited OAuth verify the provider organization/current user, stage encrypted credentials and require agency approval. Replacement needs explicit confirmation; existing record mappings cannot silently cross organizations. The invitation callback uses its own browser binding and state, while ordinary callbacks retain app-session authentication.

CRM adapters are registered for HubSpot, Zoho, ClickUp, legacy ActiveCampaign and mock tests. OAuth state and encrypted token storage belong to the initiating user/organization and target. Tokens use AES-256-GCM with a private stable `INTEGRATION_ENCRYPTION_KEY`. Connection summaries must exclude secrets.

Managed HubSpot/Zoho connections support confirmed removal by Admin/Manager. Removal deletes local credentials, marks the connection disconnected/removed, and hides it from management and active resolution. Records and mappings remain attached to the archived row; Zoho organization-switch checks still apply. Reauthorization restores the row after the normal verification/approval checks.

Agency import persists canonical contacts, companies, deals and activity associations using external-record mappings. Local edits and explicit sync/retry are separate paths. Zoho handoffs and ClickUp tracking validate their client/agent/deal targets; synchronization may fail after local records have been saved.

Local database transactions cannot roll back an already completed CRM request, sent message or calendar booking. Services retain selected status/error information and mapping IDs. This is not a distributed all-or-nothing transaction, a durable cross-provider queue or globally exactly-once delivery. Comprehensive conflict policies, crash-safe orchestration and reconciliation remain work to finish.

## Other implemented workflows

- Twilio callbacks validate signatures and normalize SMS/call outcomes with provider-SID deduplication. Live voice uses a handset bridge; browser microphone calling is not implemented. Manual logs/phone links remain available.
- Lead analysis uses Gemini when configured and valid, otherwise a labeled rules-engine fallback. Analysis is editable and processes complete transcripts up to 100,000 characters; automatic approved-field CRM writeback and automatic transcription remain separate gaps. Scripts and proposals use a shared Gemini writing service with structured sections, scoped conversation context, optional briefs, validation and persisted provider/fallback provenance. Commercial proposal terms require manual confirmation. See [Gemini sales content](gemini-sales-content.md).
- Google/Outlook/Calendly use authenticated calendar connections and the calendar sync service. The separate mock adapter supports local tests. Appointments are saved before remote booking; Google/Outlook have stable create identifiers, while ambiguous Calendly creates require review. Personal calendar accounts remain agent-owned across clients.
- Closed-deal and manual commissions share commission/ledger records. Payments/corrections serialize balances and commit audit/ledger changes together. Reports group monetary totals by currency.
- Active time uses focused/visible-tab heartbeats and locked per-agent sessions. Manual time and audited corrections remain available. Time Audit stores per-client rates on assignments and computes expected pay; it is not payroll payment processing.
- Editable documents/scripts are persisted. Uploaded PDFs are stored as database bytes and downloaded through scoped endpoints. Generated follow-ups remain drafts.

## Local deployment and verification

Non-Docker development reads `.env.local`. Docker Compose runs a Node 22 app image and PostgreSQL 16 with `.env.docker`. These can use different databases, so accounts and tokens are not automatically shared. Compose exposes the app on port 3000 and PostgreSQL on localhost port 5433; the app connects internally to `db:5432`.

The image contains its own code/dependencies/generated Prisma client. `docker compose up --build` updates it after source or dependency changes. Startup runs `prisma migrate deploy`; the named PostgreSQL volume retains records. No dependency or repository bind mount masks the rebuilt image. This is a development deployment, not a public production hosting configuration.

Regression scripts cover selected authorization, failure, retry and accounting paths, often with disposable PostgreSQL fixtures and intercepted provider requests. Successful builds and mocks do not certify live consent, calls, calendar invitations, or all nine module acceptance scenarios. No application tests or provider operations were run as part of this documentation cleanup.
