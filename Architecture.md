# System Architecture

## 1. Overview

The Unified Sales Operations Platform is a **multi-tenant SaaS-style web application** that acts as an abstraction and synchronization layer between sales agents and multiple external CRM systems.

The core architectural principle is:

> **The frontend communicates with our backend, the backend communicates with external systems, and agents should not need to communicate with each CRM directly.**

The architecture must support:

* Multiple sales agencies.
* Multiple agents per agency.
* Multiple client companies per agency.
* Multiple CRM providers.
* A unified internal data model.
* Bidirectional synchronization.
* Background synchronization jobs.
* Webhooks.
* External API failures and retries.
* Role-based access control.
* Tenant isolation.
* Audit logging.
* Extensibility for future CRM integrations.

---

# 2. High-Level Architecture

```text
                         ┌───────────────────────┐
                         │       USER            │
                         │    Sales Agent        │
                         └───────────┬───────────┘
                                     │
                                     │ HTTPS
                                     ▼
                         ┌───────────────────────┐
                         │       FRONTEND        │
                         │       Next.js         │
                         │       React           │
                         │      TypeScript       │
                         └───────────┬───────────┘
                                     │
                              REST / JSON
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      BACKEND API      │
                         │     NestJS / Node     │
                         │      TypeScript       │
                         └───────────┬───────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
      ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
      │ Auth & RBAC   │      │ Business      │      │ Integration   │
      │ Module        │      │ Logic         │      │ Layer         │
      └───────────────┘      └───────────────┘      └───────┬───────┘
                                                            │
                                                            ▼
                                                   ┌─────────────────┐
                                                   │ Sync / Job      │
                                                   │ Processing      │
                                                   └────────┬────────┘
                                                            │
                             ┌──────────────────────────────┼──────────────────────────────┐
                             │                              │                              │
                             ▼                              ▼                              ▼
                    ┌─────────────────┐           ┌─────────────────┐           ┌─────────────────┐
                    │  GoHighLevel    │           │ ActiveCampaign  │           │   Close CRM     │
                    │      API        │           │      API        │           │      API        │
                    └─────────────────┘           └─────────────────┘           └─────────────────┘


                         ┌───────────────────────┐
                         │      PostgreSQL       │
                         │   Primary Database    │
                         └───────────────────────┘

                         ┌───────────────────────┐
                         │        Redis          │
                         │ Queue / Cache / Jobs  │
                         └───────────────────────┘
```

---

# 3. Architectural Style

The recommended architecture is a:

> **Modular Monolith + Asynchronous Integration Layer**

The FYP should **not** initially be implemented as a large microservices architecture.

A modular monolith provides:

* Easier development.
* Easier debugging.
* Lower infrastructure complexity.
* Clear module boundaries.
* Easier deployment.
* Easier testing.

The system can later be split into independent services if the product grows.

---

# 4. Technology Stack

## 4.1 Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
React Query / TanStack Query
Zod
```

### Responsibilities

The frontend handles:

* User interface.
* Authentication state.
* Dashboard.
* Lead management.
* Calendar.
* Activities.
* Notes.
* Client management.
* Integration configuration.
* Sync status.
* Notifications.

The frontend must **never contain third-party CRM API secrets**.

---

# 4.2 Backend

Recommended:

```text
Node.js
NestJS
TypeScript
```

NestJS is recommended because the application contains multiple logically independent domains.

The backend should be organized into modules such as:

```text
AuthModule
UsersModule
OrganizationsModule
ClientsModule
LeadsModule
ContactsModule
DealsModule
ActivitiesModule
AppointmentsModule
TasksModule
IntegrationsModule
SyncModule
NotificationsModule
AuditModule
```

---

# 4.3 Database

```text
PostgreSQL
```

PostgreSQL is the primary source of truth for the platform.

It stores:

* Users.
* Organizations.
* Clients.
* Leads.
* Deals.
* Activities.
* Appointments.
* CRM connections.
* External ID mappings.
* Synchronization events.
* Audit logs.

---

# 4.4 ORM

Recommended:

```text
Prisma
```

Prisma provides:

* Type-safe database queries.
* Schema management.
* Migrations.
* Strong TypeScript integration.

Alternative:

```text
TypeORM
```

Prisma is preferred for this project because the development team can maintain a clear typed data model without excessive ORM complexity.

---

# 4.5 Queue / Background Processing

Recommended:

```text
Redis
+
BullMQ
```

Redis is used for:

* Background jobs.
* Synchronization queues.
* Retry handling.
* Temporary caching.
* Rate-limit coordination where required.

BullMQ handles:

```text
Sync jobs
Retry jobs
Webhook processing
Notification jobs
Background imports
```

---

# 4.6 Authentication

Recommended:

```text
JWT
+
Refresh Token
```

Alternative:

```text
Session-based authentication
```

The backend must validate the authenticated user's:

```text
user_id
organization_id
role
permissions
```

on protected requests.

---

# 4.7 API

The frontend communicates with the backend through:

```text
REST API
JSON
HTTPS
```

Example:

```text
GET    /api/v1/leads
GET    /api/v1/leads/:id
PATCH  /api/v1/leads/:id
POST   /api/v1/leads/:id/notes
POST   /api/v1/leads/:id/call
POST   /api/v1/leads/:id/close
```

---

# 5. Repository Structure

A monorepo is recommended.

```text
sales-platform/
│
├── apps/
│   │
│   ├── web/
│   │   └── Next.js frontend
│   │
│   └── api/
│       └── NestJS backend
│
├── packages/
│   │
│   ├── shared-types/
│   │
│   ├── validation/
│   │
│   └── config/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── docker/
│
├── docs/
│
├── .env.example
├── docker-compose.yml
├── package.json
└── README.md
```

---

# 6. Backend Architecture

The backend should follow a layered architecture.

```text
Controller
    ↓
