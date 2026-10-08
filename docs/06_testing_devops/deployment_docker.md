# Deployment & Docker

## 1. Development stack (`docker-compose.yml`)

```mermaid
flowchart LR
    subgraph host["Host"]
        B3000["localhost:3000"]
        B8000["localhost:8000"]
        B5432["localhost:5432"]
        B6379["localhost:6379"]
    end
    B3000 --> FE["frontend<br/>node:22-alpine<br/>next dev"]
    B8000 --> NG["nginx<br/>nginx:alpine"]
    NG -->|fastcgi :9000| BE["backend<br/>php 8.2-fpm-alpine"]
    BE --> PG[("postgres<br/>pgvector/pgvector:pg16")]
    BE --> RD[("redis<br/>redis:alpine")]
    B5432 --> PG
    B6379 --> RD
```

| Service | Build / image | Mounts | Healthcheck |
|---------|---------------|--------|-------------|
| `postgres` | `pgvector/pgvector:pg16` | `pgdata` volume, `docker/postgres/init.sql` → `/docker-entrypoint-initdb.d/` | `pg_isready -U $POSTGRES_USER -d $POSTGRES_DB` |
| `redis` | `redis:alpine` (`--appendonly yes`) | `redisdata` volume | `redis-cli ping` |
| `backend` | `docker/backend/Dockerfile` target `dev` | `./backend:/var/www/html` + named volumes `backend_vendor` → `vendor/`, `backend_framework` → `storage/framework/`, `composer_cache` | `vendor/autoload.php` present && `php-fpm -t` |
| `queue` | same image as `backend` | same as `backend` | — (`php artisan queue:work redis --tries=3 --timeout=600`) |
| `nginx` | `nginx:alpine` | `./backend/public` (ro), `docker/nginx/default.conf` | `wget -qO- http://localhost/up` |
| `frontend` | `node:22-alpine` | `./frontend:/app`, anonymous volume `/app/node_modules` | `wget -qO- http://localhost:3000` |

`init.sql` creates the `vector` extension in the main DB and creates `afaq_testing` (with the extension) for Pest.

### Common commands

```bash
cp .env.example .env                       # compose-level vars (ports, DB creds)
cp backend/.env.example backend/.env       # Laravel vars
docker compose up -d --build               # first start runs composer install into the vendor volume
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate --seed   # demo content + admin user
docker compose exec backend php artisan storage:link
docker compose exec backend php artisan rag:index-knowledge   # needs GEMINI_API_KEY (Phase 3)
docker compose logs -f backend nginx
```

### Dev performance & permissions (Windows/macOS hosts)

- **Hot paths live in named volumes.** Bind-mounted NTFS is slow for Linux containers (listing `vendor/` took ~85 s; Laravel booted in ~30 s). `vendor/` and `storage/framework/` are therefore Docker named volumes — boot drops to ~2 s and requests to ~0.2 s. App code stays bind-mounted for live editing.
- `docker/backend/entrypoint-dev.sh` prepares those volumes on start (`composer install` when `vendor/` is empty, for the `backend` service only).
- Consequence: the host `backend/vendor/` is **not** what the app runs; run Composer via `docker compose exec backend composer …`. (A host copy can still be installed for IDE autocompletion.)
- `php.dev.ini` enables OPcache for CLI + FPM with `revalidate_freq=2` (edits appear within ~2 s).
- Dev FPM workers run as **root** (`php-fpm --allow-to-run-as-root`) because host files surface as root-owned in bind mounts; artisan and web requests therefore share one owner. The `prod` target keeps non-root `www-data`.
- If `next dev` file-watching lags, `WATCHPACK_POLLING=true` is already set; running the project inside WSL2 is faster still.

## 2. Backend image (`docker/backend/Dockerfile`)

Multi-stage:

| Stage | Base | Purpose |
|-------|------|---------|
| `base` | `php:8.2-fpm-alpine` | System libs + PHP extensions: `pdo_pgsql pgsql bcmath intl zip gd exif pcntl opcache` + `pecl redis`; Composer binary copied from `composer:2` |
| `dev` | `base` | Xdebug-ready (off by default), dev `php.ini`, runs as `www-data` with UID mapped via `UID`/`GID` build args |
| `vendor` | `base` | `composer install --no-dev --prefer-dist --optimize-autoloader` with only `composer.json/lock` copied (layer cache) |
| `prod` | `base` | App code + vendor; `php artisan config:cache route:cache view:cache event:cache filament:optimize`; `opcache.validate_timestamps=0`; non-root; `HEALTHCHECK` |

Prod also runs a **queue** container (same image, `command: php artisan queue:work redis --tries=3 --max-time=3600`) and a **scheduler** container (`php artisan schedule:work`) for `model:prune` and stale-index checks.

PHP ini (prod): `memory_limit=256M`, `upload_max_filesize=10M`, `post_max_size=12M`, `max_execution_time=90` (AI streams), `output_buffering=Off` (SSE).

## 3. nginx (`docker/nginx/default.conf`)

Key directives:

```nginx
client_max_body_size 12m;

location / { try_files $uri $uri/ /index.php?$query_string; }

location = /api/v1/ai/chat {
    fastcgi_pass backend:9000;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME /var/www/html/public/index.php;
    fastcgi_buffering off;          # SSE
    fastcgi_read_timeout 90s;
}

location ~ \.php$ {
    fastcgi_pass backend:9000;
    fastcgi_param SCRIPT_FILENAME /var/www/html/public$fastcgi_script_name;
    include fastcgi_params;
    fastcgi_read_timeout 60s;
}

location ~* ^/storage/.*\.php$ { deny all; }
location ~ /\.(?!well-known) { deny all; }
```

