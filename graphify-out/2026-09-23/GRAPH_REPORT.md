# Graph Report - Multi-crm-orchestrator  (2026-09-23)

## Corpus Check
- 170 files · ~107,905 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1105 nodes · 2296 edges · 101 communities (90 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2444c8b4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- integration-service.ts
- dependencies
- compilerOptions
- app/layout.tsx
- devDependencies
- client.ts
- mvp.md
- Design Audit
- 5. Module 6.1 — Multi-CRM Sync Engine
- System Architecture
- withApiErrorHandling
- request-context.ts
- TiltCard.tsx
- calendar-service.ts
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- admin-service.ts
- poc.md
- Network Background Image
- 21. MVP Completion Criteria
- 12. Module 6.8 — Workflow & Smart Scheduling
- 6. Module 6.2 — VoIP & SMS Identity Gateway
- 8. Module 6.4 — AI Intelligence & Lead Analysis
- 11. Module 6.7 — Sales Ops Reconciliation
- 13. Module 6.9 — Document & Proposal Generator
- 7. Module 6.3 — Unified Interaction Aggregator
- 9. Module 6.5 — Sales Script Architect
- requireAuthenticatedUser
- useClientAccount
- contact-sync-service.ts
- AdminWorkspacePage.tsx
- phase10-system-test.cjs
- stage2-6-sales-crm-test.cjs
- MultiCrmCard.tsx
- canonical.ts
- hubspot-sales-sync-service.ts
- calendar/page.tsx
- prepareActiveClientSync
- document-service.ts
- AdminWorkspacePage
- sales-crm-service.ts
- documents/page.tsx
- (agent)/operations/page.tsx
- Post-MVP Development Plan
- recordAuditEvent
- 19. MVP Implementation Order
- communication-service.ts
- sales-script-service.ts
- timeline/page.tsx
- (agent)/integrations/page.tsx
- MultiCrmCard
- [...path]/route.ts
- 10. Module 6.6 — Commission & Financial Tracker
- scripts
- history/route.ts
- MVP_PROGRESS.md
- import/route.ts
- Stage 2.7 - Status
- Q: Trace the existing authentication, RBAC, route layouts, sidebar, and Admin-Agent workspace dependencies for the Stage 2 correction.
- Phase 1 - Status
- Phase 4 - Status
- Phase 5 - Status
- Phase 6 - Status
- Phase 7 - Status
- Phase 8 - Status
- Phase 9 - Status
- Phase 10 - Status
- Post-MVP Stage 1 - Status
- Post-MVP Stage 2 - Status
- Phase 2 - Status
- Post-MVP Stage 2.5 - Status
- Post-MVP Stage 2.6 - Status
- Phase 3 - Status
- package.json
- contacts/[id]/sync/route.ts
- scripts/[id]/route.ts
- dateTime
- AdminWorkspaceShell.tsx
- money
- admin-types.ts
- lucide-react
- react-dom
- recharts
- three

## God Nodes (most connected - your core abstractions)
1. `withApiErrorHandling()` - 102 edges
2. `success()` - 89 edges
3. `requireRequestContext()` - 67 edges
4. `prepareActiveClientSync()` - 46 edges
5. `recordAuditEvent()` - 36 edges
6. `requireAuthenticatedUser()` - 33 edges
7. `useClientAccount()` - 23 edges
8. `AppError` - 23 edges
9. `isAdminWorkspaceRole()` - 17 edges
10. `prisma` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Architecture Essentials` --semantically_similar_to--> `System Architecture`  [EXTRACTED] [semantically similar]
  ArchitectureEssentials.md → Architecture.md
- `Product Requirements Document` --references--> `System Architecture`  [INFERRED]
  Prod.md → Architecture.md
- `AgentLayout()` --calls--> `requireAgentWorkspaceUser()`  [EXTRACTED]
  src/app/(agent)/layout.tsx → src/lib/auth/server-workspace.ts
- `Integration Layer` --references--> `CRMAdapter Interface`  [EXTRACTED]
  Architecture.md → ArchitectureEssentials.md
- `AdminLayout()` --calls--> `requireAdminWorkspaceUser()`  [EXTRACTED]
  src/app/(admin)/layout.tsx → src/lib/auth/server-workspace.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Platform Layers** — architecture_frontend, architecture_backend, architecture_integration_layer, architecture_data_layer [EXTRACTED 1.00]
- **CRM Integration Pattern** — crm_adapter_interface, architecture_integration_layer, unified_data_model [EXTRACTED 1.00]
- **Static Assets** — public_file_svg, public_globe_svg, public_next_svg, public_vercel_svg, public_window_svg [INFERRED 0.90]

## Communities (101 total, 11 thin omitted)

### Community 0 - "integration-service.ts"
Cohesion: 0.09
Nodes (37): AdminLayout(), GET(), AuthLayout(), LoginPage(), AdminWorkspaceShell(), ADMIN_WORKSPACE_ROLES, isAdminWorkspaceRole(), workspaceHomeForRole() (+29 more)

### Community 1 - "dependencies"
Cohesion: 0.11
Nodes (19): clsx, framer-motion, next, dependencies, clsx, framer-motion, next, pg (+11 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 3 - "app/layout.tsx"
Cohesion: 0.07
Nodes (28): initialCrmStatuses, recentActivity, stats, geistMono, geistSans, metadata, AdvancedWidget(), MainView (+20 more)

### Community 4 - "devDependencies"
Cohesion: 0.10
Nodes (21): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/postcss (+13 more)

### Community 5 - "client.ts"
Cohesion: 0.07
Nodes (45): hubSpotContactAdapter, associationIds(), fetchAllObjects(), fetchAllOwners(), fetchHubSpotContacts(), fetchHubSpotSalesCrm(), hubSpotHeaders(), hubSpotRequest() (+37 more)

### Community 6 - "mvp.md"
Cohesion: 0.14
Nodes (13): 14. Cross-Module Data Architecture, 15. Core Canonical Models, 16. API / Backend Requirements, 17. Error Handling and Failsafe Requirements, 18. Auditability, 1. Purpose, 20. End-to-End MVP Demonstration, 22. Explicitly Out of Scope for Initial MVP (+5 more)

### Community 7 - "Design Audit"
Cohesion: 0.10
Nodes (19): Code Quality, Color and Surfaces, Component Patterns, Content, Design Audit, Fix Priority, How This Works, Iconography (+11 more)

### Community 8 - "5. Module 6.1 — Multi-CRM Sync Engine"
Cohesion: 0.18
Nodes (11): 5. Module 6.1 — Multi-CRM Sync Engine, Atomic / Consistency Requirements, Automated Features, Bi-Directional Sync, Data Normalization, Duplicate Prevention, Manual Override, Multi-CRM Support (+3 more)

### Community 9 - "System Architecture"
Cohesion: 0.31
Nodes (9): Backend API Layer, Data Layer, Frontend Layer, Integration Layer, System Architecture, Architecture Essentials, CRMAdapter Interface, Product Requirements Document (+1 more)

### Community 10 - "withApiErrorHandling"
Cohesion: 0.10
Nodes (42): PATCH(), POST(), PATCH(), dynamic, GET(), POST(), dynamic, GET() (+34 more)

### Community 11 - "request-context.ts"
Cohesion: 0.14
Nodes (22): dynamic, POST(), dynamic, POST(), dynamic, POST(), createSession(), deleteSession() (+14 more)

### Community 13 - "calendar-service.ts"
Cohesion: 0.12
Nodes (22): dynamic, GET(), adapters, CalendarAdapter, calendarAdapterFor(), CalendarAdapterInput, CalendarAdapterResult, mockCalendarAdapter (+14 more)

### Community 17 - "admin-service.ts"
Cohesion: 0.14
Nodes (21): dynamic, PATCH(), dynamic, GET(), POST(), dynamic, GET(), dynamic (+13 more)

### Community 22 - "poc.md"
Cohesion: 0.05
Nodes (43): 10. Authentication / Credentials, 10. The application must actually use a real CRM API, 11. Pagination, 12. Frontend — MINIMAL CHANGES ONLY, 13. Suggested User Experience, 14. Error Handling, 15. Logging, 16. Database — Do Not Overengineer (+35 more)

### Community 30 - "21. MVP Completion Criteria"
Cohesion: 0.20
Nodes (10): 21. MVP Completion Criteria, AI, Communication, Documents, Financial, Interaction History, Multi-CRM, Operations (+2 more)

### Community 31 - "12. Module 6.8 — Workflow & Smart Scheduling"
Cohesion: 0.25
Nodes (8): 12. Module 6.8 — Workflow & Smart Scheduling, AI Intent Detection, Automated Features, Calendar Integration, Manual Override, Priority, Purpose, Scheduling Workflow

### Community 32 - "6. Module 6.2 — VoIP & SMS Identity Gateway"
Cohesion: 0.25
Nodes (8): 6. Module 6.2 — VoIP & SMS Identity Gateway, Automated Features, Identity Switcher, Manual Override, MVP Requirement, Priority, Purpose, Twilio Identity Mapping

### Community 33 - "8. Module 6.4 — AI Intelligence & Lead Analysis"
Cohesion: 0.25
Nodes (8): 8. Module 6.4 — AI Intelligence & Lead Analysis, AI Results Must Be Editable, Automated Features, Lead Quality Scoring, Manual Override, Priority, Purpose, Transcript Data Extraction

### Community 34 - "11. Module 6.7 — Sales Ops Reconciliation"
Cohesion: 0.29
Nodes (7): 11. Module 6.7 — Sales Ops Reconciliation, Automated Features, Manual Override, Priority, Purpose, Reconciliation Reports, Time-on-Account Tracking

### Community 35 - "13. Module 6.9 — Document & Proposal Generator"
Cohesion: 0.29
Nodes (7): 13. Module 6.9 — Document & Proposal Generator, Automated Features, Generative Drafting, Manual Override, One-Click Follow-Up, Priority, Purpose

### Community 36 - "7. Module 6.3 — Unified Interaction Aggregator"
Cohesion: 0.29
Nodes (7): 7. Module 6.3 — Unified Interaction Aggregator, Automated Features, Manual Override, Multi-Source Logging, Priority, Purpose, Unified Timeline

### Community 37 - "9. Module 6.5 — Sales Script Architect"
Cohesion: 0.29
Nodes (7): 9. Module 6.5 — Sales Script Architect, Automated Features, Contextual Script Generation, Manual Override, Messaging Templates, Priority, Purpose

### Community 38 - "requireAuthenticatedUser"
Cohesion: 0.17
Nodes (18): dynamic, POST(), dynamic, GET(), POST(), POST(), POST(), DELETE() (+10 more)

### Community 39 - "useClientAccount"
Cohesion: 0.13
Nodes (19): AgentLayout(), AssessmentForm, CompanyForm, DealForm, Lead, LeadsPage(), PersistedContact, PersistedLeadAnalysis (+11 more)

### Community 40 - "contact-sync-service.ts"
Cohesion: 0.14
Nodes (19): dynamic, PATCH(), dynamic, GET(), getCrmAdapter, listInteractions(), auditSourceForProvider(), ContactUpdateInput (+11 more)

### Community 41 - "AdminWorkspacePage.tsx"
Cohesion: 0.09
Nodes (3): AdminManageProps, AdminView, headings

### Community 42 - "phase10-system-test.cjs"
Cohesion: 0.17
Nodes (20): assert(), { createHash, randomBytes }, createStoredTestSession(), { encryptIntegrationSecret, decryptIntegrationSecret }, expectError(), expectSuccess(), { File }, fs (+12 more)

### Community 43 - "stage2-6-sales-crm-test.cjs"
Cohesion: 0.11
Nodes (17): assert(), calls, { encryptIntegrationSecret, decryptIntegrationSecret }, fs, ids, { listInteractions }, main(), Module (+9 more)

### Community 44 - "MultiCrmCard.tsx"
Cohesion: 0.17
Nodes (15): CommunicationIdentity, Contact, SmartDialerPage(), Analysis, Channel, Contact, Script, ScriptsPage() (+7 more)

### Community 45 - "canonical.ts"
Cohesion: 0.15
Nodes (13): AuditEvent, globalForPrisma, prisma, directions, types, CanonicalContact, CrmConnectionSummary, CrmProvider (+5 more)

### Community 46 - "hubspot-sales-sync-service.ts"
Cohesion: 0.23
Nodes (19): activityDirection(), activityPlainText(), activityText(), applyContactAssociations(), CategoryCounts, clean(), Counts, dealStatus() (+11 more)

### Community 47 - "calendar/page.tsx"
Cohesion: 0.18
Nodes (18): addDays(), Appointment, blankForm(), CalendarPage(), Contact, contactName(), displayDateTime(), displayTime() (+10 more)

### Community 48 - "prepareActiveClientSync"
Cohesion: 0.23
Nodes (18): listLeadAnalyses(), createManualInteraction(), cents(), commissionStatus(), contactFor(), contactSelection, createManualCommission(), createManualTimeLog() (+10 more)

### Community 49 - "document-service.ts"
Cohesion: 0.23
Nodes (15): createManualDocument(), documentContext(), documentInclude, DocumentKind, DocumentStatus, editableKinds, generatedDocument(), generateDocument() (+7 more)

### Community 51 - "sales-crm-service.ts"
Cohesion: 0.27
Nodes (12): activeClientIntegrationWhere(), isSyncableConnectionStatus(), SYNCABLE_CONNECTION_STATUSES, getIntegrationAdapter(), dateValue(), Input, nullableText(), retryActiveClientCompanySync() (+4 more)

### Community 52 - "documents/page.tsx"
Cohesion: 0.21
Nodes (12): Analysis, blankForm(), Contact, contactName(), Deal, DocumentRecord, DocumentSource, DocumentsPage() (+4 more)

### Community 53 - "(agent)/operations/page.tsx"
Cohesion: 0.21
Nodes (12): Commission, CommissionStatus, Contact, contactName(), dateTime(), LedgerEntry, LedgerType, money() (+4 more)

### Community 54 - "Post-MVP Development Plan"
Cohesion: 0.17
Nodes (11): Post-MVP Development Plan, Stage 1 — Lead & CRM Refinement, Stage 2.5 — Generic Integration Framework & HubSpot OAuth, Stage 2.6 — HubSpot Sales CRM Expansion, Stage 2 — Authentication & RBAC, Stage 2 workspace correction — completed, Stage 3 — UI / UX Refinement, Stage 4 — Real Integrations (+3 more)

### Community 55 - "recordAuditEvent"
Cohesion: 0.26
Nodes (9): activeContact(), AnalysisInput, analyzeTranscript(), createLeadAnalysis(), firstMatch(), updateLeadAnalysis(), recordAuditEvent(), AppError (+1 more)

### Community 56 - "19. MVP Implementation Order"
Cohesion: 0.18
Nodes (11): 19. MVP Implementation Order, Phase 10 — Integration & System Testing, Phase 1 — Foundation, Phase 2 — Multi-CRM Sync Engine, Phase 3 — Unified Interaction Aggregator, Phase 4 — VoIP & SMS Identity Gateway, Phase 5 — AI Intelligence, Phase 6 — Sales Script Architect (+3 more)

### Community 57 - "communication-service.ts"
Cohesion: 0.27
Nodes (9): dynamic, POST(), CommunicationKind, dispatchCommunication(), DispatchInput, DispatchMode, normalizePhone(), sendWithTwilio() (+1 more)

### Community 58 - "sales-script-service.ts"
Cohesion: 0.27
Nodes (9): dynamic, POST(), Channel, contextFor(), createManualSalesScript(), generatedContent(), generateSalesScript(), ScriptInput (+1 more)

### Community 59 - "timeline/page.tsx"
Cohesion: 0.22
Nodes (9): ContactOption, emptyInteractionForm(), FieldDiff, InteractionDirection, InteractionFormValues, InteractionType, mockEvents, TimelineEvent (+1 more)

### Community 60 - "(agent)/integrations/page.tsx"
Cohesion: 0.31
Nodes (5): formatDate(), IntegrationPayload, IntegrationsAppCenter(), statusTone(), IntegrationConnectionSummary

### Community 61 - "MultiCrmCard"
Cohesion: 0.29
Nodes (7): Analysis, Contact, CopilotPage(), EditableAnalysis, editableFrom(), Interaction, MultiCrmCard()

### Community 62 - "[...path]/route.ts"
Cohesion: 0.25
Nodes (6): DELETE, dynamic, GET, PATCH, POST, PUT

### Community 63 - "10. Module 6.6 — Commission & Financial Tracker"
Cohesion: 0.29
Nodes (7): 10. Module 6.6 — Commission & Financial Tracker, Automated Features, Manual Override, Payout Analytics, Pipeline Visibility, Priority, Purpose

### Community 64 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, start, test:stage2.6, test:system

### Community 65 - "history/route.ts"
Cohesion: 0.33
Nodes (5): GET(), dynamic, GET(), downloadDocument(), getActiveClientSyncHistory()

### Community 66 - "MVP_PROGRESS.md"
Cohesion: 0.33
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Post-MVP Stage 2 RBAC Workspace Correction - Status

### Community 67 - "import/route.ts"
Cohesion: 0.53
Nodes (5): dynamic, GET(), handleManualSync(), POST(), syncActiveClientContacts()

### Community 68 - "Stage 2.7 - Status"
Cohesion: 0.33
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Stage 2.7 - Status

### Community 69 - "Q: Trace the existing authentication, RBAC, route layouts, sidebar, and Admin-Agent workspace dependencies for the Stage 2 correction."
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Trace the existing authentication, RBAC, route layouts, sidebar, and Admin-Agent workspace dependencies for the Stage 2 correction., Source Nodes

### Community 70 - "Phase 1 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Phase 1 - Status

### Community 71 - "Phase 4 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Phase 4 - Status

### Community 72 - "Phase 5 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Phase 5 - Status

### Community 73 - "Phase 6 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Phase 6 - Status

### Community 74 - "Phase 7 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Phase 7 - Status

### Community 75 - "Phase 8 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Phase 8 - Status

### Community 76 - "Phase 9 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Phase 9 - Status

### Community 77 - "Phase 10 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Phase 10 - Status

### Community 78 - "Post-MVP Stage 1 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Post-MVP Stage 1 - Status

### Community 79 - "Post-MVP Stage 2 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Post-MVP Stage 2 - Status

### Community 80 - "Phase 2 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Phase 2 - Status

### Community 81 - "Post-MVP Stage 2.5 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Post-MVP Stage 2.5 - Status

### Community 82 - "Post-MVP Stage 2.6 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Post-MVP Stage 2.6 - Status

### Community 83 - "Phase 3 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Phase 3 - Status

### Community 84 - "package.json"
Cohesion: 0.50
Nodes (3): name, private, version

### Community 85 - "contacts/[id]/sync/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, POST(), retryActiveClientContactOutboundSync()

### Community 86 - "scripts/[id]/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, PATCH(), updateSalesScript()

### Community 87 - "dateTime"
Cohesion: 0.50
Nodes (4): AuditRows(), dateTime(), OperationsView(), SyncRunCard()

### Community 88 - "AdminWorkspaceShell.tsx"
Cohesion: 0.50
Nodes (3): AdminWorkspaceContext, navigation, useAdminWorkspaceUser()

### Community 89 - "money"
Cohesion: 0.67
Nodes (3): CommissionsView(), Metrics(), money()

## Knowledge Gaps
- **462 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+457 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MultiCrmCard()` connect `MultiCrmCard` to `integration-service.ts`, `app/layout.tsx`, `useClientAccount`, `AdminWorkspacePage.tsx`, `MultiCrmCard.tsx`, `calendar/page.tsx`, `documents/page.tsx`, `(agent)/operations/page.tsx`, `timeline/page.tsx`, `(agent)/integrations/page.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `withApiErrorHandling()` connect `withApiErrorHandling` to `integration-service.ts`, `history/route.ts`, `import/route.ts`, `requireAuthenticatedUser`, `contact-sync-service.ts`, `request-context.ts`, `calendar-service.ts`, `admin-service.ts`, `contacts/[id]/sync/route.ts`, `scripts/[id]/route.ts`, `communication-service.ts`, `sales-script-service.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _462 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `integration-service.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09268707482993198 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07084785133565621 - nodes in this community are weakly interconnected._