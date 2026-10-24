#!/usr/bin/env bash
# Nightly encrypted backup of the OGGAQ application database in the Compose environment.
#   backup.sh            takes a backup: pg_dump -Fc | encrypt | checksum | manifest | LATEST heartbeat | prune
#   backup.sh --check    exits non-zero when the last successful backup is older than MAX_AGE_HOURS (monitoring)
# Configuration: BACKUP_ENV (default $OGGAQ_BASE/shared/backup.env), see backup.env.example. It holds no secrets: the
# server only has the PUBLIC encryption key, so this script can never read a backup back. Off-site copies are PULLED by
# the owner's machine (mac/pull-backups.sh); this server keeps no credentials to anywhere else.
set -Eeuo pipefail
umask 077
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

config="${BACKUP_ENV:-${OGGAQ_BASE:-$HOME/oggaq-development}/shared/backup.env}"
if [ -f "$config" ]; then set -a; . "$config"; set +a; fi
oggaq_init   # re-evaluate path defaults the config may have changed
: "${PGDATABASE:=oggaq}"
BACKUP_DIR="${BACKUP_DIR:-${OGGAQ_BASE:-$HOME/oggaq-development}/backups}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"
export KEEP_DAILY="${KEEP_DAILY:-7}" KEEP_WEEKLY="${KEEP_WEEKLY:-4}" KEEP_MONTHLY="${KEEP_MONTHLY:-6}"

if [ "${1:-}" = --check ]; then
  age=$(heartbeat_age "$BACKUP_DIR/LATEST")
  [ "$age" -le $((MAX_AGE_HOURS * 3600)) ] || die "Son başarılı yedek: $(age_phrase "$age") (sınır ${MAX_AGE_HOURS} saat)."
  log "Yedek taze: $(age_phrase "$age")."
  exit 0
fi

[ "$OGGAQ_PG_MODE" = compose ] && { command -v docker >/dev/null || die "docker bulunamadı."; }
ENCRYPT_TOOL="${ENCRYPT_TOOL:-age}"
extension="$(encrypt_extension)"
command -v "$ENCRYPT_TOOL" >/dev/null || die "$ENCRYPT_TOOL kurulu değil."
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
LOCK_BASE="$BACKUP_DIR"
acquire_lock oggaq-backup
partial=""
trap 'status=$?; release_lock; [ "$status" -eq 0 ] || rm -f -- "${partial:-}" "${manifest_tmp:-}"' EXIT

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="oggaq-${PGDATABASE}-${stamp}.dump.${extension}"
out="$BACKUP_DIR/$name"
partial="$out.partial"

# Only the application database is dumped (never oggaq_test or other projects' databases on the same host).
log "Yedek alınıyor: $name"
# pipefail: a failing pg_dump or encryption fails the pipeline and the partial file is removed. No plaintext touches disk.
pg_tool pg_dump -d "$PGDATABASE" --format=custom --compress=6 --no-owner --no-acl | encrypt_stream >"$partial" || die "pg_dump/şifreleme başarısız."
size=$(wc -c <"$partial" | tr -d ' ')
[ "$size" -ge 1024 ] || die "Yedek dosyası beklenmedik biçimde küçük ($size bayt)."
mv -- "$partial" "$out"
partial=""
digest="$(sha256_of "$out")"
printf '%s  %s\n' "$digest" "$name" >"$out.sha256"

# Manifest: what was backed up (numbers and the last migration name only; no personal data).
q() { pg_tool psql -d "$PGDATABASE" -Atc "$1" 2>/dev/null || echo unknown; }
manifest="${out%.*}.manifest"
manifest_tmp="$manifest.tmp$$"
{
  echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "database=$PGDATABASE"
  echo "server_version=$(q 'show server_version')"
  echo "latest_migration=$(q 'select migration from migrations order by id desc limit 1')"
  echo "users=$(q 'select count(*) from users')"
  echo "questions=$(q 'select count(*) from questions')"
  echo "official_exams=$(q 'select count(*) from official_exams')"
  echo "exam_attempts=$(q 'select count(*) from exam_attempts')"
  echo "erasure_ledger_entries=$(q 'select count(*) from account_erasures')"
  echo "encrypted_bytes=$size"
} >"$manifest_tmp"
mv -- "$manifest_tmp" "$manifest"
manifest_tmp=""

# Sanity: a backup of a database that lost its content must not silently replace good ones. Compare with the previous manifest.
previous="$(ls -1 "$BACKUP_DIR"/oggaq-"$PGDATABASE"-*.dump.manifest 2>/dev/null | grep -v -F "$manifest" | sort | tail -n 1 || true)"
if [ -n "$previous" ]; then
  for key in questions official_exams; do
    now="$(state_value "$manifest" "$key")"; was="$(state_value "$previous" "$key")"
    case "$now$was" in *[!0-9]*|'') continue ;; esac
    if [ "$was" -gt 0 ] && [ "$now" -lt $((was * 8 / 10)) ]; then alert "$key sayısı $was -> $now (>%20 düşüş): veritabanı beklenmedik biçimde küçüldü."; fi
  done
fi

"$here/../../backup/prune.sh" "$BACKUP_DIR" | sed 's/^/prune: /' || log "UYARI: saklama temizliği başarısız."

# Heartbeat for the monitoring on the owner's machine (non-sensitive: name, time, size, digest of the ENCRYPTED file).
write_heartbeat "$BACKUP_DIR/LATEST" \
  "name=$name" "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" "bytes=$size" "sha256=$digest" "database=$PGDATABASE" "manifest=$(basename "$manifest")"
log "Yedek tamam: $name ($size bayt)"
