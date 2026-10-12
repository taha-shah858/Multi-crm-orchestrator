# Documentation

The root README covers startup. This folder holds the maintained project documents. Architecture and status were reviewed against the `realbranch` checkout on 2026-10-12; dated database inventories and test reports remain snapshots of their stated environments.

## Project direction

- [Architecture](architecture.md): current runtime, ownership, services, database, provider paths, and reliability boundaries.
- [Requirements](PROJECT_REQUIREMENTS.md): required modules 6.1–6.9, manual failsafes, account ownership, and the acceptance scenario.
- [Alignment audit](PROJECT_ALIGNMENT_AUDIT.md): current implemented scope, gaps, and verification limits.
- [Local Docker development](docker-local-development.md): isolated setup, credentials, account creation, updates, and database lifecycle.

## Feature guides

- [Client CRM contact directory](client-directory-contacts.md)
- [Twilio gateway](twilio-gateway.md)
- [Calendar connections and sync](calendar-provider-sync.md)
- [Scheduling signals](calendar-scheduling-signals.md)
- [Commission reconciliation](commission-reconciliation.md)
- [Active time tracking](active-time-tracking.md)
- [Time Audit and hourly pay](time-audit.md)
- [Email/password validation](password-email-validation.md)

## Reference and historical evidence

- [Database reference](database-reference.md): detailed catalogue from the recorded local inspection, with a password recovery addendum. Counts, sizes, and PostgreSQL version describe that database, not a fresh Docker installation.
- [Persistence audit](database-persistence-audit.md): dated read-only inspection; its identified dashboard/ClickUp defects were subsequently corrected.
- [Authentication integration notes](auth-validation-merge.md): historical integration and test evidence; branch names describe the original integration.
- [UI/AI integration notes](ui-ai-backend-integration.md): historical integration and verification evidence.

## Cleanup decisions

The old POC, MVP specification/progress, post-MVP plan, stage 2.5–2.9 implementation briefs, and duplicate product/architecture specifications were removed. They mixed superseded provider ownership, proposed infrastructure and historical completion claims. Their relevant requirements are retained in the requirements and acceptance audit; the architecture guide replaces the two old architecture files. Deleted tracked documents remain recoverable from Git history.

`README.md`, `AGENTS.md`, `CLAUDE.md`, and `GEMINI.md` remain in the repository root because they are project/tool entry points. The generated `graphify-out/` directory is separate tool output, not maintained documentation, and can refer to removed documents until a deliberate graph refresh.
