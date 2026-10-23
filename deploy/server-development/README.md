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

Smoke kontrolü HTTPS origin'ini Playwright yönlendirmesiyle taklit eder; gerçek DNS/TLS doğrulaması ayrıca yapılır. Hesap/veri oluşturmaz. Öğrenci giriş sayfası, admin alt yolu ve yenilemesi, tema/CSS, CSRF, secure/host-only çerez, geçersiz giriş, yetkisiz API ve gizli dosya erişimi kontrol edilir.

Yayından sonra `OGGAQ_DIRECT=1 node deploy/server-development/smoke.mjs` doğrudan gerçek HTTPS adresini kontrol eder. Yeni kayıt yerel DNS'in olumsuz önbelleğindeyse yalnızca test için `OGGAQ_RESOLVE_IP=<yetkili-DNS-yanıtındaki-IP>` verilebilir; TLS/sertifika kontrolü kapatılmaz. Bu tanılama sistemin DNS ayarlarını veya hosts dosyasını değiştirmez.

## Veri kalıcılığı ve sınırlar

PostgreSQL, Redis AOF ve Laravel storage ayrı named volume'lardadır. `docker compose down` bu verileri silmez; `down --volumes` veri kaybına yol açar. Gerçek veri eklenmeden önce sunucu dışı yedek ve geri yükleme planı ayrıca uygulanmalıdır; Compose'un çalışması yedek alındığı anlamına gelmez.

Bu dosya tek alan adı ve paylaşılan sunucu için mevcut [üretim şablonlarına](../../docs/DEPLOYMENT.md) alternatif bir geliştirme kurulumudur. Üretim şablonları ve host servis yönetimiyle birlikte çalıştırılmaz.

## 23 Ekim 2026 sunucu doğrulaması

Ubuntu 22.04 üzerinde ayrı `/home/harun/oggaq-development` dizini ve `oggaq-development` Compose projesi kuruldu. `current` bağlantısı ilk kaynak sürümünü gösterir; `~/oggaq-development/manage` sarmalayıcısı ortam dosyalarını değerlerini yazdırmadan yükleyerek Compose komutlarını çalıştırır (`manage ps`, `manage exec app php artisan ...`). PHP 8.4.27 ve PostgreSQL 18.6 üzerinde 23 migration uygulandı; `oggaq` rolünde superuser/createdb/createrole kapalı olduğu doğrulandı.

Yerel strict tip kontrolü, 11 admin/4 web testi ve iki derleme geçti. Sunucuda Composer manifest/platform/audit ve gerçek tarayıcı smoke kontrolü geçti; kalp atışı dahil hazırlık yanıtı `ok`. Horizon üzerinden gönderilen tek sentetik bildirim yalnızca Mailpit'e ulaştı. Başlangıç kaynak dosyalarının kısıtlı izinleri ilk veritabanı betiğini ve tema betiğini engellemişti; imajdaki okuma izinleri ile başlangıç betiği düzeltildi ve tekrar doğrulandı. Gerçek soru/kullanıcı verisi taşınmadı.

Cloudflare `oggaq-development` tüneli sağlıklı olarak bağlandı (dört edge bağlantısı). `oggsorubankasi.codentum.net` için proxy'li CNAME ve `http://web:8080` uygulama yönlendirmesi oluşturuldu. Yetkili DNS/1.1.1.1 sorguları kaydı döndürdü. Sunucudan normal DNS çözümlemesiyle HTTPS sağlık kontrolü `200 / ok`; bu Mac'te geçerli sertifikayla gerçek Cloudflare IP'sine yöneltilmiş doğrudan Playwright kontrolü de geçti. Safari'de normal HTTPS adresi açılıp öğrenci giriş ekranı ayrıca görüldü. HTTP istekleri yol ve sorgu parametreleri korunarak `308` ile HTTPS'e yönlenir; nginx yapılandırması `nginx -t` ile geçti. Alan adına özgü bu kural diğer projelerin ayarlarını değiştirmez.

İlk tünel denemesinde 0600 token dosyası yetenekleri kaldırılmış root süreci tarafından okunamadı; konteyner, dosyanın sahibi olan dağıtım kullanıcısının UID/GID'siyle çalıştırılarak düzeltildi. Token değeri ekrana, günlüklere veya depoya yazılmadı.

Bu doğrulama tam backend PHPUnit veya native iOS/Android kontrolü değildir. İlk yönetici hesabı, gerçek içerik aktarımı, gerçek SMTP ve sunucu dışı yedek ayrı adımlardır; hazır oldukları ileri sürülmez.
