Stage 2.7 — Agency CRM + Client CRM Handoff
Purpose
Change the CRM ownership model established by the initial HubSpot integration.
HubSpot is now the Agency CRM.
The Agency CRM contains the agency's unified sales pipeline across all clients and agents.
Each client may have its own separate CRM. For the MVP, ActiveCampaign is the planned client CRM.
The platform therefore has two distinct CRM contexts:
1. Agency CRM — HubSpot
2. Client CRM — ActiveCampaign
They must not be treated as the same data source.
1. Core Architecture
                         AGENCY
                            │
                            ▼
                     AGENCY CRM
                       HubSpot
                            │
                 ┌──────────┼──────────┐
                 ▼          ▼          ▼
              Client A   Client B   Client C
                 │          │          │
                 ▼          ▼          ▼
           Client CRM   Client CRM   Client CRM
         ActiveCampaign ActiveCampaign ActiveCampaign
The platform sits between these layers:
                     MULTI-CRM PLATFORM
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
        AGENCY CRM                    CLIENT CRM
          HubSpot                  ActiveCampaign
              │                           │
              ▼                           ▼
      Unified Leads                 Client Records
      Agency Deals                  Client Contacts
      Agent Assignment              Client Companies
      Sales Activities              Client Activities
      Revenue                       Handoff Records
      Commission
Core principle
The Agency CRM owns the agency sales pipeline. The Client CRM owns the client's operational records.

The Client CRM is no longer the source of the Unified Leads Directory.
2. Agency CRM
HubSpot is now the Agency CRM.
Preserve the existing HubSpot implementation rather than rebuilding it.
It contains the agency's:
- Contacts
- Companies
- Deals
- Owners
- Pipelines
- Stages
- Activities
- Associations
These represent the agency's unified sales operation.
HubSpot
   ↓
HubSpot Adapter
   ↓
Canonical CRM Models
   ↓
Unified Leads Directory
Reuse the existing Stage 2.6 synchronization architecture.
Do not create a second independent HubSpot data model.
3. Unified Leads Directory
This is the most important architectural change.
Old behavior
Selected Client
      ↓
Client CRM
      ↓
CRM synchronization
      ↓
Unified Leads Directory
This is no longer correct.
New behavior
                    HubSpot
                 Agency CRM
                      ↓
              Canonical CRM Model
                      ↓
             Unified Leads Directory
The Unified Leads Directory is agency-level.
It must NOT be rebuilt or resynchronized merely because the active client changes.
Example:
Lead              Client       Agent       Stage
----------------------------------------------------
John Smith        Client A     Ahmed       Qualified
Sarah Jones       Client B     Ali         Proposal
Michael Brown     Client C     Ahmed       Closed Won
Selecting Client A or Client B may filter the directory, but the underlying source remains the Agency CRM.
Explicit requirements
Switching the selected client must NOT:
- Replace the Unified Leads data source
- Trigger a full HubSpot re-import
- Clear Unified Leads
- Replace agency deals with client CRM records
- Require synchronization merely to change client context
4. Client Account Context
The selected client controls client-specific operational systems, not the Agency CRM.
When an agent selects Client A:
Client A
 ├── Client CRM connection
 ├── Twilio connection
 ├── Calendar connection
 └── Other client-specific integrations
The agency context remains available independently.
GLOBAL AGENCY CONTEXT
    │
    ├── Unified Leads
    ├── Agency Deals
    ├── Agency Pipeline
    ├── Revenue
    ├── Commission
    └── Agent Performance

SELECTED CLIENT CONTEXT
    │
    ├── Client CRM
    ├── Client Records
    ├── Client Handoffs
    ├── Twilio
    └── Calendar
5. Client CRM
For the MVP, ActiveCampaign is the client CRM provider.
The Client CRM is responsible for client operational data, such as:
- Contacts
- Companies/accounts
- Client-side records
- Follow-up information
- Tasks
- Notes
- Client activities
- Handoff information
The platform must support:
1. Connecting a client's ActiveCampaign account.
2. Reading supported client CRM records.
3. Displaying those records in the platform.
4. Editing supported client CRM records from the platform.
5. Creating/updating client CRM information when an agency deal is handed off.
The Client CRM must NOT become the source of Unified Leads.
6. Client CRM Module
Introduce a dedicated Client CRM module.
Suggested structure:
Client CRM
 ├── Contacts
 ├── Companies
 ├── Records
 ├── Activities
 ├── Handoffs
 └── Connection
