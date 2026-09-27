# Graph Report - Multi-crm-orchestrator  (2026-09-26)

## Corpus Check
- 196 files · ~131,022 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1295 nodes · 2749 edges · 119 communities (96 shown, 23 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2444c8b4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- copilot/page.tsx
- dependencies
- compilerOptions
- app/layout.tsx
- devDependencies
- hubspot/client.ts
- mvp.md
- Design Audit
- 5. Module 6.1 — Multi-CRM Sync Engine
- System Architecture
- withApiErrorHandling
- integration-service.ts
- TiltCard.tsx
- calendar-service.ts
- eslint.config.mjs
- compilerOptions
- postcss.config.mjs
- success
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
- client-crm/sync/route.ts
- MultiCrmCard.tsx
- contact-sync-service.ts
- AdminWorkspacePage.tsx
- phase10-system-test.cjs
- stage2-6-sales-crm-test.cjs
- scripts/page.tsx
- prisma.ts
- request-context.ts
- calendar/page.tsx
- recordAuditEvent
- document-service.ts
- AdminWorkspacePage
- hubspot-sales-sync-service.ts
- documents/page.tsx
- (agent)/operations/page.tsx
- Post-MVP Development Plan
- auth-service.ts
- 19. MVP Implementation Order
- app-error.ts
- canonical.ts
- timeline/page.tsx
- (agent)/integrations/page.tsx
- Stage 2.7 - Status
- [...path]/route.ts
- 10. Module 6.6 — Commission & Financial Tracker
- scripts
- check-axel-deals.cjs
- Post-MVP Stage 2 RBAC Workspace Correction - Status
- stage2-7-agency-client-crm-test.cjs
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
- MVP_PROGRESS.md
- Post-MVP Stage 2.6 - Status
- Phase 3 - Status
- package.json
- stage2-8-agency-hubspot-zoho-client-crm-test.cjs
- MultiCrmInnerPanel
- dateTime
- commissions/route.ts
- money
- admin-types.ts
- documents/route.ts
- react-dom
- useClientAccount
- three
- identities/route.ts
- time-logs/route.ts
- AdminWorkspaceShell.tsx
- CalendarAdapter
- prepareActiveClientSync
- events/route.ts
- contacts/[id]/route.ts
- contacts/[id]/sync/route.ts
- companies/[id]/route.ts
- companies/[id]/sync/route.ts
- lucide-react
- tailwind-merge
- deals/[id]/route.ts
- deals/[id]/sync/route.ts
- download/route.ts
- templates/route.ts
- history/route.ts

## God Nodes (most connected - your core abstractions)
1. `withApiErrorHandling()` - 117 edges
2. `success()` - 104 edges
3. `requireRequestContext()` - 78 edges
4. `prepareActiveClientSync()` - 46 edges
5. `recordAuditEvent()` - 42 edges
6. `requireAuthenticatedUser()` - 39 edges
7. `AppError` - 29 edges
8. `useClientAccount()` - 25 edges
9. `assertClientAccess()` - 23 edges
10. `isAdminWorkspaceRole()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Architecture Essentials` --semantically_similar_to--> `System Architecture`  [EXTRACTED] [semantically similar]
  ArchitectureEssentials.md → Architecture.md
- `Product Requirements Document` --references--> `System Architecture`  [INFERRED]
  Prod.md → Architecture.md
- `ClientCrmPage()` --calls--> `useClientAccount()`  [EXTRACTED]
  src/app/(agent)/client-crm/page.tsx → src/context/ClientAccountContext.tsx
- `AgentLayout()` --calls--> `requireAgentWorkspaceUser()`  [EXTRACTED]
  src/app/(agent)/layout.tsx → src/lib/auth/server-workspace.ts
- `LeadsPage()` --calls--> `useClientAccount()`  [EXTRACTED]
  src/app/(agent)/leads/page.tsx → src/context/ClientAccountContext.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Platform Layers** — architecture_frontend, architecture_backend, architecture_integration_layer, architecture_data_layer [EXTRACTED 1.00]
- **CRM Integration Pattern** — crm_adapter_interface, architecture_integration_layer, unified_data_model [EXTRACTED 1.00]
- **Static Assets** — public_file_svg, public_globe_svg, public_next_svg, public_vercel_svg, public_window_svg [INFERRED 0.90]

## Communities (119 total, 23 thin omitted)

### Community 0 - "copilot/page.tsx"
Cohesion: 0.33
Nodes (6): Analysis, Contact, CopilotPage(), EditableAnalysis, editableFrom(), Interaction

### Community 1 - "dependencies"
Cohesion: 0.11
Nodes (19): clsx, framer-motion, next, dependencies, clsx, framer-motion, next, pg (+11 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (29): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+21 more)

### Community 3 - "app/layout.tsx"
Cohesion: 0.10
Nodes (21): geistMono, geistSans, metadata, AdvancedWidget(), MainView, ThemeSubView, AuroraShader, ParticleWaveBackground() (+13 more)

### Community 4 - "devDependencies"
Cohesion: 0.10
Nodes (21): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, prisma, tailwindcss, @tailwindcss/postcss (+13 more)

### Community 5 - "hubspot/client.ts"
Cohesion: 0.07
Nodes (43): activeCampaignAdapter, hubSpotContactAdapter, associationIds(), fetchAllObjects(), fetchAllOwners(), fetchHubSpotContacts(), fetchHubSpotSalesCrm(), hubSpotHeaders() (+35 more)

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
Cohesion: 0.09
Nodes (33): POST(), PATCH(), POST(), dynamic, PATCH(), dynamic, GET(), PATCH() (+25 more)

### Community 11 - "integration-service.ts"
Cohesion: 0.05
Nodes (83): GET(), GET(), POST(), assertClientAccess(), isAdminWorkspaceRole(), formatClientCrmRecord(), listClientCrmRecords(), syncClientCrm() (+75 more)

### Community 13 - "calendar-service.ts"
Cohesion: 0.17
Nodes (19): adapters, calendarAdapterFor(), CalendarAdapterInput, CalendarAdapterResult, mockCalendarAdapter, SupportedCalendarProvider, AppointmentInput, AppointmentStatus (+11 more)

### Community 15 - "compilerOptions"
Cohesion: 0.06
Nodes (31): nextConfig, .next, compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules (+23 more)

### Community 17 - "success"
Cohesion: 0.15
Nodes (23): dynamic, PATCH(), dynamic, GET(), POST(), dynamic, GET(), dynamic (+15 more)

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

### Community 39 - "MultiCrmCard.tsx"
Cohesion: 0.13
Nodes (14): ClientCrmPage(), DealHandoffTarget, TabType, AssessmentForm, CompanyForm, DealForm, Lead, LeadsPage() (+6 more)

### Community 40 - "contact-sync-service.ts"
Cohesion: 0.15
Nodes (19): getCrmAdapter, listInteractions(), auditSourceForProvider(), ContactUpdateInput, getActiveClientContacts(), getActiveClientSyncHistory(), getUnifiedLeads(), normalizeContactUpdate() (+11 more)

### Community 41 - "AdminWorkspacePage.tsx"
Cohesion: 0.09
Nodes (3): AdminManageProps, AdminView, headings

### Community 42 - "phase10-system-test.cjs"
Cohesion: 0.17
Nodes (20): assert(), { createHash, randomBytes }, createStoredTestSession(), { encryptIntegrationSecret, decryptIntegrationSecret }, expectError(), expectSuccess(), { File }, fs (+12 more)

### Community 43 - "stage2-6-sales-crm-test.cjs"
Cohesion: 0.11
Nodes (17): assert(), calls, { encryptIntegrationSecret, decryptIntegrationSecret }, fs, ids, { listInteractions }, main(), Module (+9 more)

### Community 44 - "scripts/page.tsx"
Cohesion: 0.16
Nodes (13): CommunicationIdentity, Contact, SmartDialerPage(), Analysis, Channel, Contact, Script, ScriptsPage() (+5 more)

### Community 45 - "prisma.ts"
Cohesion: 0.13
Nodes (16): AuditEvent, CommunicationKind, dispatchCommunication(), DispatchInput, DispatchMode, listCommunicationIdentities(), normalizePhone(), sendWithTwilio() (+8 more)

### Community 46 - "request-context.ts"
Cohesion: 0.14
Nodes (12): dynamic, POST(), dynamic, dynamic, GET(), dynamic, dynamic, PATCH() (+4 more)

### Community 47 - "calendar/page.tsx"
Cohesion: 0.18
Nodes (18): addDays(), Appointment, blankForm(), CalendarPage(), Contact, contactName(), displayDateTime(), displayTime() (+10 more)

### Community 48 - "recordAuditEvent"
Cohesion: 0.31
Nodes (14): recordAuditEvent(), cents(), commissionStatus(), contactFor(), contactSelection, createManualCommission(), createManualTimeLog(), currency() (+6 more)

### Community 49 - "document-service.ts"
Cohesion: 0.23
Nodes (15): createManualDocument(), documentContext(), documentInclude, DocumentKind, DocumentStatus, editableKinds, generatedDocument(), generateDocument() (+7 more)

### Community 51 - "hubspot-sales-sync-service.ts"
Cohesion: 0.21
Nodes (20): ContactSyncSummary, activityDirection(), activityPlainText(), activityText(), applyContactAssociations(), CategoryCounts, clean(), Counts (+12 more)

### Community 52 - "documents/page.tsx"
Cohesion: 0.21
Nodes (12): Analysis, blankForm(), Contact, contactName(), Deal, DocumentRecord, DocumentSource, DocumentsPage() (+4 more)

### Community 53 - "(agent)/operations/page.tsx"
Cohesion: 0.21
Nodes (12): Commission, CommissionStatus, Contact, contactName(), dateTime(), LedgerEntry, LedgerType, money() (+4 more)

### Community 54 - "Post-MVP Development Plan"
Cohesion: 0.17
Nodes (11): Post-MVP Development Plan, Stage 1 — Lead & CRM Refinement, Stage 2.5 — Generic Integration Framework & HubSpot OAuth, Stage 2.6 — HubSpot Sales CRM Expansion, Stage 2 — Authentication & RBAC, Stage 2 workspace correction — completed, Stage 3 — UI / UX Refinement, Stage 4 — Real Integrations (+3 more)

### Community 55 - "auth-service.ts"
Cohesion: 0.08
Nodes (43): AdminLayout(), dynamic, POST(), dynamic, POST(), AuthLayout(), LoginPage(), AdminWorkspaceShell() (+35 more)

### Community 56 - "19. MVP Implementation Order"
Cohesion: 0.18
Nodes (11): 19. MVP Implementation Order, Phase 10 — Integration & System Testing, Phase 1 — Foundation, Phase 2 — Multi-CRM Sync Engine, Phase 3 — Unified Interaction Aggregator, Phase 4 — VoIP & SMS Identity Gateway, Phase 5 — AI Intelligence, Phase 6 — Sales Script Architect (+3 more)

### Community 57 - "app-error.ts"
Cohesion: 0.23
Nodes (9): activeContact(), AnalysisInput, analyzeTranscript(), createLeadAnalysis(), firstMatch(), listLeadAnalyses(), updateLeadAnalysis(), AppError (+1 more)

### Community 58 - "canonical.ts"
Cohesion: 0.11
Nodes (27): createDealHandoffFromAgencyDeal(), CreateHandoffOptions, dispatchHandoffToClientCrm(), formatHandoff(), listDealHandoffs(), retryDealHandoff(), activeClientIntegrationWhere(), hubspotConnectionWhere() (+19 more)

### Community 59 - "timeline/page.tsx"
Cohesion: 0.22
Nodes (9): ContactOption, emptyInteractionForm(), FieldDiff, InteractionDirection, InteractionFormValues, InteractionType, mockEvents, TimelineEvent (+1 more)

### Community 60 - "(agent)/integrations/page.tsx"
Cohesion: 0.31
Nodes (5): formatDate(), IntegrationPayload, IntegrationsAppCenter(), statusTone(), IntegrationConnectionSummary

### Community 61 - "Stage 2.7 - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Stage 2.7 - Status

### Community 62 - "[...path]/route.ts"
Cohesion: 0.25
Nodes (6): DELETE, dynamic, GET, PATCH, POST, PUT

### Community 63 - "10. Module 6.6 — Commission & Financial Tracker"
Cohesion: 0.29
Nodes (7): 10. Module 6.6 — Commission & Financial Tracker, Automated Features, Manual Override, Payout Analytics, Pipeline Visibility, Priority, Purpose

### Community 64 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, start, test:stage2.6, test:stage2.7, test:stage2.8 (+1 more)

### Community 65 - "check-axel-deals.cjs"
Cohesion: 0.25
Nodes (6): adapter, dotenv, path, prisma, { PrismaClient }, { PrismaPg }

### Community 66 - "Post-MVP Stage 2 RBAC Workspace Correction - Status"
Cohesion: 0.40
Nodes (5): Completed, In Progress, Notes / Decisions, Pending, Post-MVP Stage 2 RBAC Workspace Correction - Status

### Community 67 - "stage2-7-agency-client-crm-test.cjs"
Cohesion: 0.12
Nodes (17): { activeCampaignAdapter }, { agencyIntegrationWhere, clientIntegrationWhere }, assert(), { createDealHandoffFromAgencyDeal, dispatchHandoffToClientCrm, retryDealHandoff, listDealHandoffs }, { encryptIntegrationSecret, decryptIntegrationSecret }, { fetchActiveCampaignRecords }, fs, { getActiveClientContacts } (+9 more)

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

### Community 81 - "MVP_PROGRESS.md"
Cohesion: 0.33
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

### Community 85 - "stage2-8-agency-hubspot-zoho-client-crm-test.cjs"
Cohesion: 0.12
Nodes (17): { agencyIntegrationWhere, clientIntegrationWhere }, assert(), { connectZoho }, { createDealHandoffFromAgencyDeal, dispatchHandoffToClientCrm, retryDealHandoff, listDealHandoffs }, { encryptIntegrationSecret, decryptIntegrationSecret }, { fetchZohoRecords, syncHandoffToZoho, resolveZohoCredentials, createOrUpdateZohoRecord }, fs, { getActiveClientContacts } (+9 more)

### Community 86 - "MultiCrmInnerPanel"
Cohesion: 0.23
Nodes (8): initialCrmStatuses, recentActivity, stats, GlassCard(), GlassCardProps, MetricWidget(), MetricWidgetProps, MultiCrmInnerPanel()

### Community 87 - "dateTime"
Cohesion: 0.50
Nodes (4): AuditRows(), dateTime(), OperationsView(), SyncRunCard()

### Community 88 - "commissions/route.ts"
Cohesion: 0.25
Nodes (6): dynamic, GET(), POST(), dynamic, POST(), listSalesOperations()

### Community 89 - "money"
Cohesion: 0.67
Nodes (3): CommissionsView(), Metrics(), money()

### Community 91 - "documents/route.ts"
Cohesion: 0.50
Nodes (4): dynamic, GET(), POST(), listDocuments()

### Community 93 - "useClientAccount"
Cohesion: 0.25
Nodes (9): AgentLayout(), ClientAccountSwitcher(), ClientLayoutWrapper(), Sidebar(), workspaceNavigation, ClientAccountContext, ClientAccountProvider(), pendingAccount (+1 more)

### Community 96 - "time-logs/route.ts"
Cohesion: 0.50
Nodes (4): dynamic, GET(), POST(), listTimeLogs()

### Community 101 - "AdminWorkspaceShell.tsx"
Cohesion: 0.50
Nodes (3): AdminWorkspaceContext, navigation, useAdminWorkspaceUser()

### Community 103 - "prepareActiveClientSync"
Cohesion: 0.21
Nodes (15): dynamic, GET(), handleManualSync(), POST(), Channel, contextFor(), createManualSalesScript(), generatedContent() (+7 more)

## Knowledge Gaps
- **551 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+546 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GlassCard()` connect `MultiCrmInnerPanel` to `app/layout.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `MultiCrmCard()` connect `MultiCrmCard.tsx` to `copilot/page.tsx`, `AdminWorkspacePage.tsx`, `scripts/page.tsx`, `calendar/page.tsx`, `documents/page.tsx`, `(agent)/operations/page.tsx`, `MultiCrmInnerPanel`, `auth-service.ts`, `timeline/page.tsx`, `(agent)/integrations/page.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `MultiCrmInnerPanel()` connect `MultiCrmInnerPanel` to `copilot/page.tsx`, `MultiCrmCard.tsx`, `AdminWorkspacePage.tsx`, `scripts/page.tsx`, `calendar/page.tsx`, `documents/page.tsx`, `(agent)/operations/page.tsx`, `timeline/page.tsx`, `(agent)/integrations/page.tsx`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _551 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `app/layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0967741935483871 - nodes in this community are weakly interconnected._