# Project requirements and working memory

Recorded on 2026-10-01 from the user's module specification and follow-up decisions. This is the durable repository record of the product direction. Read it before future planning or feature implementation, alongside `PROJECT_ALIGNMENT_AUDIT.md`. It specifies requirements; it does not claim those features are implemented.

## Confirmed architecture and account ownership

- HubSpot is the agency CRM and supplies the Unified Lead Directory: agency leads, contacts, companies, owners, deals, pipelines, and sales activities.
- The Unified Lead Directory is shared across client accounts within the agency. Switching Client A to Client B must not replace, clear, reload, or resync it from a different CRM.
- Zoho is each client's CRM and receives controlled closed-deal/customer handoffs and supported client-record updates. It is not the source of Unified Leads.
- ClickUp is each agent's personal sales/work tracker. Sales Operations surfaces the agent's closed customers, associated client/company, deal values, expected commission/revenue, and payout status.
- Client selection changes the selected client's Zoho, Twilio, Calendly, and other client-specific integration context. It does not select another agency HubSpot dataset or another agent's ClickUp account.
- ActiveCampaign is legacy architecture. Preserve existing code/records until an authorized migration; do not treat it as the current planned client CRM. The user reiterated during implementation that the current client CRM must be Zoho: the active client CRM screen, Sync API, and new-handoff API use Zoho, without allowing legacy records to change the current provider.
- Agents own their signup/sign-in credentials. Both agents and agency administrators must support email/password signup with an emailed verification code that the user confirms, plus Google signup/sign-in. An admin finds an existing agent by name, approves the account, and assigns client accounts/integrations afterward. Agent email must not appear in admin UI or admin-facing API responses. Duplicate names require a safe account reference.
- Google and Outlook calendar integrations are required alongside Calendly. The user confirmed this on 2026-10-01; Calendly does not replace them.

The pasted table's `Client (HubSpot/Salesforce)` wording is superseded by the user's explicit confirmation of HubSpot = agency / Zoho = client / ClickUp = agent. Salesforce is not a newly authorized mandatory provider.

## Current implementation boundary

On 2026-10-01, the user explicitly chose to continue implementation from `twilio+calendly` and defer merging `email-setup` until the end, after mail credentials are ready. Do not merge or cherry-pick that branch's authentication work early. Authentication remains a required final capability, but is not a prerequisite for correcting this branch's data ownership, authorization, CRM routing, accounting, or other modules. Read the other branch for compatibility context when needed; do not duplicate its signup implementation.

New focused branches may be created from the current development baseline when useful, using the `codex/` prefix. Preserve current documentation changes. Keep existing authenticated-user/request-context contracts compatible where possible so the deferred auth integration can be reviewed and tested at the end.

The user protected branch `new` as the existing structure. Its branch ref/committed contents must remain unchanged. The first implementation batch uses `codex/crm-boundary-safety`, created from `twilio+calendly` at `e4ad0b4`; no work is to be merged into `new` without a later user instruction.

## Required modules

