# Feature: Interactive 3D Portfolio Showcase

## 1. Goal

Turn case studies into explorable machines. Each project is an n8n pipeline rendered in 3D; visitors (or the AI agent) can **explode** it to see every node, its type, and the data flowing between them, alongside live-looking metrics.

## 2. User stories

| ID | As a… | I want… | Acceptance |
|----|-------|---------|------------|
| P-1 | visitor | to browse 3 featured automation projects | Tabs/cards list projects with title, client, key metric; first project loads in the 3D stage |
| P-2 | visitor | to explode a workflow | Toggle button / double-click / scroll animates nodes apart in ≤ 1.4 s; labels stay readable |
| P-3 | visitor | to inspect a node | Click selects node, camera focuses, side panel shows node name, n8n type, avg ms, role in pipeline |
| P-4 | visitor | to see results | Metric strip: avg execution time, failure rate (0%), nodes count, monthly runs, hours saved |
| P-5 | visitor on mobile / no WebGL | an equivalent experience | SVG fallback diagram with the same nodes/edges; explode = spacing animation |
| P-6 | AI agent | to show a project exploded on request | `trigger_3d_workflow(slug, mode)` selects + animates (see [state_management.md](../01_architecture/state_management.md)) |

## 3. Layout

```
┌──────────────── Portfolio · أعمالنا ────────────────┐
│ [Omnichannel Support] [Invoice Extractor] [Lead…]   │ ← project tabs (scrollable, RTL-aware)
│ ┌───────────────────────────────┐ ┌───────────────┐ │
│ │                               │ │ Node inspector│ │
│ │        3D WorkflowScene       │ │  • name/type  │ │
│ │                               │ │  • avg ms     │ │
│ │   [⇔ Explode] [⟲ Reset cam]   │ │  • description│ │
│ └───────────────────────────────┘ └───────────────┘ │
│ ⏱ 840 ms · ✓ 0% failures · ◇ 4 nodes · ↻ 120k/mo    │ ← metric strip (count-up animation)
│ Summary paragraph · Services used · [Live demo ↗]   │
└─────────────────────────────────────────────────────┘
```

Mobile: inspector becomes a bottom sheet; metrics become a 2×2 grid.

## 4. Seeded projects

| Slug | Pipeline (node kinds) | Highlight metrics |
|------|------------------------|-------------------|
| `omnichannel-support-sync` | Webhook (trigger) → Sentiment AI (ai) → Router (router) → Ticket Resolution (action) | 840 ms · 0% · 120k runs/mo · 310 h saved |
| `autonomous-invoice-extractor` | Email Trigger (trigger) → OCR Node (ai) → Postgres Save (storage) → WhatsApp Alert (action) | 2.1 s · 0% · 18k invoices/mo · 220 h saved |
| `lead-enrichment-engine` | Form Trigger (trigger) → Clearbit API (action) → Scoring Filter (router) → HubSpot CRM (action) | 620 ms · 0% · 45k leads/mo · 160 h saved |

Each seeds a full `workflow_metadata` (positions on a gentle arc, hand-tuned `exploded` offsets so nodes never overlap and labels face the camera).

## 5. Data flow

1. `app/[locale]/page.tsx` (Server Component) fetches `GET /projects?locale=…` (list incl. `workflow`).
2. `<PortfolioSection projects>` (client) renders tabs + dynamically imports `<WorkflowScene>`.
3. Selecting a tab → `useSceneStore.setActiveProject(slug)`; the scene swaps workflow with a 300 ms cross-fade (nodes scale 0 → 1, staggered).
4. Metric strip reads `project.metrics`; numbers count up when the section enters the viewport.

`useLocalizedWorkflow(workflow, locale)` mirrors X coordinates for RTL so data flows right → left in Arabic.

## 6. Node inspector content

| Field | Source |
|-------|--------|
| Title | `node.label` |
| Type badge | `node.n8nType` prettified (`n8n-nodes-base.webhook` → "Webhook") with kind icon |
| Avg duration | `node.stats.avgMs` (fallback "—") |
| Description | Static map `nodeTypeDescriptions[kind]` in messages (localized) |
| Connections | Incoming/outgoing node names from `edges` |

## 7. Analytics events (optional, privacy-friendly)

`portfolio_project_view`, `portfolio_explode` (`source: click|scroll|ai`), `portfolio_node_select`. Sent to a first-party endpoint only if analytics are enabled.

## 8. Acceptance tests

- Playwright: switching tabs changes the active scene (assert `data-active-project` attribute on stage).
- Playwright: clicking Explode sets `data-mode="exploded"` on the stage within 2 s.
- Playwright (WebGL disabled via launch flag): fallback SVG shows 4 nodes for each project.
- Vitest: `useLocalizedWorkflow` mirrors X for `ar` and leaves `en` unchanged.