When the active client changes:
Client A
   ↓
ActiveCampaign A
becomes:
Client B
   ↓
ActiveCampaign B
Only the Client CRM context changes.
The Agency CRM and Unified Leads context do not change.
7. Deal Handoff Module
Introduce a dedicated Deal Handoff module.
It bridges:
Agency CRM
     ↓
Closed Deal
     ↓
Client Handoff
     ↓
Client CRM
The handoff represents the point where the agency has completed its sales responsibility and the client should take over.
Example:
Agency Deal
────────────────────────────
Deal: ABC Software Implementation
Client: XYZ Consulting
Agent: Ahmed
Amount: $15,000
Status: Closed Won
becomes:
Client Handoff
────────────────────────────
Client: XYZ Consulting
Deal: ABC Software Implementation
Agent: Ahmed
Status: Pending
Amount: $15,000
Close outcome: Client accepted proposal
Next action: Begin onboarding
The handoff is then synchronized to the client's CRM.
8. Handoff Trigger
The primary MVP trigger is:
Agent marks Agency Deal as CLOSED WON
Flow:
Agent
  ↓
Agency Deal = Closed Won
  ↓
Platform detects close
  ↓
Create/update Deal Handoff
  ↓
Send handoff information
  ↓
Client CRM
The agent should not need to manually duplicate the information into the client CRM.
Minimum handoff information:
- Agency deal ID
- Client account ID
- Agent
- Deal name
- Deal amount
- Currency
- Close status
- Close date
- Close outcome/reason
- Handoff notes
- Recommended next action
- Handoff timestamp
- Client CRM provider
- Client CRM record ID
- Synchronization status
9. Client CRM Handoff
When a deal is closed:
Agency CRM
    ↓
Deal Handoff
    ↓
Client CRM
The client CRM should receive information describing:
Deal closed by agency.

Outcome:
<close outcome>

Final amount:
<amount>

Closed by:
<agent>

Next action:
<next action>

Handoff date:
<date>
The exact representation depends on ActiveCampaign's supported API capabilities.
Do not assume ActiveCampaign has a HubSpot-equivalent Deal object or identical data model.
The ActiveCampaign adapter must map the canonical handoff model to the provider's actual API capabilities.
10. Client CRM Record Visibility and Editing
Agents must be able to view relevant client CRM records in the platform.
Example:
Selected Client: XYZ Consulting

Client CRM
────────────────────
Contacts
Companies
Deals / Handoffs
Activities
Notes
Tasks
Support editing of records where the provider API permits it.
The agent should not need to leave the platform for normal client CRM operations covered by the MVP.
These records belong to the Client CRM module and must not automatically populate Unified Leads.
11. Agency Deal vs Client CRM Record
These are different concepts.
Agency Deal
Represents the agency's sales relationship and responsibility.
Agency Deal
Client: XYZ Consulting
Agent: Ahmed
Amount: $15,000
Stage: Closed Won
Commission: $1,500
Client CRM Record
Represents the client's operational follow-up after handoff.
Client CRM
Customer: ABC Corp
Handoff: Received
Next Action: Onboarding
Owner: Client team
Do not merge these models.
Maintain an explicit mapping between them.
12. Data Ownership
Agency CRM owns
- Agency contacts
- Agency companies
- Agency deals
- Agency pipelines
- Agency stages
- Agency activities
- Agent assignment
- Agency sales status
- Agency revenue
- Commission
Platform owns
- Agency/client relationships
- Client accounts
- Agent/client assignments
- Client CRM connections
- Deal Handoffs
- Handoff state
- Commission rules
- Commission calculation
- Integration configuration
- Synchronization state
Client CRM owns
- Client operational contacts
- Client operational companies/accounts
- Client follow-up records
- Client-side activities
- Client-side ownership
- Client workflow after handoff
13. Source-of-Truth Rules
Avoid bidirectional synchronization of the same business concept unless explicitly required.
Agency CRM → Platform
HubSpot sales information is synchronized into canonical platform models.
HubSpot
   ↓
