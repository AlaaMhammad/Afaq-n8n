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
| ADR-001 | 2026-10-08 | **Google Gemini** (AI Studio free tier) for chat + tool calling (`gemini-2.5-flash`) and embeddings (`text-embedding-004`). | Single free-tier key for both capabilities; native function calling; good Arabic quality. | Plan §2 "OpenAI / Claude API" |
| ADR-002 | 2026-10-08 | **Adapter/Driver pattern** for `LlmDriver` and `EmbeddingDriver`, selected by `LLM_DRIVER` / `EMBEDDING_DRIVER` (`gemini`, `ollama`, `fake`). | Swap to a local **Ollama** instance by editing `.env` only; deterministic `fake` driver for tests. | — |
| ADR-003 | 2026-10-08 | Embedding column is **`vector(768)`**. | Native size of `text-embedding-004`; also matches Ollama `nomic-embed-text` (768) so a driver swap needs no migration — only a re-index. Fallback model: `gemini-embedding-001` with `outputDimensionality: 768`. | Plan §4 Phase 2 `vector 1536` |
| ADR-004 | 2026-10-08 | **Filament v4** for the admin panel. | Current stable line with Laravel 12 support; v3 is in maintenance. | Plan §2 "Filament v3" |
| ADR-005 | 2026-10-08 | Add an **nginx** container in front of PHP-FPM. | FPM speaks FastCGI only; nginx serves `public/` and buffers SSE correctly (`X-Accel-Buffering: no`). | Plan §4 Phase 1 (4 services) |
| ADR-006 | 2026-10-08 | Arabic (`ar`) is the **default locale**; every translatable column stores `{ "ar": "...", "en": "..." }`. | Primary audience is Arabic-speaking; Spatie Translatable reads this shape natively. | — |

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
