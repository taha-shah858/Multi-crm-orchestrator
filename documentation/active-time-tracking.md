# Automatic active work time — module 6.7

Originally implemented on `codex/active-time-tracking`, extending the existing manual time ledger. Current time entry/correction and hourly-pay UI is documented in [Time Audit](time-audit.md).

## Where it appears

- Agent workspace: a timer beside the client selector, with Pause / Resume. It tracks the selected assigned client across agent pages.
- Agent **Time Audit** (`/time-audit`): automatic and manual entries, timestamps, correction status, current-client/all-assigned-client totals and complete export. Sales Operations links to this report rather than duplicating its ledger/forms.
- Admin **Sales Operations** (`/admin/operations`): agent/client attribution, automatic/manual source and duration in Recent operational logs. Admin time totals include every matching entry.
- Open an agent Time Audit entry to correct its description, time and whole-minute report duration. Automatic entries may be corrected to zero. Manual **Add** remains available for off-platform work or connection failures.

## Tracking rules

- Tracking requires an authenticated active agent and an active assigned client. A heartbeat must match the selected-client cookie; admin work is not tracked.
- Only a visible, focused tab sends running heartbeats. Tracking pauses after two minutes without pointer, keyboard, touch or scroll activity, and on blur, hiding, navigation or manual pause. Activity/focus resumes unless manually paused. The pause preference persists in the browser and propagates to other tabs.
- Heartbeats checkpoint every 20 seconds. The server calculates elapsed seconds using its own clock; request bodies cannot supply durations or timestamps. Pauses save a final partial interval when the request can reach the server.
- One locked session row per agent prevents overlapping time across tabs/devices. A newly focused tab, reload, client change after reset or failed request begins a fresh interval. Old-tab pause requests cannot stop the new tab's session. Duplicate sequences from the current tab do not accrue time.
- Gaps longer than 60 seconds are excluded. Offline intervals and intervals following failed requests are not estimated; a pause queued after a failure also excludes that uncertain interval. Delayed requests cannot move the session timestamp backwards. Closing abruptly, losing a connection or transferring to another tab can lose the unconfirmed final interval, normally up to 20 seconds. Use a manual entry to account for known missing work.
- Zero-length starts do not create ledger clutter. Pause/resume creates separate work segments. UTC midnight splits segments so inclusive UTC date filters attribute each day's seconds correctly.
- Automatic entries retain exact `trackedSeconds`; their compatibility `minutes` field is rounded down. Reports sum seconds first, including short segments, then display fractional minutes/hours. Manual entries use their entered minutes.
- Corrections retain measured seconds for reference, use corrected minutes in totals, and close the currently edited segment. Future heartbeats create a new segment instead of overwriting the correction. The correction and audit record commit together under the same lock order as heartbeats.
- Detailed lists show the most recent 100 entries. Totals cover every matching entry. Date filters use UTC days; form date/time inputs display local time and convert back to UTC on save.

## Local setup and validation

The migration adds `AUTO`, measured seconds and the per-agent tracking session. Apply migrations and regenerate Prisma when moving to another checkout:

```sh
npx prisma migrate deploy
npx prisma generate
npm run dev
```

Run `node scripts/active-time-tracking-test.cjs` (or `npm run test:time-tracking`). It uses disposable local database fixtures, deterministic server clocks and a browser-controller harness; it sends no CRM or mail requests. Coverage includes concurrency, client changes, replayed requests, midnight, report totals over 100 entries, manual corrections, authorization, inactivity, focus, pause, offline recovery and delayed responses.

CRM mapping remains HubSpot agency / Zoho client / ClickUp agent. Historical branch names describe the original implementation; see [current status](PROJECT_ALIGNMENT_AUDIT.md) for subsequent branch consolidation.
