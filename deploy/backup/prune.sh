#!/usr/bin/env bash
# Yedek saklama: gün/hafta/ay kovalarının en yenisini tutar, gerisini siler (sha256 ve manifest eşleriyle birlikte).
#   prune.sh <dizin> [--dry-run]       KEEP_DAILY/KEEP_WEEKLY/KEEP_MONTHLY ortam değişkenlerinden okunur (7/4/6)
# Dosya adlarındaki UTC zaman damgasına (…-YYYYMMDDTHHMMSSZ…) bakar, dosya tarihine değil. Haftalık kova, 1970'ten
# beri geçen günün 7'ye bölümüdür (takvim haftası değil). Gün sayısı, yedek bulunan günler üzerinden sayılır.
set -Eeuo pipefail
dir="${1:?kullanım: prune.sh <dizin> [--dry-run]}"
dry="${2:-}"
kd="${KEEP_DAILY:-7}"; kw="${KEEP_WEEKLY:-4}"; km="${KEEP_MONTHLY:-6}"

decide() { # stdin: en yeniden eskiye dosya adları; stdout: "keep|delete <ad>"
  awk -v kd="$kd" -v kw="$kw" -v km="$km" '
    function days(y, m, d,   era, yoe, mp, doy, doe) {
      y -= (m <= 2); era = int(y / 400); yoe = y - era * 400; mp = (m + 9) % 12
      doy = int((153 * mp + 2) / 5) + d - 1; doe = yoe * 365 + int(yoe / 4) - int(yoe / 100) + doy
      return era * 146097 + doe - 719468
    }
    {
      if (!match($0, /[0-9]{8}T[0-9]{6}Z/)) { print "keep " $0; next }   # tanınmayan ad: dokunma
      ts = substr($0, RSTART, 15)
      day = substr(ts, 1, 8); month = substr(ts, 1, 6)
      week = int(days(substr(ts, 1, 4) + 0, substr(ts, 5, 2) + 0, substr(ts, 7, 2) + 0) / 7)
      keep = 0
      if (!(day in seenDay)) { seenDay[day] = 1; if (++dayRank <= kd) keep = 1 }
      if (!(week in seenWeek)) { seenWeek[week] = 1; if (++weekRank <= kw) keep = 1 }
      if (!(month in seenMonth)) { seenMonth[month] = 1; if (++monthRank <= km) keep = 1 }
      print (keep ? "keep " : "delete ") $0
    }'
}

for pattern in 'oggaq-*.dump.*' 'erasures-*.ndjson.*'; do
  # Yalnızca şifreli ana dosyalar; .sha256 ve .manifest onların eşidir.
  while IFS= read -r line; do
    action="${line%% *}"; name="${line#* }"
    [ "$action" = delete ] || continue
    if [ "$dry" = --dry-run ]; then echo "silinecek: $name"; continue; fi
    rm -f -- "$dir/$name" "$dir/$name.sha256" "$dir/${name%.*}.manifest"
    echo "silindi: $name"
  done < <(cd "$dir" && ls -1 $pattern 2>/dev/null | grep -Ev '\.(sha256|manifest|partial)$' | sort -r | decide)
done
