# Product Requirements Document (PRD)

## Unified Sales Operations Platform for Multi-Client Sales Agencies

**Document:** `Prod.md`
**Project Type:** Final Year Project (FYP)
**Product Category:** Sales Operations / CRM Aggregation / Workflow Automation
**Primary Users:** Sales agents working for multi-client sales agencies
**Secondary Users:** Sales agency managers, administrators, and client companies
**Status:** Product Definition / FYP Specification

---

# 1. Product Overview

## 1.1 Product Vision

The product is a **unified sales workspace** designed for sales agencies that manage sales operations for multiple client companies.

These agencies employ sales agents who may simultaneously work with leads belonging to several different client companies. Each client may use a different CRM, while the sales agency itself may maintain another CRM or internal record system.

Currently, an agent may need to:

* Open one CRM to view a lead.
* Open another application to make a phone call.
* Open a separate calendar application to check appointments.
* Open another CRM to update the lead.
* Update the sales agency's internal CRM.
* Update the client's CRM.
* Maintain personal notes or records.
* Repeat the same information across multiple systems.

This creates unnecessary context switching, duplicated data entry, inconsistent records, and wasted agent time.

### Product Goal

Build **one web-based workspace where a sales agent can perform the majority of their daily sales activities without manually switching between multiple applications.**

The platform acts as an **operational layer above multiple CRMs and sales tools**.

The agent interacts primarily with our platform, while our backend synchronizes the required actions with the connected systems.

---

# 2. Problem Statement

Sales agencies have a fundamentally different problem from companies using a single CRM.

A normal sales organization might have:

```text
Sales Agent
     ↓
Company CRM
     ↓
Lead
```

A sales agency may have:

```text
                         ┌── Client CRM A
                         │
Sales Agent → Agency → ──┼── Client CRM B
                         │
                         ├── Client CRM C
                         │
                         └── Internal CRM
```

The agent may therefore have to work across several independent systems.

## Example

Suppose a sales agency has three clients:

* Client A uses GoHighLevel.
* Client B uses ActiveCampaign.
* Client C uses Close CRM.

The sales agency itself also maintains its own CRM.

An agent receives a lead from Client A.

The agent may need to:

1. Open the CRM.
2. Find the lead.
3. Read the lead information.
4. Call the lead using another application.
5. Check the calendar.
6. Record the call outcome.
7. Update the lead status in the agency CRM.
8. Update the lead status in Client A's CRM.
9. Add notes.
10. Schedule a follow-up.
11. Potentially update another internal system.

The same business event can therefore require several manual operations.

### Core problem

> **Sales agents are spending time operating software instead of selling.**

The product aims to reduce this operational overhead.

---

# 3. Target Market

## 3.1 Primary Customer

The primary customer is a **sales outsourcing / sales agency**.

These companies provide sales services to other businesses.

For example:

```text
Client Company
      ↓
"We need a sales team."
      ↓
Sales Agency
      ↓
Provides trained sales agents
      ↓
Agents sell Client Company's products/services
```

The agency may manage sales operations for many clients simultaneously.

---

# 4. User Personas

## 4.1 Sales Agent — Primary User

The sales agent is the most important user of the system.

### Responsibilities

The agent may:

* Receive leads.
* Contact leads.
* Make calls.
* Send messages.
* Schedule appointments.
* Update lead status.
* Add notes.
* Move leads through a sales pipeline.
* Close deals.
* Follow up with leads.
* Check appointments.
* Manage daily tasks.

### Main pain points

* Too many applications.
* Repeated data entry.
* Constant CRM switching.
* Difficulty remembering which CRM needs to be updated.
* Duplicate work.
* Lost time.
* Increased possibility of human error.

### Primary objective

> Sell more while spending less time managing software.

---

# 4.2 Sales Agency Manager

The manager oversees agents and clients.

### Responsibilities

* Manage sales agents.
* Assign clients to agents.
* Monitor sales performance.
* Monitor leads.
* Monitor pipelines.
* View appointments.
* Track conversions.
* Manage CRM integrations.
* Configure workflows.
* Review synchronization errors.

### Main objective

> Manage the entire sales operation from one centralized system.

---

# 4.3 Agency Administrator

Responsible for technical and organizational configuration.

### Responsibilities

* Connect CRMs.
* Configure integrations.
* Manage users.
* Configure client accounts.
* Define permissions.
* Configure synchronization.
* Manage API credentials/OAuth connections.

---

# 4.4 Client Company

The client company is not necessarily the primary user of the application.

The client mainly cares that:

* Their leads are handled correctly.
* Their CRM remains updated.
* Sales agents are working efficiently.
* Closed deals are correctly recorded.
* Their data remains synchronized.

---

# 5. Product Objectives

## Primary Objectives

### Objective 1 — One Workspace

Provide agents with a single interface for their daily sales operations.

### Objective 2 — Multi-CRM Access

Allow the platform to connect to multiple CRM systems.

### Objective 3 — Eliminate Repetitive Data Entry

When an agent performs an action once, the platform should synchronize it to the relevant connected systems.

### Objective 4 — Reduce Context Switching

The agent should not need to continuously switch between:

* CRM
* Calendar
* Calling application
* Internal CRM
* Client CRM
* Notes system

### Objective 5 — Centralized Data

Present relevant information from multiple systems in one unified interface.

### Objective 6 — Synchronization

Changes made through the platform should be propagated to the appropriate external systems.

---

# 6. Core Product Concept

The platform should be understood as a **Unified Sales Workspace + Integration Layer**.

It is not necessarily intended to replace every CRM.

Instead:

```text
                    OUR PLATFORM
                         │
              Unified Sales Workspace
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ↓                ↓                ↓
    CRM A            CRM B            CRM C
        │                │                │
        └────────────────┼────────────────┘
                         │
                  Other Services
                         │
                 Calendar / Calling
```

The agent primarily interacts with our platform.

Our backend handles communication with external systems.

---

# 7. Core User Experience

The ideal agent experience should look like this:

```text
LOGIN
  ↓
Dashboard
  ↓
Today's Leads
  ↓
Open Lead
  ↓
View complete lead information
  ↓
Call / Message / Schedule / Add Note
  ↓
Update lead status
  ↓
Close Lead
  ↓
Platform synchronizes required changes
  ↓
External CRMs updated
```

The agent should not have to manually repeat the same operation.

---

# 8. Functional Requirements

# 8.1 Authentication

The platform must provide secure authentication.

### Features

* User registration.
* Login.
* Logout.
* Password reset.
* Session management.
* Role-based access control.

### Roles

Minimum roles:

```text
ADMIN
MANAGER
AGENT
```

Future roles can be added.

---

# 8.2 Organization Management

The system should support organizations/companies.

An organization represents a sales agency.

Example:

```text
Agency XYZ
│
├── Managers
├── Sales Agents
│
├── Client A
├── Client B
└── Client C
```

The agency administrator should be able to:

* Create clients.
* Add agents.
* Remove agents.
* Assign agents to clients.
* Configure integrations.

---

# 8.3 Client Management

Each agency can manage multiple client companies.

Each client should have:

* Name.
* Description.
* Industry.
* Assigned agents.
* Connected CRM(s).
* Pipeline configuration.
* Integration status.

Example:

```text
Client: ABC Roofing

CRM:
GoHighLevel

Assigned Agents:
- Agent 1
- Agent 2
- Agent 3
```

---

# 8.4 CRM Integration

This is one of the most important components of the project.

The platform should support multiple CRM providers.

For the FYP, the initial implementation can target:

* GoHighLevel
* ActiveCampaign
* Close CRM

The architecture should be designed so additional CRMs can be added later.

---

# 9. Integration Architecture

The system should **not** directly hard-code CRM-specific logic throughout the application.

Instead, create a standardized integration layer.

### Recommended architecture

```text
                 Frontend
                    │
                    ↓
              Backend API
                    │
                    ↓
          Unified Data Model
                    │
                    ↓
          Integration Service
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
 GoHighLevel   ActiveCampaign   Close
```

Each CRM gets its own adapter.

Example:

```text
CRMAdapter
│
├── GoHighLevelAdapter
├── ActiveCampaignAdapter
└── CloseCRMAdapter
```

The application interacts with the generic interface rather than directly with individual CRM APIs.

---

# 10. Unified CRM Data Model

Different CRMs use different terminology and structures.

The platform should normalize these differences.

For example:

### Lead

```text
Lead
├── id
├── first_name
├── last_name
├── email
├── phone
├── company
├── source
├── status
├── pipeline
├── assigned_agent
├── notes
├── created_at
└── updated_at
```

CRM-specific fields can be stored separately.

```text
external_data
```

This allows the platform to maintain a common representation while preserving provider-specific information.

---

# 11. Lead Management

The platform should provide a unified lead interface.

### Lead list

Agents should be able to see:

* Lead name.
* Company.
* Phone.
* Email.
* Client.
* CRM.
* Lead status.
* Assigned agent.
* Last contact.
* Next follow-up.
* Deal value.

### Filters

Agents should be able to filter by:

* Client.
* CRM.
* Status.
* Agent.
* Date.
* Lead source.
* Follow-up date.

---

# 12. Unified Lead Profile

Opening a lead should display a consolidated view.

Example:

```text
------------------------------------------------
John Smith
ABC Company
------------------------------------------------

Phone: +XX XXX XXXXX
Email: john@example.com

Client: Client A
CRM: GoHighLevel

Status: Qualified
Deal Value: $5,000

------------------------------------------------
Activity Timeline

10:00 AM  Lead created
10:30 AM  Called
11:00 AM  Follow-up scheduled
2:00 PM   Note added

------------------------------------------------

[ Call ] [ Message ] [ Schedule ]
[ Add Note ] [ Update Status ]

------------------------------------------------
```

The goal is to eliminate the need to open the external CRM merely to understand the lead.

---

# 13. Calling

The platform should provide a unified calling experience where technically possible.

Instead of:

```text
CRM → copy phone number → calling application
```

the agent should be able to:

```text
Lead
 ↓
Click "Call"
 ↓
Calling integration
```

The platform should record:

* Call initiated.
* Call completed.
* Call duration where available.
* Call outcome.
* Timestamp.
* Agent.

The exact calling implementation depends on the selected telephony provider and available APIs.

For the FYP, this can initially be implemented using a telephony integration or a simulated call workflow if a production telephony integration is outside project scope.

---

# 14. Calendar

The platform should provide a unified calendar.

Agents should be able to view:

* Today's appointments.
* Upcoming appointments.
* Lead name.
* Client.
* Appointment time.
* Appointment type.
* Appointment status.

### Example

```text
TODAY

09:00  John Smith — Client A
11:00  Sarah Khan — Client B
14:30  David Ali — Client A
16:00  Michael — Client C
```

The agent should not have to open a separate calendar merely to know their schedule.

---

# 15. Appointment Creation

From the lead profile:

```text
Click "Schedule"
       ↓
Select date
       ↓
Select time
       ↓
Appointment created
       ↓
Calendar updated
       ↓
Relevant CRM updated
```

The platform should maintain an internal appointment record and synchronize it to the relevant external service.

---

# 16. Notes

Agents should be able to add notes directly from the platform.

Example:

```text
Note:

"Lead is interested but wants to discuss pricing with his partner.
Follow up Friday."
```

When appropriate, the note should be synchronized to the client's CRM.

---

# 17. Lead Status Management

The platform should provide a standardized lead lifecycle.

Example:

```text
New
 ↓
Contacted
 ↓
Qualified
 ↓
Appointment Scheduled
 ↓
Proposal
 ↓
Won / Closed
```

Different clients may use different pipelines.

Therefore, the system should maintain a mapping between the platform's standardized status and each CRM's corresponding status.

Example:

```text
Unified Status
     ↓
"Qualified"
     ↓
┌──────────────┬───────────────┬─────────────┐
│ GoHighLevel  │ ActiveCampaign│ Close       │
│ Status A     │ Status B      │ Status C    │
└──────────────┴───────────────┴─────────────┘
```

---

# 18. The Key Feature — Write Once, Synchronize Everywhere

This is the core value proposition.

Suppose an agent closes a lead.

Without the platform:

```text
Update Agency CRM
        ↓
Update Client CRM
        ↓
Update Personal Record
```

With the platform:

```text
Agent clicks:

[CLOSE DEAL]

        ↓

Our backend processes event

        ↓

┌──────────────┬──────────────┬──────────────┐
│ Agency CRM   │ Client CRM   │ Internal DB   │
│ Updated      │ Updated      │ Updated       │
└──────────────┴──────────────┴──────────────┘
```

The agent performs the action **once**.

---

# 19. Event-Based Synchronization

The backend should use an event-driven approach.

Example:

```text
Agent changes lead status
        ↓
LeadStatusChanged event
        ↓
Synchronization Service
        ↓
Determine connected systems
        ↓
Send updates
        ↓
Record results
```

Example event:

```text
{
    "event": "LEAD_STATUS_CHANGED",
    "lead_id": "12345",
    "new_status": "CLOSED",
    "agent_id": "agent_01",
    "client_id": "client_01"
}
```

The synchronization engine determines which external systems need to receive the update.

---

# 20. Synchronization Status

Every synchronization operation should have a status.

Possible states:

```text
PENDING
PROCESSING
SUCCESS
FAILED
RETRYING
```

Example:

```text
Close Lead

✓ Internal Database
✓ Agency CRM
✓ Client CRM
⚠ Calendar
```

The agent or manager should be able to see whether an operation succeeded.

---

