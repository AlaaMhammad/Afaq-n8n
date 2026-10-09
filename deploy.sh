#!/usr/bin/env bash
# Afaq Automation Agency — production deploy (single VPS, Docker Compose)
#
#   ./deploy.sh              pull main, back up the DB, migrate, rebuild + restart everything
#   ./deploy.sh --seed       first deploy: also seed content + admin user and index the knowledge base
#   ./deploy.sh --reindex    also re-embed changed knowledge chunks (rag:index-knowledge)
#   ./deploy.sh --no-pull    deploy the checked-out commit as is (e.g. a rollback: git checkout <sha> first)
#   ./deploy.sh --skip-backup
#
# Rollback: git checkout <previous sha> && ./deploy.sh --no-pull
#           (restore the matching dump from $BACKUP_DIR if a migration changed data — see the docs).
# Docs: docs/06_testing_devops/deployment_docker.md §9
set -Eeuo pipefail

cd "$(dirname "$(readlink -f "$0")")"

BRANCH="${DEPLOY_BRANCH:-main}"
COMPOSE=(docker compose -f docker-compose.prod.yml)
SEED=0 REINDEX=0 PULL=1 BACKUP=1

for arg in "$@"; do
  case "$arg" in
    --seed) SEED=1; REINDEX=1 ;;
    --reindex) REINDEX=1 ;;
    --no-pull) PULL=0 ;;
    --skip-backup) BACKUP=0 ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg (see --help)" >&2; exit 2 ;;
  esac
done

# ── helpers ───────────────────────────────────────────────────────────
if [ -t 1 ]; then B=$'\e[1m' G=$'\e[32m' Y=$'\e[33m' R=$'\e[31m' N=$'\e[0m'; else B='' G='' Y='' R='' N=''; fi
step() { echo; echo "${B}▶ $*${N}"; }
ok()   { echo "  ${G}✓${N} $*"; }
warn() { echo "  ${Y}!${N} $*"; }
die()  { echo "${R}✗ $*${N}" >&2; exit 1; }

PREVIOUS="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
on_error() {
  local line=$1
  echo
  echo "${R}✗ Deploy failed (line ${line}).${N} Running containers were left as they were at the failing step."
  echo "  Inspect:  ${COMPOSE[*]} ps   |   ${COMPOSE[*]} logs --tail=100 backend web frontend"
  echo "  Rollback: git checkout ${PREVIOUS} && ./deploy.sh --no-pull"
}
trap 'on_error $LINENO' ERR

# One deploy at a time
exec 9>"/tmp/afaq-deploy.lock"
flock -n 9 || die "Another deploy is already running."

# ── preflight ─────────────────────────────────────────────────────────
step "Preflight"
command -v docker >/dev/null || die "docker is not installed."
docker compose version >/dev/null 2>&1 || die "The docker compose plugin is missing."
docker info >/dev/null 2>&1 || die "Cannot talk to the Docker daemon (is $(whoami) in the docker group?)."
[ -f .env ] || die "Missing .env — cp .env.production.example .env and fill it in."
[ -f backend/.env ] || die "Missing backend/.env — cp backend/.env.production.example backend/.env and fill it in."
grep -Eq '^APP_KEY=base64:.+' backend/.env || die "APP_KEY is empty in backend/.env. Generate one with:
  ${COMPOSE[*]} build backend && ${COMPOSE[*]} run --rm --no-deps -e AFAQ_OPTIMIZE=0 backend php artisan key:generate --show"
grep -Eq '^APP_ENV=production' backend/.env || warn "backend/.env does not say APP_ENV=production."

set -a
# shellcheck disable=SC1091
. ./.env
set +a
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD is empty in .env}"
WEB_PORT="${WEB_PORT:-8080}"
FRONTEND_PORT="${FRONTEND_PORT:-3000}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://dashboard.afaqn8n.me/api/v1}"
NEXT_PUBLIC_SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://afaqn8n.me}"
BACKUP_DIR="${BACKUP_DIR:-/var/www/afaq/backups}"
BACKUP_KEEP="${BACKUP_KEEP:-14}"
ok "configuration loaded"

# ── code ──────────────────────────────────────────────────────────────
if [ "$PULL" = 1 ]; then
  step "Updating code from origin/${BRANCH}"
  [ -z "$(git status --porcelain --untracked-files=no)" ] || die "Tracked files were modified on the server; commit or discard them first (git status)."
  git fetch --prune origin "$BRANCH"
  git checkout -q "$BRANCH"
  git merge --ff-only "origin/${BRANCH}"
fi
RELEASE="$(git rev-parse --short HEAD)"
ok "release ${RELEASE} ($(git log -1 --format=%s))"
[ "$PREVIOUS" = "$RELEASE" ] || ok "previous ${PREVIOUS}"

