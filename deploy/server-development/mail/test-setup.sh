#!/usr/bin/env bash
# Offline test of setup-hestia-mail.sh with stub Hestia commands (no root, no Hestia, nothing on the network is changed).
# `id -u` is faked through a PATH shim so the root check passes.
set -Eeuo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
mkdir -p "$work/bin" "$work/users/ornek" "$work/out" "$work/shim" "$work/state"
for cmd in v-list-mail-domain v-list-mail-account; do
  printf '#!/usr/bin/env bash\n[ -e "%s/$(basename "$0").$2.${3:-}" ]\n' "$work/state" >"$work/bin/$cmd"
done
cat >"$work/bin/v-add-mail-domain" <<EOS
#!/usr/bin/env bash
touch "$work/state/v-list-mail-domain.\$2."; echo "\$@" >>"$work/state/calls"
EOS
cat >"$work/bin/v-add-mail-account" <<EOS
#!/usr/bin/env bash
touch "$work/state/v-list-mail-account.\$2.\$3"; echo "add-account \$1 \$2 \$3 <password>" >>"$work/state/calls"
EOS
printf '#!/usr/bin/env bash\necho "mail._domainkey TXT v=DKIM1; k=rsa; p=ORNEKANAHTAR"\n' >"$work/bin/v-list-mail-domain-dkim-dns"
printf '#!/bin/sh\n[ "${1:-}" = -u ] && { echo 0; exit 0; }\nexec /usr/bin/id "$@"\n' >"$work/shim/id"
printf '#!/bin/sh\necho 203.0.113.7\n' >"$work/shim/curl"
printf '#!/bin/sh\nexit 0\n' >"$work/shim/systemctl"
chmod +x "$work"/bin/* "$work"/shim/*
run() { PATH="$work/shim:$PATH" HESTIA_BIN="$work/bin" HESTIA_USERS="$work/users" bash "$here/setup-hestia-mail.sh" --deploy-user "$(/usr/bin/id -un)" --out "$work/out" "$@"; }
fail() { echo "BAŞARISIZ: $*" >&2; exit 1; }

list="$(run)"; echo "$list" | grep -q "ornek" || fail "kullanıcı listesi gelmedi"
run --user ornek >/dev/null || fail "ilk kurulum"
[ -f "$work/out/mail-password" ] || fail "parola dosyası yok"
[ "$(stat -f '%Lp' "$work/out/mail-password" 2>/dev/null || stat -c '%a' "$work/out/mail-password")" = 600 ] || fail "parola dosyası 0600 değil"
[ "$(wc -c <"$work/out/mail-password")" -ge 25 ] || fail "parola kısa"
grep -q "ORNEKANAHTAR" "$work/out/mail-dns-records.txt" || fail "DKIM yok"
grep -q "ip4:203.0.113.7" "$work/out/mail-dns-records.txt" || fail "SPF yok"
grep -q "p=none" "$work/out/mail-dns-records.txt" || fail "DMARC yok"
first="$(cat "$work/out/mail-password")"
out2="$(run --user ornek)"; echo "$out2" | grep -q "zaten var, atlandı" || fail "ikinci çalıştırma atlamadı"
[ "$(cat "$work/out/mail-password")" = "$first" ] || fail "parola ezildi"
[ "$(grep -c '^add-account' "$work/state/calls")" = 1 ] || fail "hesap iki kez eklendi"
grep -q "$first" "$work/state/calls" && fail "parola çağrı kaydına sızdı"
run --user yok >/dev/null 2>&1 && fail "olmayan kullanıcı kabul edildi"
echo "tamam: setup-hestia-mail.sh testleri geçti"
