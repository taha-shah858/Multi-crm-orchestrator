Stage 2.7 — Agency CRM Foundation
Purpose
Build the minimum native Agency CRM layer required to support the core FYP business model:
An agency manages multiple sales agents who work across multiple client accounts, while client CRM systems remain the source of CRM data.

The Agency CRM is part of the Multi-CRM Orchestrator. It is not another external CRM integration.
The goal is to connect client CRM sales activity to a centralized agency-level view of revenue, deals, agents, and commissions.
Core Architecture
                         AGENCY
                           │
                    ┌──────▼──────┐
                    │ Agency CRM  │
                    │             │
                    │ Deals       │
                    │ Revenue     │
                    │ Agents      │
                    │ Commission  │
                    └──────▲──────┘
                           │
                    Multi-CRM Platform
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      Client A         Client B         Client C
       HubSpot         GoHighLevel        Close
          │                │                │
          ▼                ▼                ▼
       Contacts         Contacts         Contacts
       Companies        Companies        Companies
       Deals            Deals            Deals
       Activities       Activities       Activities
The platform should maintain a canonical CRM model between external providers and the Agency CRM.
Client CRM
    ↓
Provider Adapter
    ↓
Canonical CRM Model
    ↓
Agency Sales Model
    ↓
Agency CRM / Reporting
Source-of-Truth Rules
Client CRM is the source of truth for:
- Contact information
- Company information
- CRM-native deal information
- Deal amount
- CRM pipeline
- CRM stage
- CRM close status
- CRM close date
- CRM activities
- Provider-specific CRM identifiers
The Multi-CRM Orchestrator is the source of truth for:
- Agency
- Sales agents
- Client accounts
- Agent-to-client assignments
- Agency deal attribution
- Commission rules
- Commission rates
- Commission calculations
- Commission payment status
- Agency-level reporting
This separation prevents synchronization conflicts.
Agency Data Model
Agency
Represents the organization using the platform.
Agency
 ├── Sales Agents
 └── Client Accounts
Required concepts:
- Agency ID
- Name
- Status
- Created date
Sales Agent
Represents a salesperson working for the agency.
Required concepts:
- Agent ID
- Agency ID
- Name
- Email
- Status
- Assigned client accounts
An agent belongs to an agency and can work with multiple client accounts.
Client Account
Represents a client company served by the agency.
Agency
   │
   └── Client Account
          │
          └── CRM Connection
                │
                ├── HubSpot
                ├── GoHighLevel
                └── Close
Required concepts:
- Client account ID
- Agency ID
- Client name
- Assigned agents
- CRM connection
- CRM provider
- Connection status
Agency Deal
The Agency Deal is the agency-level representation of a deal originating from a client CRM.
Example:
Agency Deal
────────────────────────────
Client: Northstar Analytics
Deal: Northstar Platform Rollout
Source CRM: HubSpot
Source Deal ID: 123456
Agent: Liam Brooks
Amount: $24,000
Stage: Initial Contact
Status: Open
Expected Close: 2026-10-15
Commission: $2,400
Required concepts:
- Agency deal ID
- Agency ID
- Client account ID
- Agent ID
- Source CRM provider
- Source CRM deal ID
- Deal name
- Amount
- Currency
- Stage
- Status
- Expected close date
- Closed date
- Commission rate
- Expected commission
- Earned commission
- Commission status
- Last synchronized timestamp
The combination of:
Client Account + Source CRM + Source Deal ID
should provide an idempotent identity for synchronization.
Deal Synchronization
Client CRM → Agency CRM
When a client closes or updates a deal in its CRM:
Client CRM
    ↓
Multi-CRM Sync
    ↓
Canonical Deal
    ↓
Agency Deal
Example:
HubSpot
Deal: Northstar Platform Rollout
Amount: $24,000
Stage: Closed Won
        ↓
Agency CRM
Deal: Northstar Platform Rollout
Amount: $24,000
Status: Closed Won
Agent: Liam
Commission: $2,400
The synchronization must be:
- Idempotent
- Retryable
- Provider-aware
- Safe against duplicate records
- Able to handle partial failures
A deal already synchronized must be updated rather than recreated.
Platform → Client CRM + Agency CRM
Agents must also be able to make supported changes through the platform.
Agent
  ↓
