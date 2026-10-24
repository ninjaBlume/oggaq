# Öğrenci web uygulaması

React 19/TypeScript, Vite, Tailwind ve TanStack Query ile gerçek Laravel API'sine bağlı öğrenci uygulaması. Yönetim panelinden ayrı uygulamadır; platform yöneticisi de kendi hesabıyla öğrenci akışını kullanabilir. Telefon, tablet ve masaüstü ekran boyutları desteklenir; ayrı Expo uygulaması [mobil belgede](../../docs/MOBILE.md) açıklanır.

## Yerelde açma

API ve PostgreSQL/Redis açıkken depo kökünde Node 24 ile:

```sh
npm ci --ignore-scripts
npm run dev:web
```

Öğrenci uygulaması `http://127.0.0.1:5173`, API varsayılan `http://127.0.0.1:8000` adresindedir. `.env.example` dosyasını `.env.local` olarak kopyalayarak `VITE_API_URL` değiştirilebilir. Bu değer herkese açık yapılandırmadır; secret içermez. Backend `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS` ve CORS aynı origin ile eşleşmelidir. `localhost` ve `127.0.0.1` isimlerini karıştırmayın.

Yeni backend migration'ını PHP 8.4 ile `backend/` içinde `php artisan migrate` kullanarak uygulayın. Mevcut geliştirme verisini silmek için `migrate:fresh` kullanılmaz.

**Gezinme.** Üst menü: **Deneme sınavları**, **Ders sınavları**, **Sonuçlarım**, **Tekrar**, **Başarım**. Soru bankası ve çalışma geçmişi yoktur; öğrenci iki sınav türüne girer. *Deneme sınavları* silahlı/silahsız seçtirip tam sınavları listeler (silahlı 125, silahsız 100 soru); *Ders sınavları* dersi seçtirip o dersin her sınav numarasındaki sınavını listeler. Her sınav satırı önceki sonucu (kez, en iyi %) gösterir; “Sınava gir” süre sorar (önerilen: silahlı 150, silahsız 120 dk — EGM sınav talimatı 4.3; ders sınavında 1,2 dk/soru; en çok 180) ve açık denemede “Devam et” verir. *Sonuçlarım* girilen tüm sınavları saklar. *Tekrar* yanlış, boş ve favori soruları listeler ve tek soru çalışması olarak çözdürür. Eski adresler (`questions`, `exams`, `history`) yeni sayfalara yönlenir.

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
- Biten denemenin sonucunda her sorunun altında **Soruyu bildir**: neden (radyo) ve en çok 500 karakterlik isteğe bağlı not; gönderince “Bildirimin alındı, teşekkürler.” ve düğme “Bildirdin” olur, sayfa yenilense de kalır. Süre işlerken bildirim yoktur. Cevap açıklaması yalnız doluysa gösterilir.

- **Hesabım** (`/account`, üst menüde *Hesabım*; çalışma alanından bağımsız sayfa): e-posta adresini değiştir (yeni adrese imzalı bağlantı; `/confirm-email-change` sayfası bağlantıyı onaylar), parolayı değiştir (diğer cihazların oturumunu kapatır), cihazlar ve oturumlar (tek tek veya diğer hepsinden çıkış; liste ilk 5 ile sınırlı, “Tümünü göster”), **Verilerimi indir** (JSON dosyası, günde 3 kez), **Hesabı sil** (tehlike bölgesi: parola + “HESABIMI SİL”; silinince herkese açık `/account-deleted` onay ekranı). Her işlem mevcut parolayı ister; yönetici paneli hesabı silme ekranı taşımaz. Ayrıntı [PRIVACY](../../docs/PRIVACY.md).

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

Deneme menüsü soru sayısı/süre/ders/konu seçimi, otomatik cevap kaydı, sunucu süresi ve sonuç/geçmiş ekranına bağlıdır; [EXAMS](../../docs/EXAMS.md). Ortak E2E komutundan önce kökte `npm run export:mobile:preview` çalıştırın.