# 21. Error Handling

External APIs can fail.

Examples:

* API unavailable.
* Authentication expired.
* Rate limit reached.
* Invalid data.
* Lead deleted externally.
* Permission denied.

The platform must not silently lose the update.

Instead:

```text
Action
 ↓
External API failure
 ↓
Store failed event
 ↓
Retry
 ↓
If still failing
 ↓
Notify user/admin
```

A synchronization log should be maintained.

---

# 22. Sync Logs

Administrators/managers should be able to see:

```text
Timestamp
Action
Lead
External System
Status
Error
Retry Count
```

Example:

```text
15:32
Lead #123
Status → Closed
GoHighLevel
SUCCESS

15:32
Lead #123
Status → Closed
Close CRM
FAILED
Authentication expired
```

This is important for debugging and system reliability.

---

# 23. Dashboard

The agent dashboard should provide an overview of daily work.

### Dashboard components

```text
Today's Leads
Upcoming Appointments
Tasks
Follow-ups
Recent Activity
Sales Performance
Sync Notifications
```

Example:

```text
---------------------------------------
Good Morning, Agent
---------------------------------------

Today's Leads       32
Calls               18
Appointments         6
Closed Deals         3

---------------------------------------

Upcoming

10:00 John Smith
11:30 Sarah Khan
14:00 David Ali

---------------------------------------

Follow-ups

5 overdue
8 due today

---------------------------------------
```

---

# 24. Activity Timeline

Every significant action should be recorded.

Example:

```text
Lead Created
       ↓
Lead Assigned
       ↓
Call Made
       ↓
Note Added
       ↓
Appointment Scheduled
       ↓
Follow-up Completed
       ↓
Deal Closed
```

The timeline should provide a single source of truth for the agent's interaction history.

---

# 25. Search

Agents should be able to search across all accessible clients and CRMs.

Example:

```text
Search: John Smith
```

Results:

```text
John Smith
Client A
GoHighLevel
Qualified

John Smith
Client C
Close CRM
Contacted
```

Search should support:

* Name.
* Email.
* Phone.
* Company.
* Lead ID.

---

# 26. Notifications

Notifications should inform users about important events.

Examples:

* New lead assigned.
* Appointment approaching.
* Follow-up overdue.
* Synchronization failed.
* CRM connection expired.
* Deal successfully closed.

---

# 27. CRM Connection Management

Managers/admins should be able to connect external CRMs.

Example:

```text
Integrations

GoHighLevel
Connected ✓

ActiveCampaign
Connected ✓

Close CRM
Not Connected

[Connect]
```

OAuth should be preferred where supported.

API keys/tokens should be securely stored when OAuth is unavailable or inappropriate.

---

# 28. Multi-Tenant Architecture

The platform should be designed as a multi-tenant system.

Example:

```text
Platform
│
├── Agency A
│   ├── Agents
│   ├── Clients
│   └── Integrations
│
├── Agency B
│   ├── Agents
│   ├── Clients
│   └── Integrations
│
└── Agency C
```

Data belonging to one agency must not be accessible to another agency.

This is a critical security requirement.

---

# 29. Permissions

## Agent

Can:

* View assigned leads.
* Update assigned leads.
* Make calls.
* Add notes.
* Schedule appointments.
* Change lead statuses.
* View own activities.

Cannot:

* Modify organization settings.
* Connect global integrations.
* Access another agency.
* Modify other agents' permissions.

---

## Manager

Can:

* View agents.
* View leads.
* Assign leads.
* View performance.
* Configure clients.
* View synchronization logs.
* Manage client integrations.

---

## Admin

Can:

* Manage organization.
* Manage users.
* Configure integrations.
* Configure permissions.
* View all data.
* Manage system settings.

---

# 30. Suggested System Architecture

```text
                    ┌──────────────────────┐
                    │      Frontend        │
                    │   Web Application    │
                    └──────────┬───────────┘
                               │
                               ↓
                    ┌──────────────────────┐
                    │      API Layer       │
                    │   Authentication     │
                    │   Authorization      │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼─────────────────┐
              ↓                ↓                 ↓
       ┌────────────┐   ┌─────────────┐   ┌─────────────┐
       │ Lead       │   │ Activity    │   │ Calendar    │
       │ Service    │   │ Service     │   │ Service     │
       └────────────┘   └─────────────┘   └─────────────┘
              │                │                 │
              └────────────────┼─────────────────┘
                               ↓
                    ┌──────────────────────┐
                    │ Integration Service  │
                    └──────────┬───────────┘
                               │
          ┌────────────────────┼────────────────────┐
          ↓                    ↓                    ↓
   GoHighLevel          ActiveCampaign          Close CRM
```