Canonical Models
Platform → Client CRM
Agency closing information is transformed into a Client Handoff and synchronized to the client's CRM.
Agency Deal
   ↓
Handoff
   ↓
Client CRM
Client CRM → Platform
Supported client CRM records may be read for display/editing.
Client CRM
   ↓
Client CRM Module
They do not populate Unified Leads.
14. Agent Editing Rules
Agency Deal edits through the platform follow the existing HubSpot integration:
Agent
 ↓
Edit Agency Deal
 ↓
HubSpot
 ↓
Canonical Agency Deal
When the deal becomes Closed Won, the handoff process starts.
Client CRM edits are separate:
Agent
 ↓
Client CRM Module
 ↓
ActiveCampaign
Do not accidentally write client CRM changes into HubSpot agency records.
15. Commission
Commission belongs to the Agency CRM/business layer.
Example:
Deal Amount: $15,000
Commission Rate: 10%

Commission:
$1,500
MVP states:
EXPECTED
EARNED
PAID
CANCELLED
Commission is not client CRM data.
16. Client-Specific Integrations
The selected client determines credentials/configuration for client-specific external services.
Twilio
Future architecture:
Agency
 │
 ├── Client A
 │      └── Twilio Account A
 │           └── Client A phone number
 │
 ├── Client B
 │      └── Twilio Account B
 │           └── Client B phone number
 │
 └── Client C
        └── Twilio Account C
             └── Client C phone number
When Client B is selected, communication uses Client B's Twilio connection.
Do not use one global Twilio account for all clients unless explicitly required later.
Calendar
Use the same client-scoped pattern:
Client A → Calendar A
Client B → Calendar B
Client C → Calendar C
Calendly/Google/Outlook implementation belongs to later stages.
17. Integration Resolution
Reuse the existing integration architecture.
There are now two integration ownership levels.
Agency integration
Agency
 └── HubSpot
Powers:
- Agency CRM
- Unified Leads
- Agency Deals
- Agency pipeline
- Agency activities
Client integrations
Client Account
 ├── ActiveCampaign
 ├── Twilio
 └── Calendar
Power client-specific operations.
The connection resolver must distinguish these ownership levels.
18. UI Architecture
Do not redesign the existing application.
Reuse existing components, layouts, navigation, tables, dialogs, styling and state-management patterns.
Clearly distinguish:
Agency Sales
Unified Leads
Agency Pipeline
Agency Deals
Sales Operations
Analytics
Commission
Client Operations
Client CRM
Contacts
Companies
Client Records
Handoffs
Activities
Communication
Calendar
The user must always understand whether they are viewing Agency CRM data or Client CRM data.
19. Client Switching Behavior
This is a critical acceptance criterion.
Suppose:
Active Client = Client A
Unified Leads remains:
Agency CRM → HubSpot
Switch to:
Active Client = Client B
and Unified Leads remains:
Agency CRM → HubSpot
while:
Client CRM
     ↓
ActiveCampaign B
changes.
Conceptually:
                 SWITCH CLIENT
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
    Agency Context             Client Context
       UNCHANGED                   CHANGES
          │                         │
       HubSpot                 ActiveCampaign
          │                         │
   Unified Leads              Client Records
   Agency Deals               Handoffs
   Pipeline                   Activities
Explicitly prohibited
Do not:
- Trigger Agency CRM resynchronization merely because the active client changes.
- Reload Unified Leads from ActiveCampaign.
- Replace Unified Leads with the selected client's CRM.
- Clear agency data when changing clients.
20. Multi-Tenant Isolation
Preserve the existing B2B tenancy model.
Agency
 │
 ├── Agents
 │
 ├── Agency CRM
 │
 └── Client Accounts
       │
       ├── Client CRM
       ├── Twilio
       └── Calendar
An agent must only access authorized:
- Agency data
- Client accounts
- Client CRM records
- Client integrations
- Agency sales data
An agent must not access another agency's clients, CRM connections, deals, contacts, commissions or integrations.
21. Synchronization Failure Handling
Client CRM failures must not corrupt the Agency CRM.
Example:
Agency Deal = Closed Won
       ↓
