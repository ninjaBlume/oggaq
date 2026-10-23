# Geliştirme yol haritası

Güncelleme: 9 Ekim 2026. Güncel [prompt.md](../prompt.md) ilk analiz sonrasında yenilendi; önceki belgelerdeki faz numaraları ve kesilmiş yönerge varsayımı artık kullanılmaz. Kullanıcı backend altyapısı, kimlik doğrulama ve kurum izolasyonu geliştirmesini onayladı. Süre veya yayın tarihi taahhüdü yoktur.

## Tamamlanan ilk backend teslimi

- [x] Laravel 13 + PHP 8.4 modüler backend ve kilitli bağımlılıklar.
- [x] Projeye özel PostgreSQL 18, Redis ve yerel Mailpit servisleri.
- [x] Kullanıcı, oturum, kurum, üyelik, çalışma bağlamı ve audit migration'ları.
- [x] Kayıt, cookie giriş/çıkış, süreli ve cihaz bazlı mobil token.
- [x] E-posta doğrulama ve parola sıfırlama; şifreli queue payload ve Horizon.
- [x] Ad güncelleme; istemciden rol/sahiplik alanlarıyla yetki yükseltmenin reddi.
- [x] Platform yöneticisi kurum/üyelik oluşturma ve üyelik iptali.
- [x] Kurum yöneticisinin yalnız kendi kurumunun üye listesi/detail erişimi.
- [x] Kişisel/aktif kurum bağlamı ayrımı ve iptal edilen üyelikte erişimin kesilmesi.
- [x] Gerçek PostgreSQL/Redis üzerinde 52 test, 191 assertion ve gerçek HTTP kimlik akışı.
- [x] OpenAPI 3.1.2, route eşitliği testi, API lint, Composer kontrolleri.
- [x] Kurulum belgeleri ve yerelde hazır GitHub Actions yapılandırması.

İlk teslim backend/API temeliydi. Üçüncü teslimde yönetim paneli eklendi; öğrenci web kayıt/tek soru çalışması dördüncü teslimde eklendi; süreli deneme ve Expo istemcisi beşinci teslimde eklendi; native derleme sonuçları ayrıca izlenir. Üretim deploy çalıştırılmadı. Uzak CI sonucu GitHub Actions üzerinden izlenir.

## Tamamlanan ikinci backend teslimi — merkezi soru bankası

- [x] Merkezi ders/konu/alt konu, sınav türü ve kaynak katalogları.
- [x] Tek doğru seçenekli metin sorusu taslağı ve yeni sürümle düzenleme.
- [x] Ayrı yayımlama, yönetici sürüm geçmişi ve `base_version` çakışma kontrolü.
- [x] Öğrenciye yalnız yayımlanmış sürüm; cevap/açıklama gizliliği ve filtreli cursor listeleri.
- [x] Composite FK, yayın pointer'ı, PostgreSQL yayımlanmış sürüm/seçenek değişmezliği ve merkezi audit.
- [x] 23 yeni test; toplam 75 test/329 assertion, gerçek HTTP soru bankası akışı ve 39 operasyonlu OpenAPI.

Kapsam ve sınırlar [QUESTION_BANK](QUESTION_BANK.md) içindedir. Gerçek kaynak import henüz yoktur; Study/Exams sunucu değerlendirmesi sonraki teslimlerde eklendi. Yönetim paneli üçüncü teslimde eklendi. Yeni bağımlılık eklenmedi.

## Tamamlanan üçüncü teslim — gerçek API ile yönetim paneli

- [x] Türkçe, telefon/tablet/masaüstü React 19/TypeScript paneli.
- [x] Cookie/CSRF giriş, çıkış, rol/doğrulama kapısı ve session hata yönetimi.
- [x] Ders/konu/alt konu, sınav türü ve kaynak oluşturma/listeleme.
- [x] Soru listesi/filtre/sayfalama, taslak oluşturma, yeni sürümle düzenleme, önizleme, yayın onayı ve geçmiş sürümler.
- [x] Kaydedilmemiş değişiklik koruması ve iki gerçek sekmeyle 409 çakışma akışı.
- [x] OpenAPI'den üretilen ortak tipler ve cookie/CSRF API istemcisi.
- [x] Strict tip kontrolü, üretim build'i, 11 Vitest ve 8 gerçek API Chromium E2E testi.
- [x] CI'da admin kontrolleri ve tarayıcı testleri; önceki eksik Unit dizini hatasının giderilmesi.

Panel kapsamı ve kurulum [apps/admin/README](../apps/admin/README.md) içindedir. Kurum yönetimi, import ve öğrenci sınav motoru sonraki işlerdir.

## Tamamlanan dördüncü teslim — öğrenci web ve tek soru alıştırması

