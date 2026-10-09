# Test ve doğrulama stratejisi

Mevcut yerel sonuç: PHP 8.4 / gerçek PostgreSQL 18 / Redis ile **109 backend testi, 584 assertion**; admin 11, web 4, mobil 7 ve ortak saat 3 olmak üzere **25 Vitest**. **24 Chromium E2E** admin, öğrenci, deneme ve Expo ekran/Bearer akışlarını kapsar. Strict TypeScript, iki web production build, üç platform Metro export, native prebuild ve Expo Doctor (21/21) doğrulandı. Native derleme sonuçları [MOBILE](MOBILE.md) içinde ayrı tutulur; Chromium kontrolü cihaz testi yerine geçmez. İki upstream Expo build advisory'si açıktır; ham npm audit temiz değildir.

## Araçlar ve ortamlar

Backend standardı PHPUnit 12.5.38; Composer lock dosyasıyla kilitli. Gerçek PostgreSQL servisinde feature/database/authorization testleri; gerektiğinde Redis queue integration. Merkezi PostgreSQL testleri SQLite ile ikame edilmez.

Admin: Vitest ile saf editör kuralları ve API taşıma hata davranışı; Playwright ile gerçek Laravel/PostgreSQL ve cookie/CSRF kritik akışları. React Testing Library henüz kurulmadı. Mobil: saf oturum/taşıma kuralları Vitest; Expo web export ekranları gerçek Bearer API ile Playwright. Jest/RNTL, SQLite ve cihaz E2E henüz yoktur. Native E2E aracı mobil temel kurulunca uyumluluk/CI maliyetine göre seçilir.

Saat, ağ ve dış e-posta/depolama sınırları kontrollü olabilir; domain/tenant/idempotency davranışı gerçek veritabanında doğrulanır. Testlerde sentetik sorular ve kullanıcılar kullanılır; resmî soru veya gerçek kişisel veri kullanılmaz.

## Uygulanan admin tarayıcı kontrolleri

1. Giriş, gerçek katalog oluşturma, taslak/önizleme/kayıt, kalıcı veri, yayın, yeni sürüm, eski yayın ve geçmiş koruması, öğrenci cevap gizliliği, çıkış.
2. Öğrenci ve doğrulanmamış yönetici erişiminin engellenmesi.
3. Yanlış parola ve gerçek duplicate kod 422 alan hatası.
4. Kaydedilmemiş değişiklikleri koruma veya bırakma.
5. İki gerçek sekmenin aynı soruyu düzenlemesinde 409 ve yerel girdilerin korunması.
6. Telefon/tablet ölçülerinde yatay taşma kontrolü.
7. Kontrollü ağ hatasında hata/retry görünümü ve gerçek API'ye tekrar bağlanma.
8. Kontrollü 401 yanıtında session temizleme ve girişe dönüş.

E2E `APP_ENV=local` ile gerçek CSRF middleware'ini kullanır; sentetik fixture'lar yalnız `oggaq_test` içinde hazırlanır/temizlenir. Guard farklı veritabanını reddeder. Backend testleri ile E2E aynı veritabanını yenilediğinden **eşzamanlı çalıştırılmaz**. Test session/cache'i database driver ile izole edilir; geliştirme Redis cache'i temizlenmez. Chromium doğrulandı; Firefox/WebKit, ekran okuyucu veya native cihaz testi tamamlandı sayılmaz. Komutlar ve portlar [panel README](../apps/admin/README.md) içindedir.

## Uygulanan öğrenci kontrolleri

18 Study PostgreSQL testi ve 9 öğrenci Chromium E2E: doğru/yanlış/boş, sabit sürüm, kişisel/kurum ayrımı, stale actor/üyelik/kurum aktifliği, kalıcı geçmiş, yanıt kaybında aynı kayıt, iki sekmede farklı cevap çakışması, gerçek broker/notification bağlantısıyla kayıt/doğrulama/reset. Test SMTP teslimi web E2E'ye dahil değildir. Senaryolar ve test portları [web README](../apps/web/README.md) içindedir.

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

Yerelde hazır GitHub Actions yapılandırması PHP 8.4, Node 24, PostgreSQL ve Redis içerir; manifest/audit/biçim, backend testleri, API lint ve üretilen tiplerin güncelliği, strict tip kontrolü, Vitest, admin build, npm audit ve gerçek API Chromium E2E kapıları bulunur. Kilitli Composer/npm kurulumu kullanılır. Android APK ve macOS 26 iOS Simulator derleme işleri eklendi; web test başarısı mobil başarı sayılmaz.

Bir özellikte yalnız ilgili testler çalıştırılıp sonuçları raporlanır; değişen shared contract etkilenen uygulamalarda doğrulanır. Test raporu komut, ortam, başarı/başarısızlık ve çalıştırılmayan kontrolleri belirtir. Üretim kapısında güvenlik/performance, backup restore ve hesap silme akışı ayrıca doğrulanır.

Deneme testleri, yarış worker guardı ve süre sonu fixture davranışı [EXAMS](EXAMS.md) içinde. Tam E2E öncesi `npm run export:mobile:preview` çalıştırın; test sunucuları 8001/5183/5184/5185 portlarını açıp kapatır. PHPUnit ile sırayla çalıştırın.