Multi-CRM Platform
  ├──→ Client CRM
  └──→ Agency CRM
For example:
Agent changes deal:
Initial Contact
       ↓
Closed Won
The platform should:
1. Update the client CRM.
2. Update the corresponding Agency Deal.
3. Preserve the source CRM mapping.
4. Record synchronization state.
5. Handle provider failures without corrupting agency data.
The client CRM remains authoritative for CRM-native fields after synchronization.
Commission Model
Keep the MVP commission system intentionally simple.
Deal Amount × Commission Rate = Commission
Example:
Deal Amount:       $24,000
Commission Rate:   10%
Expected Commission: $2,400
Support at minimum:
- Commission rate
- Expected commission
- Earned commission
- Commission status
Possible statuses:
EXPECTED
EARNED
PAID
CANCELLED
Do not implement complex tiered commission structures in this stage unless already required by the existing scope.
Future extensions may include:
- Client-specific rates
- Agent-specific rates
- Fixed commissions
- Tiered commissions
- Commission overrides
- Payment tracking
Deal Attribution
Every Agency Deal should have an identifiable responsible agent where applicable.
Agency
  ↓
Client Account
  ↓
Agency Deal
  ↓
Sales Agent
If a deal has no agent assignment:
Agent: Unassigned
Do not invent or infer ownership from incomplete CRM data.
Minimal Agency CRM UI
Do not build a full CRM UI at this stage.
Implement only the views required to prove the business model.
Agency Dashboard
Display:
Agency Sales Operations

Total Pipeline
Closed Revenue
Expected Revenue
Open Deals
Closed Deals
Expected Commission
Earned Commission
Agent Sales View
Display:
My Sales

Open Deals
Closed Deals
Closed Revenue
Expected Revenue
Expected Commission
Earned Commission
The agent should be able to see deals across the client accounts they are authorized to work with.
Client Account View
The selected client account should continue to expose client CRM data:
Client Account
 ├── Contacts
 ├── Companies
 ├── Deals
 ├── Activities
 └── CRM Connection
The agent selects the client account first.
Business Analytics vs Sales Operations
Sales Operations
Operational CRM work:
- Leads
- Contacts
- Companies
- Deals
- Activities
- Tasks
- Follow-ups
- Calendar
- Client CRM data
Business Analytics
Agency-level performance:
- Revenue
- Pipeline value
- Closed revenue
- Conversion metrics
- Client performance
- Agent performance
- Commission
- Expected revenue
Do not mix these concepts unnecessarily.
Synchronization Rules
External → Agency
Client CRM
    ↓
Sync
    ↓
Canonical Model
    ↓
Agency Deal
Changes such as:
- Deal amount
- Stage
- Status
- Close date
- CRM owner
should be synchronized according to the existing provider synchronization rules.
Agency → External
Agency-owned fields such as:
- Commission rate
- Commission status
- Internal attribution
must not be written into the client CRM unless explicitly supported and required.
CRM-native fields changed through the platform should use the provider adapter and then update the canonical/agency representation.
Failure Handling
The Agency CRM must remain usable when an external CRM temporarily fails.
HubSpot sync fails
       ↓
Agency data remains available
       ↓
Deal marked with sync state
       ↓
Retry later
Do not delete agency records because a provider temporarily becomes unavailable.
Track:
- Last successful synchronization
- Last failed synchronization
- Sync status
- Error information
- Provider/source
Multi-Tenant Isolation
Agency data must remain tenant-isolated.
A sales agent must not be able to access:
- Another agency's clients
- Another agency's deals
- Another agency's agents
- Another agency's commission data
Client CRM connections must also remain scoped to the correct client account and agency.
The existing B2B hierarchy remains:
Agency
   ↓
Sales Agent
   ↓
Client Account
   ↓
CRM Connection
   ↓
