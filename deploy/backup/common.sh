# Yedek betiklerinin ortak işlevleri (kaynak olarak yüklenir; tek başına çalıştırılmaz).
log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }
die() { log "HATA: $*" >&2; alert "$*"; exit 1; }

# Başarısızlık bildirimi: her zaman standart hataya (journald) yazılır; ALERT_WEBHOOK_URL tanımlıysa oraya da gider.
# İleti gizli değer içermez (yalnızca ne olduğunu söyler). Webhook gövdesi {"text": "..."} biçimindedir (Slack/Discord/
# Mattermost uyumlu); farklı bir hizmet için burayı uyarlayın.
alert() {
  [ -n "${ALERT_WEBHOOK_URL:-}" ] || return 0
  local text="OGGAQ yedek: $1 ($(hostname -s))"
  text="${text//\\/\\\\}"; text="${text//\"/\\\"}"
  curl -fsS --max-time 10 -X POST -H 'Content-Type: application/json' -d "{\"text\":\"${text}\"}" "$ALERT_WEBHOOK_URL" >/dev/null 2>&1 || log "Uyarı gönderilemedi (webhook)." >&2
}

sha256_of() {
  if command -v sha256sum >/dev/null; then sha256sum "$1" | awk '{print $1}'; else shasum -a 256 "$1" | awk '{print $1}'; fi
}

file_age_seconds() {
  local modified; modified="$(stat -c %Y "$1" 2>/dev/null || stat -f %m "$1")"
  echo $(( $(date +%s) - modified ))
}

# Aynı anda tek örnek: flock varsa flock, yoksa dizin kilidi (macOS prova).
LOCK_DIR=""
acquire_lock() { # $1: kilit adı
  local base="${LOCK_BASE:-${TMPDIR:-/tmp}}"
  if command -v flock >/dev/null; then
    exec 9>"$base/$1.lock"
    flock -n 9 || die "Başka bir örnek çalışıyor ($1)."
  else
    mkdir "$base/$1.lock.d" 2>/dev/null || die "Başka bir örnek çalışıyor ($1)."
    LOCK_DIR="$base/$1.lock.d"
  fi
}
release_lock() { [ -z "$LOCK_DIR" ] || rmdir "$LOCK_DIR" 2>/dev/null || true; }

encrypt_extension() { case "${ENCRYPT_TOOL:-age}" in age) echo age ;; gpg) echo gpg ;; *) die "ENCRYPT_TOOL age ya da gpg olmalı." ;; esac; }

# Standart girdiyi şifreleyip standart çıktıya yazar. Şifresiz kopya diske hiç yazılmaz.
encrypt_stream() {
  case "${ENCRYPT_TOOL:-age}" in
    age)
      [ -r "${AGE_RECIPIENT_FILE:-}" ] || die "AGE_RECIPIENT_FILE okunamıyor (genel anahtar dosyası)."
      age -R "$AGE_RECIPIENT_FILE" ;;
    gpg)
      [ -n "${GPG_RECIPIENT:-}" ] || die "GPG_RECIPIENT tanımlı değil."
      gpg --batch --yes --no-tty --no-auto-key-locate --trust-model always --encrypt --recipient "$GPG_RECIPIENT" ;;
  esac
}
