# Authentication validation integration — 2026-10-07

The interrupted pull was backed up and aborted. Integration is isolated on `codex/auth-validation-integration`, merging `dcc25b2` from `multi-crm-authentication-validation` into `ai-ui-backend` at `9d41b25`. The original `ai-ui-backend` ref and `codex/backup-ai-ui-backend-20261007` retain the baseline. `new` and `email-setup` are untouched.

The working-tree snapshot and calendar text patch are in the task's local `merge-safety-20261007` backup directory. A named Git stash also preserves the uncommitted Calendar Planner text edit; it is restored after the merge commit and retained as a recovery copy. Local `.env.local` credentials remain outside Git.

## Combined behavior

- Retains existing Calendar Planner/Google/Outlook/Calendly, AI scheduling signals, Twilio, CRM boundaries, closed-deal commissions, reconciliation, independent client time tracking and hourly rates.
- Adds administrator signup email verification, OTP resend, password visibility, invitation acceptance, and member management from the requested branch. Existing accounts still sign in with their existing passwords. New passwords keep the existing 7–128 character uppercase/number/special-character policy.
- Adds database tables with an additive migration; existing user/CRM/calendar/ledger data is not reset.
- Verification is gated by a hashed code, expiry, five-attempt limit and resend cooldown. Code consumption and workspace creation commit together. Verification does not create an unused login session.
- Configured email failures are reported. Verification codes and invitation URLs are not logged in production. Local terminal-only email testing requires an explicit `EMAIL_DEV_LOG=true` and is unavailable in production.
- Invited agents start without client assignments. Administrators assign access afterward. Managers cannot invite privileged roles. Revocation suspends accounts and invalidates sessions while retaining deal/time/financial history. Assignment edits retain unchanged client hourly rates.

## Email configuration

Configure either `RESEND_API_KEY` with `SMTP_FROM` (a verified sender), or `SMTP_USER`/`SMTP_PASS` with `SMTP_HOST`, `SMTP_PORT` and optional `SMTP_FROM`. Configure `APP_URL` for invitation links. No real emails were sent during testing.

## Remaining product requirements

This merge does not merge or recreate `email-setup`, Google signup, independent public agent signup/approval by name, or complete the pending agent-email privacy requirements. The incoming branch still uses administrator email invitations. Those gaps remain subject to the project's separately deferred authentication work.

## Validation

`auth-credentials-test.cjs` and `auth-merge-integration-test.cjs` verify password/login compatibility, OTP gating and recovery, attempts/expiry/replay, transactional rollback, access boundaries, preserved hourly rates and history, and email failure handling using isolated fixtures and intercepted delivery. Existing calendar, scheduling analysis, active time tracking, commission/reconciliation, CRM boundary, Twilio and Gemini suites pass. TypeScript and production build pass.

The merged branch is for review; nothing is pushed or merged back into the original development branch automatically.
