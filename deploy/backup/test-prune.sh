#!/usr/bin/env bash
# prune.sh saklama kuralının kendi kendine sınaması (geçici dizinde, gerçek yedeğe dokunmaz):  ./test-prune.sh
# 1 Ocak - 23 Ekim 2026 arası günlük dosyalar (son üç gün için günde iki) üretir; 7/4/6 kuralını denetler.
set -Eeuo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
work="$(mktemp -d)"; trap 'rm -rf "$work"' EXIT
fail() { echo "BAŞARISIZ: $*" >&2; exit 1; }

epoch=$(python3 - <<'PY'
import datetime
d=datetime.date(2026,1,1); end=datetime.date(2026,10,23)
while d<=end:
    stamps=[f"{d:%Y%m%d}T033000Z"]
    if (end-d).days<3: stamps.append(f"{d:%Y%m%d}T194500Z")   # dağıtım öncesi ikinci yedek
    for s in stamps: print(s)
    d+=datetime.timedelta(days=1)
PY
)
for stamp in $epoch; do
  for ext in dump.gpg; do
    touch "$work/oggaq-oggaq-$stamp.$ext" "$work/oggaq-oggaq-$stamp.$ext.sha256" "$work/oggaq-oggaq-$stamp.dump.manifest"
  done
  touch "$work/erasures-$stamp.ndjson.gpg"
done
touch "$work/notes.txt" "$work/oggaq-unrecognised.dump.gpg"
before=$(ls "$work"/oggaq-oggaq-*.dump.gpg | wc -l | tr -d ' ')

KEEP_DAILY=7 KEEP_WEEKLY=4 KEEP_MONTHLY=6 "$here/prune.sh" "$work" --dry-run >/dev/null
[ "$(ls "$work"/oggaq-oggaq-*.dump.gpg | wc -l | tr -d ' ')" = "$before" ] || fail "--dry-run dosya sildi"
KEEP_DAILY=7 KEEP_WEEKLY=4 KEEP_MONTHLY=6 "$here/prune.sh" "$work" >/dev/null

kept() { ls "$work" | grep -E "^oggaq-oggaq-.*\.dump\.gpg$" | grep -oE '[0-9]{8}T[0-9]{6}Z'; }
have() { kept | grep -qx "$1"; }
count=$(kept | wc -l | tr -d ' ')
[ "$count" -le 17 ] && [ "$count" -ge 10 ] || fail "tutulan sayısı beklenmedik: $count"
for day in 20261023 20261022 20261021 20261020 20261019 20261018 20261017; do
  kept | grep -q "^${day}" || fail "son 7 günden biri silinmiş: $day"
done
# Aynı günde iki yedek varsa yalnızca en yenisi kalır.
have 20261023T194500Z || fail "en yeni dağıtım öncesi yedek silinmiş"
have 20261023T033000Z && fail "aynı günün eski yedeği duruyor"
# Her ayın en yenisi kalır (Mayıs - Eylül tam ay; Ekim bu ayın en yenisi).
for month in 20260930T033000Z 20260831T033000Z 20260731T033000Z 20260630T033000Z 20260531T033000Z; do
  have "$month" || fail "ayın son yedeği silinmiş: $month"
done
# Altı aydan eski aylar (Nisan ve öncesi) tamamen silinir.
kept | grep -qE '^2026(01|02|03|04)' && fail "eski aydan yedek kalmış"
# Sidecar'lar ana dosyayla birlikte gider; tutulanların sidecar'ı durur; tanınmayan dosyalara dokunulmaz.
for f in "$work"/oggaq-oggaq-*.dump.gpg; do [ -f "$f.sha256" ] && [ -f "${f%.*}.manifest" ] || fail "tutulan yedeğin eşi eksik: $f"; done
[ "$(ls "$work"/oggaq-oggaq-*.sha256 | wc -l | tr -d ' ')" = "$count" ] || fail "yetim sağlama dosyası kalmış"
[ -f "$work/notes.txt" ] && [ -f "$work/oggaq-unrecognised.dump.gpg" ] || fail "tanınmayan dosya silinmiş"
[ "$(ls "$work"/erasures-*.ndjson.gpg | wc -l | tr -d ' ')" -le 17 ] || fail "silme listesi dışa aktarımları sınırlanmadı"
# İkinci çalıştırma bir şey silmez.
KEEP_DAILY=7 KEEP_WEEKLY=4 KEEP_MONTHLY=6 "$here/prune.sh" "$work" | grep -q 'silindi' && fail "ikinci çalıştırma dosya sildi"
echo "tamam: $before dosyadan $count yedek kaldı; saklama kuralı doğru"
