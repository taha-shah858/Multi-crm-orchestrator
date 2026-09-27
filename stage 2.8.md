Stage 2.8 — Agency CRM + Zoho Client CRM Handoff
Status
Planned / implementation specification.
Stage 2.6 established the working HubSpot integration and the agency-side unified sales data flow.
Stage 2.8 changes the CRM responsibility model:
- HubSpot becomes the Agency CRM.
- Zoho CRM becomes the Client CRM integration.
- The Agency CRM is the source of truth for the agency's unified leads, deals, sales pipeline, agents, and sales activity.
- The Client CRM is a downstream operational system used to notify the client that a deal/customer has been closed and to hand over the relevant customer/deal information.
- The Unified Lead Directory must remain tied to the Agency CRM and must NOT change when the active client account changes.
Do not begin Stage 3 until Stage 2.8 is implemented and verified.
1. New Architecture
The platform follows:
Agency
  |
  +-- Agency CRM (HubSpot)
  |      |
  |      +-- Unified Leads
  |      +-- Companies / Client Accounts
  |      +-- Deals
  |      +-- Sales Pipeline
  |      +-- Sales Agents
  |      +-- Closed Deals
  |
  +-- Client Accounts
         |
         +-- Client A
         |     |
         |     +-- Zoho CRM connection
         |     +-- Twilio account
         |     +-- Calendar account
         |
         +-- Client B
               |
               +-- Zoho CRM connection
               +-- Twilio account
               +-- Calendar account
The critical distinction is:
Agency CRM != Client CRM
The active client selector changes which client's operational integrations are active.
It does not change the Unified Lead Directory.
2. CRM Responsibilities
2.1 Agency CRM — HubSpot
HubSpot is the agency's central sales CRM.
It contains:
- Unified leads
- Companies / client accounts
- Deals
- Sales pipelines
- Sales agents / owners
- Deal stages
- Deal amounts
- Close dates
- Sales activities
- Closed customer information
The existing HubSpot integration should be preserved and extended rather than replaced.
Source of truth
The agency-side CRM is the source of truth for:
- Unified Lead Directory
- Agency sales pipeline
- Agent sales activity
- Deal state
- Closed-won/closed customer state
- Agency sales reporting
- Commission calculations
3. Client CRM — Zoho CRM
Zoho CRM is the selected Client CRM provider for this stage.
The purpose is NOT to mirror the entire Agency CRM into Zoho.
Instead, the platform sends a controlled deal handoff to the appropriate client's Zoho CRM when an agency deal reaches the configured closed state.
The client should receive enough information to understand:
1. Who the customer is
2. What they purchased / agreed to
3. Deal value
4. When the deal closed
5. Why it closed
6. Which agent handled it
7. What the client needs to do next
8. Any relevant handoff notes
9. What follow-up action is expected
4. Zoho OAuth Architecture
Zoho authentication is an agency/admin responsibility, not an individual agent responsibility.
4.1 Admin connection
The agency administrator connects Zoho through:
Agency Portal
    ↓
Integrations
    ↓
Zoho CRM
    ↓
Connect
    ↓
Zoho OAuth
    ↓
Authorize
    ↓
Store encrypted credentials
The OAuth connection must be associated with the appropriate client account.
The application must never expose:
- Client secrets
- Refresh tokens
- Access tokens
to the browser.
All OAuth token exchange and refresh operations remain server-side.
4.2 Agent access
Agents should NOT have to perform Zoho OAuth.
Once the administrator has configured the client's Zoho CRM connection:
Admin connects Zoho
        ↓
Connection stored for Client Account
        ↓
Agent selects Client Account
        ↓
Platform resolves that client's Zoho connection
        ↓
Agent can view/use client CRM operations
This follows the same client-account architecture already used for integrations.
5. Integration Hub
The Agency Integration Hub should show both CRM roles clearly.
Example:
CRM Integrations

Agency CRM
────────────────────────
HubSpot
Connected
Agency sales CRM


Client CRM Providers
────────────────────────
Zoho CRM
Configured per client account
Do not present Zoho as if it were another source for the Unified Lead Directory.
The UI should make the distinction obvious.
Recommended labels
Agency CRM
HubSpot

Client CRM
Zoho CRM
This prevents confusion between:
- the agency's sales system
- the client's operational CRM
6. Client Account Integration Model
Each client account can have its own integrations.
Example:
Client Account: ACME Inc.

Agency CRM
    HubSpot
    ↓
Client CRM
    Zoho CRM
    ↓
Communication
    Twilio
    ↓
Calendar
    Calendly / Google / Outlook
