#!/usr/bin/env bash
# OGGAQ dağıtım betiği. SUNUCUDA, `oggaq` kullanıcısı olarak çalışır (docs/DEPLOYMENT.md).
#
#   deploy.sh deploy <etiket|dal|commit>   yeni sürümü kurar, sağlık denetimi geçerse yayına alır
#   deploy.sh rollback [sürüm-kimliği]     bir önceki (ya da belirtilen) sürüme döner
#   deploy.sh status                       yayındaki ve eski sürümleri listeler
#
# Yöntem: SÜRÜM DİZİNLERİ + ATOMİK SEMBOLİK BAĞ. Her dağıtım /srv/oggaq/releases/<zaman>-<commit> altına tam bir
# kopya kurar; kurulum bitip sağlık denetimi geçmeden yayındaki sürüme (current) dokunulmaz, geçiş tek bir
# sembolik bağ değişikliğidir ve geri dönüş de aynı tek adımdır. Yerinde güncelleme (git pull + bakım modu)
# yarım güncellenmiş kodu sunar ve geri dönüşü zorlaştırır; bu proje küçük olduğu için disk maliyeti önemsizdir.
# Veritabanı migration'ları geri alınmaz: geri dönüş yalnızca kodu eski sürüme çevirir, bu yüzden her migration
# bir önceki kodla da çalışacak şekilde (önce ekle, sonra kaldır) yazılmalıdır. Aksi hâlde geri yükleme gerekir.
#
# Ortam: OGGAQ_BASE (varsayılan /srv/oggaq). Yapılandırma: $BASE/shared/deploy.env (REPO_URL, API_URL, ...).
# Prova için: OGGAQ_SKIP_SERVICES=1 systemctl/sudo çağrılarını ve dağıtım öncesi yedeği atlar,
# OGGAQ_SKIP_HEALTH=1 sağlık denetimini atlar (yalnızca ilk kurulum provası).
set -Eeuo pipefail
umask 027

BASE="${OGGAQ_BASE:-/srv/oggaq}"
RELEASES="$BASE/releases"
SHARED="$BASE/shared"
CURRENT="$BASE/current"
REPO="$BASE/repo.git"

NEW_DIR=""
SWITCHED=0
LOCK_DIR=""

log() { printf '%s %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { log "HATA: $*" >&2; exit 1; }

load_config() {
  [ -f "$SHARED/deploy.env" ] || die "$SHARED/deploy.env yok (docs/DEPLOYMENT.md 'Dağıtım yapılandırması')."
  # shellcheck disable=SC1091
  . "$SHARED/deploy.env"
  : "${REPO_URL:?deploy.env içinde REPO_URL tanımlı olmalı}"
  : "${API_URL:?deploy.env içinde API_URL tanımlı olmalı (https://api.example.com)}"
  KEEP_RELEASES="${KEEP_RELEASES:-5}"
  HEALTH_URL="${HEALTH_URL:-${API_URL%/}/api/v1/health/ready}"
  HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-120}"
  PRE_DEPLOY_BACKUP="${PRE_DEPLOY_BACKUP:-1}"
}

file_mode() { stat -c '%a' "$1" 2>/dev/null || stat -f '%Lp' "$1"; }

env_value() { grep -E "^$1=" "$SHARED/.env" | tail -n1 | cut -d= -f2- || true; }

services() { # $@: sudo ile çalıştırılacak systemctl bağımsız değişkenleri
  [ "${OGGAQ_SKIP_SERVICES:-0}" = 1 ] && { log "(prova) systemctl $*"; return 0; }
  sudo -n /usr/bin/systemctl "$@"
}

preflight() {
  for command_name in git php composer node npm curl tar; do
    command -v "$command_name" >/dev/null || die "$command_name kurulu değil."
  done
  php -r 'exit(PHP_VERSION_ID >= 80400 ? 0 : 1);' || die "PHP 8.4 gerekir."
  [ "$(node -p 'process.versions.node.split(".")[0]')" = 24 ] || die "Node 24 gerekir (derleme için)."
  [ -f "$SHARED/.env" ] || die "$SHARED/.env yok (deploy/.env.production.example'dan oluşturun)."
  local mode; mode="$(file_mode "$SHARED/.env")"
  case "$mode" in 600|640|400) ;; *) die "$SHARED/.env izni $mode; 0600 olmalı." ;; esac
  [ "$(env_value APP_ENV)" = production ] || die ".env içinde APP_ENV=production olmalı."
  [ "$(env_value APP_DEBUG)" = false ] || die ".env içinde APP_DEBUG=false olmalı."
  [[ "$(env_value APP_KEY)" == base64:?* ]] || die ".env içinde APP_KEY tanımlı değil (php artisan key:generate --show)."
  [ -n "$(env_value ERASURE_LEDGER_KEY)" ] || die ".env içinde ERASURE_LEDGER_KEY tanımlı değil."
  [ "$(env_value SESSION_SECURE_COOKIE)" = true ] || die ".env içinde SESSION_SECURE_COOKIE=true olmalı."
  local free_kb; free_kb="$(df -Pk "$BASE" | awk 'NR==2 {print $4}')"
  [ "${free_kb:-0}" -ge 2097152 ] || die "$BASE diskinde en az 2 GB boş yer gerekir."
  mkdir -p "$RELEASES" "$SHARED/storage/app/public" "$SHARED/storage/framework/cache/data" \
    "$SHARED/storage/framework/sessions" "$SHARED/storage/framework/views" "$SHARED/storage/logs"
}