# ── images ────────────────────────────────────────────────────────────
step "Building backend images (PHP-FPM + nginx)"
"${COMPOSE[@]}" build backend web
docker tag afaq/backend:latest "afaq/backend:${RELEASE}"
docker tag afaq/web:latest "afaq/web:${RELEASE}"
ok "afaq/backend:${RELEASE}, afaq/web:${RELEASE}"

# ── data services ─────────────────────────────────────────────────────
step "Starting Postgres + Redis"
"${COMPOSE[@]}" up -d --wait postgres redis
ok "healthy"

if [ "$BACKUP" = 1 ]; then
  step "Backing up the database"
  tables="$("${COMPOSE[@]}" exec -T postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
    "select count(*) from information_schema.tables where table_schema = 'public'")"
  if [ "${tables//[[:space:]]/}" = "0" ]; then
    ok "empty database (first deploy) — nothing to back up"
  else
    mkdir -p "$BACKUP_DIR"
    dump="${BACKUP_DIR}/afaq-$(date +%Y%m%d-%H%M%S)-${PREVIOUS}.dump"
    "${COMPOSE[@]}" exec -T postgres pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$dump"
    chmod 600 "$dump"
    ok "$(du -h "$dump" | cut -f1) → ${dump}"
    # keep the newest $BACKUP_KEEP dumps
    find "$BACKUP_DIR" -maxdepth 1 -name 'afaq-*.dump' -printf '%T@ %p\n' | sort -rn \
      | tail -n "+$((BACKUP_KEEP + 1))" | cut -d' ' -f2- | xargs -r rm -f --
  fi
fi

# ── database ──────────────────────────────────────────────────────────
step "Running migrations"
"${COMPOSE[@]}" run --rm --no-deps -T -e AFAQ_OPTIMIZE=0 backend php artisan migrate --force
if [ "$SEED" = 1 ]; then
  step "Seeding content + admin user"
  "${COMPOSE[@]}" run --rm --no-deps -T -e AFAQ_OPTIMIZE=0 backend php artisan db:seed --force
fi

# ── backend ───────────────────────────────────────────────────────────
step "Restarting backend, queue, scheduler, web"
"${COMPOSE[@]}" up -d --wait --remove-orphans backend queue scheduler web
curl -fsS -o /dev/null "http://127.0.0.1:${WEB_PORT}/up" || die "Laravel health check failed on :${WEB_PORT}/up"
ok "Laravel is up on 127.0.0.1:${WEB_PORT}"

if [ "$REINDEX" = 1 ]; then
  step "Indexing the knowledge base (Gemini embeddings; unchanged chunks are reused)"
  "${COMPOSE[@]}" exec -T backend php artisan rag:index-knowledge \
    || warn "rag:index-knowledge failed (GEMINI_API_KEY?). The site works; the AI concierge answers without context until it succeeds."
fi

# ── frontend ──────────────────────────────────────────────────────────
step "Building the frontend (prerenders /ar and /en from the live API)"
curl -fsS -o /dev/null -H 'Accept: application/json' "http://127.0.0.1:${WEB_PORT}/api/v1/services" \
  || die "The API isn't answering on :${WEB_PORT}; the frontend would be prerendered without content."
docker build --network host \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --build-arg NEXT_PUBLIC_SITE_URL="$NEXT_PUBLIC_SITE_URL" \
  --build-arg API_INTERNAL_URL="http://127.0.0.1:${WEB_PORT}/api/v1" \
  -t afaq/frontend:latest -t "afaq/frontend:${RELEASE}" \
  frontend
ok "afaq/frontend:${RELEASE}"

step "Restarting the frontend"
"${COMPOSE[@]}" up -d --wait frontend
for locale in ar en; do
  curl -fsS -o /dev/null "http://127.0.0.1:${FRONTEND_PORT}/${locale}" || die "Frontend /${locale} is not answering on :${FRONTEND_PORT}"
done
ok "Next.js is up on 127.0.0.1:${FRONTEND_PORT} (/ar, /en)"

# ── cleanup ───────────────────────────────────────────────────────────
step "Cleaning up"
docker image prune -f >/dev/null
# keep the 3 newest release tags per image for quick rollbacks
for repo in afaq/backend afaq/web afaq/frontend; do
  docker image ls "$repo" --format '{{.Tag}} {{.CreatedAt}}' | grep -v '^latest ' | sort -k2 -r \
    | tail -n +4 | cut -d' ' -f1 | xargs -r -I{} docker image rm -f "$repo:{}" >/dev/null 2>&1 || true
done
ok "old images pruned"

echo
echo "${G}${B}✓ Deployed ${RELEASE}${N}"
echo "  https://afaqn8n.me           (frontend)"
echo "  https://dashboard.afaqn8n.me/admin  (admin)"
