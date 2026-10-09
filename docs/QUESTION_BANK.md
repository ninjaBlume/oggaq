# Merkezi soru bankası — uygulanmış backend

QuestionBank modülü yalnız merkezi içeriği yönetir. Kurum yöneticisinin veya öğrencinin merkezi katalog/soru yazma yetkisi yoktur. Kuruma özel içerik için gelecekte ayrı sahiplik, tablo ve policy gerekir; `tenant_id` merkezi endpoint'lerde kabul edilmez. Gerçek kaynak verisi içeri aktarılmadı; geliştirme veritabanına örnek soru eklenmedi.

## Katalog ve içerik

Platform yöneticisi `/api/v1/admin/subjects`, `/admin/topics`, `/admin/exam-types`, `/admin/question-sources` üzerinden GET listesi ve POST oluşturma kullanır. Ders/sınav türü `code` değeri tekildir; konu kodu ders içinde tekildir. Konu `parent_id` ile aynı dersin başka konusuna bağlanabilir. Katalog düzenleme/silme bu teslimde yoktur.

Doğrulanmış aktif kullanıcılar `/api/v1/subjects`, `/exam-types`, `/subjects/{subject}/topics` üzerinden sınıflandırmaları okuyabilir. Bu etiketler henüz soru yayımlanmadan da görünür; soru taslaklarını içermez. Sınav türleri veriyle tanımlanır; resmî sınav sayısı/süresi/puanlama kuralı kodda sabitlenmedi.

Şimdilik tek doğru seçenekli metin sorusu desteklenir. Medya, geçmiş sınavın yılı/numarası/sırası, çoklu sınav eşleştirmesi ve değerlendirme motoru henüz yoktur. Kaynak `title`, nullable HTTP(S) `url` ve `citation` taşır. Kaynak kaydının varlığı resmîlik veya kullanım hakkı onayı anlamına gelmez; gerçek içerik yayını için kaynak/hak incelemesi üretim kapısıdır.

## Taslak ve sürüm

`questions` kalıcı kimlik, `revision`, `latest_version_id` ve nullable `published_version_id` taşır. `question_versions` içerik snapshot'larıdır; `question_options` her sürümün ayrı seçenek kimliklerini taşır. API mevcut sürümü düzenlemez, her PATCH yeni sürüm ekler. Eski taslaklar da yönetici geçmişinde kalır. Yayımlanan sürümler ve seçenekleri PostgreSQL seviyesinde değiştirilemez/silinemez.

POST `/api/v1/admin/questions` ilk taslağı oluşturur. PATCH `/api/v1/admin/questions/{question}` tam içerik snapshot'ı ve güncel `base_version` ister; atlanan nullable alanlar yeni sürümde NULL olur. `base_version`, soru `revision` değeridir; içerik sürüm numarası değildir. Yazmalar transaction ve satır kilidi altındadır. Güncel olmayan revision 409 `version_conflict` verir; ikinci sürüm/audit yazılmaz.

Örnek gövde yalnız sentetik içerik şablonudur; UUID'ler önceden API'den oluşturulan gerçek katalog kimlikleriyle değiştirilir:

```json
{
  "subject_id": "<subject UUID>",
  "topic_id": "<topic UUID veya null>",
  "exam_type_id": "<exam type UUID veya null>",
  "source_id": "<source UUID veya null>",
  "stem": "Sentetik örnek soru — resmî içerik değildir",
  "options": ["Sentetik A", "Sentetik B"],
  "correct_option_position": 1,
  "explanation": "Sentetik açıklama"
}
```

Seçenek sırası dizinin sırasıdır; doğru cevap konumu 1 tabanlıdır. Taslakta 0–10 seçenek, nullable cevap ve kaynak mümkündür. Boş/tekrarlanan seçenekler veya mevcut olmayan doğru konum 422 verir. Üst sınır 10 bir API içerik limitidir; resmî sınav kuralı değildir. Konu/ders, doğru seçenek/sürüm ve sürüm/soru bağları composite foreign key ile korunur.

## Yayımlama ve öğrenci erişimi

POST `/api/v1/admin/questions/{question}/publish`, `{"base_version": <revision>}` alır. En az iki seçenek, bir doğru seçenek ve kaynak zorunludur. İşlem son taslağı yayımlar, soru revision'ını artırır ve audit kaydı ekler. Yeni taslak oluşturmak mevcut yayını değiştirmez; yeni taslak yayımlandığında public pointer değişir. Güncel revision ile zaten yayında olan sürümü tekrar yayımlamak revision/audit üretmez. Eski revision ile tekrar 409 döner.

GET `/api/v1/admin/questions/{question}/versions` sürümleri azalan numara sırasıyla cursor pagination ile döndürür. Yönetici yanıtı doğru seçeneği ve açıklamayı içerir. Gelecekteki denemeler soru kimliğinin güncel pointer'ını değil kullandıkları sürüm kimliğini saklamalıdır; deneme tabloları henüz uygulanmadı.

GET `/api/v1/questions` ve `/questions/{question}` yalnız güncel yayımlanmış sürümü döndürür. Cevap anahtarı ve açıklama ayrı öğrenci Resource üzerinden çıkarılır; yönetici hesabı da öğrenci route'unu kullanırsa bu alanları alamaz. Taslak veya olmayan soru 404 döner. `include_answers` ve öğrenci `status` parametreleri reddedilir. Cevap gönderme ve doğru/yanlış değerlendirme henüz yoktur.

Öğrenci filtreleri `subject_id`, `topic_id`, `exam_type_id`, `source_id` yayımlanmış sürüme uygulanır. `topic_id` tam eşleşmedir; alt konuları otomatik kapsamaz. Yönetici listesi aynı filtreleri son taslağa uygular, ek `status=draft|published` kabul eder. `draft` hiç yayımlanmamış soru demektir; yayımlanmış sorunun bekleyen taslağı `has_pending_changes` alanıyla belirtilir. Listeler varsayılan 20, en fazla 100 kayıt döndürür; cursor ve filtreler sonraki sayfa bağlantısında korunur.

## Doğrulama

23 QuestionBank testi PostgreSQL üzerinde çalışır: yetkiler, taslak/cevap gizliliği, katalog/alt konu doğrulaması, yayın şartları, sürüm koruma, stale revision, transaction rollback, filtre/pagination, composite FK ve yayın değişmezliği. Toplam backend sonucu 75 test, 329 assertion'dır. Ayrı yerel API sürecinde `oggaq_test` üzerinde gerçek HTTP oluşturma/yayımlama/düzenleme/409 ve öğrenci/admin erişimi doğrulandı; sentetik veriler temizlendi.

PostgreSQL [constraint](https://www.postgresql.org/docs/18/ddl-constraints.html) ve [trigger](https://www.postgresql.org/docs/18/trigger-definition.html) mekanizmaları ilişkileri ve yayımlanmış içerik korumasını uygular. Migration fonksiyonları `CREATE OR REPLACE` kullanır; test `migrate:fresh` işlemi tabloları silerken kalan fonksiyonlar yeniden kurulabilir. Migration rollback merkezi audit geçmişini silmez ve audit `tenant_id` alanını nullable bırakır.

Sözleşme [OpenAPI](openapi.json) içinde; route eşitliği otomatik testte ve Redocly lint temizdir. Web/admin/mobil arayüz ve native/E2E testleri bu backend teslimine dahil değildir.
