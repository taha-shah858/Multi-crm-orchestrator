# ArchitectureEssentials.md

## 1. Architecture Goal
These are not hard and fast rules if something doesnt work the plan can be changed a bit 

The platform is a **multi-tenant, provider-agnostic sales workspace** for sales agencies whose clients use different CRM systems.

The agent interacts with **one application**, while the platform handles the complexity of communicating with different CRMs.

```text
Sales Agent
     ↓
Unified Sales Workspace
     ↓
Core Platform
     ↓
Integration Layer
     ↓
Multiple CRM Providers
```

The architecture must allow new CRM providers to be added **without changing the core frontend or business logic**.

---

# 2. Recommended Tech Stack

| Layer           | Technology                    |
| --------------- | ----------------------------- |
| Frontend        | Next.js + React + TypeScript  |
| UI              | Tailwind CSS                  |
| Server State    | TanStack Query                |
| Backend         | Node.js + NestJS + TypeScript |
| Database        | PostgreSQL                    |
| ORM             | Prisma                        |
| Background Jobs | Redis + BullMQ                |
| API             | REST + JSON                   |
| Authentication  | JWT + Refresh Tokens          |
| Testing         | Jest + Playwright             |
| Infrastructure  | Docker                        |

---

# 3. Core Architecture

```text
                    SALES AGENT
                         │
                         ▼
              ┌─────────────────────┐
              │    UNIFIED UI       │
              │                     │
              │ My Leads            │
              │ My Calls            │
              │ My Calendar         │
              │ My Tasks            │
              │ My Pipeline         │
              │ My Activities       │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   CORE PLATFORM     │
              │                     │
              │ Unified Data Model  │
              │ Business Logic      │
              │ Auth / RBAC         │
              │ Multi-tenancy       │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │ INTEGRATION LAYER   │
              │                     │
              │ CRM Adapters        │
              │ ID Mapping          │
              │ Sync Engine         │
              │ Webhooks            │
              └──────────┬──────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
        GHL             Close       ActiveCampaign
          │              │              │
          └──────────────┼──────────────┘
                         │
                    Future CRMs
```

---

# 4. Architectural Style

Use a:

> **Modular Monolith + Provider-Agnostic Integration Layer + Asynchronous Synchronization**

Do **not** use microservices for the FYP.

The backend should be divided into logical modules:

```text
Auth
Organizations
Users
Clients
Leads
Activities
Appointments
Tasks
Integrations
Synchronization
Notifications
Audit
```

---

# 5. Provider-Agnostic Design

The frontend and core business logic must **never depend on a specific CRM**.

Bad:

```text
Frontend
   ↓
GoHighLevel API
```

Also bad:

```text
LeadService
 ├── GoHighLevel logic
 ├── Close logic
 └── ActiveCampaign logic
```

Correct:

```text
Frontend
   ↓
Core Platform
   ↓
Integration Service
   ↓
CRM Adapter
   ↓
Specific CRM API
```

This means adding a new CRM should primarily require implementing a **new adapter**.

---

# 6. Unified Data Model

Different CRMs use different terminology and schemas.

The platform therefore defines its own common models.

Core models:

```text
Lead
Contact
Deal
Activity
Note
Task
Appointment
```

Example:

```text
Lead
├── id
├── clientId
├── assignedAgentId
├── firstName
├── lastName
├── email
├── phone
├── company
├── status
└── updatedAt
```

The frontend only works with these unified models.

It should not need to know whether the underlying CRM calls something a `Lead`, `Contact`, or something else.

---

# 7. CRM Adapter Pattern

Each CRM implements a common interface.

```typescript
interface CRMAdapter {

    getLeads(): Promise<Lead[]>;

    getLead(id: string): Promise<Lead>;

    createLead(data: Lead): Promise<Lead>;

    updateLead(
        id: string,
        data: Partial<Lead>
    ): Promise<Lead>;

    updateLeadStatus(
        id: string,
        status: LeadStatus
    ): Promise<void>;

    addNote(
        leadId: string,
        note: string
    ): Promise<void>;
}
```

Implementations:

```text
CRMAdapter
│
├── GoHighLevelAdapter
├── ActiveCampaignAdapter
├── CloseAdapter
├── HubSpotAdapter       ← future
├── SalesforceAdapter    ← future
└── PipedriveAdapter     ← future
```

The core application interacts with `CRMAdapter`, not directly with individual providers.

---

# 8. Adding a New CRM

Adding another CRM should follow this pattern:

```text
New CRM
   ↓
Create New Adapter
   ↓
Implement CRMAdapter
   ↓
Map CRM Data → Unified Model
   ↓
Register Provider
```

The following should **not** need to change:

```text
Agent Dashboard
Lead UI
Pipeline UI
Core Lead Service
Database structure
Authentication
```

For example, adding HubSpot:

```text
HubSpot API
     ↓
HubSpotAdapter
     ↓
Unified Lead
     ↓
Existing Backend
     ↓
Existing Frontend
```

---

# 9. CRM Capability System

Not every CRM supports the same functionality.

Therefore, adapters should expose their capabilities.

```typescript
interface CRMCapabilities {
    leads: boolean;
    contacts: boolean;
    deals: boolean;
    activities: boolean;
    notes: boolean;
    tasks: boolean;
    calendar: boolean;
    calling: boolean;
}
```

Example:

```text
                 GHL   Close   AC
Leads             ✓      ✓     ✓
Contacts          ✓      ✓     ✓
Deals             ✓      ✓     ✓
Notes             ✓      ✓     ✓
Tasks             ✓      ✓     ✗
Calendar          ✓      ✓     ✓
Calling           ✓      ✗     ✗
```

The frontend can use capabilities to determine which **CRM-backed features** are available for a particular client.

---

# 10. Platform-Owned vs CRM-Owned Features

Not every feature should depend on the CRM.

Some functionality should eventually belong to the platform itself.

### Platform-owned

```text
Agent Dashboard
Tasks
Unified Activities
Agent Workspace
Internal Notifications
Audit Logs
```

### CRM-backed

```text
CRM Leads
CRM Contacts
CRM Deals
CRM Notes
CRM Pipelines
```

### Potential future integrations

```text
Calling → Telephony Provider
Calendar → Calendar Provider
Messaging → Communication Provider
```

This prevents the product from becoming dependent on whichever features a particular CRM happens to provide.

---

# 11. External ID Mapping

Internal platform IDs must remain separate from CRM IDs.

Example:

```text
Internal Lead
lead_123

GoHighLevel → ghl_8921
Close        → close_4812
HubSpot      → hs_7291
```

Use an `external_records` table:

```text
external_records
-------------------------
id
organization_id
client_id
entity_type
internal_entity_id
provider
external_id
last_synced_at
```

The internal ID is the identity used by the platform.

---

# 12. Multi-Client Architecture

A sales agency can have multiple clients using different CRMs.

```text
Sales Agency
│
├── Client A
│    └── GoHighLevel
│
├── Client B
│    └── HubSpot
│
├── Client C
│    └── Close
│
└── Client D
     └── ActiveCampaign
```

The agent sees:

```text
MY LEADS
──────────────
John Smith
Sarah Khan
Ali Ahmed
David Jones
```

The CRM provider is an implementation detail attached to each client's data.

---

# 13. Synchronization Architecture

Synchronization works in both directions.

### CRM → Platform

```text
CRM
 ↓
Webhook / Polling
 ↓
Backend
 ↓
Normalize
 ↓
PostgreSQL
 ↓
Frontend
```

### Platform → CRM

```text
Agent
 ↓
Backend
 ↓
PostgreSQL
 ↓
Sync Event
 ↓
Redis / BullMQ
 ↓
CRM Adapter
 ↓
External CRM
```

---

# 14. Asynchronous Synchronization

The agent should not wait for multiple external API requests.

Example:

```text
Agent
 ↓
Close Lead
 ↓
Update Internal DB
 ↓
Create Sync Events
 ↓
Return Success
```

Background workers then execute:

```text
Queue
├── GHL Sync
├── Close Sync
└── ActiveCampaign Sync
```

This makes the UI responsive and allows failed integrations to be retried.

---

# 15. Sync Reliability

Every synchronization job should have a status:

```text
PENDING
PROCESSING
SUCCESS
FAILED
RETRYING
```

Failed operations should automatically retry.

Example:

```text
CRM API
   ↓
Failed
   ↓
Retry
   ↓
Retry
   ↓
Success
```

If all retries fail, the failure should be recorded and shown to the appropriate user.

Successful CRM updates should not be rolled back just because another CRM failed.

---

# 16. Idempotency

Sync operations must be idempotent.

Processing the same event twice must not create duplicate:

```text
Notes
Activities
Appointments
Deals
```

Every synchronization event should have a unique event ID/idempotency key.

---

# 17. Webhooks

When supported by a CRM:

```text
CRM
 ↓
Webhook Endpoint
 ↓
Validate Signature
 ↓
Queue
 ↓
Webhook Worker
 ↓
Normalize Event
 ↓
Update Database
```

