# Graph Report - Multi-crm-orchestrator  (2026-08-21)

## Corpus Check
- 48 files · ~54,077 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 391 nodes · 423 edges · 38 communities (32 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3f7159ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MultiCrmCard.tsx
- dependencies
- compilerOptions
- layout.tsx
- devDependencies
- mapper.ts
- mvp.md
- Design Audit
- 5. Module 6.1 — Multi-CRM Sync Engine
- System Architecture
- 17. What We MUST NOT Compromise On
- integrations/page.tsx
- TiltCard.tsx
- middleware.ts
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `19. MVP Implementation Order` - 11 edges
3. `17. What We MUST NOT Compromise On` - 11 edges
4. `MultiCrmCard()` - 10 edges
5. `Design Audit` - 10 edges
6. `21. MVP Completion Criteria` - 10 edges
7. `MultiCrmInnerPanel()` - 7 edges
8. `MultiCrmTag()` - 7 edges
9. `include` - 7 edges
10. `System Architecture` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Architecture Essentials` --semantically_similar_to--> `System Architecture`  [EXTRACTED] [semantically similar]
  ArchitectureEssentials.md → Architecture.md
- `Product Requirements Document` --references--> `System Architecture`  [INFERRED]
  Prod.md → Architecture.md
- `Integration Layer` --references--> `CRMAdapter Interface`  [EXTRACTED]
  Architecture.md → ArchitectureEssentials.md
- `GET()` --indirect_call--> `mapHubSpotContactToNormalized()`  [INFERRED]
  src/app/api/contacts/import/route.ts → src/lib/integrations/hubspot/mapper.ts
- `GET()` --calls--> `fetchHubSpotContacts()`  [EXTRACTED]
  src/app/api/contacts/import/route.ts → src/lib/integrations/hubspot/client.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Platform Layers** — architecture_frontend, architecture_backend, architecture_integration_layer, architecture_data_layer [EXTRACTED 1.00]
- **CRM Integration Pattern** — crm_adapter_interface, architecture_integration_layer, unified_data_model [EXTRACTED 1.00]
- **Static Assets** — public_file_svg, public_globe_svg, public_next_svg, public_vercel_svg, public_window_svg [INFERRED 0.90]

## Communities (38 total, 6 thin omitted)

### Community 0 - "MultiCrmCard.tsx"
Cohesion: 0.05
Nodes (35): CalendarEvent, daysOfWeek, sampleEvents, timeSlots, BantState, BRANDS, ChatMessage, initialBant (+27 more)

### Community 1 - "dependencies"
Cohesion: 0.10
Nodes (21): clsx, framer-motion, lucide-react, next, dependencies, clsx, framer-motion, lucide-react (+13 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 3 - "layout.tsx"
Cohesion: 0.09
Nodes (24): geistMono, geistSans, metadata, AdvancedWidget(), MainView, ThemeSubView, ClientLayoutWrapper(), AuroraShader (+16 more)

### Community 4 - "devDependencies"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+17 more)

### Community 5 - "mapper.ts"
Cohesion: 0.29
Nodes (7): GET(), fetchHubSpotContacts(), mapHubSpotContactToNormalized(), HubSpotContactProperties, HubSpotContactRecord, HubSpotContactsApiResponse, NormalizedContact

### Community 6 - "mvp.md"
Cohesion: 0.06
Nodes (31): 10. Module 6.6 — Commission & Financial Tracker, 14. Cross-Module Data Architecture, 15. Core Canonical Models, 16. API / Backend Requirements, 17. Error Handling and Failsafe Requirements, 18. Auditability, 19. MVP Implementation Order, 1. Purpose (+23 more)

### Community 7 - "Design Audit"
Cohesion: 0.10
Nodes (19): Code Quality, Color and Surfaces, Component Patterns, Content, Design Audit, Fix Priority, How This Works, Iconography (+11 more)

### Community 8 - "5. Module 6.1 — Multi-CRM Sync Engine"
Cohesion: 0.18
Nodes (11): 5. Module 6.1 — Multi-CRM Sync Engine, Atomic / Consistency Requirements, Automated Features, Bi-Directional Sync, Data Normalization, Duplicate Prevention, Manual Override, Multi-CRM Support (+3 more)

### Community 9 - "System Architecture"
Cohesion: 0.31
Nodes (9): Backend API Layer, Data Layer, Frontend Layer, Integration Layer, System Architecture, Architecture Essentials, CRMAdapter Interface, Product Requirements Document (+1 more)

### Community 10 - "17. What We MUST NOT Compromise On"
Cohesion: 0.18
Nodes (11): 10. The application must actually use a real CRM API, 17. What We MUST NOT Compromise On, 1. No hardcoded secrets, 2. Frontend must not directly call the CRM, 3. Do not expose raw CRM structures to the frontend, 4. Keep CRM-specific logic isolated, 5. Do not break existing functionality, 6. Minimal frontend modifications (+3 more)

### Community 11 - "integrations/page.tsx"
Cohesion: 0.33
Nodes (4): AppItem, categories, iconMap, initialApps

### Community 22 - "poc.md"
Cohesion: 0.06
Nodes (32): 10. Authentication / Credentials, 11. Pagination, 12. Frontend — MINIMAL CHANGES ONLY, 13. Suggested User Experience, 14. Error Handling, 15. Logging, 16. Database — Do Not Overengineer, 18. Testing (+24 more)

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

## Knowledge Gaps
- **242 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+237 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `GlassCard()` connect `MultiCrmCard.tsx` to `layout.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _242 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MultiCrmCard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05194805194805195 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08571428571428572 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._