current_release() { [ -L "$CURRENT" ] && basename "$(readlink "$CURRENT")" || true; }

# Sürüm kimlikleri zaman damgasıyla başladığı için ada göre sıralama kronolojiktir.
list_releases() { ls -1 "$RELEASES" 2>/dev/null | sort || true; }

switch_to() { # $1: sürüm kimliği
  local target="$RELEASES/$1"
  [ -d "$target" ] || die "Sürüm yok: $1"
  if mv --help 2>&1 | grep -q -- '--no-target-directory'; then
    ln -sfn "$target" "$BASE/current.new" && mv -Tf "$BASE/current.new" "$CURRENT" # GNU: atomik
  else
    ln -sfn "$target" "$CURRENT" # BSD/macOS (yalnızca geliştirme provası): atomik değildir
  fi
}

restart_services() {
  services reload php8.4-fpm
  (cd "$CURRENT/backend" && php artisan horizon:terminate >/dev/null 2>&1) || true
  services restart oggaq-horizon
  services restart oggaq-scheduler
}

health_ok() { # başarı: HTTP 200 ve durum "ok"
  [ "${OGGAQ_SKIP_HEALTH:-0}" = 1 ] && { log "(prova) sağlık denetimi atlandı"; return 0; }
  local waited=0 body code
  while [ "$waited" -lt "$HEALTH_TIMEOUT" ]; do
    body="$(curl -sS --max-time 5 -w '\n%{http_code}' "$HEALTH_URL" 2>/dev/null || true)"
    code="${body##*$'\n'}"
    if [ "$code" = 200 ] && grep -q '"status":"ok"' <<<"$body"; then return 0; fi
    sleep 3; waited=$((waited + 3))
  done
  log "Son yanıt: HTTP ${code:-yok} $(printf '%s' "$body" | head -n1 | cut -c1-200)"
  return 1
}

prune() {
  local keep="$KEEP_RELEASES" current previous count=0 id
  current="$(current_release)"
  # En yeni $keep sürüm ve yayındaki sürüm kalır, gerisi silinir.
  while IFS= read -r id; do
    count=$((count + 1))
    [ "$count" -le "$keep" ] && continue
    previous="$id"
    [ "$previous" = "$current" ] && continue
    rm -rf "${RELEASES:?}/$previous"
    log "Eski sürüm silindi: $previous"
  done < <(list_releases | sort -r)
}

build_release() { # $1: sürüm dizini
  local dir="$1"
  log "Backend bağımlılıkları (composer, yalnız üretim)"
  (cd "$dir/backend" && composer install --no-dev --optimize-autoloader --no-interaction --no-progress --prefer-dist)
  log "Web ve yönetim paneli derlemesi (VITE_API_URL=$API_URL)"
  (cd "$dir" && npm ci --no-audit --no-fund --loglevel=error \
    && VITE_API_URL="$API_URL" npm run build:web --silent \
    && VITE_API_URL="$API_URL" npm run build:admin --silent)
  # Derleme araçları çalışma zamanında gerekmez; disk ve saldırı yüzeyi küçülür.
  rm -rf "$dir/node_modules" "$dir"/apps/*/node_modules "$dir"/packages/*/node_modules
  [ -f "$dir/apps/web/dist/index.html" ] && [ -f "$dir/apps/admin/dist/index.html" ] || die "Derleme çıktısı eksik."
}

# Kurulum yarıda kalırsa yarım sürüm silinir; yayındaki sürüme hiç dokunulmamıştır.
on_exit() {
  local status=$?
  [ -z "$LOCK_DIR" ] || rmdir "$LOCK_DIR" 2>/dev/null || true
  if [ "$status" -ne 0 ] && [ -n "$NEW_DIR" ] && [ "$SWITCHED" != 1 ]; then
    log "Kurulum başarısız; yarım sürüm siliniyor: $(basename "$NEW_DIR")" >&2
    rm -rf "$NEW_DIR"
  fi
}

