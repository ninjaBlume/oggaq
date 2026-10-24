# Sunucuda ayrı geliştirme ortamı

Hedef adres `https://oggsorubankasi.codentum.net`. Öğrenci uygulaması `/`, yönetim paneli `/yonetim/`, API `/api/v1/`, CSRF ucu `/sanctum/` altında sunulur. Mobil API kökü aynı HTTPS adresidir. Admin'in varsayılan yerel kökü `/` olarak korunur; alt yol derlemede `VITE_ADMIN_BASE_PATH=/yonetim/` ile seçilir.

DNS ve HTTPS doğrulandıktan sonra mobil geliştirme istemcisini aynı API'ye bağlamak için proje kökünde `EXPO_PUBLIC_API_URL=https://oggsorubankasi.codentum.net npm run dev:mobile` kullanılır. Mevcut yerel API ayarları ve test adresleri değiştirilmez; yeni native/EAS paketleri için de bu değer derleme ortamında verilmelidir.

Bu kurulum mevcut Hestia, nginx, PHP 8.3, PostgreSQL 14 ve diğer projelerin servislerini değiştirmeden Docker Compose içinde PHP 8.4, PostgreSQL 18, Redis 8 ve nginx kullanır. Node 24 yalnızca imajın web derleme aşamasındadır. Güncelleme yeni imaj derleyip ilgili konteynerleri yeniden oluşturmayı gerektirir; canlı dosya izleme/HMR yoktur.

Geliştirme sunucusu internete açılacağı için Laravel `APP_ENV=production`, `APP_DEBUG=false` ve güvenli oturum çerezi kullanır. Oturum çerezi yalnızca bu host içindir; diğer `codentum.net` uygulamalarına gönderilmez. Kullanıcının tercihi, Cloudflare Access yerine uygulamanın kendi girişini kullanmaktır. Adresi bilen herkes giriş/kayıt sayfasını görebilir; içerik erişimi backend yetkilendirmesine bağlıdır.

## Yapılandırma

Kaynak kod dışında, izinleri 0600 olan iki dosya gerekir:

- `.env.example` üzerinden oluşturulmuş uygulama ortamı: rastgele `APP_KEY`, `DB_PASSWORD`, `REDIS_PASSWORD`, `ERASURE_LEDGER_KEY`.
- `.postgres-password`: rastgele PostgreSQL yönetim parolası. Uygulama bu parolayı almaz; uygulamanın `oggaq` rolü süper kullanıcı değildir ve rol/veritabanı oluşturamaz.

`ERASURE_LEDGER_KEY` ve `APP_KEY` bağımsız güvenli anahtar saklamasında da korunmalıdır. Ortam dosyaları, veritabanı ve gerçek soru verileri build context'e girmez (`.dockerignore`). Uygulama ve `oggaq_test` veritabanları ilk kurulumda boş oluşturulur. Gerçek içerik aktarımı ayrı onay gerektirir.

Komutlarda proje kökünden:

```sh
export OGGAQ_ENV_FILE=/home/harun/oggaq-development/shared/.env
export OGGAQ_POSTGRES_PASSWORD_FILE=/home/harun/oggaq-development/shared/.postgres-password
export OGGAQ_RELEASE=initial
docker compose --env-file "$OGGAQ_ENV_FILE" -f deploy/server-development/compose.yaml config -q
docker compose --env-file "$OGGAQ_ENV_FILE" -f deploy/server-development/compose.yaml build
docker compose --env-file "$OGGAQ_ENV_FILE" -f deploy/server-development/compose.yaml up -d database redis mailpit
docker compose --env-file "$OGGAQ_ENV_FILE" -f deploy/server-development/compose.yaml run --rm -T --interactive=false app php artisan migrate --force
docker compose --env-file "$OGGAQ_ENV_FILE" -f deploy/server-development/compose.yaml up -d
```

İlk yönetici hazır parola ile oluşturulmaz; operatör `docker compose ... exec app php artisan app:create-admin <eposta>` komutunu etkileşimli çalıştırır. Parolayı komut satırına, depoya veya sohbete yazmayın.

## Ağ ve e-posta

- HTTP yalnızca sunucuda `127.0.0.1:18080` adresindedir. Cloudflare Tunnel bu servise yönlendirilir; mevcut 80/443 dinleyicileri korunur.
- PostgreSQL, Redis ve PHP-FPM portları host üzerinde yayınlanmaz. Compose ağı `172.30.88.0/24` olarak ayrılmıştır; kurulum öncesi diğer Docker ağlarıyla çakışmadığı doğrulanmalıdır.
- nginx `CF-Connecting-IP` başlığına yalnızca bu ağdan güvenir. Tunnel bu ağa katılacaksa ağdaki diğer servisler güvenilir olmalıdır. Yerel hosta erişebilen kullanıcılar da loopback servisine erişebilir.
- Cloudflare kuralında API/CSRF/HTML yanıtlarını önbelleğe almayın. nginx sayfaları `noindex` ile sunar; bu bir erişim engeli değildir.
- E-postalar dışarıya gönderilmez: Mailpit yalnızca `127.0.0.1:18025` üzerindedir. SSH yönlendirmesiyle posta kutusuna erişilebilir. SMTP sağlayıcısı bağlanana kadar hesap doğrulama/reset bağlantıları buradan alınır.
- Cloudflare Access eklenmez; uygulama girişi test ekibinin erişim yöntemidir.

