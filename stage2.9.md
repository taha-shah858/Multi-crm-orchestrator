Stage 2.9 — ClickUp Agent Personal CRM / Sales Tracker


Purpose
Add ClickUp as the agent's personal CRM/work-management layer.
ClickUp is NOT the Agency CRM and NOT the Client CRM.
Agency CRM (HubSpot)
        ↓
Unified Lead Directory
        ↓
Agent works assigned leads
        ↓
Client CRM (Zoho)
        ↓
Client receives closed-deal / handoff information

Agent Personal CRM (ClickUp)
        ↓
Agent tracks:
- who they closed
- which client the customer belongs to
- deal value
- expected agent revenue
- follow-ups
- personal sales workload
HubSpot remains the Agency CRM source of truth. Zoho remains the Client CRM/handoff system. ClickUp is an agent-facing tracking layer.
Don't add another module.
Keep Sales Operations and evolve it into:
Sales Operations — Agent Revenue & Commission

with ClickUp as an integration underneath it.
The architecture then becomes very clean:
HubSpot
   ↓
Agency CRM
   ↓
Unified Lead Directory
   ↓
Agent
   │
   ├── Sales Operations
   │       ├── Closed Deals
   │       ├── Commission
   │       ├── Expected Revenue
   │       └── ClickUp
   │
   └── Client CRM
           ↓
          Zoho
           ↓
     Client Handoff

     How I would calculate expected agent revenue
For the MVP, use a simple commission model:
Expected Agent Revenue = Closed Deal Value × Commission Rate

For example:
Deal	Deal Value	Commission	Expected Revenue
Northstar Platform Rollout	$24,000	10%	$2,400
Client B Automation	$12,000	10%	$1,200
Client C Services	$36,000	10%	$3,600


So your example of 10% is perfectly reasonable for the initial implementation.
However, I would not hard-code 10% into the application.
Instead, make the commission rate configurable.
Recommended hierarchy
Agency default commission
        ↓
Client-specific commission
        ↓
Agent-specific commission
        ↓
Deal-specific override

For example:
Default agency rate: 10%

Client A: 10%
Client B: 12%
Client C: 8%

Agent-specific override:
Agent X → 10%
Agent Y → 12%

For the FYP/MVP, you can initially just have:
Commission Rate: 10%

and store it in the database rather than hard-coding it. Later, the agency admin can change it.
2. Keep these three numbers separate
Your current Sales Operations UI already has the right conceptual structure.
Expected payout
What the agent should receive based on closed deals.
$24,000 × 10% = $2,400

Received
What the agency has actually recorded as paid to the agent.
Received = $1,000

Still pending
Expected - Received
$2,400 - $1,000 = $1,400

This is much better than treating the ClickUp CRM as the commission system.
Your application remains the source of truth for commission calculations. ClickUp simply receives the agent's sales record.
3. Where should ClickUp go?
I agree with your instinct:
Put it inside Sales Operations
I would not add another top-level sidebar item called "Agent CRM."
Your sidebar currently has:
Integrations Hub
Unified Lead Directory
Client CRM
Twilio Smart Dialer
Aggregation Timeline
AI Copilot Suite
Script Architect
Calendar Planner
Sales Operations   ← HERE
Documents & Proposals
Multi-CRM Suite

Adding another top-level:
Agent CRM

would make the application feel like it has another major CRM when ClickUp isn't actually another source-of-truth CRM.
Instead:
Sales Operations
│
├── Commission Overview
│
├── My Closed Deals
│
├── Expected Revenue
│
├── Received / Pending
│
├── Time Ledger
│
└── My ClickUp
      ├── Connection
      ├── Workspace
      └── Sync status

I would also rename/position the existing ledger slightly
Your current page says:
Commission ledger

That's good.
I'd make the main flow:
Sales Operations

[ Expected Payout ] [ Received ] [ Still Pending ] [ Account Time ]

---------------------------------------------------------------

My Closed Deals

Customer     Client       Deal       Value     Commission
Liam Brooks  Client A     Platform    $24,000   $2,400
Ethan Parker Client A     Expansion   $12,000   $1,200

---------------------------------------------------------------

Agent CRM / ClickUp

Connected ✓
Last sync: ...
[Sync ClickUp]

---------------------------------------------------------------

Time Ledger

This makes the purpose very clear.
4. What happens when the agent closes a deal?
This is the important architecture.
Suppose the agent closes:
Liam Brooks
Client: Northstar Analytics
Deal: Northstar Platform Rollout
Deal value: $24,000
Commission: 10%