Application / Service Layer
    ↓
Domain Logic
    ↓
Repository
    ↓
Database
```

External integrations should be separated:

```text
Business Service
       ↓
Integration Service
       ↓
CRM Adapter
       ↓
External CRM API
```

---

# 7. Backend Module Structure

Recommended structure:

```text
apps/api/src/

├── auth/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── auth.module.ts
│   ├── guards/
│   └── strategies/
│
├── users/
│
├── organizations/
│
├── clients/
│
├── leads/
│
├── contacts/
│
├── deals/
│
├── activities/
│
├── appointments/
│
├── tasks/
│
├── integrations/
│
├── sync/
│
├── notifications/
│
├── audit/
│
├── database/
│
├── common/
│
└── main.ts
```

---

# 8. Domain Modules

## 8.1 Auth Module

Responsible for:

* Registration.
* Login.
* Password hashing.
* Token generation.
* Refresh tokens.
* Authentication guards.

---

## 8.2 Users Module

Responsible for:

* User profiles.
* User roles.
* User status.
* Organization membership.

---

## 8.3 Organizations Module

Represents the sales agency.

Example:

```text
Organization
│
├── Users
├── Clients
├── CRM Connections
└── Leads
```

---

## 8.4 Clients Module

Represents companies that have hired the sales agency.

Example:

```text
Sales Agency
│
├── Client A
├── Client B
└── Client C
```

Each client can have one or more CRM connections.

---

# 9. Lead Module

The Lead module manages the platform's normalized representation of a sales lead.

Responsibilities:

* Create lead.
* Retrieve lead.
* Update lead.
* Search leads.
* Filter leads.
* Assign lead.
* Change lead status.
* Close lead.

The Lead module should not contain CRM-specific API code.

For example, this is bad:

```text
LeadService
    ↓
GoHighLevel API
```

Instead:

```text
LeadService
    ↓
IntegrationService
    ↓
CRMAdapter
```

---

# 10. Integration Architecture

This is the most important architectural component.

The system must abstract CRM providers behind a common interface.

```text
                    IntegrationService
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
       GoHighLevel      ActiveCampaign    Close
          Adapter          Adapter       Adapter
              │             │             │
              ▼             ▼             ▼
            API             API           API
```

---

# 11. CRM Adapter Pattern

Define a generic interface:

```text
CRMAdapter
```

Conceptually:

```typescript
interface CRMAdapter {

    getLead(externalId: string): Promise<ExternalLead>;

    getLeads(params?: LeadQuery): Promise<ExternalLead[]>;

    createLead(lead: UnifiedLead): Promise<ExternalLead>;

    updateLead(
        externalId: string,
        data: UpdateLeadData
    ): Promise<ExternalLead>;

    updateLeadStatus(
        externalId: string,
        status: string
    ): Promise<void>;

    addNote(
        externalId: string,
        note: string
    ): Promise<void>;

    createAppointment(
        data: AppointmentData
    ): Promise<ExternalAppointment>;

}
```

Each CRM implements this interface.

```text
GoHighLevelAdapter
ActiveCampaignAdapter
CloseAdapter
```

---

# 12. Why the Adapter Pattern Is Necessary

Without an adapter architecture:

```text
LeadService
├── GoHighLevel logic
├── ActiveCampaign logic
├── Close logic
├── Salesforce logic
├── HubSpot logic
└── ...
```

This quickly becomes difficult to maintain.

With adapters:

```text
LeadService
      ↓
IntegrationService
      ↓
CRMAdapter
      ↓
Provider
```

Adding another CRM becomes:

```text
NewCRMAdapter
```

rather than rewriting the entire application.

---

# 13. Unified Data Model

External CRMs use different schemas.

The platform should normalize them.

Example internal lead:

```text
Lead
├── id
├── organizationId
├── clientId
├── firstName
├── lastName
├── email
├── phone
├── company
├── status
├── source
├── assignedAgentId
├── createdAt
└── updatedAt
```

CRM-specific fields should be stored separately when required.

---

# 14. External Record Mapping

Never assume that an internal ID equals an external CRM ID.

Example:

```text
Internal Lead
ID: lead_123

