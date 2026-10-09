# Afaq frontend (Next.js 16)

Bilingual one-page site for Afaq Automation Agency: Arabic RTL (default) and English LTR, with Obsidian dark (default) and clean light themes. Content comes from the Laravel API, and the AI concierge drives the page through Zustand stores.

## Run (recommended on Windows/macOS: on the host)

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL / API_INTERNAL_URL → http://localhost:8000/api/v1
npm install
npm run dev                  # http://localhost:3000 → /ar
```

The backend (`docker compose up -d postgres redis backend queue nginx` from the repo root) must be running for content and the AI chat.

| Script | What |
|--------|------|
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Vitest (stores, SSE client, agent bridge, sections, 3D physics/camera/quality utils) |

## Layout

```
src/
├── app/[locale]/        root layout (html lang/dir, providers), page, not-found
├── proxy.ts             locale negotiation (next-intl)
├── i18n/                routing, request config (next/root-params), navigation
├── components/
│   ├── ui/              shared kit: Button, Card, Badge, Input/Textarea, Label, Dialog, Tooltip, Skeleton, Separator, Toaster, icons
│   ├── layout/          Container, SectionShell, SiteHeader, SiteFooter, ThemeToggle, LocaleSwitcher, SectionObserver
│   ├── sections/        Hero (+ 3D core), Services, Portfolio explorer, Team (+ CV dialog), Booking
│   ├── portfolio/       Workflow stage (3D ⇄ 2D), 2D diagram (SSR poster + fallback), step list, scroll reveal
│   ├── stage/           StageRoot (mounts the single background canvas), StageSlot (per-section 3D slot + poster)
│   ├── three/           single-canvas stage, procedural hardware kit, scenes (hero switch, rack, neural core, terminal), portfolio workflow
│   ├── assistant/       Copilot widget (launcher + lazy panel), markdown, composer, AgentActionRunner
│   ├── booking/         5-step booking & live estimator (react-hook-form + zod)
│   └── providers/       next-themes + tooltip providers
├── stores/              Zustand: scene (3D), agent (Copilot + action queue), ui
└── lib/                 api (client, cached content fetchers, SSE client, booking), agent (action schemas + runner),
                         hooks (media queries, WebGL/idle/viewport), theme palette for Three.js, utils
messages/{ar,en}.json    UI copy (type-checked keys)
```

Architecture notes: `docs/03_frontend_3d/theme_and_i18n.md` §8, `docs/03_frontend_3d/r3f_components.md` §10 and `docs/01_architecture/state_management.md` §6–7.

3D is client-only and code-split: the 2D diagram is server-rendered, the R3F chunk loads near the portfolio (hero: on idle, ≥ 1024 px). In development `window.__afaq.scene.getState()` exposes the scene store, e.g. `setQuality('high')` or `setMode('exploded')`.