Another client may have:
Client Account: Example Corp.

Agency CRM
    HubSpot
    ↓
Client CRM
    Zoho CRM
    ↓
Twilio
    different account/number
    ↓
Calendar
    different account
Therefore integration ownership is:
HubSpot
→ Agency-level

Zoho
→ Client-account-level

Twilio
→ Client-account-level

Calendar
→ Client-account-level
This model must remain consistent throughout the application.
7. Unified Lead Directory Rule
This is a critical Stage 2.7 requirement.
The Unified Lead Directory belongs to the Agency CRM.
Changing the selected client must NOT cause the Unified Lead Directory to be replaced or re-synced from the client's Zoho CRM.
Incorrect:
Select Client A
    ↓
Load Client A CRM
    ↓
Replace Unified Leads

Select Client B
    ↓
Load Client B CRM
    ↓
Replace Unified Leads
Correct:
Agency HubSpot
      ↓
Unified Lead Directory
      ↓
Agent selects Client A / Client B
      ↓
Only client-specific context changes
      ↓
Zoho / Twilio / Calendar connection changes
The Unified Lead Directory remains stable.
Client selection determines the operational context for the selected client.
8. Deal Handoff
The central feature of Stage 2.7 is the Deal Handoff.
When an agency deal is closed, the platform creates a handoff for the client's CRM.
Example:
Agent closes deal
        ↓
Agency CRM deal becomes Closed Won
        ↓
Platform detects closed state
        ↓
Determine associated Client Account
        ↓
Resolve client's Zoho connection
        ↓
Create/update Zoho CRM records
        ↓
Create Deal Handoff record
        ↓
Record sync result
The handoff must be idempotent.
If the same closed deal is processed again, the platform must not create uncontrolled duplicate records.
9. Closing Trigger
The primary trigger should be a deal reaching the configured closed-won state in the Agency CRM.
For example:
Deal Stage = Closed Won
The exact stage identifier must come from the configured Agency CRM pipeline rather than relying on hard-coded display text where possible.
The platform should also support a controlled manual action:
Mark as Closed & Handoff
This is useful as a manual override/failsafe.
10. Deal Handoff Data
The handoff should contain a focused set of information.
10.1 Customer information
Recommended:
- First name
- Last name
- Email
- Phone
- Company
- Job title
- Customer/source contact ID
- Agency CRM contact ID
10.2 Deal information
Recommended:
- Deal name
- Deal ID
- Deal amount
- Currency
- Pipeline
- Final stage
- Close date
- Product/service
- Deal source
- Agency CRM URL/reference
10.3 Closure information
Recommended:
- Closed status
- Closed date/time
- Close reason
- Outcome
- Agent who closed the deal
- Agency owner
- Relevant sales notes
10.4 Client handoff information
Recommended:
- Handoff status
- Handoff date/time
- Client CRM owner
- Next action
- Next action due date
- Handoff notes
- Customer expectations
- Special instructions
11. Recommended Zoho Record Structure
Do not attempt to copy every Agency CRM property into Zoho.
Use the minimum useful record structure.
Recommended mapping:
Zoho Contact / Lead
-------------------
First Name
Last Name
Email
Phone
Company
Job Title
Source
Agency Contact ID
Zoho Deal
-------------------
Deal Name
Amount
Currency
Closing Date
Stage
Pipeline
Contact
Company
Source
Agency Deal ID
Sales Agent
Close Reason
Handoff Notes
-------------------
Customer context
What was sold
Why the deal closed
What the client should do next
Special instructions
The exact Zoho object/property mapping should be verified against the Zoho CRM API capabilities before implementation.
12. Handoff Status
The platform should maintain its own handoff state independently from the Zoho record.
Recommended states:
PENDING
SYNCING
SYNCED
FAILED
RETRY_REQUIRED
MANUAL_REVIEW
Example:
Deal: Northstar Platform Rollout

Agency Deal:
Closed Won

Client:
ACME Inc.

Client CRM:
Zoho CRM

Handoff:
SYNCED
If Zoho is temporarily unavailable:
Agency Deal:
Closed Won

Handoff:
RETRY_REQUIRED
The closed deal must remain closed in the Agency CRM.
A client CRM failure must not reverse the agency's sales state.
13. Client CRM Records UI
Add a dedicated Client CRM module/page for agents.
This module should show records belonging to the currently selected client.
Suggested navigation:
Sales
  └── Unified Leads

Client Operations
  ├── Client CRM
  ├── Deal Handoffs
  ├── Communications
  └── Calendar
