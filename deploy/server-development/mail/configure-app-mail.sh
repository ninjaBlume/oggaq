#!/usr/bin/env bash
# Deploy-user side (no root): points the application at the Hestia mailbox and sends one test mail.
#   bash configure-app-mail.sh --to <deneme-adresi> [--host H] [--port 587] [--from no-reply@codentum.net] [--username U] [--prompt-password]
# Hestia mailbox: defaults (host panel.harunaltay.net, username = the from address). SMTP provider (e.g. Brevo): pass
# --host smtp-relay.brevo.com --username <SMTP girişi> --prompt-password (asks for the SMTP key without echo, stores it only in
# shared/mail-password with mode 0600).
# Reads the password from shared/mail-password (never printed), backs up shared/.env, rewrites only MAIL_* lines,
# recreates app/worker/scheduler (--no-deps: database, redis and the tunnel stay untouched) and sends one test mail.
set -Eeuo pipefail
umask 077
base="${OGGAQ_BASE:-$HOME/oggaq-development}"
host="panel.harunaltay.net"; port="587"; from="no-reply@codentum.net"; to=""; send_only=0; username=""; prompt_password=0
while [ $# -gt 0 ]; do
  case "$1" in
    --to) to="${2:?}"; shift ;; --host) host="${2:?}"; shift ;; --port) port="${2:?}"; shift ;; --from) from="${2:?}"; shift ;;
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

username="${username:-$from}"
if [ "$prompt_password" = 1 ]; then
  [ -t 0 ] || { echo "--prompt-password etkileşimli bir terminal ister." >&2; exit 2; }
  read -rsp "SMTP parolası/anahtarı (yazarken görünmez): " secret; echo
  [ -n "$secret" ] || { echo "Boş parola." >&2; exit 2; }
  printf '%s\n' "$secret" >"$password_file"; chmod 600 "$password_file"; unset secret
fi
if [ "$send_only" = 0 ]; then
  [ -r "$password_file" ] || { echo "Parola dosyası yok: $password_file (önce setup-hestia-mail.sh)." >&2; exit 1; }
  backup="$env_file.bak-$(date +%Y%m%d%H%M%S)"; cp -p "$env_file" "$backup"; chmod 600 "$backup"
  tmp="$(mktemp "$base/shared/.env.XXXXXX")"
  grep -vE '^(MAIL_MAILER|MAIL_HOST|MAIL_PORT|MAIL_USERNAME|MAIL_PASSWORD|MAIL_FROM_ADDRESS|MAIL_SCHEME)=' "$env_file" >"$tmp"
  {
    echo "MAIL_MAILER=smtp"; echo "MAIL_HOST=$host"; echo "MAIL_PORT=$port"
    echo "MAIL_USERNAME=$username"; printf 'MAIL_PASSWORD=%s\n' "$(head -n 1 "$password_file")"; echo "MAIL_FROM_ADDRESS=$from"
  } >>"$tmp"
  chmod 600 "$tmp"; mv "$tmp" "$env_file"
  echo ".env güncellendi (yedek: $backup). Konteynerler yenileniyor…"
  "$manage" up -d --no-deps --force-recreate app worker scheduler
  sleep 8
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
