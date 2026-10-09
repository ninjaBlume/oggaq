# Geliştirme ortamı ve doğrulama

9 Ekim 2026: macOS üzerinde PHP 8.4.26, Laravel 13.35.0, PostgreSQL 18.6, Redis 8.10.2, Node 24.21.0 ve Mailpit 1.31.4 ile yerel backend doğrulandı. Servisler sadece `127.0.0.1` adresine bağlanır. Mevcut PHP 8.5/Node 23/PostgreSQL 14 global bağlantıları değiştirilmedi; proje komutlarında hedef sürümler açıkça seçilir.

## Kurulum

Homebrew tabanlı macOS ortamı için gerekli araçlar:

```sh
brew install php@8.4 postgresql@18 redis node@24 mailpit
export PATH="$(brew --prefix php@8.4)/bin:$(brew --prefix node@24)/bin:$PATH"
php --version
node --version
python3 scripts/dev-services.py start
cd backend
composer install --no-interaction --prefer-dist
php artisan migrate
```

Servis script'i projeye ait `infrastructure/data/` altında PostgreSQL cluster'ı, Redis AOF ve yerel posta kutusunu oluşturur. `oggaq` ve `oggaq_test` ayrı veritabanlarıdır; uygulama rolü superuser/createdb/createrole yetkisine sahip değildir. Cluster yönetimi aynı OS kullanıcısına açık özel Unix socket üzerinden yapılır; TCP parolalıdır. Bu yalnız yerel geliştirme düzenidir.

Script rastgele DB/Redis parolası ve uygulama anahtarı üretir; değerleri çıktıya yazmaz. Yerel credential dosyası ve `.env` dosyaları 0600 izinle, veri dizini 0700 izinle saklanır ve Git tarafından dışlanır. Mevcut `.env` dosyalarının üzerine yazılmaz. Başka ortamın `.env` dosyası varsa bağlantı değerlerini kullanıcı kendi yerel ayarlarına göre eşleştirir.

Homebrew olmayan ortamda PHP 8.4, PostgreSQL 18 ve Redis'i kendiniz hazırlayıp `.env.example` değerlerini bağlantınıza göre ayarlayabilirsiniz. PHPUnit için ayrı `oggaq_test` veritabanı şarttır. Docker runtime veya Docker geliştirme ortamı bu teslimde kurulmadı.

## Çalıştırma

`backend/` içinde ayrı terminaller:

```sh
php artisan serve --host=127.0.0.1 --port=8000 --no-reload
php artisan horizon
php artisan schedule:work
```

| Servis | Adres / port |
| --- | --- |
| API | `http://127.0.0.1:8000` |
| PostgreSQL | `127.0.0.1:55432` |
| Redis | `127.0.0.1:56379` |
| Mailpit posta kutusu | `http://127.0.0.1:58025` |
| Yerel SMTP | `127.0.0.1:51025` |

Mailpit e-postaları yerelde yakalar; dışarıya göndermez. Bildirimler Horizon çalışırken işlenir. Doğrulama ve parola sıfırlama e-postaları öğrenci web formlarını açar; backend reset endpoint'i ve token akışı test edilmiştir. Doğrulama bağlantısı giriş yapmış aynı kullanıcı için geçerlidir; webde cookie, mobil API'de Bearer kimliği kullanılır.

Horizon paneli yerelde de yalnız doğrulanmış aktif platform yöneticisine açıktır. Örnek yönetici hesabı/parolası otomatik oluşturulmaz:

```sh
php artisan app:create-admin admin@example.test --name="Platform yöneticisi"
```

Komut parolayı gizli istemle iki kez alır; mevcut kullanıcıyı yöneticiye yükseltmez. Komut, güvenilir yerel/operasyon yöneticisi tarafından oluşturulan hesap için e-posta doğrulanmış durumunu atar. Öğrenci kayıt endpoint'i bunu yapamaz. `.test` adresler sadece geliştirme örneğidir.

## Web ve mobil API kullanımı

Web girişinden önce `/sanctum/csrf-cookie` çağrılır; cookies saklanır. `XSRF-TOKEN` cookie'sinin URL decode edilmiş değeri `X-XSRF-TOKEN` başlığında, cookie'ler `credentials: include` ile gönderilir. Giriş session ID'sini yeniler. `FRONTEND_URL`, `ADMIN_URL` ve `SANCTUM_STATEFUL_DOMAINS` gerçek istemci origin'leriyle eşleşmelidir.

Mobil `/api/v1/auth/mobile-tokens` için e-posta/parola ve UUID `device_id` gönderir; sonlu `expires_at` ve token alır. Aynı cihazla tekrar giriş o cihazın eski token'ını iptal eder. Diğer cihazlar korunur. Token `api:access` ability taşır; Policy denetimleri ayrıca uygulanır. Üretimde istemci token'ı SecureStore'a yazacak; mobil uygulama henüz yoktur.