- [x] Kayıt, giriş/çıkış, web formunda imzalı doğrulama ve parola sıfırlama.
- [x] Ders/konu filtresi, kişisel/aktif kurum çalışma seçimi.
- [x] Sabit yayımlanmış sürüm, doğru/yanlış/boş sunucu değerlendirmesi, kalıcı ve yarım çalışma geçmişi.
- [x] Tekrar güvenli açma/cevap; ikinci farklı cevabın 409 ile reddi.
- [x] 18 yeni backend testi; toplam 93 test/450 assertion. 15 istemci birim testi ve 17 Chromium E2E, iki web build'i/strict tip kontrolü.

Kapsam [STUDY](STUDY.md), kurulum [öğrenci README](../apps/web/README.md) içindedir. Tek soru çalışması tamamlandı; resmî/süreli çok sorulu sınav değildir.

## Beşinci teslim — süreli deneme ve Expo istemcisi

- [x] Sunucu süresi, sabit rastgele soru/sürüm listesi, doğru/yanlış/boş/puan, atomik bitirme ve scheduler.
- [x] Revision çakışması/tekrar güvenliği, sahip/kurum yetkisi, 16 PostgreSQL testi (gerçek paralel finish dahil).
- [x] Web deneme/sonuç/geçmiş, süre sonunda API sonucu ve telefon/tablet düzeni.
- [x] Expo native giriş, SecureStore, kişisel/kurum seçimi, ders/konu çalışması, geçmiş ve deneme.
- [x] Yerel strict tip, unit, Expo Doctor, iOS/Android Metro export ve prebuild; gerçek Bearer API ekran QA.
- [x] GitHub Actions Android APK ve iOS Simulator derlemesi; iki artifact indirildi ve hash'leri kaydedildi.
- [x] Son paketleri Android/iPhone emülatöründe açma, giriş ekranı görüntülerini inceleme, native SecureStore yazma/okuma/silme kontrolü.
- [ ] Fiziksel cihazda oturum/arka plan testleri, canlı HTTPS API ve mağaza yayını.

[EXAMS](EXAMS.md), [MOBILE](MOBILE.md); iki upstream Expo build advisory'si açık.

## Altıncı teslim — deneme sağlamlaştırma, tekrar/istatistik ve çıkmış sınav (18 Ekim 2026)

Yerel PHP 8.4.26 / PostgreSQL 18.6 / Node 24.22 ile doğrulandı: 126 backend testi (875 assertion), Pint, OpenAPI lint, `generate:api`, 35 Vitest, strict tip, admin/web build ve 37 Chromium E2E (admin, web, mobil Expo web export) geçti. Native Android/iOS derlemesi ve fiziksel cihaz yeniden denenmedi.

- [x] Deneme cevap çakışması deneme geneli yerine cevap bazına indirildi (`exam_answers.changed_revision`).
- [x] Rastgele deneme seçimi soru satırı kilidi almıyor; yayımlama beklemiyor.
- [x] Geçmiş listesi salt okunur; süre dolumu `exams:expire` veya denemeyi açma ile.
- [x] Yanlışlarım/boşlarım/favorilerim (`review-questions`, `favorites`) ve `stats` API'si.
- [x] Çıkmış sınav modeli (`official_exams*`), yönetici taslak/yayım uçları, öğrenci künye uçları ve `official_exam_id` ile orijinal sıralı deneme; DB trigger'ları.
- [x] `packages/shared-types` `npm run generate:api` ile yenilendi.
- [x] Web: Tekrar, Başarım, favori ve çıkmış sınav seçimi; yönetim paneli: çıkmış sınav oluşturma/sıralama/yayımlama; mobil: yan menüde Tekrar ve Başarım, favori, çıkmış sınav denemesi.
- [x] Mobil ana sayfada Tekrar/Başarım kısayolları (Başarım karosu doğruluğu gösterir) ve sınav sonuç ekranından favoriye ekleme.
- [x] `symfony/http-foundation` 7.4.21'e güncellendi; `composer audit` temiz.
- [x] Gerçek çıkmış sınav verisi: `asvip-1` adapter'ı ile önizleme/onay/aktarım uygulandı ve geliştirme veritabanına aktarıldı ([IMPORTING](IMPORTING.md#uygulanan-adapter-asvip-1-kurum-arşiv-dökümü)); üretim aktarımı ve düzenleme gerektiren sorular açık.

## Sıradaki işler — kurum şablonları ve raporlar

Ders, konu ve gerekirse alt konu; soru/seçenek/görsel/kaynak sürümleri; sınav türü/numarası/yıl/dönem; resmî sınavın özgün soru sırası ve cevap anahtarı. Bir soru birden çok sınavda kullanılabilir. Alıştırma ile süreli sınavın kuralları ayrılır; doğrulanmamış resmî sayı/süre/başarı koşulu sabitlenmez.

Deneme, cevap ve merkezi değerlendirme; geçmiş sonucun soru/kural değişikliklerinden korunması. Yanlışlar, boş bırakılanlar, favoriler ve başarı API'si altıncı teslimde eklendi; kurum raporları ve ekranlar sürer. Kabul kapısı gerçek PostgreSQL işlemleri, context/tenant policies, sürümleme ve puanlama testleri, gerçek API/OpenAPI tutarlılığıdır.