Your platform performs:
                    HUBSPOT
                 Agency CRM
                     │
                     │ Deal CLOSED
                     ▼
             Internal Deal Event
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
       ZOHO                  SALES OPS
    Client CRM                  │
          │                     │
          │                     ▼
          │                Calculate
          │              $24,000 × 10%
          │                     │
          │                     ▼
          │                  $2,400
          │                     │
          │                     ▼
          │                  CLICKUP
          │              Agent's personal
          │               sales record
          │
          ▼
   Client receives:
   - Customer
   - Closed deal
   - Deal value
   - Close details
   - Next action
   - Handoff information

That's a very coherent architecture.
5. One important distinction
I would not make ClickUp the thing the agent has to manually update when they close a deal.
The agent should close the deal in your platform.
Then:
Your platform
     ↓
Commission calculated
     ↓
Sales Operations updated
     ↓
Zoho handoff triggered
     ↓
ClickUp record created/updated

That prevents the agent from having to maintain the same information in three places.
ClickUp becomes a personal productivity/sales tracking mirror, not another source of truth.
6. What should the ClickUp task contain?
For the example above:
Task:
[Northstar Analytics] Liam Brooks — Northstar Platform Rollout

Fields:
Customer: Liam Brooks
Customer Email: liam.brooks@gmail.com

Client: Northstar Analytics

Deal: Northstar Platform Rollout

Deal Value: $24,000
Commission Rate: 10%
Expected Revenue: $2,400

Status: Closed
Close Date: 2026-10-15

Client CRM: Zoho
Client CRM Handoff: Completed

Agency Deal ID: ...
Zoho Record ID: ...

This gives the agent a very clear personal history of what they closed and what revenue they are expecting.
7. One addition I strongly recommend
Add a Commission Rate field to the closed-deal record itself.
Don't only calculate:
$24,000 × current commission rate

because commission rules could change later.
Instead, when the deal closes, snapshot:
Deal Value:       $24,000
Commission Rate:  10%
Expected Revenue: $2,400

That means if the agency changes its default rate from 10% → 12% next month, the old deal remains:
$24,000
10%
$2,400

1. Ownership Model
ClickUp connections belong to individual agents.
Agency
├── HubSpot → Agency CRM
├── Client A → Zoho CRM
├── Client B → Zoho CRM
├── Agent 1 → ClickUp
├── Agent 2 → ClickUp
└── Agent 3 → ClickUp
An agent connects their own ClickUp account. Agents must not see or modify another agent's ClickUp connection or personal sales records.
Reuse the existing IntegrationConnection architecture rather than creating a separate credential system.
Example:
IntegrationConnection
├── provider = CLICKUP
├── agentId = ...
├── clientAccountId = null
├── encryptedAccessToken
├── encryptedRefreshToken
├── expiresAt
├── status
└── metadata
2. Why ClickUp Is Needed
The platform can tell the agency that an agent closed a deal, and Zoho can tell the client about the handoff.
ClickUp gives the agent a personal operational record such as:
Customer       Client       Deal Value    Expected Revenue
----------------------------------------------------------
Liam Brooks    Client A       $24,000          $2,400
Ethan Parker   Client A       $12,000          $1,200
Mia Reed       Client B       $36,000          $3,600
Expected revenue/commission is calculated by the application, not by ClickUp.
3. Recommended ClickUp Representation
For the MVP, use a ClickUp List as the agent's sales tracker.
Each closed/qualified sales record becomes a ClickUp Task.
Recommended title:
[Client A] Liam Brooks — Northstar Platform Rollout
Recommended task fields:
- Customer name
- Customer email
- Client account
- Deal name
- Deal value
- Expected agent revenue
- Close date
- Agency deal ID
- Agency contact ID
- Client CRM ID
- Handoff status
- Next action
- Follow-up date
- Agent
- Source CRM
Do not copy unnecessary CRM data into ClickUp.
4. Closed Deal Flow
Agent closes deal
      ↓
Agency CRM / internal deal state updated
      ↓
Determine Client Account
      ↓
Create/update Client CRM handoff
      ↓
Calculate expected agent revenue
      ↓
Create/update ClickUp task
      ↓
Agent sees the closed deal in ClickUp
ClickUp API operations must be server-side.
A ClickUp failure must never prevent the core deal-close operation or the client handoff from completing.
5. Idempotency
Repeated syncs must not create duplicate ClickUp tasks.
This includes:
- clicking Sync twice
- refreshing a page
- webhook retries
- token refresh
- reprocessing the same deal
Maintain an internal mapping:
Agency Deal ID
    ↓
Agent ID
    ↓