Webhook processing should be asynchronous.

---

# 18. Database

PostgreSQL should store the platform's unified operational state.

Core tables:

```text
organizations
users
clients
leads
contacts
deals
activities
tasks
appointments
notes
crm_connections
external_records
sync_events
audit_logs
```

The internal database should provide fast unified reads instead of querying every CRM whenever the agent opens a page.

---

# 19. Multi-Tenancy

All tenant data must be isolated by organization.

```text
Organization
│
├── Users
├── Clients
├── CRM Connections
└── Sales Data
```

Every tenant-owned query must enforce:

```text
organization_id = currentUser.organizationId
```

No organization may access another organization's data.

---

# 20. Authentication & Authorization

Use:

```text
JWT
+
Refresh Tokens
+
RBAC
```

Initial roles:

```text
ADMIN
MANAGER
AGENT
```

Authorization must be enforced by the backend, not only by hiding UI elements.

---

# 21. CRM Credentials

CRM credentials must never be exposed to the frontend.

```text
CRM Credentials
      ↓
Backend
      ↓
Encrypted Storage
      ↓
CRM Adapter
      ↓
CRM API
```

Secrets must never be committed to Git.

---

# 22. Core Business Events

Important actions should generate events:

```text
LeadCreated
LeadAssigned
LeadUpdated
LeadStatusChanged
DealClosed
NoteAdded
TaskCreated
AppointmentCreated
CallCompleted
```

Example:

```text
LeadStatusChanged
        ↓
Update Internal DB
        ↓
Create Sync Event
        ↓
Queue
        ↓
Relevant CRM Adapter
        ↓
External CRM
        ↓
Record Result
        ↓
Audit Log
```

---

# 23. Core Design Rules

### Rule 1

**The frontend never communicates directly with CRM APIs.**

### Rule 2

**The frontend uses the platform's unified data model.**

### Rule 3

**CRM-specific logic exists only inside adapters/integration services.**

### Rule 4

**Adding a CRM should not require redesigning the core frontend.**

### Rule 5

**CRM capabilities must be explicitly represented because providers do not offer identical functionality.**

### Rule 6

**Internal IDs are independent of external CRM IDs.**

### Rule 7

**External synchronization is asynchronous and retryable.**

### Rule 8

**All tenant data is isolated by organization.**

### Rule 9

**Business actions should generate trackable events.**

### Rule 10

**The platform should own core agent workflow functionality instead of blindly depending on CRM features.**

---

# 24. Essential End-to-End Architecture

```text
                         SALES AGENT
                              │
                              ▼
                    ┌───────────────────┐
                    │   YOUR FRONTEND   │
                    │                   │
                    │ Leads             │
                    │ Calls             │
                    │ Calendar          │
                    │ Tasks             │
                    │ Pipeline          │
                    │ Activities        │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │   CORE PLATFORM   │
                    │                   │
                    │ Unified Models    │
                    │ Business Logic    │
                    │ Auth / RBAC       │
                    │ Multi-Tenancy     │
                    └─────────┬─────────┘
                              │
                              ▼
                    ┌───────────────────┐
                    │ INTEGRATION LAYER │
                    │                   │
                    │ Adapter Pattern   │
                    │ ID Mapping        │
                    │ Capabilities      │
                    │ Webhooks          │
                    │ Sync Engine       │
                    └─────────┬─────────┘
                              │
          ┌───────────────────┼────────────────────┐
          ▼                   ▼                    ▼
       GHL Adapter       Close Adapter       AC Adapter
          │                   │                    │
          ▼                   ▼                    ▼
        GHL API            Close API             AC API

                              +
                       Future Adapters
                              │
               ┌──────────────┼──────────────┐
               ▼              ▼              ▼
            HubSpot       Salesforce      Pipedrive
```

---

# 25. Final Architectural Principle

The central principle of the system is:

> **The agent works with one unified sales platform; the integration layer adapts each client's CRM to that platform.**

Therefore:

```text
                 ONE FRONTEND
                      │
                      ▼
              ONE CORE PLATFORM
                      │
                      ▼
             ONE UNIFIED MODEL
                      │
                      ▼
              ADAPTER INTERFACE
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
      GHL           Close           HubSpot
       ▼              ▼              ▼
      API             API            API
```

**The frontend does not adapt to every CRM. Every CRM adapts to your platform.**

This makes the architecture extensible beyond the initial three CRMs while keeping the FYP implementation manageable.