---

# 31. Recommended Backend Components

The backend should contain separate services/modules for:

```text
Authentication
Organizations
Users
Clients
Leads
Contacts
Deals
Activities
Appointments
Notes
Integrations
Synchronization
Notifications
Audit Logs
```

For an FYP, these can initially exist as modular components inside one backend application rather than separate microservices.

A **modular monolith** is preferable for the first implementation because it provides clean separation without unnecessary distributed-system complexity.

---

# 32. Database Design

A relational database such as PostgreSQL is recommended.

Potential tables:

```text
users
organizations
clients
client_users
crm_connections
leads
contacts
deals
pipelines
pipeline_stages
activities
notes
appointments
tasks
sync_events
sync_logs
audit_logs
notifications
```

---

# 33. External ID Mapping

One of the most important database concepts is mapping internal entities to external CRM entities.

Example:

```text
Internal Lead
ID: lead_123

External Records:

GoHighLevel:
contact_id = ghl_78291

ActiveCampaign:
contact_id = ac_19281

Close:
lead_id = close_72818
```

The system should never assume that the same ID exists across CRMs.

Use a mapping table such as:

```text
external_records

id
internal_entity_id
provider
external_id
entity_type
last_synced_at
```

---

# 34. Data Synchronization Strategy

The system should support two synchronization directions.

## Direction 1

```text
External CRM
      ↓
Our Platform
```

Used when a lead or update occurs externally.

## Direction 2

```text
Our Platform
      ↓
External CRM
```

Used when an agent performs an action through our platform.

---

# 35. Webhooks

Where supported, external CRM webhooks should be used.

Example:

```text
CRM
 ↓
Lead Updated
 ↓
Webhook
 ↓
Our Backend
 ↓
Process Event
 ↓
Update Internal Database
```

This is preferable to continuously polling every CRM.

For CRMs without suitable webhook support, scheduled synchronization can be used.

---

# 36. Conflict Resolution

Conflicts may occur.

Example:

```text
Agent changes lead to CLOSED
```

at the same time another user changes it externally to:

```text
QUALIFIED
```

The system needs a defined conflict strategy.

For the FYP, an initial strategy can be:

```text
Last valid update wins
```

while recording the conflict in the audit log.

A more sophisticated implementation can later use timestamps, version numbers, or source priority.

---

# 37. Audit Logging

Every important change should be auditable.

Example:

```text
Agent: John
Lead: #123
Action: Status changed
Old: Qualified
New: Closed
Time: 15:32
Source: Our Platform
```

This is particularly important because the platform modifies external systems.

---

# 38. Security Requirements

Because the platform handles customer and sales data, security is a major requirement.

### Requirements

* Password hashing.
* HTTPS.
* JWT/session security.
* Role-based authorization.
* Tenant isolation.
* Secure API credentials.
* Encryption of sensitive credentials.
* Input validation.
* API rate limiting.
* Audit logging.
* Secure webhook verification.
* No credentials exposed to frontend.
* No CRM API keys stored in plaintext.

---

# 39. API Architecture

The frontend should communicate with our backend.

Example:

```text
GET /api/leads
GET /api/leads/:id
POST /api/leads/:id/notes
PATCH /api/leads/:id/status

GET /api/appointments
POST /api/appointments

GET /api/integrations
POST /api/integrations/connect

GET /api/sync-logs
POST /api/sync/retry
```

The frontend should not directly communicate with third-party CRM APIs using secret credentials.

---

# 40. Example User Workflow

## Workflow A — Agent receives a lead

```text
CRM
 ↓
Webhook
 ↓
Backend
 ↓
Normalize Lead
 ↓
Internal Database
 ↓
Agent Dashboard
```

The agent sees:

```text
New Lead

John Smith
ABC Company
Client A

[View Lead]
```

---

# 41. Workflow B — Agent calls lead

```text
Agent opens lead
       ↓
Clicks Call
       ↓
Calling provider
       ↓
Call completed
       ↓
Call activity created
       ↓
Activity synchronized
```

---

# 42. Workflow C — Agent adds note

```text
Agent
 ↓
Writes note
 ↓
Our Database
 ↓
Sync Event
 ↓
Client CRM
```

The agent performs one operation.

---

# 43. Workflow D — Agent closes deal

This is the most important demonstration workflow for the FYP.

```text
Agent opens lead
       ↓
Clicks "Close Deal"
       ↓
Confirmation
       ↓
Internal database updated
       ↓
Agency CRM updated
       ↓
Client CRM updated
       ↓
Activity recorded
       ↓
Dashboard updated
```

