#!/usr/bin/env bash
# Hourly export of the deleted-account ledger (keyed hashes only, no personal data), encrypted and kept separately from the
# database backups so a restore can re-apply deletions that are NEWER than the backup (php artisan accounts:reapply-erasures).
# A new file is written only when the ledger changed; LATEST-ERASURES is refreshed every run (heartbeat).
#   erasures.sh            export
#   erasures.sh --check    non-zero when the heartbeat is older than ERASURES_MAX_AGE_HOURS (default 6)
set -Eeuo pipefail
umask 077
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"

config="${BACKUP_ENV:-${OGGAQ_BASE:-$HOME/oggaq-development}/shared/backup.env}"
if [ -f "$config" ]; then set -a; . "$config"; set +a; fi
oggaq_init   # re-evaluate path defaults the config may have changed
BACKUP_DIR="${BACKUP_DIR:-${OGGAQ_BASE:-$HOME/oggaq-development}/backups}"
export KEEP_DAILY="${KEEP_DAILY:-7}" KEEP_WEEKLY="${KEEP_WEEKLY:-4}" KEEP_MONTHLY="${KEEP_MONTHLY:-6}"

if [ "${1:-}" = --check ]; then
  age=$(heartbeat_age "$BACKUP_DIR/LATEST-ERASURES")
  limit=$(( ${ERASURES_MAX_AGE_HOURS:-6} * 3600 ))
  [ "$age" -le "$limit" ] || die "Silme listesi dışa aktarımı: $(age_phrase "$age") (sınır ${ERASURES_MAX_AGE_HOURS:-6} saat)."
  log "Silme listesi dışa aktarımı taze."
  exit 0
fi

[ "$OGGAQ_PG_MODE" = compose ] && { command -v docker >/dev/null || die "docker bulunamadı."; }
ENCRYPT_TOOL="${ENCRYPT_TOOL:-age}"
extension="$(encrypt_extension)"
command -v "$ENCRYPT_TOOL" >/dev/null || die "$ENCRYPT_TOOL kurulu değil."
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
LOCK_BASE="$BACKUP_DIR"
acquire_lock oggaq-erasures
plain="$(mktemp "$BACKUP_DIR/.erasures-plain.XXXXXX")"
partial=""
trap 'status=$?; release_lock; rm -f -- "$plain" "${partial:-}"; true' EXIT

# The ledger is a few hashes per deleted account; stdout of the artisan command, written to a private temp file only to
# compare it with the previous export (hashes are not personal data, and the file is removed at exit).
app_artisan accounts:export-erasures >"$plain" || die "Silme listesi okunamadı (accounts:export-erasures)."
now_digest="$(sha256_of "$plain")"
state="$BACKUP_DIR/.erasures-state"
last_digest="$(state_value "$state" plain_sha256)"
lines=$(wc -l <"$plain" | tr -d ' ')
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="$(state_value "$state" name)"

if [ "$now_digest" != "$last_digest" ] || [ -z "$name" ] || [ ! -f "$BACKUP_DIR/$name" ]; then
  name="erasures-${stamp}.ndjson.${extension}"
  partial="$BACKUP_DIR/$name.partial"
  encrypt_stream <"$plain" >"$partial" || die "Silme listesi şifrelenemedi."
  mv -- "$partial" "$BACKUP_DIR/$name"
  partial=""
  printf '%s  %s\n' "$(sha256_of "$BACKUP_DIR/$name")" "$name" >"$BACKUP_DIR/$name.sha256"
  write_heartbeat "$state" "name=$name" "plain_sha256=$now_digest"
  "$here/../../backup/prune.sh" "$BACKUP_DIR" | sed 's/^/prune: /' || log "UYARI: saklama temizliği başarısız."
  log "Silme listesi yazıldı: $name ($lines kayıt)"
else
  log "Silme listesi değişmedi ($lines kayıt)."
fi
write_heartbeat "$BACKUP_DIR/LATEST-ERASURES" \
  "name=$name" "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)" "entries=$lines" "sha256=$(sha256_of "$BACKUP_DIR/$name")"
