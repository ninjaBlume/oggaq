#!/usr/bin/env bash
# Runs on the OWNER'S Mac (not on the server). Pulls the server's encrypted backups, verifies them and warns when the
# newest one is too old. The server keeps no credentials to this machine or to anywhere else: this machine connects in.
#   pull-backups.sh            pull + verify + staleness check + local retention
#   pull-backups.sh --check    no network: only verify the local copy and its age (e.g. before a trip)
# Exit codes: 0 fine, 1 checksum failure (file quarantined), 2 newest backup too old, 3 pull failed.
# Config: PULL_ENV (default ~/.config/oggaq-backup/pull.env), see pull.env.example. Tools: rsync, ssh (both ship with macOS).
set -Eeuo pipefail
umask 077
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=../lib.sh
. "$here/../lib.sh"
alert() { :; }   # this script notifies through notify_user instead

config="${PULL_ENV:-$HOME/.config/oggaq-backup/pull.env}"
[ -f "$config" ] || die "Yapılandırma yok: $config (pull.env.example dosyasını kopyalayın)."
set -a; . "$config"; set +a
LOCAL_DIR="${LOCAL_DIR:-$HOME/oggaq-backups/server-development}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oggaq_dev_ed25519}"
STALE_HOURS="${STALE_HOURS:-26}"
ERASURES_STALE_HOURS="${ERASURES_STALE_HOURS:-6}"
# The Mac keeps its own, longer history; it is cheap and independent of the server's pruning.
export KEEP_DAILY="${KEEP_DAILY:-14}" KEEP_WEEKLY="${KEEP_WEEKLY:-8}" KEEP_MONTHLY="${KEEP_MONTHLY:-12}"
PRUNE_SCRIPT="${PRUNE_SCRIPT:-$here/../../../backup/prune.sh}"
mode="${1:-pull}"

mkdir -p "$LOCAL_DIR"; chmod 700 "$LOCAL_DIR"
logfile="$LOCAL_DIR/pull.log"
say() { log "$@" | tee -a "$logfile"; }
notify_user() { # $1 message; always logged, shown as a macOS notification when possible
  say "UYARI: $1"
  if command -v osascript >/dev/null; then
    local text="${1//\\/\\\\}"; text="${text//\"/\\\"}"
    osascript -e "display notification \"$text\" with title \"OGGAQ yedek\"" >/dev/null 2>&1 || true
  fi
}
worst=0
raise() { [ "$1" -le "$worst" ] || worst="$1"; }

LOCK_BASE="$LOCAL_DIR"
acquire_lock oggaq-pull
trap 'release_lock' EXIT

if [ "$mode" != --check ]; then
  if [ -n "${SOURCE_LOCAL_DIR:-}" ]; then   # rehearsal: a local directory plays the server
    source_spec="${SOURCE_LOCAL_DIR%/}/"; ssh_args=()
  else
    [ -n "${SERVER_SSH:-}" ] && [ -n "${REMOTE_DIR:-}" ] || die "SERVER_SSH ve REMOTE_DIR tanımlı olmalı."
    [ -r "$SSH_KEY" ] || die "SSH anahtarı okunamıyor: $SSH_KEY"
    source_spec="$SERVER_SSH:${REMOTE_DIR%/}/"
    ssh_args=(-e "ssh -i $SSH_KEY -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=20")
  fi
  say "Çekiliyor: ${source_spec}"
  # Only encrypted backups and their small side files; never .partial files, never anything else.
  if rsync -rt --partial ${ssh_args[@]+"${ssh_args[@]}"} \
      --include='oggaq-*.dump.age' --include='oggaq-*.dump.gpg' --include='oggaq-*.dump.manifest' \
      --include='erasures-*.ndjson.age' --include='erasures-*.ndjson.gpg' --include='*.sha256' \
      --include='LATEST' --include='LATEST-ERASURES' --exclude='*' \
      "$source_spec" "$LOCAL_DIR/" >>"$logfile" 2>&1; then
    date -u +%Y-%m-%dT%H:%M:%SZ >"$LOCAL_DIR/.last-pull"
  else
    notify_user "Sunucudan çekme başarısız (bağlantı/anahtar/izin). Ayrıntı: $logfile"
    raise 3
  fi
fi

# Verify every file that has not been verified before (a copy that fails is quarantined, never trusted).
verified="$LOCAL_DIR/.verified"; touch "$verified"
for sum in "$LOCAL_DIR"/*.sha256; do
  [ -e "$sum" ] || continue
  target="${sum%.sha256}"; base="$(basename "$target")"
  [ -f "$target" ] || continue
  grep -qxF -- "$base" "$verified" && continue
  expected="$(awk '{print $1}' "$sum")"
  if [ "$(sha256_of "$target")" = "$expected" ]; then
    echo "$base" >>"$verified"
    say "Doğrulandı: $base"
  else
    mv -- "$target" "$LOCAL_DIR/.corrupt-$base"
    notify_user "Sağlama toplamı uyuşmuyor, dosya karantinaya alındı: $base"
    raise 1
  fi
done

# The file the heartbeat names must exist here and have passed verification (otherwise "fresh" would be a lie).
latest_name="$(state_value "$LOCAL_DIR/LATEST" name)"
if [ -n "$latest_name" ] && { [ ! -f "$LOCAL_DIR/$latest_name" ] || ! grep -qxF -- "$latest_name" "$verified"; }; then
  notify_user "En yeni yedek ($latest_name) bu Mac'te yok ya da doğrulanamadı."
  raise 1
fi

age=$(heartbeat_age "$LOCAL_DIR/LATEST")
if [ "$age" -gt $((STALE_HOURS * 3600)) ]; then
  notify_user "En yeni veritabanı yedeği: $(age_phrase "$age") (sınır ${STALE_HOURS} saat). Sunucudaki zamanlayıcıyı kontrol edin."
  raise 2
else
  say "Yedek taze: $(age_phrase "$age") ($(state_value "$LOCAL_DIR/LATEST" name))."
fi
age=$(heartbeat_age "$LOCAL_DIR/LATEST-ERASURES")
if [ "$age" -gt $((ERASURES_STALE_HOURS * 3600)) ]; then
  notify_user "Silinmiş hesap listesi dışa aktarımı: $(age_phrase "$age") (sınır ${ERASURES_STALE_HOURS} saat)."
  raise 2
fi

if [ "$mode" != --check ] && [ -x "$PRUNE_SCRIPT" ]; then
  "$PRUNE_SCRIPT" "$LOCAL_DIR" | sed 's/^/prune: /' >>"$logfile" || say "UYARI: yerel saklama temizliği başarısız."
fi
# Keep the log small.
if [ "$(wc -l <"$logfile")" -gt 2000 ]; then tail -n 500 "$logfile" >"$logfile.tmp" && mv -- "$logfile.tmp" "$logfile"; fi
exit "$worst"
