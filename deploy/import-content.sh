#!/usr/bin/env bash
# export-content.sh arşivini BOŞ, yeni migrate edilmiş bir veritabanına yükler.
#   import-content.sh <arşiv.tar.gz> --target-db <ad> [--created-by-email <yönetici-e-postası>] [--yes]
# Değişmezlik tetikleyicileri açık kalır ve atlanmaz: veri, uygulamanın kendi yaşam döngüsüyle yüklenir
# (taslak satırlar -> şıklar -> doğru şık ve yayın zamanı -> yayın işaretçileri; sınav taslak -> sorular -> yayın zamanı),
# hepsi tek işlemde (--single-transaction): biri başarısız olursa hiçbir şey kalmaz.
# Hedefte içerik tabloları boş olmalıdır; kullanıcı/deneme verisine dokunulmaz. --created-by-email verilirse sorular ve
# sınavlar o PLATFORM YÖNETİCİSİNE bağlanır, verilmezse yazar boş kalır. Sonunda satır sayıları, sütun şeması ve içerik özeti
# arşivdekiyle karşılaştırılır; fark varsa çıkış kodu 1 (işlem zaten geri alınmıştır).
# Bağlantı: PGHOST/PGPORT/PGUSER/PGPASSFILE (uygulama rolü yeterlidir; veritabanı oluşturma gerekmez).
set -Eeuo pipefail
umask 077
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
die() { echo "HATA: $*" >&2; exit 1; }

archive="${1:?kullanım: import-content.sh <arşiv.tar.gz> --target-db <ad> [...]}"; shift
target=""; email=""; assume_yes=0
while [ $# -gt 0 ]; do
  case "$1" in
    --target-db) target="${2:?}"; shift ;;
    --created-by-email) email="${2:?}"; shift ;;
    --yes) assume_yes=1 ;;
    *) die "Bilinmeyen seçenek: $1" ;;
  esac
  shift
done
[ -f "$archive" ] || die "Arşiv okunamıyor."
[[ "$target" =~ ^[a-z_][a-z0-9_]{0,62}$ ]] || die "--target-db geçerli bir veritabanı adı olmalı."
q() { psql -X -v ON_ERROR_STOP=1 -Atq -d "$target" -c "$1"; }

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
tar -xzf "$archive" -C "$work"
dir="$work/content"
manifest="$dir/manifest.txt"
[ -f "$manifest" ] && grep -qx 'format=oggaq-content-1' "$manifest" || die "Arşiv biçimi tanınmadı."
field() { grep -E "^$1=" "$manifest" | head -n1 | cut -d= -f2-; }

tables=(exam_types subjects topics question_sources questions question_versions question_options official_exams official_exam_questions official_exam_question_changes import_batches import_records)

# 1) Hedef hazır mı: migrate edilmiş, arşivdeki son migration var, şema sütunları aynı, içerik tabloları boş.
[ "$(q "select count(*) from migrations where migration = '$(field latest_migration)'")" = 1 ] \
  || die "Hedefte arşivin son migration'ı ($(field latest_migration)) yok; önce aynı sürümle migrate edin."
for table in "${tables[@]}"; do
  expected="$(field "columns.$table")"
  actual="$(q "select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_schema = 'public' and table_name = '$table'")"
  [ "$expected" = "$actual" ] || die "Şema farkı ($table): dışa ve içe aktarım aynı sürümle yapılmalı."
  [ "$(q "select count(*) from $table")" = 0 ] || die "Hedefte $table boş değil; bu betik yalnızca boş veritabanına yükler."
done
created_by="NULL"
if [ -n "$email" ]; then
  created_by="$(q "select id from users where email = '${email//\'/\'\'}' and platform_role = 'platform_admin'")"
  [ -n "$created_by" ] || die "Platform yöneticisi bulunamadı: $email"
  created_by="'$created_by'"
fi

