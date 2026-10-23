#!/usr/bin/env bash
# Geri yüklenmiş (ya da yeni içe aktarılmış) bir veritabanının sağlamlığını denetler ve içerik özetini yazar.
#   verify.sh <veritabanı> [--content-only] [--expect-checksum <özet>] [--expect-counts-from <başka-veritabanı>]
#   verify.sh <veritabanı> --print-checksum      yalnızca içerik özetini yazar (içerik aktarımı manifesti için)
# --content-only : yalnızca içerik tabloları (soru bankası) denetlenir; kullanıcı/deneme tabloları beklenmez (içerik aktarımı).
# --expect-checksum / --expect-counts-from : kaynak veritabanındaki değerle karşılaştırır. Fark varsa çıkış kodu 1.
# Bağlantı PGHOST/PGPORT/PGUSER/PGPASSFILE ortam değişkenleriyle yapılır. Salt okunurdur.
set -Eeuo pipefail
db="${1:?kullanım: verify.sh <veritabanı> [...]}"; shift || true
content_only=0; expect_checksum=""; compare_db=""; print_only=0
while [ $# -gt 0 ]; do
  case "$1" in
    --content-only) content_only=1 ;;
    --print-checksum) print_only=1 ;;
    --expect-checksum) expect_checksum="${2:?}"; shift ;;
    --expect-counts-from) compare_db="${2:?}"; shift ;;
    *) echo "Bilinmeyen seçenek: $1" >&2; exit 2 ;;
  esac
  shift
done
q() { psql -X -v ON_ERROR_STOP=1 -Atq -d "${2:-$db}" -c "$1"; }
failures=0
# İçerik özeti: yayımlanmış soru sürümleri (metin, doğru şık, şıklar) ve yayımlanmış sınavların sabitlemeleri.
checksum() {
  q "select md5(coalesce((select string_agg(x, '|' order by x) from (
        select concat_ws('~', v.id, v.question_id, v.version, v.subject_id, v.exam_type_id, md5(v.stem), v.correct_option_id,
               (select md5(string_agg(o.id::text || o.position::text || o.text, ',' order by o.position)) from question_options o where o.question_version_id = v.id)) as x
        from question_versions v where v.published_at is not null) a), '')
      || coalesce((select string_agg(y, '|' order by y) from (
        select concat_ws('~', e.id, e.exam_type_id, e.year, coalesce(e.term,''), coalesce(e.exam_number,''), coalesce(e.weapon_status,''), coalesce(e.subject_id::text,''), e.title,
               (select md5(string_agg(p.position::text || p.question_id::text || p.question_version_id::text, ',' order by p.position)) from official_exam_questions p where p.official_exam_id = e.id)) as y
        from official_exams e where e.published_at is not null) b), ''))" "${1:-$db}"
}
[ "$print_only" = 1 ] && { checksum; exit 0; }
fail() { echo "BAŞARISIZ: $*" >&2; failures=$((failures + 1)); }
ok() { echo "tamam: $*"; }

content_tables=(exam_types subjects topics question_sources questions question_versions question_options official_exams official_exam_questions)
account_tables=(users study_contexts exam_attempts exam_answers favorite_questions memberships question_reports account_erasures)

# 1) Migration kayıtları: tablo var, boş değil, son migration adı yazılabilir.
count="$(q 'select count(*) from migrations')"
[ "$count" -gt 0 ] && ok "migrations: $count kayıt, son: $(q 'select migration from migrations order by id desc limit 1')" || fail "migrations tablosu boş"

# 2) Değişmezlik tetikleyicileri yerinde mi?
expected_triggers=(guard_account_erasure guard_exam_answer guard_exam_attempt guard_official_exam_question guard_official_exam guard_practice_attempt guard_published_question_option guard_question_report guard_published_question_version guard_question_publication_pointer)
for trigger in "${expected_triggers[@]}"; do
  [ "$(q "select count(*) from pg_trigger where tgname = '$trigger' and not tgisinternal")" -ge 1 ] || fail "tetikleyici yok: $trigger"
done
ok "değişmezlik tetikleyicileri denetlendi (${#expected_triggers[@]})"

# 3) Tablo satır sayıları.
tables=("${content_tables[@]}")
[ "$content_only" = 1 ] || tables+=("${account_tables[@]}")
counts=""
for table in "${tables[@]}"; do
  n="$(q "select count(*) from $table")"
  counts+="$table=$n "
  printf '  %-28s %s\n' "$table" "$n"
done
if [ "$content_only" = 1 ]; then
  for table in "${account_tables[@]}"; do
    # İçerik sahibi platform yöneticisi (--created-by-email) ve onun çalışma alanı/üyeliği bulunabilir.
    case "$table" in users | study_contexts | memberships) continue ;; esac
    n="$(q "select count(*) from $table")"
    [ "$n" = 0 ] || fail "içerik aktarımında $table boş olmalı ama $n satır var"
  done
  ok "deneme, cevap, favori, bildirim ve çalışma alanı tabloları boş"
fi

# 4) Yayımlanmış içerik tutarlılığı: işaretçiler, sabitlenmiş sürümler.
[ "$(q 'select count(*) from questions where published_version_id is not null and not exists (select 1 from question_versions v where v.id = published_version_id and v.published_at is not null)')" = 0 ] && ok "yayın işaretçileri yayımlanmış sürümlere bakıyor" || fail "yayımlanmamış sürüme bakan işaretçi var"
[ "$(q 'select count(*) from official_exams e where e.published_at is not null and (select coalesce(max(position),0) from official_exam_questions where official_exam_id = e.id) <> (select count(*) from official_exam_questions where official_exam_id = e.id)')" = 0 ] && ok "yayımlanmış sınavlarda sıra numaraları ardışık" || fail "ardışık olmayan sıralı yayımlanmış sınav var"

# 5) İçerik özeti (işlev yukarıda tanımlıdır).
sum="$(checksum)"
echo "content_checksum=$sum"
echo "counts: $counts"
if [ -n "$expect_checksum" ]; then
  [ "$sum" = "$expect_checksum" ] && ok "içerik özeti beklenenle aynı" || fail "içerik özeti farklı (beklenen $expect_checksum)"
fi
if [ -n "$compare_db" ]; then
  [ "$(checksum "$compare_db")" = "$sum" ] && ok "içerik özeti '$compare_db' ile aynı" || fail "içerik özeti '$compare_db' ile farklı"
  for table in "${content_tables[@]}"; do
    [ "$(q "select count(*) from $table" "$compare_db")" = "$(q "select count(*) from $table")" ] || fail "satır sayısı farklı: $table"
  done
  ok "içerik tablolarının satır sayıları '$compare_db' ile aynı"
fi

[ "$failures" = 0 ] && { echo "SONUÇ: tüm denetimler geçti"; exit 0; }
echo "SONUÇ: $failures denetim başarısız" >&2; exit 1