Parola sıfırlama tüm token ve veritabanı oturumlarını iptal eder. Kullanıcının adı `/me` üzerinden güncellenebilir; e-posta/parola/rol/sahiplik alanları bu uçla değiştirilemez. Şirket davetleri, reactivation, raporlar ve hesap silme/veri export işlemleri bu teslimin dışında kalır.

## Kontroller

`backend/` içinde:

```sh
composer validate --strict
composer check-platform-reqs
composer audit
composer lint
composer test
```

Depo kökünde Node 24 ile:

```sh
npm ci --ignore-scripts
npm run lint:api
```

PHPUnit PostgreSQL ve Redis'in açık olmasını ister. `APP_ENV=testing`, PostgreSQL ve tam `oggaq_test` adı test bootstrap'ında zorunludur; DB URL'si temizlenir. Test verileri ayrı veritabanı transaction'larında tutulur. Test key'leri Redis'te benzersiz adlarla oluşturulup temizlenir. Test ortamında düşük Argon2 maliyeti, üretimde normal maliyet kullanılır.

GitHub Actions aynı PHP/Node ana sürümleri ve PostgreSQL 18/Redis 8 servisleriyle manifest, audit, biçim, test ve API lint kapılarını içerir. Workflow push ve pull request ile tetiklenir; uzak CI sonucu GitHub Actions üzerinden izlenir.

## Yönetim paneli

Backend API açıkken kökte Node 24 ile `npm ci --ignore-scripts` ve `npm run dev:admin` çalıştırın. Panel `http://127.0.0.1:5174` adresinde cookie/CSRF ile API'ye bağlanır. `.env.example` içindeki `ADMIN_URL` ve `SANCTUM_STATEFUL_DOMAINS` bu origin'i içerir. Yönetici hesabı için yukarıdaki `app:create-admin` komutu kullanılır; otomatik hesap yoktur. Akışlar ve sınırlar [panel README](../apps/admin/README.md) içindedir.

`npm run typecheck`, `npm run test:admin`, `npm run build:admin` ile istemci kontrol edilir. `npx playwright install chromium` ardından `npm run test:e2e`, yalnız `oggaq_test` PostgreSQL üzerinde sentetik veriyle çalışır; test DB'sini önce/sonra yeniden oluşturur. PHPUnit ve E2E aynı anda çalıştırılmaz. E2E `8001`/`5183`/`5184` portlarını kendi açıp kapatır; normal `8000`/`5173`/`5174` sunucularını kullanmaz. Test session/cache'i izole PostgreSQL'de tutulur; gerçek geliştirme Redis verisi temizlenmez.

CI, OpenAPI tip üretimi/fark kontrolü, admin/öğrenci web strict tip/Vitest/build/npm audit ve gerçek API Chromium E2E kapılarını da içerir. İlk uzak çalışma, Git'te bulunmayan boş `tests/Unit` dizinine PHPUnit referansı nedeniyle başarısız oldu; bu referans kaldırıldı. Yeni uzak sonuç GitHub Actions'tan izlenir.

## Öğrenci uygulaması

Backend migration'ını `php artisan migrate` ile uygulayıp kökte `npm run dev:web` çalıştırın. Uygulama `http://127.0.0.1:5173` adresindedir. Kayıt/doğrulama/reset, ders/konu çalışması ve kalıcı çözüm geçmişi [web README](../apps/web/README.md) ve [STUDY](STUDY.md) içinde açıklanır. `npm run test:web`, `npm run build:web` ve ortak `npm run typecheck` webi de kontrol eder. Bildirim bağlantısı değiştiğinden açık Horizon worker'ını yeni kodla yeniden başlatın.

## Durdurma ve üretim sınırı

Önce API, Horizon ve scheduler terminallerini Ctrl+C ile kapatın; sonra kökte:

```sh
python3 scripts/dev-services.py status
python3 scripts/dev-services.py stop
```

Veriler silinmez. `.env`, uygulama anahtarı ve veri dizini kaybolursa mevcut şifreli oturum/kuyruk verisi açılamayabilir; geliştirme verisini silmeden önce bunun etkisini değerlendirin. Üretimde HTTPS, `APP_DEBUG=false`, özel secret yönetimi, bağımsız servis yaşam döngüsü, SMTP sağlayıcısı ve veri konumu değerlendirmesi gerekir. Bu yerel script üretimde kullanılmaz.

## Deneme ve mobil

Yeni tablolar için yalnız forward `php artisan migrate`; normal DB üzerinde `migrate:fresh` çalıştırmayın. Terk edilen süreli denemeler için `php artisan schedule:work` veya üretim cron scheduler gerekir. Mobil kurulum ve toolchain [MOBILE](MOBILE.md) içinde. E2E öncesi `npm run export:mobile:preview`; native/web QA ayrı. `npm run audit` yeni advisory’leri reddeder, belgelenmiş iki Expo build uyarısı açık kalır.
