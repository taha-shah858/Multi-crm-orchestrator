1. Objective

Replace hardcoded provider credentials with a secure, reusable integration framework that allows:

Admins to connect and manage company-level integrations.

Admins or authorized assigned agents to connect client CRM accounts.

Agents to optionally connect their own user-scoped CRM/integrations.

Agents to trigger and retry synchronization without receiving provider credentials.

All provider credentials to remain server-side and encrypted.

Existing HubSpot bi-directional contact sync to continue working through the new connection model.

The same framework to later support Twilio, Google Calendar, Outlook, additional CRMs, and AI providers.

The platform must remain the canonical integration layer between external systems.

2. Integration Ownership Model

Every integration connection must have an ownership scope.

COMPANY

Used for company-wide systems.

Examples:

Company CRM

Company Twilio account

Company calendar/service account where applicable

Rules:

Connected/configured by Admin or Manager.

Agents cannot view credentials.

Agents cannot disconnect or change configuration.

Agents may use permitted company services and retry permitted sync jobs.

CLIENT_ACCOUNT

Used for a client's external systems.

Examples:

Client HubSpot

Client Salesforce

Client CRM

Client-specific Twilio identity where applicable

Rules:

Belongs to the selected Client Account, not to the user who connected it.

Admin can connect/manage it.

An assigned agent may initiate OAuth connection if permitted.

Assigned agents can trigger sync and retry failed sync.

Agents cannot view/decrypt tokens.

Cross-client access must be rejected server-side.

USER

Used for optional agent-owned integrations.

Examples:

Agent personal CRM

Agent personal calendar

Rules:

Belongs to one user.

User may connect/disconnect their own integration.

Must not become the authoritative source of commissions or company financials.

Other agents cannot access it.

3. Canonical Data Flow

Do not directly synchronize one external provider to another.

Use:

Client CRM
    ↕
Canonical Platform Database
    ↕
Company CRM

Example:

Client HubSpot
      ↓
Canonical Contact / Deal
      ↓
Agent Attribution
      ↓
Commission / Operations
      ↓
Company CRM

The platform database is the canonical orchestration layer.

4. Permission Model

Agent

Allowed:

View assigned client integrations.

Initiate client OAuth connection if explicitly permitted.

Use connected integrations for assigned clients.

Trigger inbound sync.

Trigger outbound sync.

Retry failed sync.

View sync status for assigned clients.

View own deals, commissions, and operational records.

Connect/disconnect USER-scoped integrations.

Not allowed:

View provider access tokens or refresh tokens.

Access integration secrets.

Disconnect company-level integrations.

Change company-wide provider configuration.

Change global field mappings.

Access unassigned client integrations.

View other agents' private operational/commission data.

Admin / Manager

Allowed:

Connect/disconnect COMPANY integrations.

Connect/manage CLIENT_ACCOUNT integrations.

Configure provider settings.

Configure field mappings.

View company-wide sync state.

Retry/reconcile failed sync jobs.

Manage users, assignments, and clients.

View company-wide operations, commissions, audit logs, and integration health.

All permission checks must be enforced server-side.

5. Database Model

Create or refactor toward a generic provider model.

Suggested shape:

IntegrationConnection
---------------------
id
companyId

ownershipType
  COMPANY
  CLIENT_ACCOUNT
  USER

clientAccountId?      // required for CLIENT_ACCOUNT
userId?               // required for USER

provider
  HUBSPOT
  SALESFORCE
  CLOSE
  ACTIVE_CAMPAIGN
  TWILIO
  GOOGLE_CALENDAR
  OUTLOOK
  AI_PROVIDER
  ...

providerAccountId?
providerAccountName?
status
scopes
connectedByUserId
connectedAt
lastSyncAt
createdAt
updatedAt

Credentials should be stored separately.

IntegrationCredential
---------------------
id
integrationConnectionId
encryptedAccessToken
encryptedRefreshToken?
accessTokenExpiresAt?
refreshTokenExpiresAt?
metadata?
createdAt
updatedAt

Do not expose credential records through client APIs.

6. Credential Security

Provider credentials must never be stored in:

React state beyond transient callback/navigation state.

localStorage.

sessionStorage.

client-readable cookies.

frontend source code.

plaintext database columns.

committed .env files.

For the FYP, use server-side encryption such as AES-256-GCM with an encryption key provided through a server-only environment variable.

Example:

INTEGRATION_ENCRYPTION_KEY=...

Only backend services may encrypt/decrypt provider tokens.

Production systems could later use KMS/Key Vault/Secret Manager.

7. OAuth Connection Flow

Implement a generic provider OAuth flow.

User selects Client Account
        ↓
Integrations Hub
        ↓
Connect Provider
        ↓
Backend validates authorization
        ↓
Backend generates OAuth state
        ↓
Provider login/consent page
        ↓
Provider callback
        ↓
Backend validates OAuth state
        ↓
Exchange code for tokens
        ↓
Encrypt/store credentials
        ↓
Create/update IntegrationConnection
        ↓
Mark CONNECTED
        ↓
Optional initial sync

OAuth State

Create a short-lived, one-time state record.

OAuthState
----------
id
stateHash
provider
companyId
clientAccountId?
userId?
ownershipType
initiatedByUserId
expiresAt
usedAt?
createdAt

Requirements:

Use cryptographically secure random state.

Do not trust clientAccountId/companyId returned from browser query parameters.

Validate state on callback.

Reject expired or already-used state.

Bind state to initiating user and ownership target.

8. HubSpot Migration

HubSpot is the first real provider for this framework.

Current hardcoded/private-token integration should be migrated to OAuth while preserving current functionality.

Required functionality

Connect HubSpot from Integrations Hub.

Store connection against CLIENT_ACCOUNT or COMPANY ownership.

Obtain and encrypt OAuth access/refresh tokens.

Automatically refresh expired access tokens.

Show connection status.

Import contacts.

Update contacts outbound.

Preserve ExternalRecord mapping.

Preserve duplicate prevention.

Preserve audit logs and SyncRun history.

Preserve retry behavior.

Initial scopes should stay minimal:

crm.objects.contacts.read
crm.objects.contacts.write

Add company/deal/activity scopes only when those objects are implemented.

9. Integration Hub UI

The Integrations Hub should become the primary onboarding interface.

For the currently selected client:

Client: Acme Ltd

CRM Integrations
--------------------------------
HubSpot
Status: Not Connected
[ Connect HubSpot ]

Salesforce
Status: Not Connected
[ Connect Salesforce ]

Connected state:

HubSpot
Connected ✓
Account: Acme Ltd
Last Sync: 2 minutes ago

[ Sync Now ] [ Retry Failed ] [ Settings ]

Only authorized users should see Disconnect or administrative Settings.

The Agent UI should emphasize:

Connection status.

Sync now.

Retry failed sync.

Last successful sync.

Error message when appropriate.

Do not expose tokens or provider secrets.

10. Sync Architecture

Use local-first synchronization.

Outbound example:

Agent edits contact
       ↓
Validate permission
       ↓
Update canonical PostgreSQL record
       ↓
Create SyncRun / outbound job
       ↓
Provider adapter
       ↓
External provider

Success:

Local DB ✓
HubSpot ✓
Status = SYNCED

Failure:

Local DB ✓
HubSpot ✗
Status = SYNC_FAILED
[ Retry Sync ]

Do not roll back the user's local edit just because an external provider is unavailable.

11. Provider Adapter Contract

Extend the existing integration adapter architecture instead of adding provider-specific logic throughout the application.

Suggested capabilities:

interface IntegrationAdapter {
  provider: Provider;

  connect?: (...args) => Promise<...>;
  refreshCredentials?: (...args) => Promise<...>;

  listContacts?: (...args) => Promise<...>;
  getContact?: (...args) => Promise<...>;
  createContact?: (...args) => Promise<...>;
  updateContact?: (...args) => Promise<...>;

  disconnect?: (...args) => Promise<...>;
}

Capabilities can differ by provider.

Do not force every provider to implement unsupported operations.

12. Sync Control and Retry

Agents assigned to a client should be able to:

Run inbound sync.

Run outbound sync where applicable.

Retry failed jobs.

See a safe provider error message.

Continue working when a provider is temporarily unavailable.

Retrying sync must not require revealing or re-entering provider credentials.

Admin should additionally be able to:

See failed syncs across all clients.

Retry/reconcile company-wide failures.

Inspect detailed integration health.

13. CRM Field Mapping

Continue using canonical internal fields.

Example:

Canonical       HubSpot
----------------------------
firstName   →   firstname
lastName    →   lastname
email       →   email
phone       →   phone
company     →   company

Later map AI-derived fields to provider custom fields where supported:

budget
timeline
intent
leadScore
temperature
dealProbability
aiSummary

Field mappings should eventually be configurable by Admin.

Agents should not change global mappings.

14. Commission Integrity

Agent-owned CRM data must not directly determine commission totals.

Commission should be based on canonical platform records:

Deal
  +
Agent Assignment
  +
Commission Rules
  ↓
CommissionRecord

External CRM data may populate or support these records, but financial calculations must remain controlled by the platform.

All manual commission changes must remain audited.

15. Other Providers

Do not implement all providers simultaneously.

Implement the framework first, then providers incrementally.

Recommended order:

HubSpot OAuth migration

Twilio

Google Calendar

Microsoft Outlook Calendar

Real AI provider

Optional second CRM

Each provider must use the same ownership, authorization, credential, status, and audit framework.

16. API Requirements

Provider connection APIs must:

Require authenticated user.

Resolve company from server-side session/context.

Validate ownership target.

Verify role/assignment.

Never trust tenant IDs blindly from request body.

Return JSON for success and failure.

Never return encrypted/decrypted credentials.

Record security-relevant actions in AuditLog.

Suggested API structure:

/api/integrations
/api/integrations/[id]
/api/integrations/[id]/sync
/api/integrations/[id]/retry
/api/integrations/[id]/disconnect

/api/integrations/hubspot/connect
/api/integrations/hubspot/callback

Exact route structure may be adapted to the existing application.

17. Audit Requirements

Audit at minimum:

Integration connected.

Integration disconnected.

OAuth connection failed.

Credential refresh failed.

Manual sync started.

Sync succeeded.

Sync failed.

Sync retried.

Field mapping changed.

Provider account changed.

Audit records should identify:

company

client/user ownership target

integration connection

initiating user

provider

action

timestamp

safe error metadata

Never put secrets/tokens into logs.

18. Error Handling

Provider failures must not produce raw HTML/JSON parsing errors in the UI.

Backend APIs should return structured JSON errors.

Example:

{
  "error": {
    "code": "PROVIDER_UNAVAILABLE",
    "message": "HubSpot is temporarily unavailable."
  }
}

Frontend should:

check response.ok

safely parse expected content type

display an in-app error

offer Retry where appropriate

Do not use browser alert() or prompt().

19. Stage 2.5 Testing Checklist

Ownership

COMPANY connection belongs to company.

CLIENT_ACCOUNT connection belongs to correct client.

USER connection belongs to correct user.

Cross-client access is rejected.

Cross-company access is rejected.

Agent

Agent can see assigned client's connection status.

Agent can trigger permitted sync.

Agent can retry failed sync.

Agent cannot view credentials.

Agent cannot disconnect company CRM.

Agent cannot change global mappings.

Agent cannot access another client's connection.

Admin

Admin can connect company CRM.

Admin can manage client integrations.

Admin can disconnect permitted integrations.

Admin can inspect company-wide sync health.

HubSpot OAuth

Connect button opens HubSpot authorization.

Callback creates correct client connection.

Refresh token survives access-token expiration.

Contact import works.

Contact outbound update works.

Existing ExternalRecord mappings continue working.

No duplicate contacts are created.

Persistence

Verify:

connect
→ refresh page
→ restart server
→ connection remains usable

Failure

Test:

provider failure
→ local record remains saved
→ SyncRun = FAILED
→ UI displays failure
→ agent retries
→ provider succeeds
→ SyncRun = SUCCESS

Security

Confirm:

No token in browser localStorage.

No token in network API response.

No token in browser bundle.

No plaintext token in database.

No token in AuditLog/server logs.

20. Definition of Done

Stage 2.5 is complete when:

Generic IntegrationConnection ownership framework exists.

Credentials are encrypted server-side.

COMPANY / CLIENT_ACCOUNT / USER scopes are enforced.

HubSpot no longer depends on a hardcoded per-client token.

HubSpot OAuth works end-to-end.

Existing inbound and outbound HubSpot contact sync still works.

Agent can Sync and Retry without credential access.

Admin has integration management controls.

Tenant/client isolation is enforced server-side.

Integration Hub accurately displays connection state.

Provider APIs return structured JSON failures.

Audit logging is implemented.

TypeScript passes.

Prisma validates.

Migrations apply cleanly.

Production build passes.

Relevant automated/system tests pass.

Stop after Stage 2.5 for manual review before starting the next post-MVP stage.