# Commission reconciliation — modules 6.6 and the financial report portion of 6.7

Implemented after Closed Won → commission creation, on `codex/commission-reconciliation`.

## Where to use it

- Admin: Sales Commission (`/admin/commissions`).
- Agent: Sales Operations (`/operations`), including the commission ledger and closed-sales table.
- Choose **Closed from / Closed through** dates, then **Export commissions CSV**. Empty dates mean all dates.

## Accounting rules

- Concurrent payments and adjustments lock and read the latest commission balances. The balance change, ledger entries, and audit record commit together.
- A manual override of expected or received totals records the difference in the ledger. Negative payment differences describe a manual correction/refund, not a new payout.
- Financial views and subsequent ClickUp syncs use the commission record's corrected amount. The original deal rate remains the closing snapshot. Posting a local correction does not automatically issue a payment or trigger a live ClickUp write.
- Pending balances are calculated per deal. An overpayment on one deal does not cancel an unpaid balance on another.
- Totals are grouped by currency. Currency conversion is not performed, and mixed currencies have no combined monetary total.
- Totals and CSV include every matching record. Detailed dashboard lists show the most recent 100 records and display the full matching count.
- Date controls use whole **UTC days**, inclusive of the through date. They select deals by closed date (or commission creation date when no closed date exists). Amounts represent **current balances**, not payouts received during that period or historical balances as of its end.
- Admin reports cover the agency; agent reports require an assigned active client and include only that agent's commissions. Existing manual time totals use the selected date period and include every matching time log.
- CSV retains currency, agent/client/deal attribution, closing date, manual-correction flag, and totals. Spreadsheet formulas in text are neutralized.

## Remaining scope

Automatic active time tracking (6.7), payment-date/cash-flow reports, historical balance snapshots, and paginated ledger browsing remain separate work. HubSpot agency / Zoho client / ClickUp agent is the required CRM mapping. Google/Outlook plus Calendly remain the scheduling target. Deferred signup work stays on `email-setup`; `new` remains protected.

## Checks

Run `node scripts/commission-reconciliation-test.cjs` and `node scripts/closed-deal-commission-test.cjs`. The tests use disposable local organizations and no live provider calls. Coverage includes concurrent mutations, journal balances and projections, more than 100 records, mixed currencies, inclusive dates, CSV output, authorization, and invalid input.
