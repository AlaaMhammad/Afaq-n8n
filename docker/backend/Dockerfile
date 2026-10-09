# syntax=docker/dockerfile:1
# Laravel 12 backend — PHP 8.2 FPM (Alpine)
# Targets: dev (bind-mounted code), prod (self-contained, optimized)

########################
# base: runtime + extensions
########################
FROM php:8.2-fpm-alpine AS base

COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/
RUN install-php-extensions pdo_pgsql pgsql bcmath intl zip gd exif pcntl opcache redis \
    && apk add --no-cache git unzip fcgi

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY docker/backend/php.ini /usr/local/etc/php/conf.d/zz-afaq.ini

WORKDIR /var/www/html

########################
# dev: code is bind-mounted by docker-compose
########################
FROM base AS dev
# Dev only: Windows/macOS bind mounts surface host files as root-owned, so FPM workers run as
# root too — artisan (via `docker compose exec`) and web requests then share one file owner.
# The prod target below keeps the default non-root www-data workers.
RUN printf '[www]\nuser = root\ngroup = root\n' > /usr/local/etc/php-fpm.d/zz-dev-user.conf
COPY docker/backend/php.dev.ini /usr/local/etc/php/conf.d/zz-afaq-dev.ini
COPY --chmod=755 docker/backend/entrypoint-dev.sh /usr/local/bin/afaq-entrypoint
ENV COMPOSER_CACHE_DIR=/composer-cache
ENTRYPOINT ["afaq-entrypoint"]
CMD ["php-fpm", "--allow-to-run-as-root"]

########################
# vendor: production dependencies (cached layer)
########################
FROM base AS vendor
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

########################
# prod: optimized, self-contained image (backend FPM, queue worker, scheduler)
########################
FROM base AS prod
ENV APP_ENV=production
COPY docker/backend/php.prod.ini /usr/local/etc/php/conf.d/zz-afaq-prod.ini
COPY --chmod=755 docker/backend/entrypoint-prod.sh /usr/local/bin/afaq-entrypoint
COPY --from=vendor /var/www/html/vendor ./vendor
COPY backend/ ./
# dump-autoload runs post-autoload-dump: package:discover + filament:upgrade (publishes Filament's
# css/js/fonts into public/, which are gitignored). The relative storage link works in both the
# FPM image and the nginx image below, where storage/app/public is mounted from the shared volume.
RUN composer dump-autoload --optimize --no-dev --no-interaction     && rm -rf public/storage && ln -s ../storage/app/public public/storage     && mkdir -p storage/app/public storage/app/private storage/framework/cache/data         storage/framework/sessions storage/framework/views storage/logs     && chown -R www-data:www-data storage bootstrap/cache
# config/route/view/event + Filament caches need the runtime .env, so the entrypoint builds them
USER www-data
ENTRYPOINT ["afaq-entrypoint"]
HEALTHCHECK --interval=15s --timeout=5s CMD php-fpm -t || exit 1
CMD ["php-fpm"]

########################
# web: nginx serving public/ (Filament assets, uploads) and proxying PHP to the prod FPM
########################
FROM nginx:1.29-alpine AS web
COPY docker/nginx/prod.conf /etc/nginx/conf.d/default.conf
COPY --from=prod /var/www/html/public /var/www/html/public
HEALTHCHECK --interval=15s --timeout=5s CMD wget -qO- http://127.0.0.1/up >/dev/null || exit 1
