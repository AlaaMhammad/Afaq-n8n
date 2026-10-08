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
| `npm test` | Vitest (stores, SSE client, agent bridge, sections) |

## Layout

```
src/
├── app/[locale]/        root layout (html lang/dir, providers), page, not-found
├── proxy.ts             locale negotiation (next-intl)
├── i18n/                routing, request config (next/root-params), navigation
├── components/
│   ├── ui/              shared kit: Button, Card, Badge, Input/Textarea, Label, Dialog, Tooltip, Skeleton, Separator, Toaster, icons
│   ├── layout/          Container, SectionShell, SiteHeader, SiteFooter, ThemeToggle, LocaleSwitcher, SectionObserver
│   ├── sections/        Hero, Services, Portfolio (2D workflow explorer until the 3D canvas), Team (+ CV dialog), Booking
│   ├── assistant/       AgentActionRunner (AI agent → page bridge)
│   └── providers/       next-themes + tooltip providers
├── stores/              Zustand: scene (3D), agent (Copilot + action queue), ui
└── lib/                 api (client, cached content fetchers, SSE client, booking), agent (action schemas + runner), utils
messages/{ar,en}.json    UI copy (type-checked keys)
```

Architecture notes: `docs/03_frontend_3d/theme_and_i18n.md` §8 and `docs/01_architecture/state_management.md` §6.