CRM Data
Scope Boundaries
Included in Stage 2.7
- Agency model
- Sales agent model
- Client account relationship
- Agency deal representation
- Deal-to-agent attribution
- Source CRM mapping
- Basic commission calculation
- Agency sales metrics
- Agent sales metrics
- Client account sales view
- Client CRM → Agency CRM synchronization
- Platform → Client CRM + Agency CRM synchronization
- Idempotent deal synchronization
- Basic failure/retry handling
Not Included
- Second external CRM integration
- Twilio
- Google Calendar
- Outlook Calendar
- Real LLM integration
- Advanced commission rules
- Full accounting/payroll
- Complex forecasting
- Full replacement CRM functionality
- Major UI redesign
These belong to later stages.
Relationship to Stage 3
Stage 2.7 establishes the data and business foundation required for Stage 3.
Stage 3 will refine:
- Agency Dashboard
- Agent Sales Dashboard
- Client Account experience
- CRM views
- Calendar experience
- Business Analytics
- Sales Operations
- Client switching
- Stale-state handling
- Visual consistency
- Developer-oriented UI removal
The existing design system must be preserved.
Relationship to Stage 4
Stage 4 will expand the provider ecosystem and real external integrations.
Planned direction:
HubSpot        ✓ Existing
GoHighLevel    → Future CRM adapter
Close          → Future CRM adapter
Twilio         → Communications
Google/Outlook → Calendar
LLM Provider   → AI functionality
A second CRM should be added only after the canonical model and Agency CRM flow are stable enough to prove that multiple providers can feed the same agency-level model.
Acceptance Criteria
Stage 2.7 is complete when all of the following work:
1. An agency can have multiple sales agents.
2. An agency can have multiple client accounts.
3. An agent can be assigned to a client account.
4. A client account can have a CRM connection.
5. A client CRM deal can create/update an Agency Deal.
6. A closed deal in the client CRM appears as closed in the Agency CRM.
7. The Agency Deal retains its source CRM and source deal ID.
8. The same deal does not create duplicate Agency Deals after repeated synchronization.
9. An Agency Deal can be attributed to a sales agent.
10. Commission can be calculated from deal amount and commission rate.
11. An agent can see their own sales and commission metrics.
12. The agency can see aggregate sales metrics.
13. Supported deal changes made through the platform update the client CRM and Agency Deal.
14. Temporary provider failures do not delete Agency CRM data.
15. Tenant isolation is preserved.
16. Existing HubSpot synchronization continues to work.
17. Existing client CRM functionality is not unnecessarily rewritten.
18. Existing UI components and design system are reused wherever possible.
Implementation Rules
- Read Architecture.md and MVP.md before implementation.
- Read MVP_PROGRESS.md or IMPLEMENTATION_STATE.md before starting.
- Inspect existing Stage 2.6 models and synchronization services before adding new models.
- Reuse the existing canonical Company/Deal/Owner/Activity/provider mapping architecture.
- Do not duplicate existing CRM models unnecessarily.
- Do not introduce a second external CRM during this stage.
- Keep provider-specific logic inside provider integrations.
- Keep agency-owned business logic provider-independent.
- Use Graphify only when dependency analysis is actually required.
- Implement only Stage 2.7.
- Verify all changes.
- Update the progress document.
- Stop after Stage 2.7 and wait for review.
Target Architecture
                         AGENCY
                           │
             ┌─────────────┴─────────────┐
             │                           │
        Sales Agents                Client Accounts
             │                           │
             │                     CRM Connections
             │                           │
             │              ┌────────────┼────────────┐
             │              │            │            │
             │           HubSpot     GoHighLevel    Close
             │              │            │            │
             │              └────────────┼────────────┘
             │                           │
             │                    Canonical CRM Model
             │                           │
             └───────────────┬───────────┘
                             │
                       Agency CRM
                             │
                    ┌────────┴────────┐
                    │                 │
              Sales Operations   Business Analytics
                    │                 │
                 Deals            Revenue
                 Leads            Pipeline
                 Activities       Commissions
                 Calendar         Agent Performance
Core principle: Client CRMs remain the source of CRM truth, while the platform becomes the source of agency-level sales operations, attribution, and commission truth.


















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.