ClickUp Task ID
If the task already exists, update it instead of creating another one.
A possible mapping model is:
AgentClickUpRecord
├── id
├── agentId
├── dealId
├── clickUpTaskId
├── status
├── lastSyncedAt
├── lastSyncError
├── createdAt
└── updatedAt
Before creating this model, inspect the existing Prisma schema and reuse existing structures where possible.
6. ClickUp OAuth
ClickUp should use OAuth.
Flow:
Agent
  ↓
Settings / My Integrations
  ↓
Connect ClickUp
  ↓
ClickUp OAuth
  ↓
Agent authorizes
  ↓
Backend callback
  ↓
Exchange authorization code
  ↓
Encrypt/store credentials
  ↓
CLICKUP connection = CONNECTED
The agent should not need to reconnect every time an access token expires.
The backend must:
1. Resolve the agent's ClickUp connection.
2. Check token validity.
3. Refresh credentials when required.
4. Persist rotated credentials.
5. Retry appropriate requests.
6. Mark the connection degraded/error only when it genuinely cannot be used.
Never expose ClickUp client secrets or refresh tokens to the frontend.
7. Workspace / List Selection
After OAuth:
1. Resolve the authorized ClickUp workspace/team.
2. Allow the agent to select an appropriate workspace/list if required.
3. Persist the destination.
4. Do not ask the agent to select it on every synchronization.
The chosen destination belongs to that agent.
8. Client Switching Rule
Switching clients MUST NOT change the Unified Lead Directory.
The directory remains backed by the Agency CRM.
Selected Client A
    ↓
Same Unified Lead Directory
    ↓
Client A operational context
    ├── Zoho CRM
    ├── Twilio
    └── Calendar

Agent ClickUp
    └── Agent's personal sales tracker
Switching to Client B changes the client-specific operational context, but the agent's ClickUp connection remains the same.
Each ClickUp task should contain the client account so the agent can distinguish deals belonging to different clients.
9. Revenue / Commission
Keep two concepts separate.
Deal Value
Example:
Deal Value = $24,000
Expected Agent Revenue
Example:
Commission Rate = 10%
Deal Value = $24,000
Expected Agent Revenue = $2,400
The application calculates expected revenue according to the project's commission rules.
ClickUp only stores/displays the calculated value.
Do not make ClickUp the commission calculation engine.
For this stage, do not build payroll or payment processing.
10. Handoff Relationship
The same business event can appear in three systems for different purposes:
HubSpot
└── Agency sales record

Zoho
└── Client handoff / customer record

ClickUp
└── Agent personal sales record
Link records using stable IDs rather than names alone.
Example:
Internal Deal ID: deal_123

HubSpot Deal ID: 987654
Zoho Deal ID: 456789
ClickUp Task ID: abc123
11. Manual Failsafe
Every automated ClickUp operation needs a manual fallback.
Provide:
Create ClickUp Record
Retry ClickUp Sync
Update ClickUp Record
If ClickUp is unavailable:
Deal remains closed in the platform
        ↓
Zoho handoff can still proceed
        ↓
ClickUp sync = PENDING / FAILED
        ↓
Agent can retry
12. UI
Add ClickUp under the agent's personal integration/settings area.
Example:
Settings
└── My Integrations
      └── ClickUp
            Connected
            Workspace: Sales Workspace
            List: My Sales
            Last Sync: ...
Optional agent dashboard summary:
My Sales

Closed Today        3
Expected Revenue    $4,200
Pending Handoffs    2
Follow-ups          5
Do not create a second full CRM interface.
13. Service Architecture
Create a dedicated integration module following the existing pattern:
src/lib/integrations/clickup/
├── oauth.ts
├── client.ts
├── types.ts
├── workspace.ts
└── tasks.ts
Agent-specific synchronization/business logic should be isolated, for example:
src/lib/agent-crm/
Use:
Agent Deal Service
       ↓
ClickUp Adapter
       ↓
ClickUp API
Do not put ClickUp API calls directly in React components.
Potential API routes, following the project's existing conventions:
/api/integrations/clickup/connect
/api/integrations/clickup/callback
/api/integrations/clickup/status
/api/integrations/clickup/disconnect

/api/agent-sales
/api/agent-sales/[dealId]/sync
Reuse existing authentication/RBAC.
14. Database Rules
Before changing Prisma:
1. Inspect the current schema.
2. Inspect IntegrationConnection.
3. Inspect existing Deal/User/Agent models.
4. Determine whether an existing model can represent the relationship.
5. Only add a new model if necessary.
Do not create duplicate credential or deal models.
15. Graphify Usage
Use Graphify before implementation to map:
Authentication
      ↓
Agent/User
      ↓
Deal
      ↓
Client Account
      ↓
IntegrationConnection
      ↓
Existing HubSpot deal flow
      ↓
