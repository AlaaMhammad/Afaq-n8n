#!/bin/sh
# Dev entrypoint for the backend + queue containers.
# vendor/ and storage/framework live in named volumes (fast, Linux-native) rather than the
# Windows/macOS bind mount, so they start empty on a fresh machine and are prepared here.
set -e

mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/framework/testing

if [ "${AUTO_COMPOSER_INSTALL:-0}" = "1" ] && [ ! -f vendor/autoload.php ]; then
    echo "[entrypoint] vendor/ is empty — running composer install…"
    composer install --no-interaction --prefer-dist --no-progress
fi

exec "$@"
