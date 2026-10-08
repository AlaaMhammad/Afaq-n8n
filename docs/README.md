# Afaq Automation Agency — Engineering Documentation

> Platform for **Afaq Automation Agency** (`afaqn8n.me`): a headless Laravel 12 API + Filament v4 admin, a Next.js App Router frontend with interactive React-Three-Fiber "exploded" n8n workflows, and an autonomous RAG concierge (**Afaq Copilot**) that can drive the UI and book service requests.

The source of truth for scope is [`../afaq_automation_agency_master_plan.md`](../afaq_automation_agency_master_plan.md). These documents turn that plan into implementable specifications. Where they deviate, the **Decision Log** below wins.

## Index

| # | Area | Document | Purpose |
|---|------|----------|---------|
| 01 | Architecture | [system_overview.md](01_architecture/system_overview.md) | Topology, request/SSE flows, module boundaries |
| 01 | Architecture | [database_schema.md](01_architecture/database_schema.md) | Tables, relations, pgvector design, JSON schemas |
| 01 | Architecture | [state_management.md](01_architecture/state_management.md) | Zustand stores & the agent → 3D scene bridge |
| 02 | API | [endpoints.md](02_api_specs/endpoints.md) | REST + SSE contract (`/api/v1`) |
| 02 | API | [error_handling.md](02_api_specs/error_handling.md) | RFC 7807 problem details |
| 03 | Frontend & 3D | [r3f_components.md](03_frontend_3d/r3f_components.md) | Canvas, procedural nodes, exploded view |
| 03 | Frontend & 3D | [theme_and_i18n.md](03_frontend_3d/theme_and_i18n.md) | Color tokens, dark/light, RTL/LTR |
| 03 | Frontend & 3D | [ai_assistant_ui.md](03_frontend_3d/ai_assistant_ui.md) | Copilot widget, streaming, action bubbles |
| 04 | Features | [portfolio_showcase.md](04_features/portfolio_showcase.md) | 3D workflow gallery |
| 04 | Features | [team_management.md](04_features/team_management.md) | Team roster, CV upload/preview/download |
| 04 | Features | [service_request.md](04_features/service_request.md) | Multi-step booking & estimates |
| 04 | Features | [admin_dashboard.md](04_features/admin_dashboard.md) | Filament v4 resources & knowledge ingestion |
| 04 | Features | [rag_and_ai_agent.md](04_features/rag_and_ai_agent.md) | Drivers, chunking, retrieval, tool calling |
| 05 | Security | [api_security.md](05_security/api_security.md) | CORS, Sanctum, throttling, uploads |
| 05 | Security | [prompt_guard.md](05_security/prompt_guard.md) | Prompt-injection & PII defences |
| 06 | Testing & DevOps | [backend_tests.md](06_testing_devops/backend_tests.md) | Pest suites |
| 06 | Testing & DevOps | [frontend_tests.md](06_testing_devops/frontend_tests.md) | Vitest / Playwright matrix |
| 06 | Testing & DevOps | [deployment_docker.md](06_testing_devops/deployment_docker.md) | Docker, prod images, Cloudflare |

## Decision Log (ADR-lite)