The Client CRM module should clearly display:
Client Account
CRM Provider
Connection Status
Last Sync
Records
Example:
Client CRM Operations

Client:
ACME Inc.

CRM:
Zoho CRM

Status:
Connected

Last Sync:
...

Tabs:
Contacts
Deals
Notes
Handoffs
14. Editing Client CRM Records
The platform should support controlled editing of client CRM records.
For example:
View Contact
    ↓
Edit
    ↓
Save
    ↓
Update local representation
    ↓
Update Zoho
    ↓
Record audit event
Only fields supported by the integration should be editable.
Do not create a fake local CRM that becomes a competing source of truth.
The platform is an operational interface over the client's Zoho CRM.
15. Deal Handoff UI
Add a dedicated Deal Handoffs view.
Example:
Deal Handoffs

Deal                  Client       Status
------------------------------------------------
Northstar Rollout     ACME Inc.    Synced
Greenfield Automation Client B     Pending
Vertex Expansion      Client C     Failed
Selecting a handoff should show:
Customer
Deal
Amount
Close Date
Closed By
Close Reason
Handoff Notes
Next Action
Zoho Record
Sync Status
Last Attempt
16. Fields Visible to the Client
The attached UI reference demonstrates the existing Client CRM Operations concept with:
- Contacts
- Deals
- Notes
- Deal Handoffs
- Customer/company information
- Email
- Phone
- CRM identifiers
- Edit & Sync actions
The new Zoho implementation should preserve this operational concept.
For a closed deal, I recommend the client-facing handoff contain at minimum:
Customer
    Name
    Email
    Phone
    Company

Deal
    Deal Name
    Amount
    Product/Service
    Close Date
    Pipeline/Stage

Closure
    Close Reason
    Closed By
    Outcome

Handoff
    What happened
    What was sold
    What the client needs to do next
    Follow-up date
    Additional notes
Do not add unnecessary fields just because Zoho supports them. The goal is a useful handoff, not a complete CRM clone.
17. Association Strategy
The platform should maintain stable external IDs.
Recommended relationships:
Agency Client Account
        |
        +-- HubSpot Company ID
        |
        +-- Zoho Connection
        |
        +-- Zoho Organization/Account reference
For a closed deal:
Agency Deal ID
      |
      +-- Agency Contact ID
      |
      +-- Agency Company/Client ID
      |
      +-- Deal Handoff
              |
              +-- Zoho Contact ID
              +-- Zoho Company ID
              +-- Zoho Deal ID
These identifiers are required to prevent duplicate client CRM records and to support future updates.
18. Security
OAuth credentials must be stored securely.
Never expose:
- Zoho client secret
- Zoho refresh token
- Zoho access token
to the frontend.
Agent requests should resolve:
Authenticated Agent
        ↓
Selected Client Account
        ↓
Authorized IntegrationConnection
        ↓
Server-side Zoho service
An agent must not be able to select another client's Zoho connection by manipulating a client ID in the request.
Server-side authorization must verify the agent's access to the selected client account.
19. Failure Handling
If the client CRM is unavailable:
Agency sale remains successful.
        ↓
Handoff becomes FAILED / RETRY_REQUIRED.
        ↓
Agent/admin can retry.
The system must not:
- duplicate records on retry
- change the deal back to open
- lose the handoff data
- require the agent to reconnect OAuth
- expose OAuth errors directly as implementation details
The UI should provide a human-readable message.
Example:
Deal closed successfully.

Client CRM handoff could not be completed.

Reason:
Zoho CRM is temporarily unavailable.

Action:
Retry handoff
20. Audit Logging
Use the existing audit logging system.
Record important events such as:
ZOHO_CONNECTED
ZOHO_DISCONNECTED
CLIENT_CRM_RECORD_UPDATED
DEAL_HANDOFF_CREATED
DEAL_HANDOFF_SYNC_STARTED
DEAL_HANDOFF_SYNC_COMPLETED
DEAL_HANDOFF_SYNC_FAILED
Do not create a second audit mechanism.
Use the existing project's AuditAction conventions and extend them only where required.
21. Graphify Usage
Use Graphify at the beginning of Stage 2.7 to understand:
HubSpot integration
        ↓
IntegrationConnection
        ↓
Client Account
        ↓
Unified Lead Directory
        ↓
Deal
        ↓
Handoff
        ↓
Client CRM
        ↓
