#!/usr/bin/env bash
# Offline: stub manage/sleep, synthetic .env; no mail or server access.
set -Eeuo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
mkdir -p "$work/shared" "$work/bin"
cat >"$work/shared/.env" <<'ENV'
APP_KEY=synthetic-test-key
MAIL_MAILER=smtp
MAIL_URL="smtp://old.invalid:1025"
MAIL_USERNAME=synthetic-old-user
MAIL_PASSWORD=synthetic-old-password
MAIL_FROM_ADDRESS=old@example.test
MAIL_FROM_NAME=OldName
ENV
cp "$work/shared/.env" "$work/original"
cat >"$work/manage" <<'MANAGE'
#!/usr/bin/env bash
echo "$1" >>"$OGGAQ_BASE/calls"
if [ "$1" = exec ] && [[ "$*" = *"php -r"* ]] && [ -f "$OGGAQ_BASE/fail" ]; then exit 1; fi
if [ "$1" = exec ] && [[ "$*" = *"nginx -t"* ]] && [ -f "$OGGAQ_BASE/fail-web" ]; then exit 1; fi
MANAGE
printf '#!/bin/sh\nexit 0\n' >"$work/bin/sleep"
chmod +x "$work/manage" "$work/bin/sleep"
export OGGAQ_BASE="$work"; export PATH="$work/bin:$PATH"
fail() { echo "BAŞARISIZ: $*" >&2; exit 1; }
out="$(bash "$here/configure-app-mail.sh" --relay --to probe@example.test)"
grep -q '^APP_KEY=synthetic-test-key$' "$work/shared/.env" || fail "diğer ayar değişti"
grep -q '^MAIL_URL="smtp://172.30.88.1:25?auto_tls=false"$' "$work/shared/.env" || fail "özel relay URL yok"
grep -q '^MAIL_FROM_ADDRESS=destek@oggsor.com$' "$work/shared/.env" || fail "gönderen yanlış"
grep -q '^MAIL_FROM_NAME="ÖGG SOR - Soru Bankası"$' "$work/shared/.env" || fail "eski gönderen adı kaldı"
[ "$(grep -c '^MAIL_FROM_NAME=' "$work/shared/.env")" = 1 ] || fail "gönderen adı tekrar ediyor"
[ "$(grep -c '^MAIL_URL=' "$work/shared/.env")" = 1 ] || fail "eski URL silinmedi"
grep -q '^MAIL_PASSWORD=null$' "$work/shared/.env" || fail "eski parola kaldı"
echo "$out" | grep -q synthetic-old-password && fail "parola çıktıya sızdı"
cp "$work/original" "$work/shared/.env"; : >"$work/calls"; touch "$work/fail"
if bash "$here/configure-app-mail.sh" --relay --to probe@example.test >"$work/output" 2>&1; then fail "gönderim hatası kabul edildi"; fi
cmp -s "$work/original" "$work/shared/.env" || fail "başarısız gönderimde .env geri alınmadı"
[ "$(grep -c '^up$' "$work/calls")" = 2 ] || fail "geri alma servisleri yenilemedi"
rm "$work/fail"; touch "$work/fail-web"; : >"$work/calls"
if bash "$here/configure-app-mail.sh" --relay --to probe@example.test >"$work/output" 2>&1; then fail "web sağlık hatası kabul edildi"; fi
cmp -s "$work/original" "$work/shared/.env" || fail "web hatasında .env geri alınmadı"
python3 - "$work/shared" <<'PYTEST'
import stat, sys
from pathlib import Path
backups=list(Path(sys.argv[1]).glob('.env.bak.*'))
assert len(backups)==3, 'Her işlem benzersiz yedek üretmeli'
assert all(stat.S_IMODE(p.stat().st_mode)==0o600 for p in backups), 'Yedekler 0600 olmalı'
PYTEST
echo "tamam: özel relay, eski URL temizliği, gizli değer çıktısı ve geri alma kontrolleri geçti"