Tekrar (`/study/:context/review`) bir **tekrar sınavıdır**: Yanlışlarım, Boş bıraktıklarım ve Favorilerim listelerinin soru sayısı gösterilir (`GET /review-summary`); öğrenci soru sayısı ve süreyle o listeden süreli sınav başlatır (`review_kind`). Tek tek soru gezme veya tek soru çözme yoktur. Favori ekleme/çıkarma sınav sonucu ekranındadır. Başarım (`/stats`): doğruluk, tamamlanan deneme ve ders bazlı dağılım. Kapsamları [STUDY](../../docs/STUDY.md#tekrar-listeleri-favoriler-ve-istatistik) ve [EXAMS](../../docs/EXAMS.md) içindedir; E2E: `insights.spec.ts`, `official.spec.ts`.

**Görsel dil ([DESIGN](../../docs/DESIGN.md)).** Renkler `packages/design-tokens` paketinden gelir: `styles.css` `tokens.css`'i içe aktarır ve her renk `var(--c-*)` rolüdür (sabit renk kodu yoktur). Açık/koyu tema cihazı izler (`prefers-color-scheme`); üst menüdeki üçlü anahtar (**Cihaz ayarı / Açık / Koyu**) seçimi `localStorage` (`oggaq-theme`) içinde yalnız kullanıcı değiştirince saklar ve `index.html` içindeki küçük betik (`public/theme-init.js`, satır içi değil ayrı dosya: üretim CSP'si `script-src 'self'` kalsın diye) temayı ilk boyamadan önce uygular. Pencere sınıfları: 600 altı telefon (yan boşluk 14), 600–839 orta (24; içerik en çok 720), 840 ve üstü geniş (32; içerik en çok 1120, sınav/sonuç/ders listeleri iki sütun, sınav çözme ekranında soru yanında yapışkan süre ve soru haritası paneli). Üst gezinme her genişlikte aynıdır: marka ve kullanıcı menüsü üstte, bölümler kaydırılabilir sekme satırı olarak altta; adlar `@oggaq/study-core` `vocabulary` sözlüğündendir. Sonuç skorunun rengi `scoreBand` ile belirlenir (%60 altı kırmızı, %60–79 mavi, %80 üstü yeşil; “geçti/kaldı” denmez).

## 24 Ekim 2026: Mobil ile ortak görsel dil

Öğrenci web sürümüne mobildeki mavi tema ve ölçülü kart düzeni uygulandı: lacivert marka kartı, ince geometrik vurgu, 24px kart/16px düğme köşeleri, daha belirgin başlıklar, mavi seçim grupları ve sınav ikonları. Masaüstünde giriş kartları yan yana, 840px altında marka kartı formun üstündedir; giriş düğmesi 320px telefonda ilk ekrana sığar. Giriş/kayıt/parola yenileme aynı görsel dili kullanır. Parola gösterme düğmeleri 44px hedeftir, gönderim sırasında form ve yön değiştiren bağlantılar kilitlenir. Yeni görsel bağımlılık eklenmedi; renkler ortak token rollerinden gelir.

Gezinme webin üst menüsünde kalır. Tek erişim alanı olan öğrencide gereksiz çalışma alanı seçimi gizlenir; çoklu kişisel/kurum seçimi ve geçmiş ayrımı korunur. Liste beklerken erişilebilir tek durum açıklamasıyla statik iskelet gösterilir. Soru/cevap sırası, süre ve API değerlendirmesi değiştirilmedi.

Doğrulama: strict TypeScript, 4 web birim testi, 63 tasarım token testi ve production derlemesi başarılıdır. 31 Chromium E2E tek koşumda geçti; kayıt/doğrulama, gerçek token ile parola sıfırlama, parola görünürlüğü/gönderim kilidi, tekli/çoklu erişim alanı, sınav/sonuç/tekrar/başarı, hesap işlemleri ve bildirim akışlarını kapsar. Açık/koyu 320/390/834/1280px görüntüler `artifacts/web-preview/redesign/` içinde git dışındadır; masaüstü giriş, dar koyu giriş ve sınav listesi görsel olarak incelendi. Firefox, WebKit ve fiziksel tarayıcı bu teslimde test edilmedi; backend ve native uygulama bu web düzenlemesinde değiştirilmedi.