Handoff created
       ↓
ActiveCampaign unavailable
       ↓
Handoff = SYNC_FAILED
       ↓
Agency Deal remains Closed Won
       ↓
Retry later
Track:
- Handoff status
- Last attempted synchronization
- Last successful synchronization
- Error information
- Retry count
- Client CRM record ID
Suggested states:
PENDING
SYNCING
SYNCED
FAILED
RETRYING
22. Idempotency
Repeated close events must not create duplicate client handoffs.
A handoff should have a stable identity based on the agency deal and client account.
Conceptually:
Agency Deal ID + Client Account ID
Repeated processing should update/retry the existing handoff instead of creating another one.
23. Scope
Included in Stage 2.7
Agency CRM
- Treat existing HubSpot integration as Agency CRM.
- Preserve existing HubSpot sales synchronization.
- Preserve canonical CRM models.
- Preserve agency deals, contacts, companies, owners and activities.
Unified Leads
- Make Unified Leads agency-level.
- Remove dependency on selected client CRM.
- Prevent client switching from replacing its data source.
- Allow optional client filtering.
Client CRM
- Introduce Client CRM module.
- Integrate ActiveCampaign at the level required by the MVP.
- Connect a client-specific ActiveCampaign account.
- Read supported records.
- Display supported records.
- Edit supported records.
Deal Handoff
- Detect Agency Deal Closed Won.
- Create Deal Handoff.
- Store closing/handoff information.
- Synchronize handoff to Client CRM.
- Retry failed handoffs.
- Prevent duplicate handoffs.
Data model
- Separate Agency CRM records from Client CRM records.
- Maintain mappings between Agency Deals and Client CRM records.
- Maintain client-scoped provider connections.
UI
- Clearly separate Agency Sales and Client Operations.
- Preserve existing design system.
- Fix client-switch behavior.
- Keep Unified Leads stable across client changes.
24. Explicitly Not Included
Do NOT implement:
- Twilio integration
- Calendly integration
- Google Calendar integration
- Outlook Calendar integration
- LLM integration
- Advanced commission system
- Full accounting
- Payroll
- Complex forecasting
- Full client CRM replacement
- Multiple additional CRM providers
- Major frontend redesign
ActiveCampaign is the planned client CRM provider, but implement only the functionality required by this stage.
25. Future Architecture
                    AGENCY
                       │
                  HubSpot CRM
                       │
                Unified Leads
                       │
                 Agency Deals
                       │
                ┌──────┴──────┐
                │             │
             Agent          Client
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
              ActiveCampaign Twilio  Calendar
