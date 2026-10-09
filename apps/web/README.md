# Öğrenci web uygulaması

React 19/TypeScript, Vite, Tailwind ve TanStack Query ile gerçek Laravel API'sine bağlı ders/konu çalışması. Yönetim panelinden ayrı uygulamadır; platform yöneticisi de kendi hesabıyla öğrenci akışını kullanabilir. Mobil ekran boyutları desteklenir; Expo/iOS/Android uygulaması henüz geliştirilmedi.

## Yerelde açma

API ve PostgreSQL/Redis açıkken depo kökünde Node 24 ile:

```sh
npm ci --ignore-scripts
npm run dev:web
```

Öğrenci uygulaması `http://127.0.0.1:5173`, API varsayılan `http://127.0.0.1:8000` adresindedir. `.env.example` dosyasını `.env.local` olarak kopyalayarak `VITE_API_URL` değiştirilebilir. Bu değer herkese açık yapılandırmadır; secret içermez. Backend `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS` ve CORS aynı origin ile eşleşmelidir. `localhost` ve `127.0.0.1` isimlerini karıştırmayın.

Yeni backend migration'ını PHP 8.4 ile `backend/` içinde `php artisan migrate` kullanarak uygulayın. Mevcut geliştirme verisini silmek için `migrate:fresh` kullanılmaz.

Kullanıcı kayıt formuyla kurum üyeliği olmadan hesap açabilir. Parola kuralı backend'de en az 12 karakter, büyük/küçük harf, rakam ve semboldür. Yerel e-postalar Horizon üzerinden [Mailpit](http://127.0.0.1:58025) kutusuna gider; dışarıya gönderilmez. İmzalı doğrulama bağlantısı web uygulamasını açar, aynı hesaba giriş ve sunucuda onay gerekir. Parola sıfırlama formu da gerçek backend token akışını kullanır. Yeni geliştirme kodunu almak için açık Horizon worker'ını yeniden başlatın.

## Çalışan özellikler

- Cookie/CSRF giriş, bireysel kayıt, e-posta doğrulama/resend, forgot/reset, çıkış ve session hata yönetimi. Kimlik/parola/token localStorage'da saklanmaz; hesap değişiminde query cache temizlenir.
- Kişisel veya aktif kurum çalışma alanını seçme. Alan değişikliği önceki çözümü taşımaz; API başka kullanıcının geçmişini açmaz.
- Ders ve konu/alt konu filtreli yayımlanmış soru listesi. Soru ve katalog cursor sayfaları erişilebilirdir; toplam kayıt sayısı uydurulmaz.
- Bir soruyu yayımlanmış sürümüne sabitlenmiş çalışma olarak açma. Açılmış yarım çalışma geçmişten sürdürülebilir; seçilmemiş/gönderilmemiş cevap tarayıcıda kalıcılaştırılmaz.
- Doğru, yanlış ve açık onayla boş bırakma. Sunucu değerlendirir; açıklama/doğru seçenek yalnız tamamlanan kayıtta görünür.
- Kalıcı çözüm geçmişi, sonuç ve eski soru sürümünü inceleme. Yeni yayın eski çalışmayı değiştirmez.
- Çalışma açmada istemci UUID'si, cevapta çalışma kimliğiyle tekrar güvenliği. Yanıt kaybında aynı istek yeniden gönderilir. Farklı ikinci cevap 409'dur; ilk sonuç korunur.
- Türkçe yükleniyor/boş/hata/retry, alan etiketleri, klavye seçenekleri, telefon/tablet/masaüstü düzeni.

Gerçek SQL/PDF içeriği eklenmedi; normal veritabanı boşsa soru listesi boş görünür. Sorular yönetim panelinde kaynakları incelenerek oluşturulup yayımlanır. Sentetik sorular yalnız izole test veritabanındadır. Süreli sınav, resmî puanlama, favori, istatistik, import ve offline bu teslimde yoktur.

## Doğrulama

```sh
npm run typecheck
npm run test:web
npm run build:web
npx playwright install chromium
npm run test:e2e
```

93 backend testi/450 assertion, 11 admin ve 4 web Vitest testi; admin/öğrenci için toplam 17 Chromium E2E kapsamı vardır. Öğrenci testleri kayıt/doğrulama/reset, doğru/yanlış/boş, yarım çalışma, alan ayrımı, kalıcı geçmiş, yanıt kaybı tekrarı, iki sekmede cevap çakışması ve mobil ölçüleri doğrular. E-posta linkleri test fixture'ında gerçek Laravel notification/broker üzerinden üretilir; E2E dış SMTP teslimini test etmez. Ayrı backend testleri queue encryption ve imza/expiry/ownership denetimlerini kapsar.

E2E yalnız `oggaq_test` veritabanını yeniden oluşturur/temizler. PHPUnit ile eşzamanlı çalıştırmayın. Testler kendi API `8001`, web `5183`, admin `5184` portlarını açıp kapatır; normal `8000`/`5173`/`5174` geliştirme sunucularını kullanmaz. Cache/session izole test PostgreSQL'indedir. Sentetik veriler gerçek kullanıcı hesabına/import'a yazılmaz. Ekran görüntüleri/raporlar Git dışında `artifacts/` altındadır. Firefox/WebKit, native cihaz ve üretim hosting doğrulanmadı.
