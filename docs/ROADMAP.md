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

İlk teslim backend/API temeliydi. Üçüncü teslimde yönetim paneli eklendi; öğrenci web/mobil kayıt ve sınav akışları hâlâ tamamlanmadı. Üretim deploy çalıştırılmadı. Uzak CI sonucu GitHub Actions üzerinden izlenir.

## Tamamlanan ikinci backend teslimi — merkezi soru bankası

- [x] Merkezi ders/konu/alt konu, sınav türü ve kaynak katalogları.
- [x] Tek doğru seçenekli metin sorusu taslağı ve yeni sürümle düzenleme.
- [x] Ayrı yayımlama, yönetici sürüm geçmişi ve `base_version` çakışma kontrolü.
- [x] Öğrenciye yalnız yayımlanmış sürüm; cevap/açıklama gizliliği ve filtreli cursor listeleri.
- [x] Composite FK, yayın pointer'ı, PostgreSQL yayımlanmış sürüm/seçenek değişmezliği ve merkezi audit.
- [x] 23 yeni test; toplam 75 test/329 assertion, gerçek HTTP soru bankası akışı ve 39 operasyonlu OpenAPI.

Kapsam ve sınırlar [QUESTION_BANK](QUESTION_BANK.md) içindedir. Gerçek soru/import ve cevap değerlendirme henüz yoktur. Yönetim paneli üçüncü teslimde eklendi. Yeni bağımlılık eklenmedi.

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

## Sıradaki işler — sürümlü sınav motoru ve öğrenci uygulaması

Ders, konu ve gerekirse alt konu; soru/seçenek/görsel/kaynak sürümleri; sınav türü/numarası/yıl/dönem; resmî sınavın özgün soru sırası ve cevap anahtarı. Bir soru birden çok sınavda kullanılabilir. Alıştırma ile süreli sınavın kuralları ayrılır; doğrulanmamış resmî sayı/süre/başarı koşulu sabitlenmez.

Deneme, cevap ve merkezi değerlendirme; geçmiş sonucun soru/kural değişikliklerinden korunması. Yanlışlar, boş bırakılanlar, favoriler ve başarı projeksiyonları. Kabul kapısı gerçek PostgreSQL işlemleri, context/tenant policies, sürümleme ve puanlama testleri, gerçek API/OpenAPI tutarlılığıdır.

Kurumlara özel sorular/sınavlar gelecekte ayrı sahiplik/yayın kapsamı taşıyacak; merkezi havuza otomatik katılmayacak. İlk QuestionBank migration'ları yalnız merkezi tabloları oluşturur; kurum içerik modeli veya yetkisi eklenmedi. Kurum içeriği merkezi endpoint'lere tenant alanı ekleyerek açılmayacak.

## SQL/PDF kaynak incelemesi ve import

Kaynaklar MySQL/MariaDB biçimindedir; gerçek şema/dump henüz yoktur. Önce değiştirilmeyen kaynakların analizi, eşleme, doğrulama, mükerrer adayları, önizleme ve hata raporu. Aktarım tekrar güvenli, kontrollü ve kullanıcı onaylı olmalıdır. Geliştirme onayı gerçek kaynak verisini içeri aktarma onayı değildir.

Kaynak örnekleri ve telif/yeniden kullanım bilgisi olmadan kesin adapter doğruluğu veya gerçek soru yayını tamamlandı sayılmaz. Güvenilmeyen SQL uygulama/üretim veritabanında çalıştırılmaz.

## Yönetim paneli, web ve mobil

React 19/TypeScript yönetim paneli merkezi içerik API'sine bağlandı; kurum yönetimi sonraki geliştirmedir. Kurum daveti, üyelik yönetimi, izinli raporlar ve kaynak aktarım önizlemesi sırayla tamamlanacak. Raporda kişisel/diğer kurum geçmişi gösterilmez.

Web ve Expo mobil kullanıcı uygulamalarında Türkçe kayıt/giriş, ders/konu/çıkmış sınav/karma deneme, sonuç, yanlış/boş/favori ve başarı akışları; yükleniyor/boş/hata, erişilebilirlik ve tablet/masaüstü düzeni geliştirilir. Platform sürümleri, native build ve gerçek API akışları ayrı doğrulanır.

Hesap silme, veri export, e-posta değiştirme, tüm cihaz oturum yönetimi ve silme/imha süreçleri henüz geliştirilmedi; üretim kapısından önce tamamlanacak.

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