The UI could show:

```text
Deal Closed Successfully

✓ Internal Record
✓ Agency CRM
✓ Client CRM

All systems synchronized.
```

---

# 44. Example Multi-CRM Scenario

Consider:

```text
Sales Agency
│
├── Client A → GoHighLevel
├── Client B → ActiveCampaign
└── Client C → Close CRM
```

Agent works with all three.

Instead of:

```text
Chrome Tab 1 → GoHighLevel
Chrome Tab 2 → ActiveCampaign
Chrome Tab 3 → Close
Chrome Tab 4 → Calendar
Chrome Tab 5 → Calling
```

the agent uses:

```text
              OUR PLATFORM

Dashboard
Leads
Calendar
Calls
Tasks
Clients
Activity
```

The platform communicates with the appropriate external systems in the background.

---

# 45. MVP Scope

The FYP should not attempt to build every possible sales feature.

The MVP should focus on proving the central thesis:

> **One action by a sales agent can update multiple connected systems without requiring repeated manual entry.**

## MVP Features

### Authentication

* Login.
* Registration.
* Roles.

### Organizations

* Agency.
* Clients.
* Agents.

### CRM

* Connect 2–3 CRM providers.
* Import leads.
* Display leads.
* Update lead status.

### Unified Lead View

* Contact information.
* Client.
* CRM.
* Status.
* Notes.
* Activity history.

### Actions

* Add note.
* Update status.
* Schedule appointment.
* Record activity.
* Close deal.

### Synchronization

* Platform → CRM.
* CRM → Platform where supported.
* Sync logs.
* Error handling.
* Retry.

### Dashboard

* Leads.
* Appointments.
* Tasks.
* Recent activity.

---

# 46. Features Explicitly Outside MVP

The following should be treated as future scope unless the team has sufficient development time:

* AI sales assistant.
* Automatic lead scoring.
* AI-generated sales scripts.
* Predictive analytics.
* AI call transcription.
* Sentiment analysis.
* Automated email generation.
* Advanced reporting.
* Billing.
* Customer-facing portal.
* Dozens of CRM integrations.
* Complex workflow builders.
* Fully autonomous agents.

These features can make the product larger, but they do not prove the fundamental FYP concept.

---

# 47. Future AI Layer

AI can be added after the core integration platform works.

Potential future capabilities:

## AI Lead Prioritization

```text
100 Leads
     ↓
AI analyzes lead information
     ↓
High-value leads prioritized
```

## AI Sales Assistant

The agent could ask:

> "What should I know before calling John?"

The assistant could summarize:

* Previous interactions.
* Notes.
* Lead history.
* Company information.
* Previous objections.
* Next recommended action.

## AI Follow-up Generation

The system could generate a follow-up message based on the lead's history.

## AI Call Summarization

After a call:

```text
Call
 ↓
Transcript
 ↓
AI Summary
 ↓
Important information
 ↓
Next action
 ↓
CRM update
```

This should be considered Phase 2 rather than the foundation of the FYP.

---

# 48. Non-Functional Requirements

## Performance

Common dashboard and lead operations should respond quickly.

Target:

```text
Normal internal API response:
< 500 ms where practical
```

External CRM synchronization should not block the entire UI unnecessarily.

---

# 49. Reliability

External APIs are unreliable dependencies.

The system should use:

* Retries.
* Timeouts.
* Logging.
* Failure states.
* Idempotency.
* Background processing where appropriate.

---

# 50. Idempotency

This is important for synchronization.

If the same event is processed twice:

```text
Close Deal
Close Deal
```

the system should not accidentally create duplicate records or duplicate activities.

Each synchronization event should have a unique identifier.

---

# 51. Observability

The backend should provide enough logging to understand:

```text
Who performed the action?
What happened?
When?
Which CRM?
Did it succeed?
If it failed, why?
Was it retried?
```

---

# 52. Suggested Technology Stack

Since this is an FYP and the team needs to build a working web application rather than a distributed enterprise platform, a practical stack would be:

## Frontend

```text
Next.js
React
TypeScript
Tailwind CSS
```

## Backend

Either:

```text
Node.js
NestJS / Express
TypeScript
```

or:

```text
Python
FastAPI
```

For a TypeScript-heavy web application, NestJS is a strong choice because the integration architecture can be organized into modules.

## Database

```text
PostgreSQL
```

## Authentication

```text
JWT / secure session-based authentication
```

## Background Jobs

Possible options:

```text
Redis
BullMQ
```

or a simpler database-backed job system for the initial MVP.

## API Documentation