Existing Zoho handoff
Also trace exactly where the application currently determines that a deal is closed.
Use Graphify for relationship/dependency analysis, then inspect the relevant files directly.
Do not repeatedly scan the whole repository or use Graphify for small local edits.
Implementation Phases
Phase 2.9.1 — Architecture Inspection
Before coding:
1. Read Architecture.md.
2. Read MVP.md.
3. Read MVP_PROGRESS.md / IMPLEMENTATION_STATE.md.
4. Read the current Stage 2.8 specification.
5. Inspect Prisma schema.
6. Inspect IntegrationConnection.
7. Inspect authentication/RBAC.
8. Inspect current deal-close logic.
9. Inspect HubSpot integration.
10. Inspect Zoho handoff.
11. Use Graphify only where dependency analysis is useful.
Do not redesign the architecture.
Phase 2.9.2 — ClickUp OAuth
Implement:
- OAuth initiation
- OAuth callback
- authorization-code exchange
- encrypted credential persistence
- connection status
- disconnect
- token refresh
- agent ownership enforcement
Verify one agent's connection cannot affect another agent.
Phase 2.9.3 — Workspace/List Resolution
Implement:
- workspace/team discovery
- destination selection
- persistence of selected workspace/list
- reuse of the selection on later syncs
Phase 2.8.4 — Deal Synchronization
Implement:
Closed Deal
    ↓
Resolve Agent
    ↓
Resolve Client
    ↓
Calculate Expected Revenue
    ↓
Find existing ClickUp task
    ↓
Create OR update task
Test idempotency.
Phase 2.9.5 — Agent UI
Add:
- ClickUp connection status
- personal sales summary
- expected revenue
- closed deals
- pending ClickUp syncs
- retry action
Reuse the existing design system.
Do not redesign unrelated pages.
Phase 2.9.6 — Verification
Test:
OAuth
- successful connection
- invalid callback
- expired access token
- refresh flow
- disconnect
Authorization
- Agent A cannot access Agent B's connection
- Agent A cannot modify Agent B's sales records
Deal synchronization
- closed deal creates one task
- repeated sync updates the same task
- no duplicates
- correct agent
- correct client
- correct deal value
- correct expected revenue
Failure handling
- ClickUp API unavailable
- invalid credentials
- API failure
- retry succeeds
- core deal close remains successful
- Zoho handoff remains independent
Regression
Run:
- TypeScript
- ESLint
- existing Stage 2.7 tests
- system tests
- production build
- git diff --check
Explicit Non-Goals
Do NOT implement in Stage 2.9:
- full ClickUp clone
- agency-wide ClickUp management
- cross-agent ClickUp visibility
- payroll
- commission payment processing
- complex commission accounting
- replacing HubSpot
- replacing Zoho
- moving Unified Lead Directory into ClickUp
- making ClickUp the source of truth for deal state
- Twilio integration
- Calendar integration
- Stage 3 visual redesign
Definition of Done
Stage 2.8 is complete when:
- Agent can connect their own ClickUp account through OAuth.
- Credentials are stored securely server-side.
- Access tokens can be refreshed without repeated authorization.
- Agent connections are isolated.
- Closed deal creates a corresponding ClickUp task.
- Task identifies customer and client.
- Deal value is recorded.
- Expected agent revenue is recorded.
- Repeated syncs do not create duplicates.
- Existing tasks are updated rather than duplicated.
- ClickUp failure does not break the deal-close flow.
- Agent can retry failed ClickUp synchronization.
- Existing HubSpot functionality remains intact.
- Existing Zoho handoff remains intact.
- Client switching does not change the Unified Lead Directory.
- Existing tests/build checks pass.
Progress Tracking
At each meaningful step update MVP_PROGRESS.md or IMPLEMENTATION_STATE.md:
## Stage 2.9 - Status

### Completed
- ...

### In Progress
- ...

### Pending
- ...

### Notes / Decisions
- ...
Do not mark Stage 2.9 complete until verification passes.
Final Architecture
                    AGENCY
                      │
                ┌─────┴─────┐
                │  HubSpot  │
                │ Agency CRM│
                └─────┬─────┘
                      │
              Unified Lead Directory
                      │
             ┌────────┴────────┐
             │                 │
          Client A           Client B
             │                 │
           Zoho               Zoho
             │                 │
      Client Handoff    Client Handoff


              AGENT PERSONAL LAYER
                      │
                   ClickUp
                      │
          Agent's personal sales
             tracking/workflow
Key rule: HubSpot owns agency sales data. Zoho owns client-side handoff data. ClickUp gives each agent a personal operational view. None replaces the others.

















    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.