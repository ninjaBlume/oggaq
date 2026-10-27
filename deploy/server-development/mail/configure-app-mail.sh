#!/usr/bin/env bash
# Deploy-user side (no root): configures the private relay or authenticated SMTP and sends one test mail.
#   bash configure-app-mail.sh --to <deneme-adresi> [--host H] [--port 587] [--from destek@oggsor.com] [--username U] [--prompt-password]
# --relay: yalnız 172.30.88.1:25 özel Compose köprüsü; önce setup-exim-relay.sh uygulanmalıdır.
# Hestia mailbox: defaults (host panel.harunaltay.net, username = the from address). SMTP provider (e.g. Brevo): pass
# --host smtp-relay.brevo.com --username <SMTP girişi> --prompt-password (asks for the SMTP key without echo, stores it only in
# shared/mail-password with mode 0600).
# Authenticated SMTP reads shared/mail-password; --relay uses no password. Backs up shared/.env, rewrites only MAIL_* lines,
# recreates app/worker/scheduler (--no-deps: database, redis and the tunnel stay untouched) and sends one test mail.
set -Eeuo pipefail
umask 077
base="${OGGAQ_BASE:-$HOME/oggaq-development}"
host="panel.harunaltay.net"; port="587"; from="destek@oggsor.com"; to=""; send_only=0; username=""; prompt_password=0; relay=0
while [ $# -gt 0 ]; do
  case "$1" in
    --to) to="${2:?}"; shift ;; --host) host="${2:?}"; shift ;; --port) port="${2:?}"; shift ;; --from) from="${2:?}"; shift ;;
    --relay) relay=1 ;;
    --send-only) send_only=1 ;;
    --username) username="${2:?}"; shift ;;
    --prompt-password) prompt_password=1 ;;
    *) echo "Bilinmeyen seçenek: $1" >&2; exit 2 ;;
  esac
  shift
done
[ -n "$to" ] || { echo "--to <adres> gerekli." >&2; exit 2; }
env_file="$base/shared/.env"; password_file="$base/shared/mail-password"; manage="$base/manage"
[ -f "$env_file" ] && [ -x "$manage" ] || { echo ".env ya da manage bulunamadı ($base)." >&2; exit 1; }

if [ "$relay" = 1 ]; then
  [ "$prompt_password" = 0 ] || { echo "Relay kipinde parola kullanılmaz." >&2; exit 2; }
  host="172.30.88.1"; port="25"
fi
username="${username:-$from}"
if [ "$prompt_password" = 1 ]; then
  [ -t 0 ] || { echo "--prompt-password etkileşimli bir terminal ister." >&2; exit 2; }
  read -rsp "SMTP parolası/anahtarı (yazarken görünmez): " secret; echo
  [ -n "$secret" ] || { echo "Boş parola." >&2; exit 2; }
  printf '%s\n' "$secret" >"$password_file"; chmod 600 "$password_file"; unset secret
fi
if [ "$send_only" = 0 ]; then
  [ "$relay" = 1 ] || [ -r "$password_file" ] || { echo "Parola dosyası yok: $password_file (önce setup-hestia-mail.sh)." >&2; exit 1; }
  backup="$(mktemp "$base/shared/.env.bak.XXXXXX")"; cp -p "$env_file" "$backup"; chmod 600 "$backup"
  tmp="$(mktemp "$base/shared/.env.XXXXXX")"
  grep -vE '^(MAIL_MAILER|MAIL_HOST|MAIL_PORT|MAIL_USERNAME|MAIL_PASSWORD|MAIL_FROM_ADDRESS|MAIL_FROM_NAME|MAIL_SCHEME|MAIL_URL)=' "$env_file" >"$tmp"
  {
    echo "MAIL_MAILER=smtp"; echo "MAIL_HOST=$host"; echo "MAIL_PORT=$port"
    if [ "$relay" = 1 ]; then
      echo 'MAIL_URL="smtp://172.30.88.1:25?auto_tls=false"'
      echo "MAIL_USERNAME=null"; echo "MAIL_PASSWORD=null"
    else
      echo "MAIL_USERNAME=$username"; printf 'MAIL_PASSWORD=%s\n' "$(head -n 1 "$password_file")"
    fi
    echo "MAIL_FROM_ADDRESS=$from"
    echo 'MAIL_FROM_NAME="ÖGG SOR - Soru Bankası"'
  } >>"$tmp"
  chmod 600 "$tmp"; mv "$tmp" "$env_file"
  rollback() {
    code=$?; trap - ERR
    cp -p "$backup" "$env_file"
    "$manage" up -d --no-deps --force-recreate app worker scheduler >/dev/null 2>&1 || true
    "$manage" exec -T web nginx -s reload >/dev/null 2>&1 || true
    echo "Posta yapılandırması başarısız; önceki .env geri yüklendi. Servisleri kontrol edin." >&2
    exit "$code"
  }
  trap rollback ERR
  echo ".env güncellendi (yedek: $backup). Konteynerler yenileniyor…"
  "$manage" up -d --no-deps --force-recreate app worker scheduler
  sleep 8
  # app may receive a new Compose IP; nginx must resolve its FastCGI upstream again.
  "$manage" exec -T web nginx -t
  "$manage" exec -T web nginx -s reload
  healthy=0
  for attempt in 1 2 3 4 5 6 7 8; do
    if "$manage" exec -T web wget -T 3 -qO- http://127.0.0.1:8080/up >/dev/null 2>&1; then healthy=1; break; fi
    sleep 2
  done
  [ "$healthy" = 1 ] || { echo "API yeniden hazır olmadı." >&2; false; }
fi

echo "Deneme e-postası gönderiliyor: $to"
"$manage" exec -T app php -r '
require "vendor/autoload.php"; $app = require "bootstrap/app.php";
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$to = $argv[1];
try {
  Illuminate\Support\Facades\Mail::raw("Bu bir deneme e-postasıdır. Alıyorsanız posta ayarları çalışıyor.", fn ($m) => $m->to($to)->subject(config("app.name")." deneme e-postası"));
  echo "Gönderildi (sunucu kabul etti). Gelen kutusu ve spam klasörünü kontrol edin.\n";
} catch (Throwable $e) { fwrite(STDERR, "Gönderilemedi: ".$e->getMessage()."\n"); exit(1); }
' "$to"

trap - ERR