Cloudflare'de ayrı `oggaq-development` tüneli ve yalnızca `oggsorubankasi.codentum.net` için `http://web:8080` yönlendirmesi kullanılır. Tünel token'ı kaynak kod dışında 0600 izinli `.tunnel-token` dosyasına yazılır; komut satırına veya depoya eklenmez. Token dosyası hazır olduktan sonra:

```sh
export OGGAQ_TUNNEL_TOKEN_FILE=/home/harun/oggaq-development/shared/.tunnel-token
docker compose --env-file "$OGGAQ_ENV_FILE" \
  -f deploy/server-development/compose.yaml \
  -f deploy/server-development/tunnel.compose.yaml up -d tunnel
```

Tünel konteyneri token dosyasının sahibi olan dağıtım kullanıcısının UID/GID'siyle çalışır (bu sunucuda `1000:1000`; başka sunucu için `OGGAQ_UID`/`OGGAQ_GID` ayarlanır). Yalnızca proje ağına ve kendi token dosyasına erişir; host ağı veya Docker socket'i bağlanmaz. [Cloudflare token-file belgesi](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/configure-tunnels/run-parameters/).

## Kontroller

Zamanlayıcının ilk dakikalık çalışmasından sonra `curl http://127.0.0.1:18080/api/v1/health/ready` yanıtı `ok` olmalıdır. Yanıt veritabanı, Redis, migration, kuyruk bağlantısı ve zamanlayıcı kalp atışını denetler. Posta kuyruğunun gerçekten işlendiği ayrıca kontrol edilmelidir.

DNS açılmadan bu Mac'te:

```sh
ssh -i ~/.ssh/oggaq_dev_ed25519 -N -L 18080:127.0.0.1:18080 harun@harunaltay.net
# Proje kökünde, ayrı terminal:
node deploy/server-development/smoke.mjs
```

Smoke kontrolü HTTPS origin'ini Playwright yönlendirmesiyle taklit eder; gerçek DNS/TLS doğrulaması ayrıca yapılır. Hesap/veri oluşturmaz. Öğrenci giriş sayfası, admin alt yolu ve yenilemesi, tema/CSS, CSRF, secure/host-only çerez, geçersiz giriş, yetkisiz API ve gizli dosya erişimi kontrol edilir. Öğrenci/admin oturum GET isteklerinin `Referer` içinde yalnızca origin taşıdığı, sayfa yolu ve sorgusunun taşınmadığı da denetlenir.

Yayından sonra `OGGAQ_DIRECT=1 node deploy/server-development/smoke.mjs` doğrudan gerçek HTTPS adresini kontrol eder. Yeni kayıt yerel DNS'in olumsuz önbelleğindeyse yalnızca test için `OGGAQ_RESOLVE_IP=<yetkili-DNS-yanıtındaki-IP>` verilebilir; TLS/sertifika kontrolü kapatılmaz. Bu tanılama sistemin DNS ayarlarını veya hosts dosyasını değiştirmez.

## Veri kalıcılığı ve sınırlar

PostgreSQL, Redis AOF ve Laravel storage ayrı named volume'lardadır. `docker compose down` bu verileri silmez; `down --volumes` veri kaybına yol açar. Gerçek veri eklenmeden önce sunucu dışı yedek ve geri yükleme planı ayrıca uygulanmalıdır; Compose'un çalışması yedek alındığı anlamına gelmez. Bu ortam için şifreli gece yedeği, Mac'ten çekme ile sunucu dışı kopya, geri yükleme provası ve felaket kurtarma adımları [backup/README.md](backup/README.md) içinde hazırlanmıştır (betikler hazır ve yerelde denenmiştir; **sunucuda henüz kurulmadı ve çalıştırılmadı**).

Bu dosya tek alan adı ve paylaşılan sunucu için mevcut [üretim şablonlarına](../../docs/DEPLOYMENT.md) alternatif bir geliştirme kurulumudur. Üretim şablonları ve host servis yönetimiyle birlikte çalıştırılmaz.

## 23 Ekim 2026 sunucu doğrulaması

Ubuntu 22.04 üzerinde ayrı `/home/harun/oggaq-development` dizini ve `oggaq-development` Compose projesi kuruldu. `current` bağlantısı ilk kaynak sürümünü gösterir; `~/oggaq-development/manage` sarmalayıcısı ortam dosyalarını değerlerini yazdırmadan yükleyerek Compose komutlarını çalıştırır (`manage ps`, `manage exec app php artisan ...`). PHP 8.4.27 ve PostgreSQL 18.6 üzerinde 23 migration uygulandı; `oggaq` rolünde superuser/createdb/createrole kapalı olduğu doğrulandı.