| ID | Date | Decision | Rationale | Supersedes |
|----|------|----------|-----------|------------|
| ADR-001 | 2026-10-08 | **Google Gemini** (AI Studio free tier) for chat + tool calling and embeddings. *Model ids superseded by ADR-009.* | Single free-tier key for both capabilities; native function calling; good Arabic quality. | Plan §2 "OpenAI / Claude API" |
| ADR-002 | 2026-10-08 | **Adapter/Driver pattern** for `LlmDriver` and `EmbeddingDriver`, selected by `LLM_DRIVER` / `EMBEDDING_DRIVER` (`gemini`, `ollama`, `fake`). | Swap to a local **Ollama** instance by editing `.env` only; deterministic `fake` driver for tests. | — |
| ADR-003 | 2026-10-08 | Embedding column is **`vector(768)`**. | Matches Gemini embeddings truncated with `outputDimensionality: 768` (ADR-009); also matches Ollama `nomic-embed-text` (768) so a driver swap needs no migration — only a re-index. Fallback model: `gemini-embedding-001` with `outputDimensionality: 768`. | Plan §4 Phase 2 `vector 1536` |
| ADR-004 | 2026-10-08 | **Filament v4** for the admin panel. | Current stable line with Laravel 12 support; v3 is in maintenance. | Plan §2 "Filament v3" |
| ADR-005 | 2026-10-08 | Add an **nginx** container in front of PHP-FPM. | FPM speaks FastCGI only; nginx serves `public/` and buffers SSE correctly (`X-Accel-Buffering: no`). | Plan §4 Phase 1 (4 services) |
| ADR-006 | 2026-10-08 | Arabic (`ar`) is the **default locale**; every translatable column stores `{ "ar": "...", "en": "..." }`. | Primary audience is Arabic-speaking; Spatie Translatable reads this shape natively. | — |
| ADR-007 | 2026-10-08 | Dev containers keep `vendor/` and `storage/framework/` in **named volumes**; dev FPM runs as root; OPcache on in dev. | Windows bind mounts made Laravel boot in ~30 s; named volumes bring it to ~2 s. Root FPM avoids ownership clashes with host files. Prod image unchanged (non-root). | — |
| ADR-008 | 2026-10-08 | Admin panel is **Arabic RTL by default** with an in-panel ar/en switcher (`SetAdminLocale` + `lang/ar.json`); Filament auto-labels are translated globally. | Matches ADR-006 for the team operating the platform. | — |
| ADR-009 | 2026-10-08 | Models verified against the live API: chat **`gemini-3.5-flash`** (fallback **`gemini-3.5-flash-lite`**, `thinkingLevel: low`), embeddings **`gemini-embedding-2`** @ 768-d (L2-normalised). | `text-embedding-004` is retired and `gemini-2.5-flash` is closed to new keys (both 404). `gemini-3.8-flash` measured ~6.4 s to first byte vs ~2 s for 3.5-flash on the free tier; both support tool calling with `thoughtSignature`. All ids remain `.env` settings. | ADR-001 model ids |
| ADR-010 | 2026-10-08 | Transcripts are PII-scrubbed in Postgres, but each message’s **raw text is cached for 24 h** (Redis, per session) and used only to rebuild the model’s history. | A scrubbed history (“[email]”) made multi-turn booking impossible; the cache keeps at-rest storage clean while the conversation works. | — |
| ADR-011 | 2026-10-08 | Retrieval threshold `RAG_MIN_SCORE=0.60`. | Calibrated on the seeded KB: hit@3 = 12/12 (ar+en); relevant top hits scored 0.64–0.89, off-topic ≤ 0.57. | Plan value 0.55 |
| ADR-012 | 2026-10-08 | Frontend i18n under Cache Components: `app/[locale]` is the root segment (both locales prerendered via `generateStaticParams`); next-intl reads the locale with **`next/root-params`**; locale negotiation lives in `src/proxy.ts`. | `setRequestLocale` is deprecated in next-intl 4.14; root params keep every page static without reading headers. | — |
| ADR-013 | 2026-10-08 | Theme via **next-themes** (class on `<html>`, localStorage `afaq-theme`, pre-paint script; dark default) instead of a server-read cookie. Fonts self-hosted with **@fontsource** (Inter, IBM Plex Sans Arabic, JetBrains Mono). | A cookie read in the root layout would make every route dynamic; self-hosted fonts avoid build-time Google Fonts fetches on a flaky network. | theme_and_i18n.md §3 cookie approach, `next/font/google` |
| ADR-014 | 2026-10-08 | Frontend dev runs **on the host** (`npm run dev`) on Windows/macOS; the compose `frontend` service remains for an all-Docker setup with Turbopack polling (`NEXT_WATCH_POLL_MS`). Server Components call Laravel via `API_INTERNAL_URL` (`http://nginx/api/v1` in Docker); Laravel pins generated URLs to `APP_URL`. | Docker Desktop bind mounts drop file events (Next.js docs recommend host dev). Inside the container `localhost:8000` is not nginx. | — |

## Glossary

| Term | Meaning |
|------|---------|
| **Exploded view** | 3D state where workflow nodes disperse along precomputed offset vectors to reveal internals and ports. Opposite of **assembled**. |
| **Node kinds** | `trigger` (diamond), `router` (cylinder), `action` (cube), `ai` (icosahedron), `storage` (stacked discs). |
| **Afaq Copilot** | The floating RAG assistant widget. |
| **Agent action** | A UI side-effect emitted by a tool call (e.g. `navigate_to`, `trigger_3d_workflow`) and executed client-side through the Zustand bridge. |
| **Knowledge document** | A chunk of agency content (FAQ, service docs) with a 768-d embedding used for retrieval. |
| **Problem details** | RFC 7807 JSON error body (`application/problem+json`). |
| **SSE** | Server-Sent Events — one-way streaming used by `/api/v1/ai/chat`. |

## Conventions

- Code identifiers, API fields and docs are in **English**; user-facing copy is bilingual with Arabic first.
- All timestamps are ISO-8601 UTC in API responses.
- API is versioned under `/api/v1`; breaking changes require `/api/v2`.
- Mermaid diagrams render natively on GitHub/GitLab and most Markdown viewers.
