#!/usr/bin/env bash
# OGGAQ veritabanı yedeği: pg_dump (özel biçim) -> şifreleme -> sağlama toplamı -> saklama -> sunucu dışı kopya.
#   backup.sh            yedek alır
#   backup.sh --check    son başarılı yedek MAX_AGE_HOURS'tan eskiyse hata ile çıkar (izleme / cron için)
# Yapılandırma: BACKUP_ENV (varsayılan /etc/oggaq/backup.env); systemd birimi aynı dosyayı EnvironmentFile ile verir.
# Şifresiz kopya diske hiç yazılmaz (pg_dump | şifreleme akışı). Özel anahtar sunucuda bulunmaz, bu yüzden bu betik
# yedeği AÇAMAZ; yedeğin gerçekten geri yüklenebildiği üç ayda bir yapılan tatbikatla (restore.sh + verify.sh) kanıtlanır.
set -Eeuo pipefail
umask 077
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$here/common.sh"

config="${BACKUP_ENV:-/etc/oggaq/backup.env}"
if [ -f "$config" ]; then set -a; . "$config"; set +a; fi
: "${PGDATABASE:?PGDATABASE tanımlı olmalı}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/oggaq/db}"
MAX_AGE_HOURS="${MAX_AGE_HOURS:-26}"
OFFSITE_MODE="${OFFSITE_MODE:-none}"
ERASURES_MAX_AGE="${ERASURES_MAX_AGE:-10800}"
export KEEP_DAILY="${KEEP_DAILY:-7}" KEEP_WEEKLY="${KEEP_WEEKLY:-4}" KEEP_MONTHLY="${KEEP_MONTHLY:-6}"

if [ "${1:-}" = --check ]; then
  marker="$BACKUP_DIR/.last-success"
  [ -f "$marker" ] || die "Hiç başarılı yedek kaydı yok ($marker)."
  age=$(file_age_seconds "$marker")
  [ "$age" -le $((MAX_AGE_HOURS * 3600)) ] || die "Son başarılı yedek $((age / 3600)) saat önce (sınır ${MAX_AGE_HOURS} saat)."
  log "Yedek taze: $((age / 3600)) saat önce."
  exit 0
fi

for tool in pg_dump psql; do command -v "$tool" >/dev/null || die "$tool kurulu değil."; done
ENCRYPT_TOOL="${ENCRYPT_TOOL:-age}"
extension="$(encrypt_extension)"
command -v "$ENCRYPT_TOOL" >/dev/null || die "$ENCRYPT_TOOL kurulu değil."
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
acquire_lock oggaq-backup
trap 'status=$?; release_lock; [ "$status" -eq 0 ] || rm -f -- "${partial:-}" "${partial_erasures:-}"' EXIT

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
name="oggaq-${PGDATABASE}-${stamp}.dump.${extension}"
out="$BACKUP_DIR/$name"
partial="$out.partial"

log "Yedek alınıyor: $name"
# pipefail: pg_dump ya da şifreleme başarısız olursa boru hattı başarısız olur ve yarım dosya silinir.
pg_dump --format=custom --compress=6 --no-owner --no-acl | encrypt_stream >"$partial" || die "pg_dump/şifreleme başarısız."
size=$(wc -c <"$partial" | tr -d ' ')
[ "$size" -ge 1024 ] || die "Yedek dosyası beklenmedik biçimde küçük ($size bayt)."
mv -- "$partial" "$out"
printf '%s  %s\n' "$(sha256_of "$out")" "$name" >"$out.sha256"

# Manifest: neyin yedeklendiğini söyler (kişisel veri yok, yalnızca sayılar ve son migration adı).
manifest="${out%.*}.manifest"
{
  echo "created_at=$stamp"
  echo "database=$PGDATABASE"
  echo "server_version=$(psql -Atc 'show server_version' 2>/dev/null || echo unknown)"
  echo "latest_migration=$(psql -Atc 'select migration from migrations order by id desc limit 1' 2>/dev/null || echo unknown)"
  echo "users=$(psql -Atc 'select count(*) from users' 2>/dev/null || echo unknown)"
  echo "questions=$(psql -Atc 'select count(*) from questions' 2>/dev/null || echo unknown)"
  echo "official_exams=$(psql -Atc 'select count(*) from official_exams' 2>/dev/null || echo unknown)"
  echo "erasure_ledger_entries=$(psql -Atc 'select count(*) from account_erasures' 2>/dev/null || echo unknown)"
  echo "encrypted_bytes=$size"
} >"$manifest"

# Silinmiş hesap listesinin ayrı dışa aktarımı da şifrelenip yedeklenir (docs/DEPLOYMENT.md "Silinen hesaplar").
if [ -f "${ERASURES_FILE:-/nonexistent}" ]; then
  age_s=$(file_age_seconds "$ERASURES_FILE")
  [ "$age_s" -le "$ERASURES_MAX_AGE" ] || alert "Silme listesi dışa aktarımı $((age_s / 3600)) saattir yenilenmedi (oggaq-erasures.timer çalışıyor mu?)"
  partial_erasures="$BACKUP_DIR/erasures-${stamp}.ndjson.${extension}.partial"
  encrypt_stream <"$ERASURES_FILE" >"$partial_erasures" || die "Silme listesi şifrelenemedi."
  erasures_out="${partial_erasures%.partial}"
  mv -- "$partial_erasures" "$erasures_out"
  printf '%s  %s\n' "$(sha256_of "$erasures_out")" "$(basename "$erasures_out")" >"$erasures_out.sha256"
else
  alert "Silme listesi dışa aktarımı bulunamadı (${ERASURES_FILE:-tanımsız}); yedek yalnızca veritabanını içeriyor."
fi

"$here/prune.sh" "$BACKUP_DIR"

case "$OFFSITE_MODE" in
  none) log "Sunucu dışı kopya kapalı (OFFSITE_MODE=none): yedek yalnızca bu makinede!" ;;
  rclone)
    [ -n "${RCLONE_REMOTE:-}" ] || die "RCLONE_REMOTE tanımlı değil."
    # copy (sync değil): yerelde silinen eski yedek uzaktan silinmez; uzak saklama süresini hedefte ayrıca belirleyin.
    rclone copy "$BACKUP_DIR" "$RCLONE_REMOTE" --include '*.age' --include '*.gpg' --include '*.sha256' --include '*.manifest' \
      || die "rclone kopyası başarısız." ;;
  rsync)
    [ -n "${RSYNC_TARGET:-}" ] || die "RSYNC_TARGET tanımlı değil."
    rsync -a --include='*.age' --include='*.gpg' --include='*.sha256' --include='*.manifest' --exclude='*' "$BACKUP_DIR/" "$RSYNC_TARGET" \
      || die "rsync kopyası başarısız." ;;
  *) die "OFFSITE_MODE none, rclone ya da rsync olmalı." ;;
esac

date -u +%Y-%m-%dT%H:%M:%SZ >"$BACKUP_DIR/.last-success"
log "Yedek tamam: $name ($size bayt)"
