<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project direction and persistent requirements

Before planning or implementing project changes, read `PROJECT_REQUIREMENTS.md` and `PROJECT_ALIGNMENT_AUDIT.md`. They record the user's required modules 6.1–6.9, manual failsafes, CRM ownership, account ownership, and current gaps. Preserve HubSpot = Agency CRM, Zoho = Client CRM, ClickUp = Agent CRM, and the invariant that client switching keeps the same agency lead directory. Verify branch-specific implementation before relying on historical progress documents or earlier chat claims.

The user explicitly deferred merging `email-setup` until the end after mail credentials are ready. Continue from `twilio+calendly` or focused `codex/` branches derived from the current baseline. Do not merge, cherry-pick, or recreate the deferred signup/authentication feature early; it does not block the other implementation stages.

The user also explicitly protected branch `new` as the existing structure. Leave its ref and committed contents unchanged. Implement changes on the focused development branch; do not merge back into `new` unless the user changes this instruction.