External records:

GoHighLevel
contactId: ghl_98372

ActiveCampaign
contactId: ac_72918

Close
leadId: close_19382
```

Database table:

```text
ExternalRecord
-------------------------
id
entityType
internalEntityId
provider
externalId
lastSyncedAt
createdAt
updatedAt
```

---

# 15. Integration Connection Model

Each client can have CRM connections.

Example:

```text
Client A
│
├── GoHighLevel Connection
│
└── ActiveCampaign Connection
```

The connection stores:

```text
provider
clientId
authenticationType
encryptedAccessToken
encryptedRefreshToken
tokenExpiry
status
createdAt
updatedAt
```

Credentials must never be returned to the frontend.

---

# 16. OAuth Architecture

Where supported, OAuth should be used.

Flow:

```text
Agent/Admin
     ↓
"Connect CRM"
     ↓
Our Backend
     ↓
CRM Authorization Page
     ↓
User grants permission
     ↓
CRM redirects back
     ↓
Backend receives authorization code
     ↓
Backend exchanges code for tokens
     ↓
Tokens encrypted
     ↓
Connection stored
```

The browser should not permanently hold CRM credentials.

---

# 17. Synchronization Architecture

Synchronization is divided into two directions.

## Direction A

```text
External CRM
     ↓
Webhook / Polling
     ↓
Backend
     ↓
Normalize
     ↓
Internal Database
```

## Direction B

```text
Agent
  ↓
Frontend
  ↓
Backend
  ↓
Internal Database
  ↓
Sync Event
  ↓
Queue
  ↓
CRM Adapter
  ↓
External CRM
```

---

# 18. Why Synchronization Should Be Asynchronous

Suppose the agent closes a lead.

The system should not make the frontend wait for three external API requests:

```text
Frontend
 ↓
GoHighLevel API
 ↓
ActiveCampaign API
 ↓
Close API
 ↓
Response
```

External systems may be slow or unavailable.

Instead:

```text
Agent
 ↓
Close Lead
 ↓
Backend
 ↓
Save internal state
 ↓
Create sync jobs
 ↓
Return response
```

Then:

```text
Queue
├── GoHighLevel Job
├── ActiveCampaign Job
└── Close Job
```

This makes the application more responsive and reliable.

---

# 19. Sync Event Model

Every synchronization operation should create an event.

Example:

```text
LeadStatusChanged
```

Payload:

```json
{
  "eventId": "evt_123",
  "eventType": "LEAD_STATUS_CHANGED",
  "organizationId": "org_123",
  "clientId": "client_123",
  "leadId": "lead_123",
  "oldStatus": "QUALIFIED",
  "newStatus": "CLOSED",
  "source": "PLATFORM",
  "createdAt": "2026-08-15T10:00:00Z"
}
```

---

# 20. Queue Architecture

```text
                    Backend
                       │
                       ▼
                  Redis Queue
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
     Worker         Worker          Worker
       │              │              │
       ▼              ▼              ▼
     GHL            AC             Close
```

Each worker executes the appropriate adapter operation.

---

# 21. Retry Strategy

External APIs can fail temporarily.

Example:

```text
Attempt 1
   ↓
FAILED
   ↓
Wait
   ↓
Attempt 2
   ↓
FAILED
   ↓
Wait
   ↓
Attempt 3
   ↓
SUCCESS
```

Recommended initial retry strategy:

```text
Retry 1 → 5 seconds
Retry 2 → 30 seconds
Retry 3 → 2 minutes
Retry 4 → 10 minutes
```

After the configured maximum number of retries:

```text
FAILED
```

The failure should be visible in synchronization logs.

---

# 22. Idempotency

Synchronization jobs must be idempotent.

If a job runs twice:

```text
Close Lead
```

it must not result in:

```text
Deal closed twice
Duplicate note
Duplicate appointment
Duplicate activity
```

Each operation should have an idempotency key.

Example:

```text
idempotencyKey =
organizationId + eventId + provider
```

---

# 23. Webhook Architecture

When a CRM supports webhooks:

```text
External CRM
     │
     │ POST webhook
     ▼
Webhook Controller
     │
     ▼
Validate signature
     │
     ▼
Create webhook event
     │
     ▼
Queue
     │
     ▼
Webhook Worker
     │
     ▼
Normalize event
     │
     ▼
Update internal database
```

The webhook endpoint should not perform heavy processing synchronously.

---

# 24. Webhook Security

Every webhook should be validated where the provider supports verification.

Validation can include:

```text
Signature
Timestamp
Webhook secret
Event ID
```

Invalid webhooks should be rejected.

---

# 25. Synchronization Conflict Handling

Example:

```text
10:00
Agent changes status to CLOSED

