# Module 6.7: Time Audit and hourly pay

Agents open **Time Audit** from the sidebar (`/time-audit`). The report has current-client and all-assigned-client views, whole UTC date filters, per-client totals, and a paginated ledger. The top timer shows the selected client's accumulated saved work time plus its current active seconds, rather than resetting its display for every new session. Leaving a client saves its last partial interval before the next client starts. Each client retains its own total across switches, pauses, and reloads; time spent elsewhere is not charged to the previous client.

The existing idle, hidden-tab, offline, manual-pause, server-owned time, and competing-tab protections remain. Manual logs and corrected measurements contribute to the displayed totals. Raw automatic seconds remain preserved when a log is corrected. The legacy manual entry/correction flow remains accessible through Sales Operations.

Agents save their own hourly rate and three-letter currency code. The rate is stored in PostgreSQL, independently of commissions. Expected pay is `seconds / 3600 × hourly rate`, rounded to currency cents per client. Ten minutes at USD 30/hour yields USD 5.00. Estimates use the currently saved rate for all included logs; changing it recalculates the report. These are estimates, not agreed payroll, received payments, or historical rate snapshots.

**Download all clients CSV** includes every assigned active client, per-client seconds/hours, hourly rate, expected pay, a combined total, and all matching detailed logs (not just the current page). Date filters apply to the export. Rows respect manual corrections and spreadsheet-formula text is escaped. Reports require an authenticated agent and only expose that agent's own work in assigned clients within their organization. Neither reporting nor exporting calls CRM providers.

Migration `20261007000100_agent_hourly_pay` adds nullable hourly-rate cents and currency to User, preserving existing records. It has been applied to the local PostgreSQL database. Other environments must deploy that migration and regenerate the Prisma client before running this version.

Validation: 20 real-database/browser-policy checks cover return-to-client continuity from 19 seconds, independent totals, concurrency, midnight, idle/offline behavior, manual corrections, uncapped CSV, own-agent/client scope, date filtering, persisted rate changes, and ten-minute prorating. Production build and TypeScript pass. Browser verification uses a disposable agent and clients; no real rates or logs are changed.
