#!/usr/bin/env bash
set -Eeuo pipefail
psql --username "$POSTGRES_USER" --dbname postgres --set=ON_ERROR_STOP=1 --set=app_password="$DB_PASSWORD" <<'SQL'
CREATE ROLE oggaq LOGIN PASSWORD :'app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE DATABASE oggaq OWNER oggaq;
CREATE DATABASE oggaq_test OWNER oggaq;
SQL
