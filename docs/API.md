# API standartları ve planlanan uç noktalar

Durum: Identity/Tenancy/QuestionBank/Study için [OpenAPI sözleşmesi](openapi.json), [OpenAPI 3.1.2](https://spec.openapis.org/oas/v3.1.2.html) biçiminde oluşturuldu ve lint edildi. Sözleşme–route eşitliği otomatik testtedir. Aşağıdaki çok sorulu sınav/export/silme/import/offline yolları ileri tasarım olarak korunur; OpenAPI'de yer almayan yollar henüz uygulanmadı. `packages/shared-types` içindeki operasyon/veri tipleri `npm run generate:api` ile üretilir; `packages/api-client` bu tiplerle cookie/CSRF taşımasını uygular. Admin ve öğrenci web bunları gerçek API'de kullanır. Mobil taşıma adaptörü henüz yoktur.

## Bu teslimde uygulanan yollar

Kayıt, web giriş, mobil token, logout, forgot/reset, verification/resend, profil GET/PATCH; `/me/contexts`, `/contexts/{context}`; `/admin/tenants` GET/POST; kurum profili/üye listesi/detail; `/admin/tenants/{tenant}/memberships` POST ve `/admin/tenants/{tenant}/memberships/{membership}` DELETE.

QuestionBank: `/subjects`, `/exam-types`, `/subjects/{subject}/topics` GET; `/admin/subjects`, `/admin/topics`, `/admin/exam-types`, `/admin/question-sources` GET/POST; `/admin/questions` GET/POST; `/admin/questions/{question}` GET/PATCH; `/admin/questions/{question}/publish` POST; `/admin/questions/{question}/versions` GET; `/questions`, `/questions/{question}` GET. `/sanctum/csrf-cookie` ve dört Study işlemiyle toplam 43 operasyon vardır. Yollar `/api/v1` öneki taşır; ayrıntı ve örnekler [QUESTION_BANK](QUESTION_BANK.md) içindedir.

Üyelik oluşturma/iptal şimdilik platform yöneticisine açıktır; kurum yöneticisi üyeleri okuyabilir. Öğrenciye ait context endpoint'i yalnız o öğrencinindir. Doğrulama e-postası web `/verify-email` formuna gider; form imzalı verification GET çağırır; aynı kullanıcı girişi gerekir. Mobilde Bearer kimliği de desteklenir.

Study: `/contexts/{context}/practice-attempts` GET/POST; `/contexts/{context}/practice-attempts/{attempt}` GET; `/contexts/{context}/practice-attempts/{attempt}/answer` POST. Tek soru alıştırması, tekrar semantiği ve gizlilik [STUDY](STUDY.md) içindedir.

## Genel kurallar

- İş API'si `/api/v1`; JSON `snake_case`, UUID kimlik, ISO 8601 UTC tarih.
- Başarı tek kaynakta `{ "data": ... }`; listede `data`, `links`, `meta`. Büyük listelerde cursor pagination; başlangıç limit 20, üst sınır 100.
- Filtre/sıralama allowlist; tüm girişler backend'de doğrulanır. Cevap anahtarı ve açıklama exam modunda bitişten önce online payload'a eklenmez.
- Sahip kullanıcı, tenant, platform rolü ve nihai puan sunucuda belirlenir. İstemcinin bu alanları göndermesi yetki yaratmaz.
- Cookie authentication için CSRF; mobil için sonlu Bearer token. Token abilities ek kısıttır, Policy yerine geçmez.
- Deneme create/finish gibi gelecekteki tekrar riski olan online mutation'larda `Idempotency-Key` UUID planlanır. Kimlik, bağlam ve payload hash'iyle scoped kalıcı kayıt; aynı anahtar/farklı payload 409. Mevcut katalog/soru POST oluşturma uçları kalıcı idempotency kaydı sunmaz; başarılı POST yanıtı kaybolduğunda kör tekrar yeni kayıt üretebilir.
- Güncellemelerde `base_version`; yarışta 409. Mutasyon aynı bağlamda kalır; hazır sonucu güncelleme yok.
- Upload/download limitleri ve batch boyutu uygulamada yapılandırılıp OpenAPI'de belirtilir. Başlangıç sync batch üst sınır adayı 100 işlemdir; yük testinde doğrulanır.
- `Cache-Control: private, no-store` kimlik/rapor/deneme/sync yanıtlarında; service worker API oturum yanıtlarını genel cache'e koymaz.

## Hata standardı

[RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) `application/problem+json` kullanılır; Türkçe açıklama yanında istemcinin karar verebileceği kararlı `code` ve `request_id` bulunur.

```json
{
  "type": "about:blank",
  "title": "Kayıt güncellenemedi",
  "status": 409,
  "detail": "Veri başka bir cihazda güncellendi.",
  "code": "version_conflict",
  "request_id": "<uuid>"
}
```

401 oturum/kimlik, 403 izin, 404 scoped kaynak yok, 409 sürüm/idempotency çakışması, 422 giriş doğrulama, 429 limit, 5xx iç hata. Doğrulama hatası `errors` alanında alan–mesaj listesi taşır. CSRF başarısızlığı 403 `csrf_failed` olarak merkezi katmanda standardize edilir. 429 `Retry-After` taşır. Tenant dışı kaynak varlığını açığa çıkarmak yerine scoped lookup 404 dönebilir; standart tutarlı uygulanır.

## Kimlik

| Yöntem / yol | Davranış |
| --- | --- |
| `GET /sanctum/csrf-cookie` | Web/admin CSRF başlangıcı; Laravel framework yolu |
| `POST /api/v1/auth/register` | Kayıt; duplicate e-posta/validation/rate limit |
| `POST /api/v1/auth/login` | Web cookie session; sunucuda oturum yenileme |
| `POST /api/v1/auth/mobile-tokens` | Mobil cihaz token'ı; süre ve cihaz kaydı |
| `POST /api/v1/auth/logout` | Geçerli web session veya mobil token iptali |
| `POST /api/v1/auth/forgot-password` | Hesap varlığını açığa çıkarmayan genel yanıt |
| `POST /api/v1/auth/reset-password` | Geçerli, sonlu reset token'ı; mevcut oturum politikası |
| `POST /api/v1/auth/email-verification-notification` | Limitli doğrulama e-postası |
| `GET /api/v1/auth/verify-email/{id}/{hash}` | Süreli imzalı doğrulama; kullanıcı kontrolü |
| `GET /api/v1/me`, `PATCH /api/v1/me` | İzin verilen profil alanları |
| `GET /api/v1/me/contexts` | Kişisel ve aktif üyelik bağlamları |
| `POST /api/v1/me/data-exports` | Yetkili kişisel veri dışa aktarma işi |
| `POST /api/v1/me/deletion-requests` | Yakın kimlik doğrulama ile silme talebi |

İleride veri export/silme durum sorguları gerçek iş akışının parçası olarak tanımlanacak. Platform rolü ve membership rolü profil mutation'ından değiştirilemez.

## Öğrenci ve içerik

| Yöntem / yol | Davranış |
| --- | --- |
| `GET /subjects`, `GET /subjects/{subject}/topics`, `GET /exam-types` | Uygulandı: merkezi sınıflandırmalar; taslak soru içermez |
| `GET /questions`, `GET /questions/{question}` | Uygulandı: yayımlanmış sürüm, izinli filtreler; cevap/açıklama içermez |
| `GET /exams`, `GET /exam-templates` | Yayınlanmış geçmiş sınav ve şablonlar |
| `POST /contexts/{context}/attempts` | Mod/şablon doğrulaması; pinned soru listesi |
| `GET /contexts/{context}/attempts/{attempt}` | Sahiplik/bağlam doğrulanmış mevcut deneme |
| `PUT /contexts/{context}/attempts/{attempt}/answers/{attempt_question}` | O sürümün seçeneği veya NULL; `base_version` |
| `POST /contexts/{context}/attempts/{attempt}/finish` | Transaction içinde tek sonuç ve sunucu değerlendirmesi |
| `GET /contexts/{context}/attempts/{attempt}/result` | Tamamlandıktan sonra sonuç/snapshot |
| `GET /contexts/{context}/attempts` | Sayfalı çalışma/sınav geçmişi |
| `GET /contexts/{context}/wrong-answers` | O bağlamdaki tekrar çalışılacak yanlışlar |
| `GET /contexts/{context}/favorites` | O bağlamdaki favoriler |
| `PUT /contexts/{context}/favorites/{question}` | `is_favorite` ve `base_version`; toggle yok |
| `GET /contexts/{context}/progress` | Yetkili bağlamın türetilmiş istatistikleri |

Tablodaki yollar `/api/v1` önekiyle kullanılır. Answer endpoint'i `user_id`, `tenant_id`, `is_correct` veya score kabul etmez. Kişisel öğrenci route'ları şirket yöneticisinin öğrenciler arasında gezinme aracı değildir.

## Paket ve senkronizasyon

`GET /question-packages`, `GET /question-packages/{id}/manifest?from_version=...`, `GET /question-packages/{id}/chunks/{hash}` paket yetkisi ve bütünlük bilgisi taşır. `POST /sync/operations` per-operation sonuç listesi, `GET /sync/changes?context_id=...&cursor=...` kullanıcı/bağlam scoped cursor döndürür. Protokol alanları ve retry semantiği [OFFLINE_SYNC](OFFLINE_SYNC.md) içindedir.

## Yönetim ve içe aktarma

Platform yönetiminde kurum, katalog ve soru uçları yukarıdaki kapsamda uygulanmıştır. Soru güncellemesi yeni sürüm üretir; yayımlama ayrı yetkili eylemdir. `/admin/users`, `/admin/exams`, `/admin/exam-templates`, `/admin/question-packages` ve katalog güncelleme/silme ileriki kapsamdadır.

Import yolları: `POST /admin/imports` upload/staging; `GET /admin/imports/{id}` durum/rapor; `PUT /admin/imports/{id}/mapping` eşleme; `POST /admin/imports/{id}/validate`; `GET /admin/imports/{id}/preview`; `POST /admin/imports/{id}/approve`; `POST /admin/imports/{id}/commit`. Onay sonrasında içerik/eşleme değişirse onay geçersizleşir. Ağ tekrarları ikinci aktarım üretmez.

Şirket yolları `/tenants/{tenant}/profile`, `/memberships`, `/invitations`, `/reports` şeklinde olacak; yalnız ilgili aktif admin erişebilir. Merkezi soru yönetimi şirket yollarından açılmaz. Rapor alanları, hukuki kapsam ve veri minimizasyonu doğrulanınca somut response şeması belirlenir.

Endpoint uygulanmadan path/DTO/validation/response sözleşmesi, 401/403/404/422/409 davranışı ve ilgili testleri birlikte yazılır. CI, OpenAPI tiplerini yeniden üretip Git farkı olmamasını ve admin/öğrenci web strict tip kontrolünü denetler. Cursor `links`/`meta` nesneleri sözleşmede açık alanlarla tanımlanmıştır. İstemci sunucunun döndürdüğü URL'yi doğrudan çağırmaz; yalnız cursor değerini kendi yapılandırılmış API origin'ine taşır.
