# Graph Report - Multi-crm-orchestrator  (2026-08-17)

## Corpus Check
- 41 files · ~45,362 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 203 nodes · 233 edges · 25 communities (19 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1ee50e78`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- MultiCrmCard.tsx
- dependencies
- compilerOptions
- devDependencies
- (dashboard)/page.tsx
- layout.tsx
- SpatialContext.tsx
- include
- System Architecture
- package.json
- dialer/page.tsx
- integrations/page.tsx
- TiltCard.tsx
- middleware.ts
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Network Background Image

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `MultiCrmCard()` - 10 edges
3. `MultiCrmInnerPanel()` - 7 edges
4. `MultiCrmTag()` - 7 edges
5. `include` - 7 edges
6. `System Architecture` - 7 edges
7. `scripts` - 5 edges
8. `GlassCard()` - 4 edges
9. `ROUTE_SPATIAL_MAP` - 4 edges
10. `lib` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Architecture Essentials` --semantically_similar_to--> `System Architecture`  [EXTRACTED] [semantically similar]
  ArchitectureEssentials.md → Architecture.md
- `Product Requirements Document` --references--> `System Architecture`  [INFERRED]
  Prod.md → Architecture.md
- `Integration Layer` --references--> `CRMAdapter Interface`  [EXTRACTED]
  Architecture.md → ArchitectureEssentials.md
- `AdvancedWidget()` --calls--> `useTheme()`  [EXTRACTED]
  src/components/AdvancedWidget.tsx → src/context/ThemeContext.tsx
- `SpatialContextType` --references--> `SpatialCoordinates`  [EXTRACTED]
  src/context/SpatialContext.tsx → src/config/spatialMap.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Core Platform Layers** — architecture_frontend, architecture_backend, architecture_integration_layer, architecture_data_layer [EXTRACTED 1.00]
- **CRM Integration Pattern** — crm_adapter_interface, architecture_integration_layer, unified_data_model [EXTRACTED 1.00]

## Communities (25 total, 6 thin omitted)

### Community 0 - "MultiCrmCard.tsx"
Cohesion: 0.08
Nodes (21): CalendarEvent, daysOfWeek, sampleEvents, timeSlots, BantState, BRANDS, ChatMessage, initialBant (+13 more)

### Community 1 - "dependencies"
Cohesion: 0.10
Nodes (21): clsx, framer-motion, lucide-react, next, dependencies, clsx, framer-motion, lucide-react (+13 more)

### Community 2 - "compilerOptions"
Cohesion: 0.10
Nodes (20): dom, dom.iterable, esnext, compilerOptions, allowJs, baseUrl, esModuleInterop, incremental (+12 more)

### Community 3 - "devDependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 4 - "(dashboard)/page.tsx"
Cohesion: 0.17
Nodes (11): initialCrmStatuses, recentActivity, stats, AdvancedWidget(), MainView, ThemeSubView, GlassCard(), GlassCardProps (+3 more)

### Community 5 - "layout.tsx"
Cohesion: 0.17
Nodes (11): metadata, ClientLayoutWrapper(), ParticleWaveBackground(), navigation, Sidebar(), THEME_PRESETS, ThemeColors, ThemeContext (+3 more)

### Community 6 - "SpatialContext.tsx"
Cohesion: 0.24
Nodes (7): AuroraShader, DEFAULT_COORDINATES, ROUTE_SPATIAL_MAP, SpatialCoordinates, SpatialContext, SpatialContextType, SpatialProvider()

### Community 7 - "include"
Cohesion: 0.20
Nodes (9): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude (+1 more)

### Community 8 - "System Architecture"
Cohesion: 0.31
Nodes (9): Backend API Layer, Data Layer, Frontend Layer, Integration Layer, System Architecture, Architecture Essentials, CRMAdapter Interface, Product Requirements Document (+1 more)

### Community 9 - "package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, build, dev, lint, start, version

### Community 10 - "dialer/page.tsx"
Cohesion: 0.25
Nodes (6): brandIntegrations, CallTranscript, FieldMapping, initialMappings, initialTranscripts, recentCalls

### Community 11 - "integrations/page.tsx"
Cohesion: 0.33
Nodes (4): AppItem, categories, iconMap, initialApps

## Knowledge Gaps
- **102 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+97 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MultiCrmCard()` connect `MultiCrmCard.tsx` to `dialer/page.tsx`, `(dashboard)/page.tsx`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _102 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `MultiCrmCard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08095238095238096 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._