| ID | Module | Required features | Required manual override / failsafe |
| --- | --- | --- | --- |
| 6.1 | Multi-CRM Sync Engine | Bi-directional supported-field synchronization; input data once and propagate it to the appropriate agency/client/agent systems; consistent records and clear synchronization outcomes. Original wording: atomic transactions ensure consistency across endpoints. | Agents can trigger manual sync/import and edit permitted CRM fields when providers fail or throttle requests. Save local edits and offer safe retry. |
| 6.2 | VoIP & SMS Identity Gateway | Twilio identity mapping routes calls/SMS through client/brand-specific numbers. Identity switcher makes the represented brand explicit for each account. | Authorized manual outgoing-identity selection and dialing when automatic mapping fails. The UI must accurately distinguish a platform call, a handset launch, and a manually logged event. |
| 6.3 | Unified Interaction Aggregator | One timeline for SMS, calls, and emails. Multi-source logging consolidates provider history with platform records and links it to the lead/client/agent. | Manual notes, call logs, and email summaries can be added without a working external provider. |
| 6.4 | AI Intelligence & Lead Analysis | Transcript extraction supplies CRM fields such as budget, requirements, and timeline. Lead-quality scoring categorizes prospect warmth and deal probability. | Import or paste meeting transcripts (including Zoom/Teams exports), review/edit extracted fields, and correct AI output before or after approved CRM updates. |
| 6.5 | Sales Script Architect | Contextual brand/prospect scripts and SMS/email follow-up templates use relevant lead information. | Full text editing, creation, saving, and overriding generated scripts. Human content is preserved when generation fails or a draft is regenerated. |
| 6.6 | Commission & Financial Tracker | Deals-closed versus expected commissions; real-time pending versus received payout visibility through prompt updates after recorded payments/corrections; client/deal/agent attribution. | Manual ledger entries, off-platform deal values, commission status updates, and auditable corrections. |
| 6.7 | Sales Ops Reconciliation | Automatically track active minutes per client. Produce reconciliation sheets that replace the manual Excel workflow. | Enter manual billable hours or adjust automatically captured sessions with an audit trail and duplicate prevention. |
| 6.8 | Workflow & Smart Scheduling | Detect meeting intent from calls/analysis and support bookings through Google/Outlook calendars and Calendly. | Manually book/edit/cancel meetings without AI. A local appointment and its external booking state must be distinguishable if provider sync fails. |
| 6.9 | Document & Proposal Gen | Draft proposals using extracted lead data and draft reviewable follow-up emails from call outcomes. | Upload existing PDF proposals, edit generated proposal/email text, and save versions without a functioning generation provider. |

## Interpretation that needs precision

Preserve the original consistency requirement; do not promise one PostgreSQL/Prisma transaction can roll back HubSpot, Zoho, ClickUp, Twilio, or calendar HTTP calls. Local writes can be atomic. A recommended implementation of cross-provider consistency uses durable recorded work, idempotent processing, explicit per-destination status, retry/reconciliation, and compensation where supported. This is a technical interpretation to confirm in implementation design; global all-or-nothing external commits are not a current capability.

Bi-directional sync does not mean copying every agency lead into every client's CRM or applying an external mirror's changes to authoritative commissions. Define allowed fields, routing, ownership, and conflict rules for each direction. Zoho receives the relevant client's handoff; ClickUp receives the relevant agent's tracking information.

## How future work must follow these requirements

1. Verify the current branch and code before assuming prior chat work exists in the checkout. Locate earlier work on other branches before proposing a duplicate implementation.
2. Use the existing Graphify graph as a dependency locator, then verify the relevant page → route → service → Prisma model → provider path in actual source. Record stale graph limitations; do not repeatedly rebuild the entire repository.
3. Classify each subfeature as implemented, partially implemented, or planned/not implemented. Separately record whether it has been verified with a live provider. UI copy, enums, test stubs, and historical progress claims are insufficient proof of integration completion.
4. Preserve tenant, client, and agent boundaries; keep integration credentials server-side and protected. Preserve working manual workflows.
5. Implement one stage at a time and verify its acceptance criteria before expanding scope. Run relevant success, provider-failure, manual-fallback, duplicate/retry, and cross-client authorization checks.
6. Generated AI content remains editable and reviewable. Email follow-ups are drafts for review unless the user explicitly authorizes sending; auto booking policy must distinguish a detected suggestion from a confirmed appointment.
7. Update the alignment audit when code changes or a stage is verified. Display real records/status in product screens; clearly label demo data and rule-based output.

## Integrated acceptance scenario

An agent creates and verifies their own account; the admin finds their name, approves them, and assigns Client A and Client B. The agent sees the same agency HubSpot directory when switching clients. Working a lead for Client A chooses Client A's communication identity, logs calls/SMS/email into the timeline, accepts a pasted/imported transcript, generates editable analysis/scripts/proposals, and offers a reviewed meeting booking. Closing the deal records the appropriate agent commission, creates one Client A Zoho handoff, and creates/updates one agent ClickUp tracking record. An external failure leaves saved local data and visible retry state. Manual logging, edits, ledger adjustments, time corrections, scheduling, and PDF upload remain available. Reconciliation exports match the recorded time and payout data. Client B's CRM, phone identity, and calendar receive none of Client A's actions.

This entire scenario must be demonstrated with actual records and failures before calling the nine-module project complete.