```text
OpenAPI / Swagger
```

## Deployment

Possible:

```text
Frontend → Vercel
Backend → Render / Railway / AWS
Database → PostgreSQL
```

The exact hosting provider is secondary to having a reproducible deployment.

---

# 53. Suggested Frontend Structure

```text
/app
    /dashboard
    /leads
    /leads/[id]
    /calendar
    /tasks
    /clients
    /integrations
    /settings
    /activity
```

Reusable components:

```text
LeadCard
LeadTable
LeadDetails
ActivityTimeline
StatusSelector
Calendar
IntegrationCard
SyncStatus
NotificationPanel
```

---

# 54. Suggested Backend Structure

```text
src/

auth/
organizations/
users/
clients/
leads/
contacts/
deals/
activities/
appointments/
integrations/
sync/
notifications/
audit/
database/
```

Integration layer:

```text
integrations/

  core/
    crm.interface.ts
    integration.service.ts

  gohighlevel/
    gohighlevel.adapter.ts

  activecampaign/
    activecampaign.adapter.ts

  close/
    close.adapter.ts
```

---

# 55. Generic CRM Interface

The architecture should define common operations.

Conceptually:

```text
CRMAdapter

getLead()
getLeads()
createLead()
updateLead()
updateLeadStatus()
addNote()
createAppointment()
getActivities()
```

Each provider implements the interface.

For example:

```text
GoHighLevelAdapter
ActiveCampaignAdapter
CloseAdapter
```

This makes adding a fourth CRM substantially easier.

---

# 56. API Integration Flow

Example:

```text
Frontend
   ↓
PATCH /leads/123/status
   ↓
Backend
   ↓
Validate permissions
   ↓
Update internal database
   ↓
Create Sync Event
   ↓
Integration Worker
   ↓
Identify CRM
   ↓
CRM Adapter
   ↓
External API
   ↓
Response
   ↓
Sync Log
```

---

# 57. Database Relationship Overview

```text
Organization
    │
    ├── Users
    │
    └── Clients
          │
          ├── CRM Connections
          │
          └── Leads
                │
                ├── Activities
                ├── Notes
                ├── Appointments
                └── External Records
```

---

# 58. Key Product Metrics

The FYP can measure whether the product actually solves the stated problem.

## Primary metric

### Time saved per agent

Compare:

```text
Traditional workflow
vs.
Unified platform workflow
```

Example experiment:

```text
Task:
Close a lead and update three systems.

Traditional:
4–8 minutes

Unified:
1–2 minutes
```

The actual values should be measured during testing rather than assumed.

---

# 59. Other Metrics

### Task completion time

How long does an agent take to complete a standard sales operation?

### Context switches

How many applications does the agent need to open?

### Manual updates

How many times must the same information be entered?

### Synchronization success rate

```text
Successful syncs / Total sync attempts
```

### Error rate

Number of synchronization failures.

### Agent satisfaction

Survey agents after using the system.

---

# 60. FYP Evaluation Experiment

A strong FYP evaluation should compare two workflows.

## Control

Agent uses normal CRM workflow.

```text
CRM A
+
Calendar
+
Calling
+
Agency CRM
+
Client CRM
```

## Experimental

Agent uses the unified platform.

Then give agents identical tasks.

Example:

### Task

```text
Find lead
Call lead
Add note
Schedule follow-up
Change status
Close lead
```

Measure:

* Completion time.
* Number of application switches.
* Number of manual data entries.
* Number of errors.

This gives the project an objective evaluation instead of simply demonstrating that the application works.

---

# 61. Example Success Criteria

The MVP will be considered successful if:

1. An agent can log in.
2. An agency can connect multiple CRM systems.
3. Leads can be retrieved from connected systems.
4. Leads can be displayed in a unified interface.
5. An agent can perform common sales operations from the platform.
6. Changes are synchronized to the appropriate external CRM.
7. Synchronization failures are detected and logged.
8. Agents can view appointments and activities.
9. Different users have appropriate permissions.
10. The system demonstrably reduces the number of application switches and/or time required to complete a defined sales workflow.

---

# 62. FYP Demonstration Scenario

The final presentation should use a realistic scenario.

### Setup

```text
Sales Agency: ABC Sales

Client 1 → GoHighLevel
Client 2 → ActiveCampaign
Client 3 → Close CRM
```

### Agent

```text
Agent: Ali
```

### Demonstration

Agent logs in.

Dashboard shows:

```text
Client 1
12 leads

Client 2
8 leads

Client 3
15 leads
```

Agent opens a lead.

The lead profile displays all relevant information.

Agent:

1. Calls the lead.
2. Records the call.
3. Adds a note.
4. Schedules an appointment.
5. Changes status.
6. Closes the deal.

Then demonstrate the external CRMs.

The audience should see that the corresponding records were updated without the agent manually opening each CRM.

This demonstrates the central product value very clearly.

---

# 63. Product Differentiator

The product is not simply:

> "Another CRM."

The positioning should be:

> **A unified operational workspace for sales teams that work across multiple client CRMs.**

The existing CRMs remain the systems of record.

Our platform provides the operational interface between the agent and those systems.

---

# 64. Core Value Proposition

### For Sales Agents

**One workspace instead of multiple applications.**

### For Sales Agencies

**Less administrative work and greater agent productivity.**

### For Client Companies

**Their CRM remains updated without requiring agents to duplicate work.**

### For Managers

**Centralized visibility across clients, agents, leads, activities, and integrations.**

---

# 65. Product Philosophy

The product should follow three principles.

## 1. Enter information once

The agent should not repeatedly type the same information.

## 2. See information once

The agent should have a unified view of relevant sales information.

## 3. Act once

A single action should propagate to every system that needs to know about it.

This can be summarized as:

```text
                 ENTER ONCE
                     ↓
                 SEE ONCE
                     ↓
                  ACT ONCE
                     ↓
        ┌────────────┼────────────┐
        ↓            ↓            ↓
     CRM A         CRM B        CRM C
```

---

# 66. Development Phases

## Phase 1 — Foundation

* Project setup.
* Database.
* Authentication.
* User roles.
* Organization structure.

## Phase 2 — CRM Integration

* Build integration interface.
* Implement first CRM.
* Implement second CRM.
* Implement third CRM.
* Normalize lead data.

## Phase 3 — Unified Workspace

* Dashboard.
* Lead list.
* Lead details.
* Search.
* Filters.
* Activity timeline.

## Phase 4 — Actions

* Status updates.
* Notes.
* Activities.
* Appointments.
* Deal closing.

## Phase 5 — Synchronization

* Event system.
* Background jobs.
* Retry mechanism.
* Sync logs.
* Error handling.

## Phase 6 — Testing

* Unit tests.
* Integration tests.
* API tests.
* CRM mock testing.
* End-to-end testing.

## Phase 7 — Evaluation

* Compare traditional workflow.
* Compare unified workflow.
* Measure task completion time.
* Measure application switching.
* Measure manual data entry.
* Collect agent feedback.

---

# 67. What the FYP Should NOT Become

Avoid turning the project into:

```text
CRM
+ AI
+ Email Marketing
+ Calling System
+ Calendar
+ Project Management
+ Analytics
+ Chatbot
+ Automation Builder
+ Billing
+ Customer Portal
```

That creates a very large and unfocused project.

The core thesis is much simpler:

> **Can a unified integration layer allow sales agents working across multiple client CRM systems to perform their daily operations from one interface while synchronizing those actions automatically?**

Everything in the MVP should support answering that question.

---

# 68. Final Product Definition

The final product is a **multi-tenant unified sales workspace for sales outsourcing agencies**.

It connects the agency's sales operations with multiple client CRM systems and provides sales agents with a single interface for:

* Leads.
* Contacts.
* Activities.
* Calls.
* Appointments.
* Notes.
* Tasks.
* Pipelines.
* Deal status.

Behind the interface, an integration and synchronization layer communicates with external CRM systems.

The defining behavior is:

```text
              SALES AGENT
                   │
                   ↓
        ┌─────────────────────┐
        │   UNIFIED PLATFORM  │
        └──────────┬──────────┘
                   │
             One action
                   │
       ┌───────────┼───────────┐
       ↓           ↓           ↓
    Agency       Client A    Client B
     CRM           CRM         CRM
       │           │           │
       └───────────┼───────────┘
                   ↓
              Synchronized
```

The platform therefore functions as an **operational control layer over a fragmented sales technology stack**, reducing repetitive work and allowing sales agents to spend more of their working time on actual selling rather than CRM administration.

---

# 69. One-Sentence Product Description

> **A unified sales workspace that allows sales agencies and their agents to manage leads, calls, appointments, activities, and deals across multiple client CRMs from one interface, with actions automatically synchronized to the systems that need them.**

---

# 70. Core FYP Thesis

The project can ultimately be framed around this proposition:

> **Fragmented CRM environments create unnecessary operational overhead for outsourced sales teams. A unified integration platform can reduce context switching, duplicate data entry, and task completion time by providing one interface through which sales agents can interact with multiple CRM systems simultaneously.**