Zoho
Also trace:
- Existing OAuth flow
- Existing Integration Hub
- Existing client-account resolution
- Existing sync engine
- Existing Prisma models
- Existing audit system
- Existing client CRM UI
- Existing deal handoff implementation
After the dependency structure is understood, prefer direct file inspection.
Do not repeatedly run broad Graphify analysis for small local changes.
22. Implementation Phases
Phase 2.7.1 — Architecture/Data Model
Inspect existing implementation first.
Confirm/reuse:
- Client Account
- IntegrationConnection
- Agency CRM connection
- Deal
- Contact
- Audit
- Existing sync infrastructure
Add only the database models required for:
- Client CRM configuration
- Deal Handoff
- Client CRM record/reference tracking
Verify Prisma migration and generated client.
Phase 2.7.2 — Zoho OAuth
Implement:
- Admin-only connect flow
- OAuth callback
- Secure credential storage
- Refresh token handling
- Connection status
- Disconnect/reconnect
- Server-side token management
Do not expose credentials to agents.
Phase 2.7.3 — Zoho Client CRM Service
Implement a provider service following the existing integration architecture.
Responsibilities:
- Authenticate
- Refresh tokens
- Fetch contacts
- Fetch companies/accounts
- Fetch deals
- Create/update client records
- Create/update closed-deal handoffs
- Resolve external IDs
- Handle API errors
Keep Zoho-specific API logic isolated from generic CRM/business logic.
Phase 2.7.4 — Deal Handoff
Implement:
Closed Agency Deal
        ↓
Resolve Client Account
        ↓
Resolve Zoho Connection
        ↓
Create/update client CRM records
        ↓
Create Deal Handoff
        ↓
Persist external IDs
        ↓
Audit result
Support both:
- automatic closed-deal trigger
- manual handoff/retry
Phase 2.7.5 — Client CRM UI
Implement/refine:
- Client CRM page
- Contacts
- Deals
- Notes
- Deal Handoffs
- Edit & Sync
- Sync status
- Error/retry state
The selected client controls the client CRM context.
The Unified Lead Directory must remain unchanged.
Phase 2.7.6 — Integration Hub
Add Zoho alongside HubSpot.
Clearly separate:
Agency CRM
HubSpot
from:
Client CRM
Zoho
Admin controls the connections.
Agents consume the configured client integration through the active client account.
Phase 2.7.7 — Verification
Test:
1. Admin connects Zoho.
2. OAuth credentials are stored securely.
3. Agent can select a client with Zoho configured.
4. Agent does not need to perform OAuth.
5. Unified Lead Directory remains unchanged when switching clients.
6. Client CRM changes when switching clients.
7. Client A cannot access Client B's Zoho data.
8. Contacts can be viewed.
9. Supported records can be edited.
10. Agency deal can be marked Closed Won.
11. Closed deal automatically creates a handoff.
12. Handoff creates/updates the appropriate Zoho records.
13. Retry does not create duplicates.
14. Handoff failure does not change Agency CRM deal state.
15. Manual handoff works.
16. Audit events are recorded.
17. Expired Zoho access tokens refresh correctly.
18. Server restart does not lose refresh credentials.
19. TypeScript passes.
20. Production build passes.
23. Important Scope Boundary
Stage 2.7 is NOT a full Zoho CRM clone.
Do not implement:
- Complete Zoho object coverage
- Every Zoho property
- Full workflow automation
- Full Zoho analytics
- Full Zoho administration
- Arbitrary custom modules
- Complete bidirectional synchronization of every object
The MVP goal is:
Agency CRM
    ↓
Closed Deal
    ↓
Client Account
    ↓
Zoho CRM
    ↓
Useful customer/deal handoff
24. Definition of Done
Stage 2.7 is complete when:
- HubSpot continues functioning as the Agency CRM.
- Unified Lead Directory is sourced from the Agency CRM.
- Switching clients does not replace Unified Leads.
- Zoho can be connected by an authorized agency administrator.
- Zoho connection is associated with the correct client account.
- Agents automatically inherit access through their client-account permissions.
- Agents do not perform OAuth.
- Client CRM records can be viewed.
- Supported client CRM records can be edited.
- Closing an Agency CRM deal can trigger a client handoff.
- The handoff contains useful customer, deal, closure, and next-action information.
- Zoho records are created/updated without uncontrolled duplicates.
- Handoff failures can be retried.
- Agency deal state remains authoritative.
- Audit logging works.
- OAuth refresh works.
- TypeScript passes.
- Tests pass.
- Production build passes.
Only after these conditions are satisfied should the project proceed to Stage 3 — UI / UX Refinement.

    To pick up a draggable item, press the space bar.
    While dragging, use the arrow keys to move the item.
    Press space again to drop the item in its new position, or press escape to cancel.