#!/usr/bin/env bash
# Cloudflare IP aralıklarını indirir ve nginx real_ip dosyasını yazar. SUNUCUDA, root olarak çalıştırın:
#   sudo ./update-cloudflare-ips.sh && sudo nginx -t && sudo systemctl reload nginx
# Aralıklar nadiren değişir; üç ayda bir ya da Cloudflare duyurusunda yeniden çalıştırın.
# Dosya yalnızca iki liste de indirilip doğrulanırsa değiştirilir (yarım dosya yazılmaz).
set -euo pipefail

target="${1:-/etc/nginx/snippets/cloudflare-realip.conf}"
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT

{
  echo "# Üreten: update-cloudflare-ips.sh, $(date -u +%Y-%m-%dT%H:%MZ). Elle düzenlemeyin."
  for family in v4 v6; do
    list="$(curl -fsS --max-time 20 "https://www.cloudflare.com/ips-${family}")"
    [ -n "$list" ] || { echo "ips-${family} boş döndü" >&2; exit 1; }
    while IFS= read -r range; do
      [[ "$range" =~ ^[0-9a-fA-F:.]+/[0-9]+$ ]] || { echo "Beklenmeyen satır: $range" >&2; exit 1; }
      echo "set_real_ip_from ${range};"
    done <<<"$list"
  done
  echo "real_ip_header CF-Connecting-IP;"
  echo "real_ip_recursive on;"
} >"$tmp"

install -m 0644 "$tmp" "$target"
echo "Yazıldı: $target ($(grep -c set_real_ip_from "$target") aralık)"