Yerel strict tip kontrolü, 11 admin/4 web testi ve iki derleme geçti. Sunucuda Composer manifest/platform/audit ve gerçek tarayıcı smoke kontrolü geçti; kalp atışı dahil hazırlık yanıtı `ok`. Horizon üzerinden gönderilen tek sentetik bildirim yalnızca Mailpit'e ulaştı. Başlangıç kaynak dosyalarının kısıtlı izinleri ilk veritabanı betiğini ve tema betiğini engellemişti; imajdaki okuma izinleri ile başlangıç betiği düzeltildi ve tekrar doğrulandı. İlk kurulumda veritabanı boştu; sonraki içerik aktarımı aşağıda kayıtlıdır.

Cloudflare `oggaq-development` tüneli sağlıklı olarak bağlandı (dört edge bağlantısı). `oggsorubankasi.codentum.net` için proxy'li CNAME ve `http://web:8080` uygulama yönlendirmesi oluşturuldu. Yetkili DNS/1.1.1.1 sorguları kaydı döndürdü. Sunucudan normal DNS çözümlemesiyle HTTPS sağlık kontrolü `200 / ok`; bu Mac'te geçerli sertifikayla gerçek Cloudflare IP'sine yöneltilmiş doğrudan Playwright kontrolü de geçti. Safari'de normal HTTPS adresi açılıp öğrenci giriş ekranı ayrıca görüldü. HTTP istekleri yol ve sorgu parametreleri korunarak `308` ile HTTPS'e yönlenir; nginx yapılandırması `nginx -t` ile geçti. Alan adına özgü bu kural diğer projelerin ayarlarını değiştirmez.

İlk tünel denemesinde 0600 token dosyası yetenekleri kaldırılmış root süreci tarafından okunamadı; konteyner, dosyanın sahibi olan dağıtım kullanıcısının UID/GID'siyle çalıştırılarak düzeltildi. Token değeri ekrana, günlüklere veya depoya yazılmadı.

Bu doğrulama tam backend PHPUnit veya native iOS/Android kontrolü değildir. İlk yönetici hesabı, gerçek SMTP ve düzenli sunucu dışı yedekleme ayrı adımlardır; hazır oldukları ileri sürülmez.

## 23 Ekim 2026 içerik aktarımı

Kullanıcının aktarım önizlemesinden sonra verdiği açık onayla yerel `oggaq` veritabanındaki içerik, `export-content.sh` / `import-content.sh` üzerinden bu geliştirme sunucusuna aktarıldı. Toplam 2.765 soru (2.759 yayımlanmış, 6 taslak), 13.800 seçenek, 286 sınav (273 yayımlanmış, 13 taslak), 7.700 sınav–soru bağlantısı, 11 ders, 2 sınav türü ve 22 kaynak korundu. Eksik sorular ve bunlara bağlı sınavlar taslak kaldı.

Yalnızca izin verilen 12 içerik tablosu taşındı; kullanıcılar, oturumlar, token'lar ve çözüm geçmişleri aktarılmadı. İçerikteki `created_by`, `approved_by`, `actor_id` bağları boşaltıldı. Özgün SQL dökümü sunucuya gönderilmedi. Paket ağ aktarımından önce GPG/AES-256 ile şifrelendi ve SSH üzerinden gönderildi. Sunucudaki geçici açık arşivler ve aktarım anahtarı işlem sonunda silindi.

Hedefin boşluğu ve `oggaq` rolünün sınırlı yetkileri doğrulandı; aktarım öncesi veritabanı Mac üzerinde 0600 izinli şifreli yedek olarak saklandı. Yedeğin çözülmesi ve `pg_restore --list` ile okunabilirliği denetlendi; bu işlem geri yükleme tatbikatı veya düzenli yedekleme kurulumu değildir. Yerel aktarım paketi, önizleme, sonuç kaydı ve yedek anahtarı git dışında, yalnızca sahibi tarafından erişilebilen `artifacts/content-transfer-20261023/` dizinindedir; yedek ve anahtar bağımsız güvenli saklamaya alınmalıdır.

