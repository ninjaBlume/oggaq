FROM node:24-bookworm-slim AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/mobile/package.json apps/mobile/package.json
COPY packages/ packages/
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY apps/admin/ apps/admin/
COPY apps/web/ apps/web/
ARG APP_URL=https://oggsorubankasi.codentum.net
RUN VITE_API_URL="$APP_URL" npm run build:web \
    && VITE_API_URL="$APP_URL" VITE_ADMIN_BASE_PATH=/yonetim/ npm run build:admin

FROM php:8.4-fpm-bookworm AS php-base
RUN apt-get update && apt-get install -y --no-install-recommends \
      libpq-dev libicu-dev libzip-dev libonig-dev unzip \
    && docker-php-ext-install -j2 pdo_pgsql pcntl bcmath intl zip mbstring opcache \
    && rm -rf /var/lib/apt/lists/*
COPY --from=composer:2 /usr/bin/composer /usr/local/bin/composer
WORKDIR /var/www/backend
COPY backend/composer.json backend/composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist --no-interaction --no-progress
COPY backend/ ./
RUN chmod -R a+rX /var/www/backend \
    && mkdir -p storage/app/private storage/app/public storage/framework/cache/data \
      storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && composer dump-autoload --no-dev --optimize --no-interaction \
    && chown -R www-data:www-data storage bootstrap/cache
COPY --chmod=0644 deploy/server-development/php.ini /usr/local/etc/php/conf.d/oggaq.ini
RUN printf '[www]\nclear_env = no\n' > /usr/local/etc/php-fpm.d/zz-oggaq.conf
USER www-data
CMD ["php-fpm", "-F"]

FROM nginx:stable-bookworm AS web
COPY deploy/server-development/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx/snippets/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY --from=frontend /build/apps/web/dist/ /var/www/web/
COPY --from=frontend /build/apps/admin/dist/ /var/www/admin/
COPY backend/public/index.php /var/www/backend/public/index.php
RUN chmod -R a+rX /var/www
