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
ENV APP_ENV=local
CMD ["php-fpm"]

########################
# vendor: production dependencies (cached layer)
########################
FROM base AS vendor
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction

########################
# prod: optimized, self-contained image
########################
FROM base AS prod
ENV APP_ENV=production
COPY docker/backend/php.prod.ini /usr/local/etc/php/conf.d/zz-afaq-prod.ini
COPY --from=vendor /var/www/html/vendor ./vendor
COPY backend/ ./
RUN composer dump-autoload --optimize --no-dev \
    && php artisan package:discover --ansi \
    && chown -R www-data:www-data storage bootstrap/cache
# config/route/view caches are built at release time (they need runtime env): see deployment_docker.md
USER www-data
HEALTHCHECK --interval=15s --timeout=5s CMD php-fpm -t || exit 1
CMD ["php-fpm"]
