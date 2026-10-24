#!/usr/bin/env bash
# Soru bankası İÇERİĞİNİ (katalog, kaynak, soru, sürüm, şık, çıkmış sınav ve sabitlemeleri, içe aktarım kayıtları) bir
# arşive yazar. Kullanıcı, çalışma alanı, deneme, cevap, favori, bildirim, token, oturum ve denetim kaydı ASLA girmez;
# soru/sınav/içe aktarım satırlarındaki kullanıcı bağları (created_by, approved_by, actor_id) boşaltılır.
#   export-content.sh <veritabanı> <çıktı.tar.gz>
# Salt okunurdur (kaynak veritabanına yazmaz). Bağlantı: PGHOST/PGPORT/PGUSER/PGPASSFILE.
# Arşiv gerçek soru verisidir: şifrelemeden (age/gpg) bir ağa göndermeyin; gerçek sunucuya aktarım ayrıca
# kullanıcının açık onayını gerektirir (docs/DEPLOYMENT.md "İçerik aktarımı").
set -Eeuo pipefail
umask 077
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
db="${1:?kullanım: export-content.sh <veritabanı> <çıktı.tar.gz>}"
out="${2:?kullanım: export-content.sh <veritabanı> <çıktı.tar.gz>}"
[[ "$out" == *.tar.gz ]] || { echo "Çıktı .tar.gz ile bitmeli." >&2; exit 2; }

# Bağımlılık sırası: ebeveyn tablolar önce (içe aktarım bu sırayla yükler).
tables=(exam_types subjects topics question_sources questions question_versions question_options scoring_rules scoring_periods official_exams official_exam_questions official_exam_scoring official_exam_question_changes import_batches import_records)
user_columns="created_by approved_by actor_id"

q() { psql -X -v ON_ERROR_STOP=1 -Atq -d "$db" -c "$1"; }
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
dir="$work/content"
mkdir -p "$dir"

{
  echo "format=oggaq-content-1"
  echo "created_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "source_database=$db"
  echo "latest_migration=$(q 'select migration from migrations order by id desc limit 1')"
} >"$dir/manifest.txt"

for table in "${tables[@]}"; do
  columns="$(q "select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = '$table'")"
  [ -n "$columns" ] || { echo "Tablo yok: $table" >&2; exit 1; }
  select_list=""
  IFS=',' read -ra names <<<"$columns"
  for column in "${names[@]}"; do
    case " $user_columns " in
      *" $column "*) select_list+="null::uuid as $column," ;;
      *) select_list+="$column," ;;
    esac
  done
  select_list="${select_list%,}"
  # topics: ebeveyn önce gelsin (özyinelemeli derinliğe göre), diğerleri birincil anahtara göre sabit sırada.
  case "$table" in
    topics) query="with recursive t as (select *, 0 as depth from topics where parent_id is null union all select c.*, t.depth + 1 from topics c join t on c.parent_id = t.id) select $select_list from t order by depth, id" ;;
    official_exam_scoring) query="select $select_list from $table order by official_exam_id" ;;
    official_exam_questions) query="select $select_list from $table order by official_exam_id, position" ;;
    import_records) query="select $select_list from $table order by source_system, source_table, source_key" ;;
    *) query="select $select_list from $table order by id" ;;
  esac
  psql -X -v ON_ERROR_STOP=1 -q -d "$db" -c "\\copy ($query) to '$dir/$table.csv' with (format csv, header true)"
  echo "columns.$table=$columns" >>"$dir/manifest.txt"
  echo "count.$table=$(q "select count(*) from $table")" >>"$dir/manifest.txt"
done
echo "content_checksum=$("$here/backup/verify.sh" "$db" --print-checksum)" >>"$dir/manifest.txt"

tar -czf "$out" -C "$work" content
chmod 600 "$out"
echo "Yazıldı: $out ($(wc -c <"$out" | tr -d ' ') bayt)"
grep -E '^(latest_migration|content_checksum|count\.)' "$dir/manifest.txt"
