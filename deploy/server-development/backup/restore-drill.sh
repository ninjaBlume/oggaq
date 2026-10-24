#!/usr/bin/env bash
# Restore drill: proves a backup can really be restored. Restores into a THROWAWAY database, runs the integrity checks,
# compares the result with the backup's manifest, optionally dry-runs the deleted-account re-application, then drops the
# throwaway database. It never touches the production database.
#
# It must run where the PRIVATE key is (the owner's Mac): the server cannot read its own backups by design.
#   restore-drill.sh --dir ~/oggaq-backups/server-development --identity ~/keys/oggaq-backup.key      (newest backup)
#   restore-drill.sh --file <oggaq-….dump.age|gpg> [--erasures-file <erasures-….ndjson.age|gpg>] --identity KEY
# Options:
#   --dir DIR            use the newest backup (LATEST heartbeat) and the newest erasure export in DIR
#   --file / --erasures-file   explicit encrypted files
#   --identity KEY       age private key file (gpg: the private key must be in the running user's keyring)
#   --backend-dir DIR    Laravel backend of THIS revision (enables the accounts:reapply-erasures dry run; needs php)
#   --compare-db NAME    additionally compare content checksum and counts with this database (rehearsal only)
#   --keep               do not drop the throwaway database (for manual inspection)
# Connection: PGHOST/PGPORT/PGUSER/PGPASSFILE of a role that may create databases (restore.sh rules apply).
set -Eeuo pipefail
umask 077
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
. "$here/lib.sh"
alert() { :; }   # interactive: errors go to the operator only
backup_tools="$here/../../backup"

dir=""; file=""; erasures=""; identity=""; backend=""; compare=""; keep=0
while [ $# -gt 0 ]; do
  case "$1" in
    --dir) dir="${2:?}"; shift ;;
    --file) file="${2:?}"; shift ;;
    --erasures-file) erasures="${2:?}"; shift ;;
    --identity) identity="${2:?}"; shift ;;
    --backend-dir) backend="${2:?}"; shift ;;
    --compare-db) compare="${2:?}"; shift ;;
    --keep) keep=1 ;;
    *) die "Bilinmeyen seçenek: $1" ;;
  esac
  shift
done
if [ -n "$dir" ]; then
  [ -d "$dir" ] || die "--dir bulunamadı: $dir"
  [ -n "$file" ] || { name="$(state_value "$dir/LATEST" name)"; [ -n "$name" ] || die "$dir/LATEST yok ya da boş."; file="$dir/$name"; }
  [ -n "$erasures" ] || { name="$(state_value "$dir/LATEST-ERASURES" name)"; [ -z "$name" ] || erasures="$dir/$name"; }
fi
[ -f "$file" ] || die "Yedek dosyası yok: ${file:-<verilmedi>}"
command -v psql >/dev/null || die "psql kurulu değil."

scratch="oggaq_drill_$(date +%s)_$$"
tmpdir="$(mktemp -d)"
cleanup() {
  status=$?
  rm -rf -- "$tmpdir"
  if [ "$keep" = 1 ]; then log "Geçici veritabanı bırakıldı: $scratch (elle silin: dropdb $scratch)"
  else psql -X -Atq -d postgres -c "drop database if exists \"$scratch\" with (force)" >/dev/null 2>&1 || log "UYARI: $scratch silinemedi."; fi
  [ "$status" -eq 0 ] || echo "TATBİKAT BAŞARISIZ (çıkış $status)" >&2
}
trap cleanup EXIT

log "1/4 geri yükleme -> $scratch"
identity_args=(); [ -z "$identity" ] || identity_args=(--identity "$identity")
"$backup_tools/restore.sh" --file "$file" --target-db "$scratch" --yes ${identity_args[@]+"${identity_args[@]}"}

log "2/4 bütünlük denetimi (verify.sh)"
verify_args=()
[ -z "$compare" ] || verify_args=(--expect-counts-from "$compare")
"$backup_tools/verify.sh" "$scratch" ${verify_args[@]+"${verify_args[@]}"} | tee "$tmpdir/verify.out"

log "3/4 manifest karşılaştırması"
manifest="${file%.*}.manifest"
if [ -f "$manifest" ]; then
  mismatch=0
  for pair in users:users questions:questions official_exams:official_exams exam_attempts:exam_attempts erasure_ledger_entries:account_erasures; do
    key="${pair%%:*}"; table="${pair##*:}"
    want="$(state_value "$manifest" "$key")"
    got="$(psql -X -Atq -d "$scratch" -c "select count(*) from $table")"
    if [ "$want" = "$got" ]; then printf '  %-24s %s (manifest ile aynı)\n' "$key" "$got"
    else printf '  %-24s manifest=%s geri yüklenen=%s  <-- FARKLI\n' "$key" "$want" "$got" >&2; mismatch=1; fi
  done
  [ "$mismatch" = 0 ] || die "Geri yüklenen veritabanı manifestle uyuşmuyor."
else
  log "UYARI: $manifest yok; manifest karşılaştırması atlandı."
fi

log "4/4 silinen hesapların yeniden uygulanması (yalnızca sayar, silmez)"
if [ -n "$erasures" ] && [ -n "$backend" ]; then
  [ -f "$erasures" ] || die "Silme listesi dosyası yok: $erasures"
  [ -d "$backend" ] || die "--backend-dir yok: $backend"
  case "$erasures" in
    *.age) [ -r "$identity" ] || die "--identity gerekli."; age -d -i "$identity" "$erasures" >"$tmpdir/erasures.ndjson" ;;
    *.gpg) gpg --batch --yes --no-tty --decrypt "$erasures" >"$tmpdir/erasures.ndjson" ;;
    *) die "Silme listesi .age ya da .gpg olmalı." ;;
  esac
  ( cd "$backend" && DB_DATABASE="$scratch" php artisan accounts:reapply-erasures --from="$tmpdir/erasures.ndjson" )
else
  log "Atlandı (--erasures-file ve --backend-dir verilmedi)."
fi
log "TATBİKAT TAMAM: $(basename "$file") geri yüklenebiliyor."
