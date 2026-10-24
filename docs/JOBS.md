# İş İlanları

24 Ekim 2026: Jobs modülü; platform yöneticisi için ilan yönetimi ve başvuru inceleme, öğrenci web ve Expo istemcisi için ilanları görme ve uygulama içinden başvurma akışını uygular. Başvuru ad, e-posta, telefon ve isteğe bağlı kısa ön yazı alır. CV yükleme, işveren hesabı, dış başvuru yönlendirmesi ve başvuru bildirimi bu sürümde yoktur.

## Kullanım

- **Admin:** İş İlanları → İlan ekle. Başlık, firma, şehir/konum, açıklama ve ÖGG kart türü girilir. İlan taslak kaydedilir veya yayımlanır; isteğe bağlı son başvuru tarihi belirlenir. İlan düzenleme ekranındaki Başvurular bölümünde adayın iletişim bilgileri ve ön yazısı görülür, durum Başvuru alındı / İnceleniyor / Olumlu değerlendirildi / Olumsuz değerlendirildi olarak değiştirilebilir. Geliştirme sunucusunda adres `/yonetim/is-ilanlari`.
- **Öğrenci web:** İş İlanları gezinme öğesi. **Mobil:** soldan açılan menü → İş İlanları. İlanlar sekmesinde ayrıntı ve başvuru formu; Başvurularım sekmesinde kişisel başvuru ve değerlendirme durumu bulunur. Ad ve e-posta hesap profilinden doldurulur, başvurmadan önce değiştirilebilir. İletişim bilgilerinin platform yöneticisince görüleceği formda açıklanır.
- Yalnız yayımlanmış ve süresi dolmamış ilanlar öğrenci listesine/ayrıntısına açıktır. Kapanan veya süresi dolan ilanın önceki başvurusu Başvurularım'da kalır. Başvuru yeni ilan içeriğiyle geriye dönük değiştirilmez.
- Arayüzler yükleniyor, boş liste, doğrulama, API hatası, yeniden deneme ve sayfalama durumlarını içerir. Başvuru durumları yenile düğmesiyle tekrar alınabilir; anlık bildirim/push yoktur.

## Yetki ve veri modeli

Jobs kişisel kullanıcı kimliğine bağlıdır; `study_context_id` veya tenant sahipliği kullanmaz. Çalışma alanı değişimi başvuru sahipliğini değiştirmez. Aktif ve e-postası doğrulanmış kullanıcılar ilan görebilir/başvurabilir. Yalnız platform yöneticisi (`JobPostingPolicy::manage`) ilanları veya başvuru değerlendirmelerini yönetebilir; kurum yöneticiliği bu yetkiyi vermez. Öğrenci API'si başkalarının başvurularını, başvuru sayılarını veya iletişim bilgilerini döndürmez.

`2026_10_24_000004_create_jobs_tables` migration'ı:

| Tablo | Kurallar |
| --- | --- |
| `job_postings` | UUID; başlık, firma, şehir, açıklama; `weapon_requirement` any/armed/unarmed; `status` draft/published/closed; pozitif `revision`; isteğe bağlı `expires_at`; `created_by` kullanıcı FK (`SET NULL`); durum/tarih/kimlik indeksi |
| `job_applications` | UUID; ilan FK (`RESTRICT`), kullanıcı FK (`CASCADE`); kullanıcı+ilan tekil; başvuru anındaki ilan metninin `job_snapshot` JSONB kopyası; dört iletişim/ön yazı alanında Laravel encrypted cast; submitted/reviewing/accepted/rejected durumları ve pozitif revision; ilan ve kullanıcı bazlı sayfalama indeksleri |

Durumlar ve pozitif revision PostgreSQL CHECK constraint ile doğrulanır. Başvuru yazımı transaction içinde kullanıcı ve ilan satırını kilitler, güncel hesap erişimini ve ilanın açık olduğunu tekrar doğrular. Kullanıcı kimliği istemciden alınmaz. Aynı kullanıcının aynı ilana aynı dört alanla tekrarı ilk kaydı `200` ile döndürür; ilk kayıt `201` olur. Farklı bilgilerle ikinci başvuru `409 already_applied` döndürür. Yanıt kaybından sonraki aynı tekrar, ilan kapanmış olsa da yeni başvuru üretmez. Başvuru değiştirme/silme ekranı yoktur.

İlan düzenleme ve başvuru değerlendirme `base_version` ister; eski revision `409 version_conflict` döndürür. Başvuru formu sunucuda ad/e-posta/telefon/uzunluk doğrulamasından geçer; telefon 7–15 rakam ve izin verilen biçim karakterlerini kabul eder. Başvuru uç noktası kullanıcı başına saatte 20 istekle, diğer uçlar mevcut API sınırıyla korunur.

