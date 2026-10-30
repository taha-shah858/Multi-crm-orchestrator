# Alignment audit: modules 6.1–6.9

Documentation consolidated on 2026-10-12 against the `realbranch` source and [PROJECT_REQUIREMENTS.md](PROJECT_REQUIREMENTS.md). This replaces the older baseline audit, which described several already-corrected defects as current gaps. Historical test reports remain dated evidence; this review did not rerun application tests or call providers.

## Current baseline and verification

### Gemini sales content, 2026-10-24

AI contact selectors and server generation checks now share Client CRM's company/brand matching. Import storage under Axel no longer exposes every agency contact as Axel AI context, and Northstar-matched canonical leads can be selected for Northstar without copying contacts or changing the shared agency directory. Indirect interaction/analysis/deal context is checked against that same projection.

On `codex/gemini-sales-content`, Sales Script Architect and Documents & Proposals now call the existing Gemini API with structured, validated sections, relevant prospect conversations and an optional writing brief. Drafts save provider/model/fallback provenance and display truthful Gemini/template labels. Generation preserves existing saved manual edits. Proposal commercial terms remain review placeholders rather than prospect budgets/deal values. Copilot no longer silently truncates transcripts at 12,000 characters; it accepts complete inputs up to an explicit 100,000-character limit and validates qualification fields. See [setup, verification and limits](gemini-sales-content.md). Approved offer catalogues, evidence-linked analysis, document revision history and generated PDF/DOCX export remain open.

### Zoho onboarding, 2026-10-21

Implemented on `codex/zoho-client-onboarding`: externally shareable single-use client invitations, browser-bound OAuth without an agency app session, verified organization/current-user identity and encrypted staged credentials. Both direct and invited consent now require agency approval; existing connections require explicit replacement confirmation. Cross-client duplicate organization attachment and unsafe organization changes with existing mappings are blocked. Regional endpoints are allowlisted/persisted; untrusted callback destinations and mock-code bypasses are removed. Existing agency HubSpot data and agent assignments are unchanged. See [workflow, setup and tests](zoho-client-connection-invitations.md).

Migration `20261021000100_zoho_connection_requests` was applied to native development PostgreSQL and Prisma regenerated. The new onboarding regression suite, 63 CRM safety checks, existing 20-criterion Zoho client/handoff suite, TypeScript, targeted lint and production build validate controlled paths. The older suite's stale placeholder connection-ID assertions were corrected to use the actual fixture connection IDs. Fixtures are disposable and providers intercepted/mocked; live consent has not been verified. Existing generic connections with mapped records cannot safely change organization without reconciliation. Expired staged-token purge occurs on subsequent onboarding mutations, not a background job.

The current checkout includes consolidated CRM modules, UI/Gemini integration, authentication validation/admin OTP signup, agent dashboard/ClickUp corrections, password recovery and local Docker sharing. Previous implementation branches are historical references. The user authorized local branch consolidation on 2026-10-11; `new` is no longer permanently protected. `email-setup` was deleted locally with a recovery bundle preserving its history; deleting its branch did not integrate its separate authentication features.

Recorded checks before this cleanup include production builds, credential/auth integration, dashboard/ClickUp, CRM safety, commission, time, calendar, Twilio and Gemini regression checks. Feature documents describe their exact scope and fixture/provider interception limits. The user's Docker logs on 2026-10-12 show all 26 local migrations applied to a fresh PostgreSQL database and Next.js ready. Rebuild configuration validation confirms the app uses image dependencies and PostgreSQL retains its persistent volume. None of this proves every provider is live-working.

## Scope and remaining acceptance gates

