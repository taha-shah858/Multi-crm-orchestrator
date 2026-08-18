Yes. Since this is specifically an **internship POC**, I would give the AI coding agent a tightly scoped implementation brief. The main goal should be:

> **Prove that a real CRM can be connected → data fetched by our backend → normalized → exposed through our API → displayed in the existing frontend, while making the absolute minimum frontend changes.**

You also want the agent to understand that **this is not the final architecture**, so it should not start refactoring your friend's frontend.

### How Graphify can help

If by **Graphify** you mean the tool you're using to visualize/explore your codebase, it can be useful here primarily for **understanding the existing project before modifying it**.

I would have the agent use it to:

* understand the current frontend component hierarchy
* identify where the existing leads/contacts UI lives
* trace how frontend API calls are currently handled
* identify existing backend routes/services/models
* see dependencies between components
* determine the **smallest possible set of files** that need modification
* visualize the eventual CRM → backend → frontend flow

The important instruction is: **use Graphify for analysis, not as a reason to refactor unrelated code.**

Here is the plan I would give your AI agent:

# CRM Import POC — AI Agent Implementation Plan

## 1. Purpose

We are implementing a **temporary Proof of Concept (POC)** for our multi-CRM platform as part of an internship demonstration.

The objective is NOT to complete the final multi-CRM architecture.

The objective is to prove the following end-to-end concept:

```text
CRM
  ↓
CRM API
  ↓
Our Backend
  ↓
CRM-specific Adapter / Mapper
  ↓
Normalized Internal Data
  ↓
Our Backend API
  ↓
Existing Frontend
  ↓
Display CRM Data
```

For this POC, implement **one CRM only**.

The implementation should demonstrate that our application can retrieve real CRM data and display it inside our own interface.

---

# 2. FIRST STEP — Create a Separate Git Branch

Before modifying application code, create a dedicated branch for this experiment.

Branch name:

```text
feature/crm-import-poc
```

Do NOT implement this directly on `main`.

Verify the current Git state first.

If there are uncommitted changes belonging to existing work, DO NOT overwrite, discard, reset, or commit those changes without explicit confirmation.

The POC should remain isolated so that it can later be deleted or replaced by the proper architecture.

---

# 3. Understand the Existing Project Before Coding

Before making changes, inspect the entire relevant project structure.

Do not immediately start coding.

First understand:

* frontend framework
* backend framework
* existing API architecture
* existing database/models
* authentication structure
* existing CRM-related code
* existing contacts/leads pages
* existing API client
* existing state-management approach
* existing routing
* existing UI components

Use the existing project architecture wherever practical.

Do not introduce a new framework, state-management library, API client, database technology, or major architectural pattern unless absolutely necessary.

---

# 4. Use Graphify for Codebase Understanding

Use Graphify, where available, to understand the relationships inside the existing codebase.

Specifically investigate:

### Frontend

Identify:

```text
Page
 ↓
Components
 ↓
API calls
 ↓
State
 ↓
Data display
```

Find the existing page/component that is most appropriate for displaying imported CRM contacts/leads.

Determine the minimum frontend files that need modification.

### Backend

Trace:

```text
API route
 ↓
Service
 ↓
Integration/client
 ↓
Model/mapper
```

Identify where the new CRM integration should fit without disturbing unrelated functionality.

### Important

Graphify is primarily being used here as an **analysis and navigation tool**.

Do not use this task as an excuse to refactor the existing application.

Do not reorganize the project merely because you prefer a different architecture.

Only make changes necessary for this POC.

---

# 5. CRM Selection

Use the CRM that is already easiest to authenticate and access through its API.

If the project already has a CRM selected, use that CRM.

Otherwise, use **GoHighLevel** as the first CRM unless there is a technical reason it is significantly harder to integrate than another available CRM.

The POC only needs ONE CRM.

Do not implement all three CRMs at this stage.

---

# 6. Required End-to-End Flow

The implementation should follow this flow:

```text
User
 │
 │ clicks Import / Sync
 ▼
Frontend
 │
 │ HTTP request
 ▼
Our Backend
 │
 │ calls CRM integration
 ▼
CRM API
 │
 │ returns CRM-specific response
 ▼
CRM Adapter / Mapper
 │
 │ converts CRM-specific structure
 ▼
Normalized Contact Model
 │
 ▼
Backend API Response
 │
 ▼
Frontend
 │
 ▼
Contacts/Leads UI
```