Kişisel başvurular mevcut hesap dışa aktarmasına dahil edilir ve hesap silinirken silinir. İlan yayından kalkması kişisel başvuruyu silmez. Şifreli iletişim verisinin okunması mevcut uygulama anahtarına bağlıdır; anahtar/yedek saklama kuralları korunmalıdır. Başvurular için ayrıca süreye bağlı otomatik imha işi uygulanmadı; mevcut teknik saklama hesap silinmesine kadardır. Hukuki metin ve saklama kararı bu özellik tarafından tamamlanmış sayılmaz; [PRIVACY](PRIVACY.md).

## API

Sözleşme ve ortak tipler [openapi.json](openapi.json) üzerinden üretilir. Tüm uçlar oturum/Bearer kimliği, aktif hesap ve e-posta doğrulaması gerektirir.

| Yöntem / yol (`/api/v1`) | Amaç |
| --- | --- |
| `GET /job-postings` | Açık ilanlar ve yalnız kullanıcının başvuru kimliği/durumu |
| `GET /job-postings/{job}` | Açık ilan ayrıntısı |
| `POST /job-postings/{job}/applications` | Uygulama içi başvuru, güvenli aynı-istek tekrarı |
| `GET /me/job-applications` | Yalnız kendi başvuruları ve ilan kopyaları |
| `GET/POST /admin/job-postings` | Yönetici listeleme/oluşturma |
| `GET/PATCH /admin/job-postings/{job}` | Yönetici ayrıntı/düzenleme |
| `GET /admin/job-postings/{job}/applications` | İlanın başvuruları, yöneticiye özel |
| `PATCH /admin/job-applications/{application}` | Başvuru durumunu değerlendirme |

Listeler cursor sayfalıdır; sayfa boyutu varsayılan 20, sınırı mevcut `PaginationRequest` belirler. İlan oluşturma `201`, düzenleme/değerlendirme `200`; doğrulama `422`, yetki `403`, bulunamayan/görünmeyen kayıt `404`, sürüm/ikinci başvuru çakışması `409` döndürür.

## Doğrulama

Yerel doğrulamada tam backend paketi **215 test / 2.112 assertion**, tam Chromium E2E paketi **73 test**, istemci/core birim testleri **11 admin + 4 web + 25 mobil + 16 core** ile geçti. OpenAPI lint/ortak tip üretimi, strict tip kontrolü, Pint, public API adresiyle web/admin derlemeleri ve üç platform Expo export başarılıdır. Son admin boşluk düzenlemesinden sonra 5 Jobs E2E tekrar geçti.

- PostgreSQL `JobsTest`: platform/kurum/öğrenci yetkisi, taslak/kapalı/süresi dolmuş ilanlar, tekrar başvuru, şifreli kayıt, yalnız kendi verisi, ilan kopyasının korunması, değerlendirme çakışması, sahte korunan alanlar, iletişim doğrulaması ve hesap dışa aktarma/silme.
- `tests/e2e/jobs.spec.ts`: gerçek API ile admin oluştur/yayımla → öğrenci başvur → admin değerlendir → öğrenci güncel durumu gör; kapanan ilan ve geçmiş; mobil menüden Bearer başvurusu ve kayıp yanıtın güvenli tekrarı; web API/alan hatası; üç arayüzde açık/koyu tema ve 320/834/1280 genişlikleri.
- Üç platform Expo export'u geçti. Device Hub'daki iPhone 18 Pro / iOS 27 / Expo Go SDK 58 üzerinde gerçek geliştirme API'sine bağlı İş İlanları menüsü, İlanlar ve Başvurularım boş durumları açılarak doğrulandı. İlan/form akışının native cihazda tamamlanması ve fiziksel iPad/Android klavye, kaydırma ve erişilebilirlik teyidi ayrıca gerekir; Chromium önizlemesi bunların yerine geçmez.

Sentetik ilanlar yalnız `oggaq_test` fixture'ında üretilir. Geliştirme sunucusuna örnek/gerçek ilan otomatik eklenmez; yönetici gerçek ilan içeriğini girer.

API, admin ve öğrenci web geliştirme sunucusunda yayımlandı. Ayrı yönetici hesabı kullanıcının belirttiği adresle oluşturuldu; gerçek HTTPS üzerinde öğrenci/admin girişleri, kişisel liste uçları ve yönetici erişim ayrımı doğrulandı. [Dağıtım kaydı](../deploy/server-development/README.md#24-ekim-2026-iş-başvuruları).