if [ "$assume_yes" != 1 ]; then
  printf "'%s' veritabanına içerik yüklenecek (soru: %s, sınav: %s). Onaylamak için veritabanı adını yazın: " "$target" "$(field count.questions)" "$(field count.official_exams)"
  read -r answer
  [ "$answer" = "$target" ] || die "Onay verilmedi."
fi

# 2) Tek işlemde yükleme. Hazırlık tabloları kısıtsızdır; gerçek tablolara yaşam döngüsü sırasıyla aktarılır.
script="$work/import.sql"
{
  echo "\\set ON_ERROR_STOP on"
  for table in "${tables[@]}"; do
    echo "create temp table stage_$table (like $table including defaults) on commit drop;"
    echo "\\copy stage_$table ($(field "columns.$table")) from '$dir/$table.csv' with (format csv, header true)"
  done
  cat <<SQL
insert into exam_types select * from stage_exam_types;
insert into subjects select * from stage_subjects;
insert into topics select * from stage_topics;
insert into question_sources select * from stage_question_sources;
-- Sorular: yayın işaretçileri sürümler yüklendikten sonra bağlanır.
insert into questions (id, created_by, revision, latest_version_id, published_version_id, created_at, updated_at)
  select id, $created_by::uuid, revision, null, null, created_at, updated_at from stage_questions;
-- Sürümler: önce taslak olarak, doğru şık ve yayın zamanı şıklardan sonra.
insert into question_versions (id, question_id, version, subject_id, topic_id, exam_type_id, source_id, stem, explanation, correct_option_id, published_at, created_at)
  select id, question_id, version, subject_id, topic_id, exam_type_id, source_id, stem, explanation, null, null, created_at from stage_question_versions;
insert into question_options select * from stage_question_options;
update question_versions v set correct_option_id = s.correct_option_id from stage_question_versions s where s.id = v.id and s.correct_option_id is not null;
update question_versions v set published_at = s.published_at from stage_question_versions s where s.id = v.id and s.published_at is not null;
update questions q set latest_version_id = s.latest_version_id, published_version_id = s.published_version_id, updated_at = s.updated_at from stage_questions s where s.id = q.id;
-- Sınavlar: önce taslak, sorular eklenir, sonra yayın zamanı (tetikleyici sıra ve yayımlanmış sürüm şartını denetler).
insert into official_exams (id, exam_type_id, source_id, created_by, title, year, term, exam_number, published_at, created_at, updated_at, weapon_status, subject_id, generate_unarmed, derived_from_id)
  select id, exam_type_id, source_id, $created_by::uuid, title, year, term, exam_number, null, created_at, updated_at, weapon_status, subject_id, generate_unarmed, derived_from_id from stage_official_exams;
insert into official_exam_questions select * from stage_official_exam_questions;
update official_exams e set published_at = s.published_at, updated_at = s.updated_at from stage_official_exams s where s.id = e.id and s.published_at is not null;
insert into official_exam_question_changes select * from stage_official_exam_question_changes;
insert into import_batches select * from stage_import_batches;
insert into import_records select * from stage_import_records;
insert into audit_events (id, actor_id, tenant_id, target_id, action, created_at) values (gen_random_uuid(), null, null, gen_random_uuid(), 'content.imported', now());
SQL
} >"$script"
echo "Yükleniyor (tek işlem)..."
psql -X --single-transaction -q -d "$target" -f "$script"

# 3) Doğrulama: satır sayıları ve içerik özeti arşivdekiyle aynı olmalı.
failures=0
for table in "${tables[@]}"; do
  [ "$(q "select count(*) from $table")" = "$(field "count.$table")" ] || { echo "BAŞARISIZ: satır sayısı farklı: $table" >&2; failures=$((failures + 1)); }
done
[ "$failures" = 0 ] || die "Satır sayıları uyuşmuyor (veritabanı yüklendi; temiz bir hedefte yeniden deneyin)."
"$here/backup/verify.sh" "$target" --content-only --expect-checksum "$(field content_checksum)"