The frontend should NOT directly communicate with the CRM API.

The frontend communicates only with our backend.

---

# 7. Backend Requirements

The backend is the most important part of this POC.

Implement a backend endpoint for importing/fetching contacts.

For example:

```text
GET /api/contacts/import
```

or an equivalent route that fits the existing backend conventions.

The endpoint should:

1. Receive the request from the frontend.
2. Authenticate with the CRM using the appropriate credentials/token.
3. Call the CRM API.
4. Retrieve contacts/leads.
5. Convert CRM-specific fields into our internal format.
6. Return normalized data to the frontend.

---

# 8. CRM Adapter / Mapper

Even though this is a temporary POC, DO NOT directly expose the CRM's raw response to the frontend.

Bad:

```text
CRM API
 ↓
Raw CRM JSON
 ↓
Frontend
```

Instead:

```text
CRM API
 ↓
CRM Adapter
 ↓
Normalized Internal Model
 ↓
Frontend
```

For example, the application should have an internal representation similar to:

```json
{
  "id": "123",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john@example.com",
  "phone": "+123456789",
  "company": "ABC Company",
  "source_crm": "gohighlevel"
}
```

The exact fields should be determined after inspecting the CRM API and the existing frontend.

The important principle is:

> The frontend should consume our application's data model, not the CRM vendor's data model.

---

# 9. Keep CRM-Specific Logic Isolated

CRM-specific API calls should not be scattered throughout generic backend code.

Prefer something conceptually similar to:

```text
integrations/
    gohighlevel/
        client
        mapper
```

Then:

```text
API Route
    ↓
Contact Service
    ↓
GoHighLevel Client
    ↓
GoHighLevel Mapper
    ↓
Normalized Contact
```

The exact directory names can follow the existing project conventions.

Do not force a large abstraction hierarchy for a single POC.

The requirement is simply that CRM-specific logic remains reasonably isolated.

---

# 10. Authentication / Credentials

Never hardcode:

* API keys
* access tokens
* client secrets
* passwords
* refresh tokens

Use environment variables or the existing project's configuration mechanism.

For example:

```text
CRM_API_KEY=
CRM_ACCESS_TOKEN=
```

Use whatever environment-variable naming convention already exists in the project.

Do NOT commit secrets to Git.

If OAuth is already implemented in the project, use the existing authentication mechanism.

If OAuth would require substantial additional infrastructure and the purpose of this internship POC can be demonstrated using a development API token, keep the implementation simple and clearly document that it is a POC authentication mechanism.

---

# 11. Pagination

Investigate whether the selected CRM API uses pagination.

For the POC:

* retrieving the first page of contacts is acceptable if necessary
* however, structure the code so pagination can be added later
* do not build an elaborate synchronization engine

If implementing pagination is trivial, implement it.

Otherwise document it as a known POC limitation.

---

# 12. Frontend — MINIMAL CHANGES ONLY

This is extremely important.

The current frontend was developed before the final architecture was established.

It will eventually be redesigned/revamped.

Therefore:

> DO NOT redesign the frontend during this task.

First inspect the existing frontend and identify the closest existing UI for displaying contacts/leads.

Make only the changes required to demonstrate the backend feature.

Possible minimal changes:

```text
Existing Contacts/Leads page
        +
"Import from CRM" button
        ↓
Call backend
        ↓
Show loading state
        ↓
Display imported records
```

Reuse existing:

* components
* tables
* cards
* buttons
* styling
* API utilities
* state-management patterns

whenever possible.

Do NOT:

* redesign the dashboard
* change navigation
* redesign the sidebar
* rewrite existing pages
* introduce a new design system
* change unrelated components
* refactor the frontend architecture
* change the overall UX

The frontend only needs to make the POC visibly demonstrable.

---

# 13. Suggested User Experience

The simplest acceptable flow is:

```text
Contacts Page

[ Import from CRM ]

↓ click

Loading...

↓

Imported Contacts

John Doe
john@example.com
+123456789

Jane Smith
jane@example.com
+987654321
```

A small indication of the source can be shown:

```text
Source: GoHighLevel
```

Do not spend time making this production-grade.

The purpose is to visibly prove that the data originated from an external CRM and travelled through our backend into our application.

---

# 14. Error Handling

Implement basic error handling.

At minimum:

### Success

```text
Contacts imported successfully.
```

### CRM/API failure

```text
Unable to import contacts from CRM.
```

### Authentication failure

