# Afaq Automation Agency Platform

Bilingual (Arabic RTL · English LTR) platform for **Afaq Automation Agency** (`afaqn8n.me`). It has four parts:
- a headless **Laravel 12** API with a **Filament v4** admin
- a **Next.js** frontend with interactive **React Three Fiber** "exploded view" n8n workflows
- **Afaq Copilot**, a RAG assistant powered by Gemini that can navigate the page, drive the 3D scenes and book service requests
- **PostgreSQL + pgvector** and **Redis**

| Path | What |
|------|------|
| [`docs/`](docs/README.md) | Engineering specs: architecture, API, 3D, features, security, testing/devops, and the decision log |
| `backend/` | Laravel 12 (PHP 8.2) API + admin |
| `frontend/` | Next.js (App Router, TypeScript, Tailwind v4) |
| `docker/` | Dockerfiles, nginx and Postgres init |
| `docker-compose.yml` | Dev stack: postgres (pgvector), redis, backend (FPM), queue worker, nginx, frontend |

## Quick start (Docker)

```bash
cp .env.example .env
cp backend/.env.example backend/.env
docker compose up -d --build        # first start installs PHP dependencies into a Docker volume
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate --seed
docker compose exec backend php artisan storage:link
```

Set `ADMIN_SEED_PASSWORD` (12+ characters) in `backend/.env` before seeding to choose the admin password for `admin@afaqn8n.me`. If it is empty, the seeder generates one and prints it once. Run Composer and Artisan through `docker compose exec backend …`; the container’s `vendor/` is a Docker volume, not `backend/vendor/` on the host.

| URL | Service |
|-----|---------|
| http://localhost:3000 | Frontend (Next.js) |
| http://localhost:8000 | Backend API (`/api/v1`), health at `/up` |
| http://localhost:8000/admin | Filament admin (Arabic RTL by default; switch language from the user menu) |
| localhost:5432 / 6379 | PostgreSQL / Redis |

AI features need a Google AI Studio key: set `GEMINI_API_KEY` in `backend/.env`. To switch to a local Ollama, set `LLM_DRIVER=ollama` and `EMBEDDING_DRIVER=ollama`. Details are in [docs/04_features/rag_and_ai_agent.md](docs/04_features/rag_and_ai_agent.md).

## Execution phases

1. ✅ Documentation, scaffolding, Docker
2. ✅ Database schema, realistic seeders, Filament admin
3. RAG pipeline, AI agent with tool calling, n8n webhook
4. Frontend foundations: theme, RTL/LTR, Zustand bridge
5. 3D canvas and exploded workflows
6. Core sections and Copilot UI
7. Testing, hardening, deployment

The full plan is in [`afaq_automation_agency_master_plan.md`](afaq_automation_agency_master_plan.md).