10:01
Client changes status externally to QUALIFIED
```

The initial FYP strategy should be:

```text
Last valid update wins
```

but every conflict must be recorded.

Future versions can implement:

* Version numbers.
* Source priority.
* Field-level conflict resolution.
* Manual conflict resolution.

---

# 26. Internal Database as Operational Source of Truth

The internal PostgreSQL database should act as the application's operational data store.

However, the architecture should distinguish between:

```text
Internal Operational State
```

and:

```text
External System of Record
```

The platform does not necessarily replace the client's CRM.

Instead:

```text
Client CRM
=
External system of record

Our database
=
Unified operational representation
```

---

# 27. Data Flow — Reading Leads

When an agent opens the dashboard:

```text
Agent
 ↓
Next.js
 ↓
GET /api/v1/leads
 ↓
Auth Guard
 ↓
LeadService
 ↓
LeadRepository
 ↓
PostgreSQL
 ↓
Response
 ↓
Frontend
```

The frontend should generally read from the internal database rather than directly querying three CRMs every time.

This improves:

* Speed.
* Consistency.
* API usage.
* Reliability.

---

# 28. Data Flow — CRM → Platform

Example: a new lead is created in GoHighLevel.

```text
GoHighLevel
     ↓
Webhook
     ↓
Our API
     ↓
Webhook Validation
     ↓
Queue
     ↓
Webhook Worker
     ↓
GoHighLevel Adapter
     ↓
Normalize Lead
     ↓
Find Client
     ↓
Upsert Lead
     ↓
PostgreSQL
     ↓
Agent Dashboard
```

---

# 29. Data Flow — Platform → CRM

Example: agent changes status to `CLOSED`.

```text
Agent
 ↓
Frontend
 ↓
PATCH /api/v1/leads/:id/status
 ↓
Authentication
 ↓
Authorization
 ↓
LeadService
 ↓
PostgreSQL
 ↓
Create Sync Event
 ↓
Queue
 ↓
Sync Worker
 ↓
CRM Adapter
 ↓
External CRM
 ↓
Sync Log
```

---

# 30. Transaction Strategy

Internal state changes should be transactional.

Example:

```text
BEGIN TRANSACTION

Update lead status
Create activity
Create sync event
Create audit log

COMMIT
```

Only after the transaction succeeds should synchronization processing continue.

The external API call should **not** normally happen inside the PostgreSQL transaction.

---

# 31. Why External API Calls Should Not Be Inside DB Transactions

Bad:

```text
BEGIN DB TRANSACTION
     ↓
Call CRM API
     ↓
Wait 5 seconds
     ↓
Call another CRM
     ↓
COMMIT
```

This creates long database transactions and poor reliability.

Correct:

```text
BEGIN
Update internal state
Create sync event
COMMIT

        ↓

Background worker
        ↓
External API
```

---

# 32. API Layer

The API should be versioned:

```text
/api/v1/
```

Example:

```text
/api/v1/auth/login

/api/v1/users/me

/api/v1/organizations

/api/v1/clients

/api/v1/leads

/api/v1/leads/:id

/api/v1/leads/:id/notes

/api/v1/leads/:id/status

/api/v1/appointments

/api/v1/activities

/api/v1/integrations

/api/v1/integrations/:id

/api/v1/sync

/api/v1/audit
```

---

# 33. API Authentication

Every protected request should contain authentication information.

Example:

```text
Authorization: Bearer <access_token>
```

The backend extracts:

```text
userId
organizationId
role
```

The backend must then perform authorization checks.

---

# 34. Tenant Isolation

Every major database entity must be associated with an organization.

Example:

```text
Lead
├── id
├── organizationId
└── clientId
```

Every query should enforce tenant boundaries.

Conceptually:

```text
SELECT *
FROM leads
WHERE id = ?
AND organization_id = currentUser.organizationId;
```

Never retrieve an object solely by its ID without checking tenant ownership.

---

# 35. Role-Based Access Control

Authorization hierarchy:

```text
Organization
     │
     ├── Admin
     │
     ├── Manager
     │
     └── Agent
```

Example:

```text
Agent
→ Can update assigned lead

Manager
→ Can update agency leads

Admin
→ Can configure organization
```

---

# 36. Database Schema

Initial conceptual schema:

```text
organizations
---------------
id
name
created_at
updated_at


users
---------------
id
organization_id
name
email
password_hash
role
status
created_at
updated_at


clients
---------------
id
organization_id
name
description
status
created_at
updated_at


client_users
---------------
client_id
user_id


leads
---------------
id
organization_id
client_id
assigned_agent_id
first_name
last_name
email
phone
company
status
source
created_at
updated_at


deals
---------------
id
lead_id
value
currency
status
created_at
updated_at


activities
---------------
id
organization_id
lead_id
user_id
type
description
metadata
created_at


notes
---------------
id
lead_id
user_id
content
created_at
updated_at


