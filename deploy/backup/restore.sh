#!/usr/bin/env bash
# Şifreli yedeği ADLANDIRILMIŞ bir hedef veritabanına geri yükler. Üretim veritabanını varsayılan olarak ASLA ezmez.
#   restore.sh --file <oggaq-….dump.age|gpg> --target-db <ad> [--identity <age-özel-anahtar>] [seçenekler]
# Seçenekler:
#   --identity DOSYA     age özel anahtarı (yalnız age için). gpg için özel anahtar çalışan kullanıcının anahtarlığındadır.
#   --overwrite          hedef veritabanı doluysa silip yeniden oluşturur (aksi halde reddeder)
#   --allow-production   hedef adı OGGAQ_PRODUCTION_DB (varsayılan oggaq) ise gerekir; --overwrite ile birlikte kullanılır
#   --owner ROL          nesne sahibi (varsayılan oggaq): pg_restore --role ile atanır, rol yoksa atlanır
#   --yes                onay sorusunu atlar (otomasyon/prova)
# Bağlantı: PGHOST/PGPORT/PGUSER/PGPASSFILE; veritabanı oluşturma yetkisi gerekir (genelde `sudo -u postgres`).
# Yedek geri yüklendikten sonra: verify.sh çalıştırılır ve silinmiş hesaplar yeniden uygulanır
# (accounts:reapply-erasures, docs/DEPLOYMENT.md "Geri yükleme ve silinen hesaplar"). Bu betik onları KENDİSİ çalıştırmaz.
set -Eeuo pipefail
umask 077
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
. "$here/common.sh"
alert() { :; }   # geri yükleme etkileşimlidir: hata doğrudan operatöre gösterilir, webhook'a gitmez

file=""; target=""; identity=""; overwrite=0; allow_production=0; owner="oggaq"; assume_yes=0
while [ $# -gt 0 ]; do
  case "$1" in
    --file) file="${2:?}"; shift ;;
    --target-db) target="${2:?}"; shift ;;
    --identity) identity="${2:?}"; shift ;;
    --overwrite) overwrite=1 ;;
    --allow-production) allow_production=1 ;;
    --owner) owner="${2:?}"; shift ;;
    --yes) assume_yes=1 ;;
    *) die "Bilinmeyen seçenek: $1" ;;
  esac
  shift
done
[ -f "$file" ] || die "--file gerekli ve okunabilir olmalı."
[[ "$target" =~ ^[a-z_][a-z0-9_]{0,62}$ ]] || die "--target-db geçerli bir veritabanı adı olmalı (küçük harf, rakam, alt çizgi)."
production_db="${OGGAQ_PRODUCTION_DB:-oggaq}"
if [ "$target" = "$production_db" ] && [ "$allow_production" != 1 ]; then
  die "Hedef '$target' üretim veritabanıdır. Gerçekten üzerine yüklemek için --allow-production ve (doluysa) --overwrite verin; provası için başka bir ad kullanın."
fi

# Sağlama toplamı: eş dosya varsa eşleşmeli.
if [ -f "$file.sha256" ]; then
  expected="$(awk '{print $1}' "$file.sha256")"
  [ "$(sha256_of "$file")" = "$expected" ] || die "Sağlama toplamı uyuşmuyor: yedek bozuk ya da değiştirilmiş."
  log "Sağlama toplamı doğrulandı."
else
  log "UYARI: $file.sha256 yok; bütünlük doğrulanamadı." >&2
fi

case "$file" in
  *.age)
    command -v age >/dev/null || die "age kurulu değil."
    [ -r "$identity" ] || die "--identity (age özel anahtar dosyası) gerekli."
    decrypt() { age -d -i "$identity" "$file"; } ;;
  *.gpg)
    command -v gpg >/dev/null || die "gpg kurulu değil."
    decrypt() { gpg --batch --yes --no-tty --decrypt "$file"; } ;;
  *) die "Dosya .age ya da .gpg ile bitmeli." ;;
esac

admin() { psql -X -v ON_ERROR_STOP=1 -Atq -d postgres "$@"; }
exists="$(admin -c "select count(*) from pg_database where datname = '$target'")"
if [ "$exists" = 1 ]; then
  tables="$(psql -X -v ON_ERROR_STOP=1 -Atq -d "$target" -c "select count(*) from information_schema.tables where table_schema = 'public'")"
  if [ "$tables" != 0 ] && [ "$overwrite" != 1 ]; then
    die "'$target' boş değil ($tables tablo). Silip yeniden oluşturmak için --overwrite verin."
  fi
fi

if [ "$assume_yes" != 1 ]; then
  printf "'%s' veritabanı %s ve yedekten yüklenecek. Onaylamak için veritabanı adını yazın: " "$target" "$([ "$exists" = 1 ] && echo 'SİLİNİP yeniden oluşturulacak' || echo 'oluşturulacak')"
  read -r answer
  [ "$answer" = "$target" ] || die "Onay verilmedi."
fi

if [ "$exists" = 1 ]; then admin -c "drop database \"$target\" with (force)"; fi
role_args=()
if [ "$(admin -c "select count(*) from pg_roles where rolname = '$owner'")" = 1 ]; then
  # Uygulama rolü veritabanının sahibi olur (PostgreSQL 15+ ta public şemasına yalnız sahip yazabilir); nesneler ona atanır.
  admin -c "create database \"$target\" owner \"$owner\""
  role_args=(--role="$owner")
else
  admin -c "create database \"$target\""
fi

log "Geri yükleniyor: $(basename "$file") -> $target"
# Veri yüklenirken satır tetikleyicileri ateşlenir; pg_dump tetikleyicileri veriden SONRA oluşturduğu için sorun çıkmaz.
decrypt | pg_restore --no-owner --no-acl --exit-on-error ${role_args[@]+"${role_args[@]}"} --dbname="$target"
log "Geri yükleme bitti: $target"
cat <<MSG

Sıradaki adımlar (elle):
  1. $here/verify.sh $target            # satır sayıları, tetikleyiciler, içerik özeti
  2. Silinen hesapları yeniden uygula (yedekten daha yeni silmeler için ayrı silme listesini ver):
       cd /srv/oggaq/current/backend && DB_DATABASE=$target php artisan accounts:reapply-erasures --from=<erasures-….ndjson>     # önce sayar
       ... --force ekleyerek gerçekten siler
  3. Uygulamayı bu veritabanına yönlendirmeden önce yukarıdakilerin ikisi de temiz olmalı.
MSG
