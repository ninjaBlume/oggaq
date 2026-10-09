# Geliştirme kuralları

## Kapsam ve kaynaklar

Bu dosya deponun tamamı için geçerlidir. Önce mevcut kodu, [prompt.md](prompt.md), README ve ilgili `docs/` belgelerini oku. Kullanıcının açık talimatları önceliklidir. İstenen kapsamı onaysız genişletme. Depo adı `oggaq`, geçici teknik ad `security-exam-platform`; kalıcı marka üretme.

Güncel `prompt.md` ilk inceleme sonrasında yenilendi. Çevrimdışı çalışma zorunlu MVP kapsamı değildir; kurumlara özel içerik geleceğe yönelik tasarlanır, merkezi havuza otomatik katılmaz. Eski planı güncel yönerge yerine kullanma. Kullanıcının "Hadi devam et" talimatı backend altyapısı, kimlik doğrulama ve kurum izolasyonu geliştirmesini; sonraki "ee geliştiriyor musun" talimatı açıklanan merkezi soru bankası veri modeli/API/test geliştirmesini yetkilendirmiştir. Bu işler için yeniden onay isteme. Gerçek kaynak veri aktarımı ayrıca kullanıcı onayı gerektirir.

## Uygulama ilkeleri

- Mevcut çalışan kodu incelemeden silme veya yeniden yazma; davranışı koru.
- Laravel 13 modüler monolit, PHP 8.4 ve PostgreSQL kullan. Merkezi veriler için SQLite kullanma. SQLite mobilde, IndexedDB webde yerel depodur.
- Belgeler ve kullanıcı arayüzü Türkçe; sınıf, fonksiyon, alan ve tablo adları İngilizce olsun. TypeScript `strict` kullan.
- SOLID, DRY, KISS ve sorumluluk ayrımını uygula. İş kurallarını controller veya ekranlara yığma. Gereksiz repository katmanı, bağımlılık ve geleceğe yönelik soyutlama ekleme.
- Kullanıcı kimliğini şirket üyeliğinden ayır. Merkezi soru bankasını yalnızca platform yöneticisi değiştirebilir.
- Tenant kimliğini sunucuda aktif üyelik ve rol ile doğrula. Sorgu, policy, arka plan işi, cache ve dosya erişimlerinde aynı izolasyonu koru. Kişisel geçmişi şirketlere açma.
- Backend doğrulaması zorunludur. İstemci kontrolünü yetkilendirme veya veri doğrulaması yerine kullanma.
- Veritabanını migration ile değiştir; foreign key, unique constraint ve indeksleri tanımla. Kritik işlemleri transaction ile yürüt. PostgreSQL üzerinde bütünlük/izolasyon testleri çalıştır.
- Yayınlanmış soru ve değerlendirme sürümlerini değiştirme. Geçmiş denemeler kullandıkları sürümleri korumalıdır.
- Çevrimdışı kapsamı netleşmeden offline uygulamayı MVP'ye zorunlu ekleme. Bu kapsam geliştirildiğinde yazmaları kalıcı outbox içinde sakla; tekrarları, kullanıcı/bağlam ayrımını, üyelik iptalini, ağ kesintisini ve hesap değişimini test et.
- Güvenilmeyen SQL'i uygulama veya üretim veritabanında yürütme. Gerçek dosyaları görmeden kaynak şema varsayma. İçe aktarma önizleme, doğrulama ve yönetici onayı gerektirir.
- Merkezi hata yönetimi kullan; hataları sessizce yutma. Loglara parola, token veya hassas kişisel veri yazma. Gizli anahtarları kaynak koduna veya test fixture'larına koyma.
- Ortam yapılandırmasını örnek dosyalarla belgeleyip gerçek değerleri kaynak kontrolü dışında tut. Testlerde gerçek kullanıcı verisi kullanma.
- Mock ve örnek sorular sadece geliştirme/test ortamlarında olsun; resmî soru gibi sunma.
- Marka başlığı, logo ve tasarım değerlerini merkezi yapılandırmadan yönet; platformların doğal kullanımını ve tablet düzenlerini koru.
- Mevzuat, sınav kuralları ve mağaza politikalarını resmî güncel kaynaklardan doğrula. Hukuki uygunluğu yalnızca yazılımın varlığına dayanarak tamamlandı sayma.

## Tamamlanma ve doğrulama

Yeni ürün özelliği; ilgili arayüz, gerçek API, veritabanı işlemleri, doğrulama, yetkilendirme, hata/yükleniyor/boş durumları, ilgili otomatik testler ve dokümantasyon birlikte hazır olduğunda tamamlanabilir. İlgili web ve mobil davranışlarını uygun ortamlarda doğrula; denenemeyen platformu açıkça bildir.

Her özellik için iş kuralını ve kritik başarısızlık senaryolarını doğrulayan uygun testler yaz. Dokümantasyon veya düşük etkili biçim değişikliklerinde uygulamayı taklit eden test ekleme. Değişiklikten sonra ilgili testleri çalıştır; başarısızlıkları ve çalıştırılmayan kontrolleri ayrı raporla. Uygulama olmadığı aşamada ürün testleri geçti deme.

API değişikliğiyle birlikte sözleşmeyi, veritabanı değişikliğiyle birlikte veri modelini güncelle. Gerçek durum ile planı açıkça ayır; geçici çözümleri kalıcı mimari gibi sunma. Büyük işleri küçük ve doğrulanabilir parçalara böl. Tamamlanan işleri ve kalan eksikleri açıkça belirt.

Kullanıcının "Bağla" talimatı içerik yönetim panelini mevcut API'ye bağlamayı yetkilendirir. `apps/admin` yerel React uygulamasıdır; Sites hosting veya yeni kimlik sağlayıcısına taşınmaz. İçerik ekranlarının yetkisi backend policy ile korunur. OpenAPI ortak tipleri üretildikten sonra strict tip, build ve ilgili UI testlerini çalıştır.

## Mevcut doğrulama komutları

Yerel servisleri `python3 scripts/dev-services.py start` ile başlat. Backend komutlarını PHP 8.4 ile `backend/` içinde çalıştır: `composer test`, `composer lint`, `composer validate --strict`, `composer audit`. API sözleşmesini kökte Node 24 ile `npm run lint:api` üzerinden doğrula. Kurulumun ayrıntıları [DEVELOPMENT](docs/DEVELOPMENT.md) içindedir. PHPUnit yalnız `oggaq_test` PostgreSQL veritabanını kabul eder; testleri geliştirme veya üretim veritabanına yönlendirme.

Admin için kökte `npm run generate:api`, `npm run typecheck`, `npm run test:admin`, `npm run build:admin` kullan. `npm run test:e2e` yalnız `oggaq_test` veritabanını yeniden oluşturur; PHPUnit/E2E aynı DB'yi kullandığından sırayla çalıştırılır. E2E `8001`/`5183`/`5184` portlarını kendi açar ve kapatır; bu portlarda normal sunucu açıkken çalıştırılmaz.

Öğrenci web `apps/web` içinde Study API'ye bağlıdır. Tek soru alıştırmasını süreli sınav olarak sunma; sonuçlar sabit yayımlanmış sürümden sunucuda değerlendirilir. Aynı çalışma/cevap tekrarını ikinci sonuca dönüştürme; kurum/kişisel geçmiş ayrıdır. Web için `npm run test:web` ve `npm run build:web`; ortak `npm run typecheck` iki uygulamayı kapsar. Gerçek kullanıcı kimlik/parolalarını fixture veya belgeye yazma.
