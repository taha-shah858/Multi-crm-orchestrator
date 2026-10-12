<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project direction and persistent requirements

Before planning or implementing project changes, read `documentation/PROJECT_REQUIREMENTS.md` and `documentation/PROJECT_ALIGNMENT_AUDIT.md`. They record the user's required modules 6.1–6.9, manual failsafes, CRM ownership, account ownership, and current gaps. Read `documentation/architecture.md` for the current implementation structure. Preserve HubSpot = Agency CRM, Zoho = Client CRM, ClickUp = Agent CRM, and the invariant that client switching keeps the same agency lead directory. Verify branch-specific implementation before relying on historical progress documents or earlier chat claims.

Work from the current verified checkout. The earlier `twilio+calendly` and `email-setup` local branches were deleted during user-authorized branch cleanup. Their names in dated reports describe historical work. The separate deferred signup/authentication feature is not automatically authorized by that cleanup; do not recreate or integrate it without a later instruction. Existing admin OTP signup and password recovery are part of the current baseline.

On 2026-10-11 the user superseded the earlier protection of `new` and authorized local consolidation from `codex/unused-code-cleanup`. Check current branch names before working; do not assume those historical refs still exist or automatically copy future changes to other branches. Do not modify GitHub unless explicitly requested.