## 4. Frontend image (prod)

Next.js `output: 'standalone'`:

| Stage | Base | Steps |
|-------|------|-------|
| `deps` | `node:22-alpine` | `npm ci` |
| `build` | `deps` | `NEXT_PUBLIC_API_URL` build arg → `npm run build` |
| `runner` | `node:22-alpine` | copy `.next/standalone`, `.next/static`, `public`; `USER node`; `CMD ["node", "server.js"]`; port 3000 |

## 5. Production topology

```
Cloudflare (DNS, TLS, WAF, cache)
├── afaqn8n.me         → frontend (Next.js standalone)   [Cloudflare proxied]
└── api.afaqn8n.me     → nginx → backend (FPM)            [Cloudflare proxied]
                          ├── queue worker
                          ├── scheduler
                          ├── postgres (managed or container w/ backups)
                          └── redis
```

Deploy targets: a single VPS with Docker Compose (`docker-compose.prod.yml`) for v1; images built in CI and pushed to GHCR; zero-downtime via `docker compose up -d --no-deps --build backend` + `php artisan migrate --force` in a release step.

Backups: nightly `pg_dump` (custom format) to R2, 14-day retention; `storage/app/public` synced to R2 (or use R2 as the media disk directly).

## 6. Cloudflare rules

| Rule | Match | Setting |
|------|-------|---------|
| Cache static Next assets | `afaqn8n.me/_next/static/*` | Cache Everything, Edge TTL 1 year (immutable hashed files) |
| Cache fonts/3D assets | `afaqn8n.me/fonts/*`, `afaqn8n.me/models/*`, `*.woff2`, `*.glb`, `*.ktx2` | Cache Everything, Edge TTL 30 days, Browser TTL 7 days |
| Cache media | `api.afaqn8n.me/storage/*` | Cache Everything, Edge TTL 7 days |
| Bypass API | `api.afaqn8n.me/api/*` | Bypass cache (origin `Cache-Control` honored for public GETs if enabled later) |
| Bypass admin | `api.afaqn8n.me/admin*`, `/livewire/*` | Bypass cache, WAF managed challenge for non-allow-listed countries (optional) |
| SSE | `api.afaqn8n.me/api/v1/ai/chat` | Bypass cache; no Rocket Loader; no response buffering (Cloudflare streams `text/event-stream` by default) |
| Rate limit | `api.afaqn8n.me/api/v1/ai/chat` | 20 req/min/IP → block 1 min (outer layer to Laravel's 10/min) |
| Compression | all | Brotli on |

WebGL asset optimization: procedural geometry by default; any future GLB models are Draco/Meshopt compressed with KTX2 textures (`gltf-transform optimize`), lazy-loaded via `useGLTF.preload` only when the portfolio enters the viewport.

## 7. Environment variable matrix

| Variable | Where | Dev | Prod |
|----------|-------|-----|------|
| `APP_ENV` / `APP_DEBUG` | backend | `local` / `true` | `production` / `false` |
| `APP_URL` | backend | `http://localhost:8000` | `https://api.afaqn8n.me` |
| `FRONTEND_URL` | backend | `http://localhost:3000` | `https://afaqn8n.me` |
| `CORS_ALLOWED_ORIGINS` | backend | `http://localhost:3000` | `https://afaqn8n.me,https://www.afaqn8n.me` |
| `DB_*` | backend + compose | `postgres` / `afaq` / `afaq` / `secret` | secrets |
| `REDIS_HOST` | backend | `redis` | `redis` |
| `QUEUE_CONNECTION` / `CACHE_STORE` | backend | `redis` | `redis` |
| `LLM_DRIVER` / `EMBEDDING_DRIVER` | backend | `gemini` (or `fake`) | `gemini` |
| `GEMINI_API_KEY` | backend | your AI Studio key | secret |
| `GEMINI_CHAT_MODEL` / `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS` | backend | `gemini-3.5-flash` / `gemini-embedding-2` / `768` | same |
| `OLLAMA_BASE_URL` | backend | `http://host.docker.internal:11434` | — |
| `N8N_WEBHOOK_URL` / `N8N_WEBHOOK_SECRET` | backend | test webhook / random | prod webhook / secret |
| `ADMIN_SEED_PASSWORD` | backend | dev value | unset after first deploy |
| `FILESYSTEM_DISK` | backend | `public` | `r2` |
| `NEXT_PUBLIC_API_URL` | frontend | `http://localhost:8000/api/v1` | `https://api.afaqn8n.me/api/v1` |
| `NEXT_PUBLIC_SITE_URL` | frontend | `http://localhost:3000` | `https://afaqn8n.me` |

## 8. Release checklist

1. CI green (backend + frontend + E2E).
2. Images tagged with git SHA, pushed to GHCR.
3. `php artisan down --render=errors::503` (optional for migrations with locks).
4. `docker compose -f docker-compose.prod.yml pull && up -d`.
5. `php artisan migrate --force && php artisan optimize`.
6. `php artisan rag:index-knowledge` if knowledge or embedding model changed.
7. `php artisan up`; smoke test `/api/v1/health`, home page in ar/en, one AI chat turn.
8. Purge Cloudflare cache for HTML (not `_next/static`).