```text
CRM authentication failed.
```

### Empty result

```text
No contacts found.
```

Do not build an elaborate error-management framework.

Basic, understandable errors are sufficient.

---

# 15. Logging

Add useful backend logs during development.

For example:

```text
[CRM] Starting contact import
[CRM] Requesting contacts
[CRM] Received 25 contacts
[CRM] Normalized 25 contacts
```

Do NOT log:

* API keys
* access tokens
* passwords
* sensitive credentials

Keep logs useful for demonstrating and debugging the POC.

---

# 16. Database — Do Not Overengineer

For this POC, do NOT introduce a full synchronization/database architecture unless the existing application already requires it.

The simplest acceptable implementation is:

```text
CRM
 ↓
Backend
 ↓
Normalized data
 ↓
Frontend
```

If the existing application already has a contacts table/model and storing imported contacts is straightforward, it may be used.

Otherwise, returning the imported records directly from the backend is acceptable for the POC.

The goal is to prove the integration first.

---

# 17. What We MUST NOT Compromise On

Even though this is temporary code, the following principles are non-negotiable:

### 1. No hardcoded secrets

Never commit credentials.

### 2. Frontend must not directly call the CRM

```text
Frontend → Backend → CRM
```

not:

```text
Frontend → CRM
```

### 3. Do not expose raw CRM structures to the frontend

Use a normalized internal representation.

### 4. Keep CRM-specific logic isolated

Do not scatter CRM-specific field names and API calls throughout the application.

### 5. Do not break existing functionality

The POC should be additive.

### 6. Minimal frontend modifications

The current frontend is temporary and will eventually be revamped.

### 7. Keep the POC isolated in its own Git branch

```text
feature/crm-import-poc
```

### 8. Do not perform unrelated refactoring

If you discover architectural problems unrelated to this feature, document them rather than fixing them during this task.

### 9. Do not pretend this is the final architecture

Clearly mark POC-specific code where appropriate.

### 10. The application must actually use a real CRM API

Do not mock the CRM response for the final demonstration.

The teacher should be able to see real CRM data entering the application.

---

# 18. Testing

Before considering the POC complete, verify:

### Backend

* [ ] Backend starts successfully.
* [ ] CRM credentials are loaded from environment/configuration.
* [ ] CRM API can be reached.
* [ ] Contacts can be retrieved.
* [ ] CRM response is mapped to the normalized model.
* [ ] Backend endpoint returns the normalized contacts.
* [ ] CRM errors are handled.
* [ ] Invalid/missing credentials are handled.

### Frontend

* [ ] Existing frontend still works.
* [ ] Import button/action works.
* [ ] Loading state appears.
* [ ] Imported contacts are displayed.
* [ ] Empty results are handled.
* [ ] API errors are displayed.
* [ ] No unnecessary UI changes were introduced.

### Git

* [ ] Work is isolated to `feature/crm-import-poc`.
* [ ] No secrets are committed.
* [ ] No unrelated files were modified unnecessarily.
* [ ] Changes are committed with a clear message.

---

# 19. Definition of Done

The POC is complete when we can demonstrate this live:

```text
Open our application
       ↓
Open Contacts/Leads
       ↓
Click "Import from CRM"
       ↓
Our frontend calls our backend
       ↓
Our backend calls the real CRM API
       ↓
CRM returns real contacts
       ↓
Backend normalizes the CRM response
       ↓
Frontend receives normalized data
       ↓
Real CRM contacts appear in our application
```

That is the entire success criterion.

---

# 20. Final Report After Implementation

After completing the implementation, provide a concise technical summary containing:

1. Files added.
2. Files modified.
3. Backend endpoint created.
4. CRM API endpoints used.
5. Authentication method used.
6. Normalized data model.
7. Frontend changes made.
8. How the complete data flow works.
9. Known POC limitations.
10. What should be redesigned in the production implementation.

Also report any architectural concerns discovered during implementation without automatically fixing unrelated areas.

---

# 21. Important Mindset

Treat this as a **vertical-slice proof of concept**, not as the final implementation.

The priority order is:

```text
1. Working real CRM integration
2. Correct backend flow
3. Correct data normalization
4. Minimal frontend demonstration
5. Basic error handling
6. Clean isolation
7. Documentation
8. Everything else
```

Do not sacrifice the working integration by spending time polishing unrelated frontend or architecture.

The final production architecture will be designed separately after the POC has demonstrated that the core concept works.