İçe aktarım uygulama rolüyle, tek transaction içinde, değişmezlik tetikleyicileri açıkken yapıldı. 12 tablonun tüm satır ve alanları yeniden dışa aktarılıp kaynakla karşılaştırıldı (zaman damgaları UTC'ye normalize edildi); fark bulunmadı. Yayımlanmış içerik özeti `8076cf4c2db2b4ea9b5389b0fe0eaa47` ile aynı ve 10 koruma tetikleyicisi yerinde. Uygulamanın öğrenci controller/resource zinciri salt okunur işlemde tüm sayfaları okuyarak 2.759 soru ve 273 sınav döndürdü; soru yanıtlarında cevap anahtarı/açıklama bulunmadığı doğrulandı. Aktarım sonrasında gerçek HTTPS üzerinde web/admin, hazırlık, CSRF ve erişim koruması tarayıcı kontrolleri de geçti. Hesap oluşturulmadı; bu kontrol kullanıcıyla giriş yapılarak tamamlanmış uçtan uca bir çözüm denemesi değildir.

## 23 Ekim 2026 öğrenci hesabı ve oturum düzeltmesi

Kullanıcının isteğiyle geliştirme sunucusunda sentetik bir test öğrenci hesabı oluşturuldu. Uygulamanın kayıt doğrulaması ve `RegisterUser` işlemi kullanıldı; hesap aktif, öğrenci rolünde ve tek kişisel çalışma alanına sahip. Test hesabı operatörce doğrulandı. Giriş bilgileri Mac'te depo dışında, yalnızca sahibinin okuyabildiği bir dosyada saklandı.

İlk gerçek giriş kontrolünde parola kabul edildiği halde sonraki API GET isteği `401` dönüyordu: ortak nginx başlığı ve öğrenci HTML meta etiketi `no-referrer` kullanıyor, tarayıcı aynı origin GET için `Origin` de göndermediğinden Sanctum oturum middleware'ini başlatmıyordu. [Sanctum SPA belgesi](https://laravel.com/framework/docs/13.x/sanctum#spa-authentication) `Referer` veya `Origin` gerektirir. Başlık ve meta etiketi `strict-origin` olarak düzeltildi; yalnızca origin gönderilir, yol ve sorgudaki doğrulama/sıfırlama anahtarları Referer'a girmez ([MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy#strict-origin)).

Regresyon kontrolü eski yayında boş Referer nedeniyle başarısız oldu; düzeltme sonrası gerçek HTTPS üzerinde öğrenci ve admin origin kontrolü dahil smoke geçti. Web'in 4 birim testi ve production derlemesi, sunucudaki web/admin imaj derlemesi ve `nginx -t` geçti. Test öğrenci hesabıyla gerçek tarayıcı giriş/çıkışı; profil, 11 ders, yayımlanmış soru ve sınav listelerinin `200`, yönetim API'sinin `403` dönmesi doğrulandı. Sınav başlatılmadı/cevap kaydedilmedi. Yalnızca web konteyneri güncellendi; önceki imaj kimliği geri dönüş için sunucudaki özel işlem kaydında saklandı. Backend PHPUnit ve native iOS/Android kontrolleri bu değişiklikte çalıştırılmadı.

## 24 Ekim 2026 öğrenci web tasarımı

`ff738f4` kaynak sürümünün öğrenci web paketi Node 24 ile `VITE_API_URL=https://oggsorubankasi.codentum.net npm run build:web` kullanılarak derlendi. Mobildeki ortak mavi palet, lacivert giriş kartı, tipografi, kart/düğme şekilleri, parola görünürlüğü ve yükleme iskeletleri webde uygulandı. Tek erişim alanında gereksiz seçici gizlendi; kurum ayrımı korunur.

Dağıtım kaydı ve kaynak/paket arşivleri sunucuda `releases/web-style-ff738f4/` içindedir. Önceki web imajı `oggaq-development-web:before-ff738f4` adıyla korundu. Yeni `oggaq-development-web:ff738f4` imajı mevcut web imajından türetildi ve yalnız `/var/www/web` öğrenci dosyalarını güncelledi; admin dosyaları ve nginx yapılandırması önceki imajdan gelir. İmaj `initial` etiketiyle mevcut Compose servisine bağlandı ve `manage up -d --no-deps web` ile yalnız web konteyneri yeniden oluşturuldu. Açık eski sayfaların dosya istekleri için önceki hashli statik dosyalar da imajda korunur. Güncel öğrenci kaynakları ve ortak renk tokenları `current` içindeki karşılıklarına kopyalandı; önceki kaynak arşivi dağıtım kaydında saklandı. Backend, worker, scheduler ve veritabanına dağıtım yapılmadı; migration/veri aktarımı çalıştırılmadı.

Yerelde 31 ilgili Chromium E2E, strict tip kontrolü, 4 web ve 63 token testi ile production derlemesi geçti. Sunucuda proje ağı içinde `nginx -t`, loopback hazırlık kontrolü ve doğrudan gerçek HTTPS adresinde mevcut smoke kontrolü başarılıdır. Smoke; öğrenci giriş ekranı, admin alt yolu, tema, origin/referrer, CSRF, güvenli host çerezi ve yetkisiz erişimi kapsar. Genel adresin HTML'i derlenen `index-D_8W2udH.js` ve `index-D759Pjau.css` dosyalarını döndürür. Safari'de yeni koyu giriş ve oturum açık ders sınavları ekranı ayrıca görsel olarak incelendi; tek erişim alanında seçicinin gizlendiği görüldü. Mevcut sentetik öğrenciyle doğrudan cookie API giriş/profil/çıkış işlemleri 200 döndü ve tek erişim alanı doğrulandı. Önceki Expo bağımlılık audit bulgusu bu web değişikliğinin kapsamında giderilmedi; yeni paket eklenmedi.

Geri dönüş gerekirse önceki imajı `oggaq-development-web:initial` olarak etiketleyip yalnız web servisini yeniden oluşturun; veritabanına müdahale etmeyin. Sonraki tam Docker derlemesi bu artımlı paketin yerine yeni bir imaj üretir.

## 24 Ekim 2026: Son sorudan devam düzeltmesi

`026a1fc` API, web ve Expo istemcisinde son görüntülenen sorudan devam etmeyi uygular. Sunucudaki önceki backend kaynaklarının ilgili dört dosyası commit öncesi Git sürümüyle SHA-256 üzerinden eşleşti. Bu dosyalar, yeni konum action/request/model sınıfları ve migration mevcut app imajından türetilen `oggaq-development-app:026a1fc` imajına alındı; bağımlılıklar değiştirilmedi. Öğrenci paketi public API adresiyle derlenip `oggaq-development-web:026a1fc` imajına alındı. Önceki imajlar `before-026a1fc` etiketleriyle saklandı; kaynak/paket/işlem kayıtları `releases/exam-resume-026a1fc/` içindedir.

Yalnız `2026_10_24_000003_create_exam_bookmarks` migration'ı uygulandı; eski deneme ve cevaplar değiştirilmedi. Ardından app/worker/scheduler ve web konteynerleri `--no-deps` ile yenilendi; veritabanı/Redis/tünel yeniden oluşturulmadı. Yeni backend ve ilgili istemci/ortak tip kaynakları `current` içindeki karşılıklarına kopyalandı. `initial` imaj etiketleri yeni paketlere işaret eder; önceki imajlara dönülmesi gerekirse yeni eklenen konum tablosunu silmek gerekmez. Admin statik dosyaları önceki web imajından korunur.

Proje ağı içinde `nginx -t`, tüm hazırlık bileşenleri ve gerçek HTTPS smoke kontrolü geçti. Mevcut sentetik öğrenciyle ayrı, cevapsız bir doğrulama sınavında konum 1'den 3'e kaydedildi; yeniden GET ile 3 döndüğü, cevapların boş, revision ve deadline'ın aynı kaldığı doğrulandı. Doğrulama sınavı cevap verilmeden bitirildi; geçmiş/sonuç listesine girmediği kontrol edildi. Önceden var olan öğrencinin deneme ve cevapları değiştirilmedi. Test oturumu kapatıldı. Mobil geçit kontrolü SDK 58, Expo hesabı ve sunucu API adresini doğruladı; bu kontrol fiziksel/native cihazda soru gezinme teyidi değildir. Ayrıntılı yerel test sonuçları ve sınırlar [EXAMS](../../docs/EXAMS.md#son-sorudan-devam-etme-24-ekim-2026) içindedir.

## 24 Ekim 2026: İş Başvuruları

`5ecd66b` Jobs modülünü, OpenAPI/ortak tipleri ve üç istemcinin ekranlarını ekler. Sunucuda değiştirilen dört mevcut backend dosyasının önceki Git sürümüyle SHA-256 eşleşmesi doğrulandı. Yeni modül ve ilgili dosyalar mevcut app imajından türetilerek `oggaq-development-app:5ecd66b` imajına alındı. Public API adresiyle derlenen öğrenci ve admin paketleri `oggaq-development-web:5ecd66b` imajına alındı; eski hashli statik dosyalar korunur. Bağımlılıklar, nginx ve Cloudflare ayarları değiştirilmedi.

`2026_10_24_000004_create_jobs_tables` yalnız `job_postings` ve `job_applications` tablolarını oluşturdu. Eski soru, sınav veya cevap verisi değiştirilmedi. İlk yayında konteyner başlangıcındaki bağlantı sıfırlanması sağlık kontrolünü düşürdü ve önceki app/web imajlarına otomatik dönüldü; eklenen tablolar korunarak veri kaybı olmadan geri dönüş gerçekleşti. Kontrole `--retry-all-errors --retry-connrefused` eklenip tekrar yayına alındı; migration tekrarında değişiklik yoktu. Tüm hazırlık bileşenleri `ok` döndü. Dağıtım/source arşivleri ve önceki kaynak dosyaları `releases/jobs-5ecd66b/` içindedir; önceki imajlar `before-5ecd66b` etiketlerindedir.

Ardından `a9b4c32`, webde önbellekte liste varken yenileme hatasının da görünmesini sağladı; ilgili 5 Jobs E2E, strict tip ve web derlemesi tekrar geçti. Yalnız öğrenci web paketi `oggaq-development-web:a9b4c32` imajıyla yayımlandı; admin dosyaları önceki imajdan korunur. İşlem/source kayıtları `releases/jobs-web-a9b4c32/`, önceki web imajı `before-a9b4c32` içindedir. İlgili commit kaynakları her iki yayından sonra `current` altına yedeklenerek kopyalandı. Aktif `initial` etiketleri app için `5ecd66b`, web için `a9b4c32` imajını gösterir.

Sunucuda proje ağı içinde `nginx -t`, Composer manifest (`--strict`) ve audit kontrolleri geçti. Gerçek HTTPS smoke kontrolü öğrenci/admin alt yolu, tema/CSS, hazırlık, origin/referrer, CSRF, güvenli çerez ve yetkisiz erişimi doğruladı. Öğrenci hesabıyla Jobs listesi ve kişisel başvurular `200`, yönetici ilan listesi `403` döndü. Kullanıcının sağladığı adresle mevcut `app:create-admin` komutu üzerinden ayrı, aktif/doğrulanmış platform yöneticisi oluşturuldu; parolası komut argümanına veya günlüklere yazılmadan stdin üzerinden verildi ve Mac'te depo dışında 0600 dosyada saklandı. Bu hesapla gerçek HTTPS giriş, ilan listesi ve yönetici ilan listesi `200` döndü; kontrol oturumları kapatıldı.

Yayında 0 ilan / 0 başvuru var; sentetik ilan veya başvuru eklenmedi. Soru/sınav sayıları 2.765 / 286 olarak korundu. Expo geçidi SDK 58, doğru hesap ve public API adresiyle geçti. iOS Device Hub'da gerçek API'ye bağlı menü, İlanlar ve Başvurularım boş durumları görüldü; fiziksel iPad/Android ve native başvuru formunun tam akışı ayrıca doğrulanmalıdır. Yerel test sonuçları ve özellik sınırları [JOBS](../../docs/JOBS.md) içindedir.

Geri dönüşte önceki app/web imaj etiketleriyle ilgili servisler `--no-deps` ile yenilenebilir. Sonradan başvuru birikmiş olabileceğinden Jobs tablolarını geri dönüş amacıyla silmeyin.

## 24 Ekim 2026: İş İlanları adı ve tüm sorularla sonuç inceleme

`b851475`, web/mobil/admin menü ve bölüm başlığını **İş İlanları** olarak değiştirir. Öğrenci web ve Expo tamamlanmış sınavı tüm soruların alt alta incelendiği bir listeyle gösterir; puan özeti, öğrencinin cevabı, doğru cevap, varsa açıklama ve soru bazlı favori/bildirim korunur. Mobil liste ekran çevresindeki kartları çizer; aktif sınavın tek soru ve kaldığı yerden devam akışı aynı kalır. [Sonuç düzeni ve doğrulama](../../docs/EXAMS.md#sonuçta-bütün-soruları-inceleme-24-ekim-2026).

Public API adresiyle derlenen web/admin paketleri mevcut web imajından türetilen `oggaq-development-web:b851475` imajına alındı; `initial` etiketi bu imaja bağlandı. Önceki imaj `before-b851475` olarak korunur; paket/kaynak/işlem kaydı `releases/exam-results-b851475/` içindedir. İlgili beş mevcut kaynak dosyasının önceki Git sürümüyle SHA-256 eşleşmesi doğrulandı. Commit kaynakları `current` içine önceki dosyaları yedekleyerek kopyalandı. Yalnız web konteyneri `--no-deps` ile yenilendi; app/worker/scheduler, veritabanı, Redis ve tünel değiştirilmedi. Migration veya veri aktarımı çalıştırılmadı; backend app `5ecd66b` imajında kaldı.

`nginx -t`, tüm hazırlık bileşenleri ve gerçek HTTPS smoke kontrolü geçti. Genel adreslerdeki web/admin HTML ve JS/CSS dosyalarının yerel build ile SHA-256 eşleşmesi kontrol edildi. Web `index-Dzx1gaNY.js` / `index-dwJTpj1c.css`, admin `index-BTe06DxX.js` / `index-iRKU589Q.css` döndürür. Expo geçidi SDK 58, doğru hesap ve public API adresini doğruladı; üç platform export paketlerinde public API adresi ve yerel test API adresinin bulunmadığı denetlendi. Yerel tam E2E 77, workspace birim testleri 119 ve son erişilebilir etiketinden sonra 7 sonuç/bildirim E2E geçti; strict tip, iki web build ve üç platform export başarılıdır. Native iOS'ta mevcut 10 soruluk gerçek sonuç son soruya kadar kaydırıldı; fiziksel iPad/Android ve tam VoiceOver/TalkBack doğrulaması ayrıca gerekir.

Geri dönüş gerekirse `oggaq-development-web:before-b851475` imajını `initial` olarak etiketleyip yalnız web servisini yenileyin; veritabanına müdahale etmeyin. Açık eski sayfaların dosya istekleri için önceki hashli dosyalar yeni imajda korunur. Yeni görünüm için öğrenci/admin sayfasını yenileyin; Expo Go'da aynı proje Reload ile güncellenir.


## Tek girişten iki sınav seçeneği yayını (24 Ekim 2026)

`0c949fe` kaynak sürümü yayımlandı. Yeni tam Deneme Sınavı formunda 125 soru bir kez girilerek silahlı 125 ve silahsız ilk 100 soruluk bağlı seçenek birlikte yayımlanır. Yönetim adresi `https://oggsorubankasi.codentum.net/yonetim/deneme-sinavlari`; yeni formda iki seçenek üretimi varsayılan açıktır. Ortak sorudaki denetimli sürüm düzeltmesi iki şablona uygulanır; başlamış denemeler kendi sürümlerini korur. Mevcut bağımsız sınavlar dönüştürülmedi.

Yayın öncesinde değişen 11 mevcut runtime kaynak dosyasının önceki Git sürümüyle SHA-256 eşleşmesi doğrulandı. Sunucudaki `releases/exam-variants-0c949fe/` dizininde yalnız sahibi tarafından erişilebilen tam PostgreSQL snapshot'ı alındı; `pg_restore --list` ile okunabilirliği denetlendi. Bu, düzenli sunucu dışı yedekleme veya geri yükleme tatbikatı değildir. Önceki app/web imajları `before-0c949fe` etiketleriyle korunur. Yeni app `oggaq-development-app:0c949fe` (`8fcdc49db4d5`), web `oggaq-development-web:0c949fe` (`64183c2358cb`); aktif `initial` etiketleri bunlara bağlandı. App imajı önceki backend'den, web imajı önceki webden türetildi; web imajında yalnız admin paketi değişti.

Yalnız `2026_10_24_000005_add_linked_unarmed_exams` migration'ı çalıştırıldı; iki alan, FK/unique/check ve iki ertelenebilir çift tutarlılığı trigger'ı eklendi. App/worker/scheduler ve web `--no-deps` ile yenilendi; PostgreSQL, Redis, Mailpit ve tünel konteynerleri yenilenmedi. İlk nginx bağlantısı yeniden başlatma sırasında sıfırlandı; retry ile sağlık kontrolü başarılı oldu, rollback gerekmedi. İlgili commit kaynakları önceki dosyalar yedeklenerek `current` içine kopyalandı.

Canlı doğrulama: HTTPS web/admin açılışı ve admin alt yol yenilemesi, origin/CSRF/Secure cookie, yetkisiz API ve gizli dosya koruması geçti; web/admin HTML ve JS/CSS SHA-256 değerleri yerel build ile eşleşti. Hazırlık kontrolünde database/redis/migrations/queue/scheduler `true`. Salt okunur sorguda **2.765 soru, 2.765 sürüm, 286 sınav, 7.700 soru bağlantısı** korundu; eski kayıtlarda `generate_unarmed=false` ve `derived_from_id=null`, iki deferred trigger etkin. Gerçek sunucuya sentetik sınav eklenmedi, gerçek içerik aktarımı yapılmadı. Kullanıcının değiştirdiği yönetici parolası denenmedi veya sıfırlanmadı.

Yerelde 219 PostgreSQL backend testi/2173 assertion, 79 Chromium E2E, 11 admin birim testi, PHP 8.4/Pint, OpenAPI lint/tip üretimi, strict TypeScript ve public API adresiyle admin build geçti. Yalnız sentetik `oggaq_test` üzerinde dışa/içe aktarım turunda yeni bağlantı alanları ve 125/100 çiftin içerik özeti korundu. Sunucu Composer strict validate ve lock audit başarılı; güvenlik duyurusu bulunmadı. Mobil doğrulama Expo web export/Bearer API senaryosudur; yeni çift fiziksel iPad/Android veya native iOS üzerinde ayrıca denenmedi. Uygulama imajı rollback edilirse migration otomatik geri alınmaz; var olan çiftlerdeki DB tutarlılık kuralları etkin kalır.

## 24 Ekim 2026: Dönem bazlı ÖGG puan hesaplama

`c24205c`, bağımsız kaydırmalı hesaplayıcıyı, tam denemeye bağlı ÖGG puanını, atış bilgisinin ek hesaplama sürümü olarak kaydını ve `/yonetim/puanlama` yönetimini ekler. Kaynaklar ve açık mevzuat belirsizlikleri [EXAM_SCORING_RULES](../../docs/EXAM_SCORING_RULES.md), mimari/API [EXAM_SCORING](../../docs/EXAM_SCORING.md) içindedir. Yeni tablolar eski doğru yüzdesini değiştirmez; yayımlanmış kural ve hesap çıktıları korunur.

Yayın öncesi değişen mevcut backend runtime dosyaları önceki Git sürümüyle SHA-256 olarak eşleşti. `releases/scoring-c24205c/` içinde yalnız sahibi erişebilen PostgreSQL snapshot alındı (`before-migration.dump`, 0600); `pg_restore --list` ile okunabilirliği doğrulandı. Bu işlem düzenli sunucu dışı yedekleme veya geri yükleme tatbikatı sayılmaz. İlk paketlemede `database` üst klasörünün 0700 kalması migration dosyasına erişimi engelledi; veritabanına yazılmadan eski imaj etiketi korundu. Paketleme açık klasör izinleriyle düzeltildi ve yeniden çalıştırıldı. Yeni app imajı `oggaq-development-app:c24205c` (`2e876c30bf8d`), web imajı `oggaq-development-web:c24205c` (`a728e866dc77`); `initial` etiketleri bunlara işaret eder. Web ve admin paketleri public API ve `/yonetim/` alt yolu ile derlendi; eski hashli dosyalar korunur.

Yalnız `2026_10_24_000006_create_exam_scoring` migration'ı uygulandı. Ardından `scoring:install-verified --link-existing` ile **13 kural (9 yayımlanmış / 4 taslak), 51 dönem ve 37 uygun tam sınav bağlantısı** oluşturuldu. Herhangi bir yayımlanmış tam sınav bağlantısız kalmadığı salt okunur sorguyla kontrol edildi. Üç puanlama tetikleyicisi etkin. Yeni yönetmelik taslakları hiçbir döneme atanmadı; güncel silahlı temel dönemlerde kesin başarı kararı verilmez. Soru aktarımı veya sentetik sınav oluşturma yapılmadı. **2.765 soru, 2.765 sürüm, 286 sınav, 7.700 soru bağlantısı** ve yayın işaretçileri/soru bağlantılarının içerik özeti yayın öncesiyle aynı kaldı. Yönetici parolası denenmedi veya sıfırlanmadı.

App/worker/scheduler ve web `--no-deps` ile yenilendi; veritabanı, Redis ve tünel konteynerleri yeniden oluşturulmadı. Nginx yapılandırması ve database/redis/migrations/queue/scheduler hazırlığı geçti. İlk bağlantı sıfırlanması retry ile aşıldı. İlgili commit kaynakları önceki dosyalar yedeklenerek `current` içine kopyalandı. Önceki imajlar `before-c24205c` etiketleriyle korunur. Geri dönüşte ilgili app/web etiketleri ve servisler yenilenebilir; birikmiş puan hesaplarını silmeyin ve migration'ı veri kaybıyla geri almayın.

Canlı HTTPS smoke; öğrenci/admin alt yolu, origin, CSRF, Secure cookie, yetkisiz API ve gizli dosya korumasını geçti. Public HTML ve JS/CSS hashleri yerel build ile eşleşti. Mevcut öğrenciyle ayrı oturumda hesaplayıcı 70 genel/15 silah için eksik atışta 50–75, iki isabette 60 gösterdi; güncel silahlı belirsizlik, yenileme seviye tespiti, silah farkı ve öğrenciye admin 403 doğrulandı. Bunlar yalnız önizlemeydi; kişisel hesaplama geçmişine kayıt eklenmedi ve oturum kapatıldı. iOS Device Hub'da yeni hesaplayıcının sunucudan dönemleri ve bölüm puanını aldığı görüldü. Fiziksel Android/iPad ve tam native kaydırıcı/VoiceOver/TalkBack akışları ayrıca denenmelidir.

Yerelde 230 PostgreSQL backend testi / 2.279 assertion, 83 Chromium E2E ve 119 workspace birim testi geçti. Pint, OpenAPI lint/tip üretimi, strict TypeScript, iki web build ve üç platform export başarılıdır. Sentetik `oggaq_test` içerik dışa/içe aktarımında 125/100 çift, 13 kural, arşivlenmiş kural, iki dönem bağlantısı ve içerik özeti korundu. Composer strict manifest/lock audit başarılı. Node audit **başarısız**: mevcut Expo araç zincirindeki Zod `GHSA-mrhx-c7xc-m3w5` bulgusu sürüyor; zorla bağımlılık yükseltmesi yapılmadı.

Expo Metro kesilmiş olduğundan public API/web ayarıyla yeniden başlatıldı. Yeni geçici adres `exp://iityaka-ninjablume-8082.exp.direct`; iOS/Android manifest kontrolü SDK 58, `ninjablume` oturumu ve HTTPS paket/API adreslerini doğruladı. Mac/Metro kapanırsa bu geliştirme bağlantısı kesilir; backend sunucuda çalışmaya devam eder. Public export paketlerinde yerel test API adresi bulunmadığı ayrıca denetlendi.

## 24 Ekim 2026: Sınav performansı

`877560e`, seçili katalog sorgularını, küçük kanonik cevap yanıtını ve mobilde kısa süreli merkezi katalog cache'ini ekler. [Darboğazlar, karşılaştırmalar ve doğrulama sınırları](../../docs/PERFORMANCE.md). Sunucudaki değişen 8 mevcut runtime dosyası önceki Git sürümüyle SHA-256 eşleşti. `releases/performance-877560e/` içinde 0600 tam PostgreSQL snapshot alınıp `pg_restore --list` ile denetlendi; düzenli haricî yedek veya geri yükleme tatbikatı sayılmaz.

App `oggaq-development-app:877560e` (`b1373a373fa5`), web `oggaq-development-web:877560e` (`9805fa8036a8`) yayımlandı; aktif `initial` etiketleri bunları gösterir. App/worker/scheduler ve web `--no-deps` ile yenilendi. App içinde gerçek ortam değerleriyle config cache oluşturuldu. Nginx kontrolü ve bütün hazırlık bileşenleri geçti; başlangıçtaki bağlantı sıfırlanması retry ile aşıldı. Migration, içerik aktarımı veya kural yeniden kurulumu çalıştırılmadı. Değişen commit kaynakları `current` içine eski dosyaları yedekleyerek kopyalandı.

Canlı HTML/JS/CSS hashleri ve HTTPS smoke geçti. İstenen öğrenci örneği mevcut 104. dönem sınavlarıyla tamamlandı: silahlı 76 doğru / 48 yanlış / 1 boş, 4/5 isabet ve 64,5 ÖGG puanı; silahsız 63 doğru / 37 yanlış ve 63 puan. Her iki sonuç canlı listeden açılarak doğrulandı. Merkezi 2.765 soru, 2.765 sürüm, 286 sınav, 7.700 soru bağlantısı ve yayın/soru bağlantısı özeti aynı kaldı. Geri dönüşte `before-877560e` app/web imajları kullanılabilir; mevcut hesap ve deneme kayıtlarını silmeyin. Yeni istemci küçük yanıtı desteklemeyen önceki backend'in tam yanıtını da kabul eder.