Future clients can use different CRM providers:
Client A → ActiveCampaign
Client B → Another CRM
Client C → Another CRM
All client CRM providers should use the same Client CRM abstraction.
The Agency CRM remains independent.
26. Acceptance Criteria
Stage 2.7 is complete only when:
1. HubSpot is treated as the Agency CRM.
2. Unified Leads is backed by Agency CRM data.
3. Unified Leads does not depend on the selected client's CRM.
4. Switching clients does not replace Unified Leads data.
5. Switching clients does not require an Agency CRM resync.
6. Client-specific CRM context changes correctly when switching clients.
7. ActiveCampaign can be associated with a client account.
8. Supported ActiveCampaign records can be displayed in the platform.
9. Supported ActiveCampaign records can be edited from the platform.
10. Agency Deals remain separate from Client CRM records.
11. Closing an Agency Deal can trigger a Client Handoff.
12. The Client Handoff contains the required closing and next-action information.
13. The handoff can be synchronized to the Client CRM.
14. Failed handoffs can be retried.
15. Failed Client CRM synchronization does not alter the Agency Deal's valid state.
16. Duplicate close events do not create duplicate handoffs.
17. Agent/client authorization remains enforced.
18. Existing HubSpot synchronization continues to work.
19. Existing Stage 2.5 OAuth and connection management continue to work.
20. Existing frontend functionality is preserved.
21. Agency and Client CRM contexts are clearly distinguished in the UI.
27. Implementation Workflow
Before implementation:
1. Read Architecture.md.
2. Read MVP.md.
3. Read MVP_PROGRESS.md or IMPLEMENTATION_STATE.md.
4. Read this document completely.
5. Inspect Stage 2.5 and Stage 2.6 implementation.
6. Identify all current assumptions that HubSpot is the selected client's CRM.
7. Identify all code paths that make Unified Leads dependent on the selected client.
8. Use Graphify to map those dependencies.
9. Produce a short implementation plan.
10. Implement only Stage 2.7.
Graphify rules
Use Graphify when:
- Mapping Unified Leads dependencies.
- Mapping CRM connection ownership.
- Tracing HubSpot synchronization.
- Understanding Client Account → Integration relationships.
- Understanding Deal → Lead → Client relationships.
- Tracing cross-module effects of client switching.
Do not repeatedly run Graphify on the entire repository.
Use targeted graphs.
If Graphify and source code disagree, source code is authoritative.
Anti-loop rule
If the same issue occurs twice:
1. Stop.
2. Inspect the exact failing path.
3. Trace dependencies with Graphify if appropriate.
4. Identify the root cause.
5. Make one targeted change.
6. Test again.
Do not repeatedly rewrite the same code.
28. Verification
Run appropriate existing verification:
- Prisma validation
- Prisma generate
- TypeScript
- Focused ESLint
- Stage-specific tests
- Existing system tests
- Production build
- git diff --check
Manually verify:
Agency CRM
- HubSpot records appear as agency records.
- Unified Leads displays agency leads.
- Agency deals work.
Client switching
- Select Client A.
- Confirm Unified Leads remains agency-level.
- Select Client B.
- Confirm Unified Leads remains agency-level.
- Confirm Client CRM changes from Client A to Client B.
Client CRM
- Connect ActiveCampaign for a client.
- View client records.
- Edit supported client records.
Handoff
- Close an Agency Deal.
- Confirm a Deal Handoff is created.
- Confirm the handoff contains expected information.
- Confirm it is sent to the Client CRM.
- Repeat and verify no duplicate handoff.
- Test failed client synchronization and retry behavior.
29. Progress Tracking
Update:
MVP_PROGRESS.md
or:
IMPLEMENTATION_STATE.md
Use:
## Stage 2.7 - Status

### Completed
- ...

### In Progress
- ...

### Pending
- ...

### Notes / Decisions
- HubSpot is now the Agency CRM.
- Unified Leads is agency-level.
- Client CRM is separate and client-scoped.
- ActiveCampaign is the planned client CRM provider.
- Deal Handoff bridges Agency Deals to Client CRM.
Do not mark functionality complete unless implemented and verified.
30. Stop Condition
Implement only Stage 2.7.
Do not automatically continue to:
- Stage 3
- Twilio
- Calendly
- Google Calendar
- Outlook Calendar
- LLM
- Additional CRM providers
After Stage 2.7:
1. Report existing functionality preserved.
2. Report files added.
3. Report files modified.
4. Report database/model changes.
5. Report Agency CRM changes.
6. Report Client CRM changes.
7. Report Deal Handoff changes.
8. Report Unified Leads changes.
9. Report tests and verification.
10. Report remaining issues.
11. Update progress documentation.
12. Stop for manual review.
Final Architectural Principle
The platform now has two distinct CRM layers:
                         AGENCY
                            │
                            ▼
                    ┌──────────────┐
                    │ AGENCY CRM   │
                    │   HubSpot    │
                    └──────┬───────┘
                           │
                           ▼
                  UNIFIED LEADS
                           │
                     Agency Deal
                           │
                    CLOSED WON EVENT
                           │
                           ▼
                    DEAL HANDOFF
                           │
                           ▼
                    ┌──────────────┐
                    │ CLIENT CRM   │
                    │ ActiveCampaign│
                    └──────┬───────┘
                           │
                           ▼
                  Client Operations
HubSpot is the agency's CRM and the source for Unified Leads.
ActiveCampaign is the client's CRM and the destination for post-sale handoff/client operations.
Changing the selected client changes client-specific context, not the Agency CRM or Unified Leads source.
Twilio and Calendar will later follow the same client-scoped integration model.

















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.