| Module | Implemented scope in current source | Remaining work / acceptance evidence |
| --- | --- | --- |
| 6.1 Multi-CRM Sync | HubSpot canonical imports and supported writeback; Zoho client records/handoffs; ClickUp agent tracking; mapping/status and manual sync/retry | Durable cross-provider work, crash-safe replay, field conflict policies and offline import; prove partial failure/retry with actual provider records and unchanged agency leads across client switches |
| 6.2 VoIP/SMS | Client-assigned Twilio numbers, handset-bridge dispatch, signed callbacks, provider outcomes, manual logging/phone fallback | Browser audio is absent; prove real incoming/outgoing lifecycle and account/number ownership for two clients; assess provider-success/local-failure and ambiguous-send recovery |
| 6.3 Timeline | Persisted manual events, imported HubSpot activity, signed Twilio event ingestion and provider-ID deduplication | Complete email/inbound ingestion, full cross-source normalization, truthful status/UI, historical manual times and older-record pagination need acceptance review |
| 6.4 Analysis | Gemini structured analysis, labeled rules fallback, browser transcript intake, saved/editable analysis | Automatic call transcription and approved canonical CRM patches are absent; validate negation/grounding and preserve review; probabilities are estimates, not calibrated predictions |
| 6.5 Scripts | Gemini call/email/SMS drafts from scoped conversations, optional briefs, structured sections, provenance, labeled fallback and manual editing | Persistent approved offer/brand catalogue and live quality evaluation across representative sales conversations |
| 6.6 Finance | Closed-deal/manual commissions, locked payment/correction ledger, per-currency totals and full-period CSV | Payment-date/cash-flow reports, historical balances and paginated ledger browsing remain; verify concurrent/replayed operations and ClickUp projections against real provider records |
| 6.7 Time/reporting | Automatic focused/visible-tab measurement, competing-tab locks, idle/offline rules, manual corrections, per-client rates and complete Time Audit export | Confirm billing rules with users and verify broader session failures; lost unconfirmed intervals require manual correction; estimates do not establish payroll/payout receipt |
| 6.8 Scheduling | Agent Google/Outlook/Calendly OAuth, local-first appointments, provider sync/refresh, Calendly event-type/availability management, reviewed scheduling analysis | Live consent/book/edit/cancel acceptance, timezone/availability and invitations; personal-calendar bulk ingestion/background feed absent; ambiguous Calendly creates require provider review |
| 6.9 Documents | Gemini proposal/follow-up drafts, review-only commercial terms, labeled template fallback, manual editing and scoped PDF upload/download | Approved offer catalogue, actual revision history, branded generated PDF/DOCX export and live proposal acceptance review; automatic sending is not required |

## Authentication requirements still open

Current public registration is OTP-confirmed **admin** signup. Agent accounts join through invitations/provisioning, rather than independent public registration and name-only agency approval. Google signup/sign-in and complete agent-email privacy requirements remain open. Calendar OAuth does not satisfy Google app signup. Password visibility/policy, duplicate-email handling and password reset are implemented separately from those gaps.

Password recovery records one hashed random expiring token per user, serializes consumption, revokes sessions transactionally and preserves account role/assignments. Recorded password-reset checks cover replay, expiry, replacement, concurrent use, rollback, role isolation, delivery failure and existing/new login. Provider delivery was intercepted; no live email is certified by that test report.

## Corrected historical findings

- Agency HubSpot ownership and explicit Zoho routing replaced client-dependent agency directory reads and unsafe arbitrary-provider selection.
- Client CRM reads no longer run destructive fuzzy mirroring or implicit imports; explicit imports retain unrelated/manual records.
- Agent home uses database-backed metrics/activity; Sales Operations uses the implemented ClickUp single/batch endpoints and actual results. The Multi-CRM Sync Clusters visualization remains outside those corrections.
- Closed-deal commissions, serialized corrections and per-currency reports supersede the original finance gap descriptions.
- Active time and Time Audit supersede the old manual-only time description.
- Live calendar service paths and signed Twilio callbacks supersede the old mock-calendar/no-webhook descriptions.
- Gemini analysis supersedes the old claim that every analysis path is rules-only. Template scripts/proposals remain separate.

See [architecture](architecture.md) and the [feature guides](README.md) for source locations and limitations. Dated [persistence](database-persistence-audit.md) and [database catalogue](database-reference.md) snapshots describe their inspected database, not all current deployments.

## Completion discipline

Preserve HubSpot agency / Zoho client / ClickUp agent ownership and working manual fallbacks. Continue with scoped implementation and relevant acceptance checks. Priorities are recoverable synchronization, reviewed/grounded intelligence, unresolved authentication/account ownership requirements, and live two-client verification of existing provider paths.

The full integrated acceptance scenario in the requirements must be demonstrated with actual records, provider failures and cross-client denial before calling all nine modules complete. A Prisma transaction cannot undo external HTTP operations; retain per-destination outcomes and explicit retry/review states.