appointments
---------------
id
organization_id
lead_id
assigned_agent_id
start_time
end_time
status
external_id
created_at
updated_at
```

---

# 37. Integration Tables

```text
crm_connections
-------------------------
id
organization_id
client_id
provider
auth_type
encrypted_access_token
encrypted_refresh_token
expires_at
status
created_at
updated_at


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
created_at
updated_at
```

---

# 38. Synchronization Tables

```text
sync_events
-------------------------
id
organization_id
client_id
entity_type
entity_id
event_type
source
payload
status
created_at
updated_at


sync_attempts
-------------------------
id
sync_event_id
provider
attempt_number
status
error_message
started_at
completed_at
```

---

# 39. Audit Tables

```text
audit_logs
-------------------------
id
organization_id
user_id
entity_type
entity_id
action
old_value
new_value
ip_address
created_at
```

Audit logs should be append-only from the application's perspective.

---

# 40. Notification Architecture

Notifications can be processed asynchronously.

```text
Business Event
      ↓
Notification Service
      ↓
Notification Queue
      ↓
Worker
      ↓
Database
      ↓
Frontend
```

The first version can use in-app notifications.

Future versions can support:

```text
Email
SMS
Push Notifications
Slack
```

---

# 41. Frontend Architecture

Recommended structure:

```text
apps/web/

app/
├── login/
├── dashboard/
├── leads/
├── calendar/
├── activities/
├── clients/
├── integrations/
├── settings/
└── admin/
```

Components:

```text
components/
├── ui/
├── dashboard/
├── leads/
├── calendar/
├── activities/
├── integrations/
└── navigation/
```

---

# 42. Frontend Data Fetching

Use TanStack Query for server state.

Example:

```text
useLeads()
useLead()
useAppointments()
useActivities()
useClients()
useIntegrations()
```

Benefits:

* Caching.
* Loading states.
* Error handling.
* Refetching.
* Mutation handling.

---

# 43. Frontend State

Separate:

```text
Server State
```

from:

```text
UI State
```

Server state:

```text
Leads
Clients
Activities
Appointments
```

UI state:

```text
Sidebar open/closed
Modal visibility
Selected filters
Current tab
```

Avoid putting all backend data into a global state store unnecessarily.

---

# 44. Lead Page Architecture

```text
Lead Page
│
├── Lead Header
│   ├── Name
│   ├── Status
│   └── Client
│
├── Contact Information
│
├── Actions
│   ├── Call
│   ├── Message
│   ├── Schedule
│   └── Close
│
├── Activity Timeline
│
├── Notes
│
└── Synchronization Status
```

---

# 45. Sync Status UI

Every externally synchronized action should have visible status.

Example:

```text
Deal Closed

Internal Database       ✓
Agency CRM              ✓
Client CRM              ⟳
```

After success:

```text
Deal Closed

Internal Database       ✓
Agency CRM              ✓
Client CRM              ✓
```

After failure:

```text
Deal Closed

Internal Database       ✓
Agency CRM              ✓
Client CRM              ✗

[Retry]
```

---

# 46. Caching

Redis may be used for data that is expensive to repeatedly retrieve.

Potential cached data:

```text
CRM metadata
Pipeline stages
User permissions
Integration configuration metadata
Frequently accessed dashboard data
```

Do not cache highly mutable data without a clear invalidation strategy.

---

# 47. Rate Limiting

External CRM APIs may impose rate limits.

The integration layer should support provider-specific limits.

Example:

```text
GoHighLevel
     ↓
Rate limiter
     ↓
API
```

The queue architecture makes it possible to control request frequency.

---

# 48. Error Architecture

Errors should be categorized.

## Client errors

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
```

## Server errors

```text
500 Internal Server Error
502 External API Error
503 Service Unavailable
```

External provider errors should be translated into safe internal error messages.

Do not expose raw API credentials or sensitive provider responses to users.

---

# 49. Logging

The backend should use structured logs.

Example:

```json
{
  "timestamp": "2026-08-15T10:20:00Z",
  "level": "error",
  "service": "sync",
  "organizationId": "org_123",
  "clientId": "client_456",
  "leadId": "lead_789",
  "provider": "gohighlevel",
  "event": "LEAD_STATUS_CHANGED",
  "error": "External API timeout"
}
```

---

# 50. Testing Architecture

Testing should exist at multiple levels.

## Unit Tests

Test:

* Services.
* Business logic.
* Data transformation.
* CRM adapters.

Example:

```text
GoHighLevelAdapter
→ correctly maps external lead
→ internal Lead model
```

---

# 51. Integration Tests

Test:

```text
Backend
 ↓
Database
 ↓
Integration Layer
```

External CRM APIs should preferably be mocked in automated tests.

---

# 52. End-to-End Tests

Example:

```text
Login
 ↓
Open lead
 ↓
Change status
 ↓
Create note
 ↓
Close deal
 ↓
Verify sync event
 ↓
Verify synchronization result
```

Tools such as Playwright can be used.

---

# 53. Mock CRM Environment

