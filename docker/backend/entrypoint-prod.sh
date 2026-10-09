#!/bin/sh
# Prod entrypoint for the backend, queue and scheduler containers.
# The .env is mounted at runtime, so Laravel's caches are built here (a few hundred ms) rather
# than baked into the image: every container gets caches that match the env it runs with.
set -e

if [ "${AFAQ_OPTIMIZE:-1}" = "1" ]; then
    php artisan optimize --no-ansi >/dev/null
    php artisan filament:optimize --no-ansi >/dev/null
fi

exec "$@"
