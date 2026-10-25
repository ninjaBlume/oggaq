#!/usr/bin/env bash
# One-time root setup of outgoing mail for a domain on the shared Hestia host: adds the mail domain (DKIM on), a no-reply
# mailbox with a random password, and writes the DNS records to publish. It changes nothing else: no MX, no Exim/Dovecot
# configuration (Dovecot is only restarted with --fix-dovecot), no other Hestia user or domain.
#   sudo bash setup-hestia-mail.sh                       lists the Hestia users and exits
#   sudo bash setup-hestia-mail.sh --user NAME           sets up codentum.net / no-reply for that Hestia user
#   options: --domain D (codentum.net) --account A (no-reply) --deploy-user U (harun) --out DIR --fix-dovecot
# Outputs (owned by the deploy user): DIR/mail-password (0600, never printed) and DIR/mail-dns-records.txt (public values).
set -Eeuo pipefail
umask 077

domain="codentum.net"; account="no-reply"; deploy_user="harun"; hestia_user=""; fix_dovecot=0
out=""
HESTIA_BIN="${HESTIA_BIN:-/usr/local/hestia/bin}"
HESTIA_USERS="${HESTIA_USERS:-/usr/local/hestia/data/users}"
while [ $# -gt 0 ]; do
  case "$1" in
    --user) hestia_user="${2:?}"; shift ;;
    --domain) domain="${2:?}"; shift ;;
    --account) account="${2:?}"; shift ;;
    --deploy-user) deploy_user="${2:?}"; shift ;;
    --out) out="${2:?}"; shift ;;
    --fix-dovecot) fix_dovecot=1 ;;
    -h|--help) sed -n 2,11p "$0"; exit 0 ;;
    *) echo "Bilinmeyen seçenek: $1" >&2; exit 2 ;;
  esac
  shift
done
[ "$(id -u)" -eq 0 ] || { echo "Root olarak çalıştırın: sudo bash $0 …" >&2; exit 1; }
[ -d "$HESTIA_BIN" ] || { echo "Hestia bulunamadı: $HESTIA_BIN" >&2; exit 1; }
out="${out:-/home/$deploy_user/oggaq-development/shared}"

if [ -z "$hestia_user" ]; then
  echo "Hestia kullanıcıları (alan bunlardan birinin altına eklenir):"
  for dir in "$HESTIA_USERS"/*/; do [ -d "$dir" ] && printf '  %s\n' "$(basename "$dir")"; done
  echo "Birini seçip yeniden çalıştırın: sudo bash $0 --user <ad>"
  exit 0
fi
[ -d "$HESTIA_USERS/$hestia_user" ] || { echo "Böyle bir Hestia kullanıcısı yok: $hestia_user" >&2; exit 1; }
[ -d "$out" ] || { echo "Çıktı klasörü yok: $out" >&2; exit 1; }
case "$domain$account" in *[!a-zA-Z0-9.-]*) echo "Alan ya da hesap adında geçersiz karakter." >&2; exit 2 ;; esac

echo "== Dovecot (SMTP kimlik doğrulaması buna dayanır)"
if systemctl is-active --quiet dovecot; then echo "  çalışıyor"
else
  echo "  ÇALIŞMIYOR. Son günlük satırları:"; journalctl -u dovecot -n 12 --no-pager 2>&1 | sed 's/^/    /' | cut -c1-200
  if [ "$fix_dovecot" = 1 ]; then
    echo "  --fix-dovecot verildi: yeniden başlatılıyor"; systemctl restart dovecot
    systemctl is-active --quiet dovecot && echo "  şimdi çalışıyor" || { echo "  hâlâ çalışmıyor; günlüğe bakın." >&2; }
  else echo "  Dokunulmadı. Nedenini görmek için yukarıdaki günlüğe bakın; denemek için --fix-dovecot ile yeniden çalıştırın."; fi
fi

echo "== Posta alanı: $domain ($hestia_user)"
if "$HESTIA_BIN/v-list-mail-domain" "$hestia_user" "$domain" >/dev/null 2>&1; then echo "  zaten var, atlandı"
else "$HESTIA_BIN/v-add-mail-domain" "$hestia_user" "$domain"; echo "  eklendi (DKIM açık)"; fi

echo "== Hesap: $account@$domain"
if "$HESTIA_BIN/v-list-mail-account" "$hestia_user" "$domain" "$account" >/dev/null 2>&1; then
  echo "  zaten var, atlandı (parola dosyasına dokunulmadı)"
else
  password="$(openssl rand -base64 36 | tr -dc 'A-Za-z0-9' | head -c 28)"
  [ "${#password}" -ge 24 ] || { echo "Parola üretilemedi." >&2; exit 1; }
  printf '%s\n' "$password" >"$out/mail-password"
  chown "$deploy_user:$(id -gn "$deploy_user")" "$out/mail-password"; chmod 600 "$out/mail-password"
  "$HESTIA_BIN/v-add-mail-account" "$hestia_user" "$domain" "$account" "$password"
  unset password
  echo "  eklendi; parola $out/mail-password dosyasında (ekrana yazılmadı)"
fi

echo "== DNS kayıtları ($out/mail-dns-records.txt)"
{
  echo "# $domain için yayımlanacak kayıtlar (herkese açık değerler). Cloudflare'de 'yalnız DNS' (gri bulut)."
  echo "## DKIM (Hestia'dan)"
  "$HESTIA_BIN/v-list-mail-domain-dkim-dns" "$hestia_user" "$domain" plain 2>/dev/null || "$HESTIA_BIN/v-list-mail-domain-dkim-dns" "$hestia_user" "$domain" 2>&1 || echo "(alınamadı: panelde Mail > $domain > DNS kayıtları)"
  echo "## SPF (tek kayıt; Cloudflare E-posta Yönlendirme de kullanılıyorsa include dahil)"
  echo "$domain TXT \"v=spf1 include:_spf.mx.cloudflare.net ip4:$(curl -s -m 5 https://ifconfig.me || echo SUNUCU_IP) ~all\""
  echo "## DMARC (başlangıç: yalnız izle)"
  echo "_dmarc.$domain TXT \"v=DMARC1; p=none; rua=mailto:hello@$domain\""
} >"$out/mail-dns-records.txt"
chown "$deploy_user:$(id -gn "$deploy_user")" "$out/mail-dns-records.txt"; chmod 644 "$out/mail-dns-records.txt"
cat "$out/mail-dns-records.txt" | cut -c1-240
echo
echo "Tamam. MX'e dokunulmadı. Sıradaki: kayıtları Cloudflare'e ekleyin, sonra uygulama tarafını yapılandırın."