Because external APIs may be unavailable during development/testing, the project should provide mock CRM adapters.

Example:

```text
MockCRMAdapter
```

This allows the team to demonstrate:

```text
Platform
 ↓
Mock CRM A
 ↓
Mock CRM B
 ↓
Mock CRM C
```

without relying entirely on live API accounts.

For the final demonstration, at least some real CRM integrations should be used if API access is available.

---

# 54. Development Environment

Use Docker Compose for local infrastructure.

```text
docker-compose.yml

services:

  postgres:
    image: postgres

  redis:
    image: redis

  api:
    build: ./apps/api

  web:
    build: ./apps/web
```

The team should be able to start the infrastructure with a simple command.

---

# 55. Environment Variables

Example:

```text
DATABASE_URL=

REDIS_URL=

JWT_SECRET=

JWT_REFRESH_SECRET=

GOHIGHLEVEL_CLIENT_ID=
GOHIGHLEVEL_CLIENT_SECRET=

ACTIVECAMPAIGN_CLIENT_ID=
ACTIVECAMPAIGN_CLIENT_SECRET=

CLOSE_CLIENT_ID=
CLOSE_CLIENT_SECRET=
```

Secrets must only exist in:

```text
.env
```

or the deployment provider's secret manager.

Never commit secrets to Git.

---

# 56. Deployment Architecture

A simple deployment architecture:

```text
                    Internet
                       │
                       ▼
                ┌─────────────┐
                │   Vercel    │
                │  Next.js    │
                └──────┬──────┘
                       │
                     HTTPS
                       │
                       ▼
                ┌─────────────┐
                │ Backend API │
                │   NestJS    │
                └──────┬──────┘
                       │
             ┌─────────┼─────────┐
             ▼         ▼         ▼
        PostgreSQL   Redis    External APIs
```

---

# 57. CI/CD

GitHub Actions can be used.

Pipeline:

```text
Git Push
   ↓
GitHub Actions
   ↓
Install dependencies
   ↓
Lint
   ↓
Type check
   ↓
Unit tests
   ↓
Build
   ↓
Deploy
```

Recommended branches:

```text
main
develop
feature/*
bugfix/*
```

---

# 58. Git Workflow

For multiple developers:

```text
main
  │
  └── develop
        │
        ├── feature/auth
        ├── feature/leads
        ├── feature/integrations
        └── feature/dashboard
```

Developers should not directly push unfinished work to `main`.

Use pull requests.

---

# 59. Recommended Development Ownership

For a team of 3–4 students:

## Developer 1 — Frontend

Responsible for:

```text
Next.js
Dashboard
Lead UI
Calendar
Authentication UI
```

## Developer 2 — Backend

Responsible for:

```text
NestJS
Authentication
Users
Organizations
Leads
Database
```

## Developer 3 — Integrations

Responsible for:

```text
CRM adapters
OAuth
Webhooks
Synchronization
Queues
```

## Developer 4 — Testing / DevOps / Analytics

Responsible for:

```text
Testing
Docker
CI/CD
Logging
Evaluation
Documentation
```

Responsibilities can overlap.

---

# 60. Security Architecture

Security boundaries:

```text
                  Browser
                     │
                   HTTPS
                     │
                     ▼
               API Gateway
                     │
                     ▼
              Authentication
                     │
                     ▼
              Authorization
                     │
                     ▼
               Business Logic
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      PostgreSQL           Integration Layer
                                │
                                ▼
                         External CRM APIs
```

The frontend never receives:

```text
CRM Client Secret
CRM Refresh Token
Private API Key
Database Credentials
```

---

# 61. Credential Encryption

CRM tokens should be encrypted before being stored.

Conceptually:

```text
OAuth Token
    ↓
Encryption Service
    ↓
Encrypted Token
    ↓
PostgreSQL
```

When required:

```text
PostgreSQL
    ↓
Decrypt
    ↓
Integration Adapter
    ↓
CRM API
```

The encryption key must be stored outside the database.

---

# 62. API Security

Implement:

* HTTPS.
* Authentication.
* Authorization.
* Input validation.
* Rate limiting.
* CORS configuration.
* Secure headers.
* Request size limits.
* SQL injection protection through ORM/parameterized queries.
* XSS protection.
* CSRF protection where applicable.
* Webhook signature validation.

---

# 63. Data Privacy

The platform may contain:

```text
Names
Emails
Phone Numbers
Company Information
Sales Data
Notes
Call Information
```

Therefore:

* Collect only required data.
* Restrict access based on role.
* Log sensitive operations.
* Do not expose client data across organizations.
* Avoid storing unnecessary credentials.
* Provide a mechanism to delete data where required.

---

# 64. Scalability Strategy

The initial FYP does not need massive scale.

However, the architecture should allow:

```text
More Agencies
More Agents
More Clients
More Leads
More CRM Providers
```

to be added without rewriting the core system.

The primary scalability mechanisms are:

```text
Horizontal backend scaling
+
PostgreSQL indexing
+
Redis queues
+
Asynchronous jobs
+
CRM adapters
```

---

# 65. Database Indexing

Important indexes:

```text
leads.organization_id
leads.client_id
leads.assigned_agent_id
leads.email
leads.phone
leads.status

activities.lead_id
activities.organization_id

external_records.internal_entity_id
external_records.external_id

sync_events.status
sync_events.created_at
```

Indexes should be added based on actual query patterns.

---

# 66. Search Architecture

For the MVP, PostgreSQL search is sufficient.

Search fields:

```text
first_name
last_name
email
phone
company
```

For larger deployments, the system could later use:

```text
Elasticsearch
OpenSearch
Meilisearch
```

Do not introduce a separate search engine for the FYP unless necessary.

---

# 67. Real-Time Updates

The MVP can use normal API refetching.

For a more advanced implementation:

```text
Backend
   ↓
WebSocket
   ↓
Frontend
```

This can be used for:

* Sync status.
* New lead notifications.
* Appointment updates.
* Real-time activity.

WebSockets are optional for the initial version.

---

# 68. Calendar Architecture

The platform should expose a unified appointment model:

```text
Appointment
├── lead
├── client
├── agent
├── startTime
├── endTime
├── status
└── externalMappings
```

External calendar/CRM events are mapped to this internal model.

The architecture should avoid tying the frontend directly to a particular calendar provider.

---

# 69. Calling Architecture

Calling should similarly be abstracted.

```text
CallingService
       │
       ├── TwilioAdapter
       ├── CRMCallingAdapter
       └── MockCallingAdapter
```

The agent only interacts with:

```text
Call
```

rather than knowing which provider handles the call.

For the FYP, calling can initially be implemented as:

1. A real telephony provider, or
2. A `tel:` browser call where appropriate, or
3. A mock call flow that records the activity.

The architecture should leave room for a real provider.

---

# 70. Core Design Principle — Provider Independence

The frontend must not contain code such as:

```text
if provider === "gohighlevel"
```

Provider-specific logic belongs inside the integration layer.

Correct:

```text
Frontend
 ↓
LeadService
 ↓
IntegrationService
 ↓
CRMAdapter
```

This is one of the most important architectural rules in the project.

---

# 71. Core Design Principle — Internal IDs

All platform entities should have internal IDs.

Example:

```text
lead_123
client_456
organization_789
```

External IDs should only exist inside the integration mapping layer.

Never use an external CRM ID as the platform's primary identity.

---

# 72. Core Design Principle — Events

Important business actions should generate domain events.

Examples:

```text
LeadCreated
LeadUpdated
LeadAssigned
LeadStatusChanged
LeadClosed
NoteAdded
AppointmentCreated
CallCompleted
```

These events can trigger:

```text
Synchronization
Notifications
Audit Logs
Analytics
```

This creates a clean foundation for future automation and AI.

---

# 73. Example Complete Event Flow

## Closing a Deal

```text
                    AGENT
                      │
                      ▼
                Click "Close"
                      │
                      ▼
                  FRONTEND
                      │
                      ▼
              PATCH /leads/:id
                      │
                      ▼
               AUTHORIZATION
                      │
                      ▼
                LEAD SERVICE
                      │
              ┌───────┴────────┐
              ▼                ▼
         PostgreSQL        Audit Log
              │
              ▼
       LeadStatusChanged
              │
              ▼
          Redis Queue
              │
      ┌───────┼────────┐
      ▼       ▼        ▼
     GHL      AC      Close
    Worker   Worker   Worker
      │       │        │
      ▼       ▼        ▼
    CRM API  CRM API  CRM API
      │       │        │
      └───────┼────────┘
              ▼
         Sync Results
              │
              ▼
         Sync Database
              │
              ▼
         Frontend Status
```

---

# 74. Failure Scenario

Suppose:

```text
GoHighLevel → SUCCESS
ActiveCampaign → SUCCESS
Close → FAILED
```

The system should show:

```text
Deal Closed

Internal Database       ✓
GoHighLevel             ✓
ActiveCampaign          ✓
Close CRM               ✗
```

The Close CRM job enters:

```text
RETRYING
```

If all retries fail:

```text
FAILED
```

The manager receives a notification.

The agent does not need to manually repeat the successful operations.

---

# 75. Important Architectural Decision

The system should **not roll back successful external updates simply because another CRM failed**.

Example:

```text
GHL       ✓
AC        ✓
Close     ✗
```

Do not attempt:

```text
Rollback GHL
Rollback AC
```

because distributed transactions across independent SaaS APIs are unreliable and unnecessarily complex.

Instead:

```text
Keep successful operations
Retry failed operation
Record state
```

---

# 76. Observability Architecture

The system should expose:

```text
Application Logs
Sync Logs
Audit Logs
Job Status
API Errors
Integration Health
```

A future monitoring stack can include:

```text
Sentry
Prometheus
Grafana
OpenTelemetry
```

