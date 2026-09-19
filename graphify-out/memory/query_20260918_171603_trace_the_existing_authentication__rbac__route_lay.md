---
type: "query"
date: "2026-09-18T17:16:03.674190+00:00"
question: "Trace the existing authentication, RBAC, route layouts, sidebar, and Admin-Agent workspace dependencies for the Stage 2 correction."
contributor: "graphify"
outcome: "useful"
source_nodes: ["layout.tsx", "ClientLayoutWrapper.tsx", "Sidebar.tsx"]
---

# Q: Trace the existing authentication, RBAC, route layouts, sidebar, and Admin-Agent workspace dependencies for the Stage 2 correction.

## Answer

Expanded from original query via graph vocabulary: authentication, user, agent, agents, account, client, layout, route, sidebar. The graph identified src/app/layout.tsx, src/components/ClientLayoutWrapper.tsx, and src/components/Sidebar.tsx as the shared shell path. Direct source inspection confirmed the newer AuthSession and admin-service nodes were not yet represented in the graph: the root globally mounted ClientAccountProvider, the dashboard layout wrapped both Agent pages and /admin, and Sidebar conditionally injected Admin navigation. The correction should preserve request-context/API authorization while adding server role guards and separate route-group layouts.

## Outcome

- Signal: useful

## Source Nodes

- layout.tsx
- ClientLayoutWrapper.tsx
- Sidebar.tsx