Kurumlara özel sorular/sınavlar gelecekte ayrı sahiplik/yayın kapsamı taşıyacak; merkezi havuza otomatik katılmayacak. İlk QuestionBank migration'ları yalnız merkezi tabloları oluşturur; kurum içerik modeli veya yetkisi eklenmedi. Kurum içeriği merkezi endpoint'lere tenant alanı ekleyerek açılmayacak.

## SQL/PDF kaynak incelemesi ve import

Kaynaklar MySQL/MariaDB biçimindedir; gerçek şema/dump henüz yoktur. Önce değiştirilmeyen kaynakların analizi, eşleme, doğrulama, mükerrer adayları, önizleme ve hata raporu. Aktarım tekrar güvenli, kontrollü ve kullanıcı onaylı olmalıdır. Geliştirme onayı gerçek kaynak verisini içeri aktarma onayı değildir.

Kaynak örnekleri ve telif/yeniden kullanım bilgisi olmadan kesin adapter doğruluğu veya gerçek soru yayını tamamlandı sayılmaz. Güvenilmeyen SQL uygulama/üretim veritabanında çalıştırılmaz.

## Yönetim paneli, web ve mobil

React 19/TypeScript yönetim paneli merkezi içerik API'sine bağlandı; kurum yönetimi sonraki geliştirmedir. Kurum daveti, üyelik yönetimi, izinli raporlar ve kaynak aktarım önizlemesi sırayla tamamlanacak. Raporda kişisel/diğer kurum geçmişi gösterilmez.

Web ve Expo mobil kullanıcı uygulamalarında Türkçe kayıt/giriş, ders/konu/çıkmış sınav/karma deneme, sonuç, yanlış/boş/favori ve başarı akışları; yükleniyor/boş/hata, erişilebilirlik ve tablet/masaüstü düzeni geliştirilir. Platform sürümleri, native build ve gerçek API akışları ayrı doğrulanır.

Hesap silme, veri dışa aktarma, e-posta/parola değiştirme, cihaz ve oturum yönetimi uygulandı (web `/account`, mobil Profil → Hesabım; [PRIVACY](PRIVACY.md)). Kalanlar: hukuki metinler (aydınlatma, kullanım koşulları), KVKK veri sorumlusu/aktarım kararı, yedekten dönüşte imha kaydının yeniden uygulanması, gerçek e-posta sağlayıcısı ve günlük saklama; üretim kapısından önce tamamlanacak.

Soru bildirimi (öğrenci sonuç ekranı, web/mobil) ve yönetici inceleme kuyruğu (Bildirimler) uygulandı: [QUESTION_BANK](QUESTION_BANK.md#soru-bildirimleri). Tek tek cevap açıklaması yazılmayacağı karara bağlandı. Üretim barındırma ve yedekleme sunucusu hazır; henüz yerelde geliştirilmektedir, yayın ve yedek geri yükleme tatbikatı yapılmadı.

## Ayrıca kapsamlandırılacak işler

Çevrimdışı sınav güncel yönergede otomatik zorunlu değildir. [OFFLINE_SYNC](OFFLINE_SYNC.md) hazır bir protokol önerisidir; kullanıcı kapsamını netleştirmeden SQLite/IndexedDB/PWA/outbox uygulaması başlatılmaz. Günlük hedef, tema ve soru bildirme gibi eski plandaki ekler de kesin MVP kapsamı kabul edilmez.

Reklam/sponsor mimarisi çekirdek sınavı kesintiye uğratmayacak şekilde ileride ele alınır. İlk sürümde reklam SDK'sı ve kişisel hedefleme zorunlu değildir; gizlilik/mağaza değerlendirmesi yapılmadan aktive edilmez.

## Üretim kapısı ve açık girdiler

| Girdi / karar | İlgili kapı |
| --- | --- |
| Gerçek SQL/PDF örnekleri ve kaynak hakları | Adapter doğrulaması ve içerik yayını |
| Güncel resmî sınav kuralları | Kaynaklı sürümlü şablon yayını |
| Kurum içeriği/rapor yetkisi ve hukuki dayanak | Kuruma özel içerik ve raporların açılması |
| Offline kapsamı ve minimum cihaz/OS | Mobil paket/yerel çalışma tasarımı |
| Marka ve tasarım kararları | Kullanıcı/mağaza yayını |
| Hosting/servis sağlayıcısı ve veri konumu | Gerçek kullanıcı verisi işleme |
| Aydınlatma/gizlilik, saklama/imha ve aktarım koşulları | Üretim ve mağaza hazırlığı |

Güvenlik/performance, HTTPS/secret yönetimi, backup/restore, olay izleme, hesabı güvenle silme, CI/deploy/rollback ve Android/iOS/web yayın ortamları doğrulanmadan ürün yayına hazır sayılmaz. Her işte plan, uygulanmış backend ve uçtan uca ürün özelliği ayrı raporlanır.
