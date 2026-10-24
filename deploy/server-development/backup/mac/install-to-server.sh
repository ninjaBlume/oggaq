#!/usr/bin/env bash
# Run on the OWNER'S Mac: copies the backup scripts to a STABLE folder on the server (they then keep working when `current`
# points at a new release). Only the two script folders are copied, nothing else, and nothing is executed on the server.
#   install-to-server.sh [--dry-run]      reads SERVER_SSH / SSH_KEY from the same pull.env as pull-backups.sh
#   install-to-server.sh --to-local DIR   copy into a local directory instead (rehearsal)
# Result on the server: $INSTALL_DIR/deploy/backup/…  and  $INSTALL_DIR/deploy/server-development/backup/…
# (the scripts find each other by that relative layout; INSTALL_DIR defaults to /home/harun/oggaq-development/backup-tools).
set -Eeuo pipefail
umask 077
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_deploy="$(cd "$here/../../.." && pwd)"   # <repo>/deploy
# shellcheck source=../lib.sh
. "$here/../lib.sh"
alert() { :; }

dry=""; local_target=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) dry="--dry-run" ;;
    --to-local) local_target="${2:?}"; shift ;;
    *) die "Bilinmeyen seçenek: $1" ;;
  esac
  shift
done
[ -f "$repo_deploy/backup/backup.sh" ] && [ -f "$repo_deploy/server-development/backup/backup.sh" ] || die "Depo düzeni beklenenden farklı: $repo_deploy"

if [ -n "$local_target" ]; then
  mkdir -p "$local_target/deploy/backup" "$local_target/deploy/server-development/backup"
  dest_base="${local_target%/}"; ssh_args=(); prefix=""
else
  config="${PULL_ENV:-$HOME/.config/oggaq-backup/pull.env}"
  [ -f "$config" ] || die "Yapılandırma yok: $config"
  set -a; . "$config"; set +a
  SSH_KEY="${SSH_KEY:-$HOME/.ssh/oggaq_dev_ed25519}"
  [ -n "${SERVER_SSH:-}" ] || die "SERVER_SSH tanımlı olmalı."
  [ -r "$SSH_KEY" ] || die "SSH anahtarı okunamıyor: $SSH_KEY"
  INSTALL_DIR="${INSTALL_DIR:-/home/harun/oggaq-development/backup-tools}"
  ssh_args=(-e "ssh -i $SSH_KEY -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=20")
  dest_base="${INSTALL_DIR%/}"; prefix="$SERVER_SSH:"
  # Create the target folders first (mkdir -p is the only remote command).
  ssh -i "$SSH_KEY" -o BatchMode=yes -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=20 "$SERVER_SSH" \
    "mkdir -p '$dest_base/deploy/backup' '$dest_base/deploy/server-development/backup' && chmod 700 '$dest_base'" || die "Sunucuda klasör oluşturulamadı."
fi

# No --delete: a stray file on the server is never removed by this script. .example files travel too (they are templates).
for sub in backup server-development/backup; do
  rsync -rt ${dry:+"$dry"} ${ssh_args[@]+"${ssh_args[@]}"} \
    --exclude='mac/' --exclude='*.partial' --exclude='.DS_Store' \
    "$repo_deploy/$sub/" "${prefix}${dest_base}/deploy/$sub/"
done
log "Kopyalandı${dry:+ (deneme)}: ${prefix}${dest_base}/deploy/{backup,server-development/backup}"
