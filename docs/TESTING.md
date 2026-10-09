# Test ve doğrulama stratejisi

Mevcut durum: PHP 8.4, gerçek PostgreSQL 18 ve Redis üzerinde **52 backend testi, 191 assertion geçti**. Identity, Tenancy, database constraints ve infrastructure testleri uygulanmıştır. Gerçek HTTP ile cookie/CSRF, kayıt, Horizon→Mailpit doğrulama/reset e-postası, imzalı doğrulama, parola sıfırlama, session/token iptali ve logout ayrıca doğrulandı; sentetik test hesabı temizlendi. Web/admin/mobil arayüz, soru/sınav/import ve offline akışları henüz yoktur; aşağıdaki ilgili senaryolar gelecekteki plandır. Uzak GitHub Actions çalıştırılmadı.

## Araçlar ve ortamlar

Backend standardı PHPUnit 12.5.38; Composer lock dosyasıyla kilitli. Gerçek PostgreSQL servisinde feature/database/authorization testleri; gerektiğinde Redis queue integration. Merkezi PostgreSQL testleri SQLite ile ikame edilmez.

Web/admin: Vitest + React Testing Library; Playwright ile gerçek API/veritabanına bağlı kritik akışlar. Mobil: Expo'nun uyumlu Jest preset'i ve React Native Testing Library; SQLite integration ve gerçek iOS/Android buildinde cihaz/emülatör doğrulaması. Native E2E aracı mobil temel kurulunca uyumluluk/CI maliyetine göre seçilir.

Saat, ağ ve dış e-posta/depolama sınırları kontrollü olabilir; domain/tenant/idempotency davranışı gerçek veritabanında doğrulanır. Testlerde sentetik sorular ve kullanıcılar kullanılır; resmî soru veya gerçek kişisel veri kullanılmaz.

## Kritik kabul matrisi

| Senaryo | Kanıt türü |
| --- | --- |
| Kayıt, giriş, doğrulama, reset, logout | Backend validation/auth test + web/mobil form ve akış |
| Bireysel kullanıcının soru çözmesi | Kişisel context ownership, kalıcı cevap ve E2E |
| Şirket öğrencisinin soru çözmesi | Aktif üyelik, doğru context ve E2E |
| Geçmiş sınav / deneme tamamlama | Pinned soru listesi, doğru/yanlış/boş/puan/süre testleri |
| Yanlış cevaplar / favoriler | Sahiplik, state mutation, pagination ve tekrar |
| Paket indirme / offline çalışma | Hash, kesilen indirme, SQLite/IndexedDB, reboot/refresh |
| Yeniden bağlantı / yarım sync | Yanıt kaybı, retry, kalıcı outbox ve cursor |
| Aynı sonuç iki kez gönderilmesi | Ardışık ve gerçek paralel istek; tek result/domain yazımı |
| Aynı işlem ID'si farklı içerik | 409/idempotency mismatch; ikinci mutation yok |
| Şirket A'nın B verilerine erişmesi | Liste/detail/mutation/export/cache/queue/sync negatif test |
| Kişisel geçmişin şirkete açılması | Çoklu üyelik ve admin raporu negatif test |
| Üyeliğin sonradan kaldırılması | API, queue yürütme ve offline replay reddi |
| Soru / şablon güncellemesi | Eski denemenin sonucu ve ders dağılımı aynı kalır |
| İki cihaz çakışması | Answer/favorite compare-and-swap; veri sessizce kaybolmaz |
| Hesap değişimi / silme | Token iptali, outbox sahipliği, local cleanup, eski sync reddi |
| SQL/PDF aktarım | Karantina, format hatası, önizleme/onay, tekrar güvenliği |

## Platform ve hata durumları

Webde telefon/tablet/masaüstü ölçüleri, klavye/ekran okuyucu, kontrast, boş/hata/yükleniyor durumları; PWA cache'in hesaplar arasında karışmaması doğrulanır. Service worker update sırasında açık deneme ve IndexedDB migration korunur. Background Sync yokken de manuel/ön plan sync çalışır.

Mobilde iOS ve Android, düşük/orta segment cihaz, tablet düzeni, SecureStore, SQLite migration, uygulama kapanması/arka plan, yanlış cihaz saati ve expired token test edilir. Çevrimdışı sınav bitişinde sonuç provisional kalır; sunucu sonucu gelince fark varsa kullanıcıya açıklanır.

Veritabanında composite FK/CHECK/NULL unique, rollback, yarış ve concurrent finish testleri gerekir. Salt mock ile tenant izolasyonu veya idempotency tamamlandı raporlanmaz. Soru/paket tombstone'u ve commit sıralı değişiklik cursor'u geciken transaction senaryosunda doğrulanır.

## CI ve raporlama

Yerelde hazır GitHub Actions yapılandırması PHP 8.4, Node 24, PostgreSQL ve Redis içerir; şu anda manifest/audit/biçim, backend testleri ve API lint kapıları bulunur. Frontend uygulandığında Composer/npm kilitli kurulum, format/lint, `tsc --noEmit`, build, OpenAPI doğrulama ve ilgili testler kurulacak. Native build/test ortamı ayrı hazırlanır; web test başarısı mobil başarı sayılmaz.

Bir özellikte yalnız ilgili testler çalıştırılıp sonuçları raporlanır; değişen shared contract etkilenen uygulamalarda doğrulanır. Test raporu komut, ortam, başarı/başarısızlık ve çalıştırılmayan kontrolleri belirtir. Üretim kapısında güvenlik/performance, backup restore ve hesap silme akışı ayrıca doğrulanır.
