# shellcheck shell=bash
# Shared helpers of the server-development backup scripts (sourced, never run directly).
# Reuses deploy/backup/common.sh (log, die, alert, sha256_of, file_age_seconds, locks, encrypt_stream).
here_lib="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../../backup/common.sh
. "$here_lib/../../backup/common.sh"

# ---- Where things live -------------------------------------------------------------------------------------------
# OGGAQ_PG_MODE=compose (default, on the server): every PostgreSQL/Laravel command runs inside the Compose project's
#   `database` / `app` containers. pg_dump/psql use the container's local socket as the `postgres` role, so no password is
#   ever put on a command line or in an environment variable of this script.
# OGGAQ_PG_MODE=local (rehearsal on a Mac/dev box): plain pg_dump/psql/php with the usual PGHOST/PGPORT/PGUSER/PGPASSFILE.
# Call oggaq_init after the optional backup.env was loaded so its overrides (OGGAQ_BASE, OGGAQ_ENV_FILE, ...) are honoured.
oggaq_init() {
  OGGAQ_PG_MODE="${OGGAQ_PG_MODE:-compose}"
  OGGAQ_BASE="${OGGAQ_BASE:-$HOME/oggaq-development}"
  OGGAQ_ENV_FILE="${OGGAQ_ENV_FILE:-$OGGAQ_BASE/shared/.env}"
  OGGAQ_POSTGRES_PASSWORD_FILE="${OGGAQ_POSTGRES_PASSWORD_FILE:-$OGGAQ_BASE/shared/.postgres-password}"
  OGGAQ_COMPOSE_FILE="${OGGAQ_COMPOSE_FILE:-$OGGAQ_BASE/current/deploy/server-development/compose.yaml}"
  OGGAQ_BACKEND_DIR="${OGGAQ_BACKEND_DIR:-$OGGAQ_BASE/current/backend}"   # local mode only
  : "${OGGAQ_RELEASE:=current}"   # only interpolated into image names; `exec` never rebuilds
  export OGGAQ_ENV_FILE OGGAQ_POSTGRES_PASSWORD_FILE OGGAQ_RELEASE
}
oggaq_init

compose() { docker compose --env-file "$OGGAQ_ENV_FILE" -f "$OGGAQ_COMPOSE_FILE" "$@"; }

# pg_tool <pg_dump|psql|pg_restore|...> <args...>: run a PostgreSQL client tool against the application database server.
pg_tool() {
  case "$OGGAQ_PG_MODE" in
    compose) local tool="$1"; shift; compose exec -T database "$tool" -U postgres "$@" ;;
    local) "$@" ;;
    *) die "OGGAQ_PG_MODE compose ya da local olmalı." ;;
  esac
}

# app_artisan <args...>: run `php artisan ...` in the application (stdout is the command's output).
app_artisan() {
  case "$OGGAQ_PG_MODE" in
    compose) compose exec -T app php artisan "$@" ;;
    local) ( cd "$OGGAQ_BACKEND_DIR" && php artisan "$@" ) ;;
    *) die "OGGAQ_PG_MODE compose ya da local olmalı." ;;
  esac
}

# Reads KEY=VALUE from a small non-secret state file; prints nothing when absent.
state_value() { # $1 file, $2 key
  [ -f "$1" ] || return 0
  sed -n "s/^$2=//p" "$1" | head -n 1
}

# ISO-8601 UTC (YYYY-MM-DDTHH:MM:SSZ) -> epoch seconds; works with GNU date (Linux) and BSD date (macOS).
epoch_of_iso() {
  date -u -d "$1" +%s 2>/dev/null || date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$1" +%s 2>/dev/null || echo 0
}

# Age in seconds of a heartbeat file's created_at; large when missing or unreadable.
heartbeat_age() { # $1 heartbeat file
  local created; created="$(state_value "$1" created_at)"
  [ -n "$created" ] || { echo 999999999; return; }
  local created_epoch; created_epoch="$(epoch_of_iso "$created")"
  [ "$created_epoch" -gt 0 ] || { echo 999999999; return; }
  echo $(( $(date +%s) - created_epoch ))
}

# Writes a heartbeat file atomically. Only non-sensitive values (names, times, sizes, digests of encrypted files).
write_heartbeat() { # $1 target, rest KEY=VALUE...
  local target="$1" tmp; shift
  tmp="$target.tmp$$"
  printf '%s\n' "$@" >"$tmp"
  mv -- "$tmp" "$target"
}

# Human phrase for a heartbeat age in seconds ("3 saat önce" / "hiç kayıt yok").
age_phrase() {
  if [ "$1" -ge 999999999 ]; then echo "hiç kayıt yok"; else echo "$(( $1 / 3600 )) saat önce"; fi
}