deploy() {
  local ref="${1:?kullanım: deploy.sh deploy <etiket|dal|commit>}" commit id dir previous
  if [ -d "$REPO" ]; then git --git-dir="$REPO" remote update --prune >/dev/null; else git clone --quiet --mirror "$REPO_URL" "$REPO"; fi
  commit="$(git --git-dir="$REPO" rev-parse --verify --quiet "${ref}^{commit}")" || die "Başvuru bulunamadı: $ref"
  previous="$(current_release)"
  if [ -n "$previous" ] && [ "$(cat "$RELEASES/$previous/.commit" 2>/dev/null)" = "$commit" ] && [ -z "${FORCE:-}" ]; then
    log "Bu commit zaten yayında ($previous); yapılacak bir şey yok (zorlamak için FORCE=1)."
    return 0
  fi
  id="$(date -u +%Y%m%d%H%M%S)-${commit:0:7}"
  dir="$RELEASES/$id"
  mkdir -p "$dir"
  NEW_DIR="$dir"
  log "Sürüm $id (başvuru: $ref) çıkarılıyor"
  git --git-dir="$REPO" archive "$commit" | tar -x -C "$dir"
  printf '%s\n' "$commit" >"$dir/.commit"
  printf '%s\n' "$ref" >"$dir/.ref"
  ln -sfn "$SHARED/.env" "$dir/backend/.env"
  rm -rf "$dir/backend/storage"
  ln -sfn "$SHARED/storage" "$dir/backend/storage"
  mkdir -p "$dir/backend/bootstrap/cache"
  build_release "$dir"

  if [ "$PRE_DEPLOY_BACKUP" = 1 ] && [ -n "$previous" ]; then
    log "Dağıtım öncesi veritabanı yedeği"
    services start oggaq-backup.service || die "Yedek alınamadı; migration çalıştırılmadı."
  fi
  log "Migration (veritabanı bir önceki kodla da uyumlu kalmalıdır)"
  (cd "$dir/backend" && php artisan migrate --force --no-interaction)
  (cd "$dir/backend" && php artisan config:cache && php artisan route:cache && php artisan event:cache && php artisan view:cache)

  log "Yayına alınıyor"
  switch_to "$id"
  SWITCHED=1
  restart_services
  if health_ok; then
    log "Sağlık denetimi geçti. Sürüm yayında: $id"
  else
    if [ -n "$previous" ]; then
      log "Sağlık denetimi BAŞARISIZ. Bir önceki sürüme dönülüyor: $previous" >&2
      switch_to "$previous"
      restart_services
      die "Dağıtım geri alındı. Neden için: journalctl -u oggaq-horizon, nginx ve storage/logs. Migration geri alınmadı."
    fi
    die "İlk dağıtımda sağlık denetimi başarısız; dönülecek sürüm yok. Sunucu günlüklerine bakın."
  fi
  date -u +%Y-%m-%dT%H:%M:%SZ >"$BASE/last-deploy"
  prune
}

rollback() {
  local target="${1:-}" current previous
  current="$(current_release)"
  [ -n "$current" ] || die "Yayında sürüm yok."
  if [ -z "$target" ]; then
    previous="$(list_releases | sort | awk -v c="$current" '$0 == c { print last; exit } { last = $0 }')"
    [ -n "$previous" ] || die "Dönülecek eski sürüm yok."
    target="$previous"
  fi
  log "Geri dönülüyor: $current -> $target"
  switch_to "$target"
  restart_services
  health_ok || die "Geri dönülen sürüm de sağlık denetimini geçemedi: $target"
  log "Geri dönüldü. Not: migration'lar geri alınmadı; veri bozulduysa docs/DEPLOYMENT.md 'Geri yükleme'."
}

status() {
  local current id; current="$(current_release)"
  while IFS= read -r id; do
    printf '%s %s %s\n' "$([ "$id" = "$current" ] && echo '*' || echo ' ')" "$id" "$(cat "$RELEASES/$id/.ref" 2>/dev/null || true)"
  done < <(list_releases)
  [ -f "$BASE/last-deploy" ] && printf 'Son dağıtım: %s\n' "$(cat "$BASE/last-deploy")"
  return 0
}

# Aynı anda tek dağıtım. Linux'ta flock; flock'u olmayan geliştirme makinesinde (macOS prova) dizin kilidi.
acquire_lock() {
  if command -v flock >/dev/null; then
    exec 9>"$BASE/.deploy.lock"
    flock -n 9 || die "Başka bir dağıtım çalışıyor."
  else
    mkdir "$BASE/.deploy.lock.d" 2>/dev/null || die "Başka bir dağıtım çalışıyor ($BASE/.deploy.lock.d)."
    LOCK_DIR="$BASE/.deploy.lock.d"
  fi
}

main() {
  local command_name="${1:-}"; shift || true
  mkdir -p "$BASE"
  acquire_lock
  trap on_exit EXIT
  load_config
  case "$command_name" in
    deploy) preflight; deploy "$@" ;;
    rollback) rollback "$@" ;;
    status) status ;;
    *) sed -n '2,12p' "$0"; exit 2 ;;
  esac
}

main "$@"