For the FYP, structured application logs plus synchronization logs are sufficient.

---

# 77. Integration Health

Each CRM connection should have a status:

```text
CONNECTED
DEGRADED
AUTHENTICATION_REQUIRED
ERROR
DISCONNECTED
```

Example:

```text
GoHighLevel
✓ Connected

ActiveCampaign
✓ Connected

Close CRM
⚠ Authentication Required
```

---

# 78. Integration Health Check

The backend should periodically or on-demand verify:

```text
Can we authenticate?
Can we access required resources?
Are permissions still valid?
```

If not:

```text
Connection status → ERROR
```

The administrator should be prompted to reconnect.

---

# 79. API Versioning

Use:

```text
/api/v1
```

from the beginning.

Future breaking changes can then use:

```text
/api/v2
```

without immediately breaking existing clients.

---

# 80. Documentation

The project should maintain:

```text
README.md
ARCHITECTURE.md
API.md
DATABASE.md
INTEGRATIONS.md
DEPLOYMENT.md
```

The architecture document should remain updated whenever major architectural decisions change.

---

# 81. Recommended MVP Architecture

For the FYP specifically, the final implementation should target:

```text
                    Next.js
                       │
                       ▼
                    NestJS
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       Business     Integration    Auth
        Modules       Layer       / RBAC
          │            │
          ▼            ▼
      PostgreSQL     Redis
                       │
                       ▼
                    BullMQ
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
       GoHighLevel  ActiveCampaign  Close
```

This is enough to demonstrate the complete product architecture without creating unnecessary infrastructure.

---

# 82. Final Architecture Principle

The most important architectural abstraction in this project is:

```text
                    SALES AGENT
                         │
                         ▼
                UNIFIED PLATFORM
                         │
                         ▼
                 INTERNAL DATA MODEL
                         │
                         ▼
                INTEGRATION SERVICE
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
       ADAPTER         ADAPTER        ADAPTER
          │              │              │
          ▼              ▼              ▼
      CRM A            CRM B           CRM C
```

The agent should know:

```text
"Change this lead to Closed."
```

The agent should **not** need to know:

```text
Which CRM?
Which API?
Which endpoint?
Which external ID?
Which authentication token?
Which status mapping?
How should retries work?
What happens if the API fails?
```

Those concerns belong to the backend integration architecture.

---

# 83. Architectural Success Criteria

The architecture is successful if the system can demonstrate the following scenario:

```text
1. Sales agency creates Client A.

2. Client A connects GoHighLevel.

3. Sales agency creates Client B.

4. Client B connects ActiveCampaign.

5. Sales agency creates Client C.

6. Client C connects Close CRM.

7. Leads from all three systems appear in the unified platform.

8. Agent opens a lead.

9. Agent adds a note.

10. Agent schedules an appointment.

11. Agent changes lead status.

12. Agent closes the deal.

13. Internal database records the actions.

14. Appropriate external CRMs are updated automatically.

15. Synchronization results are recorded.

16. Failed operations are retried.

17. The agent does not need to manually repeat the same actions in each CRM.
```

If this workflow works reliably, the architecture has successfully demonstrated the core technical thesis of the FYP.

---

# 84. Final Technology Decision

### Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
TanStack Query
```

### Backend

```text
Node.js
NestJS
TypeScript
REST API
```

### Database

```text
PostgreSQL
Prisma
```

### Background Processing

```text
Redis
BullMQ
```

### Authentication

```text
JWT / Refresh Tokens
RBAC
```

### Integrations

```text
CRM Adapter Pattern

GoHighLevel
ActiveCampaign
Close CRM
```

### Infrastructure

```text
Docker
Docker Compose
GitHub Actions
```

### Testing

```text
Jest
Supertest
Playwright
```

### Deployment

```text
Vercel
+
Backend hosting
+
Managed PostgreSQL
+
Managed Redis
```

---

# 85. Architectural Summary

The system should be built as a **multi-tenant modular monolith with a dedicated CRM integration layer and asynchronous synchronization engine**.

The architecture has four critical layers:

```text
┌───────────────────────────────────────────┐
│              Presentation                 │
│            Next.js / React                │
├───────────────────────────────────────────┤
│              Application                  │
│              NestJS API                   │
├───────────────────────────────────────────┤
│             Domain / Data                │
│      Business Logic + PostgreSQL         │
├───────────────────────────────────────────┤
│          Integration / Sync              │
│ Adapters + Redis + BullMQ + Webhooks     │
└───────────────────────────────────────────┘
```

The central technical principle is:

> **Normalize data internally, abstract CRM providers behind adapters, process external synchronization asynchronously, and treat every external operation as a trackable event.**

This architecture gives the FYP a realistic technical foundation while keeping the implementation manageable. It also leaves a clear path toward future capabilities such as additional CRM providers, telephony integrations, AI sales assistance, automated workflows, advanced analytics, and enterprise-scale deployment.
