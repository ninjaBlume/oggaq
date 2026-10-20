# Merkezi soru bankası — uygulanmış backend

QuestionBank modülü yalnız merkezi içeriği yönetir. Kurum yöneticisinin veya öğrencinin merkezi katalog/soru yazma yetkisi yoktur. Kuruma özel içerik için gelecekte ayrı sahiplik, tablo ve policy gerekir; `tenant_id` merkezi endpoint'lerde kabul edilmez. Gerçek kaynak verisi içeri aktarılmadı; geliştirme veritabanına örnek soru eklenmedi.

## Katalog ve içerik

Platform yöneticisi `/api/v1/admin/subjects`, `/admin/topics`, `/admin/exam-types`, `/admin/question-sources` üzerinden GET listesi ve POST oluşturma kullanır. Ders/sınav türü `code` değeri tekildir; konu kodu ders içinde tekildir. Konu `parent_id` ile aynı dersin başka konusuna bağlanabilir. Katalog düzenleme/silme bu teslimde yoktur.

Doğrulanmış aktif kullanıcılar `/api/v1/subjects`, `/exam-types`, `/subjects/{subject}/topics` üzerinden sınıflandırmaları okuyabilir. Bu etiketler henüz soru yayımlanmadan da görünür; soru taslaklarını içermez. Sınav türleri veriyle tanımlanır; resmî sınav sayısı/süresi/puanlama kuralı kodda sabitlenmedi.

Şimdilik tek doğru seçenekli metin sorusu desteklenir. Medya, geçmiş sınavın yılı/numarası/sırası, çoklu sınav eşleştirmesi ve çok sorulu sınav motoru henüz yoktur; tek soru değerlendirmesi [STUDY](STUDY.md) içinde uygulanmıştır. Kaynak `title`, nullable HTTP(S) `url` ve `citation` taşır. Kaynak kaydının varlığı resmîlik veya kullanım hakkı onayı anlamına gelmez; gerçek içerik yayını için kaynak/hak incelemesi üretim kapısıdır.

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

GET `/api/v1/admin/questions/{question}/versions` sürümleri azalan numara sırasıyla cursor pagination ile döndürür. Yönetici yanıtı doğru seçeneği ve açıklamayı içerir. Gelecekteki denemeler soru kimliğinin güncel pointer'ını değil kullandıkları sürüm kimliğini saklamalıdır; tek soru çalışması `practice_attempts` bu sürüm kimliğini saklar; çok sorulu deneme henüz uygulanmadı.

GET `/api/v1/questions` ve `/questions/{question}` yalnız güncel yayımlanmış sürümü döndürür. Cevap anahtarı ve açıklama ayrı öğrenci Resource üzerinden çıkarılır; yönetici hesabı da öğrenci route'unu kullanırsa bu alanları alamaz. Taslak veya olmayan soru 404 döner. `include_answers` ve öğrenci `status` parametreleri reddedilir. Cevap gönderme ve doğru/yanlış/boş değerlendirme ayrı Study route'ları üzerinden uygulanır.

Öğrenci filtreleri `subject_id`, `topic_id`, `exam_type_id`, `source_id` yayımlanmış sürüme uygulanır. `topic_id` tam eşleşmedir; alt konuları otomatik kapsamaz. Yönetici listesi aynı filtreleri son taslağa uygular, ek `status=draft|published` kabul eder. `draft` hiç yayımlanmamış soru demektir; yayımlanmış sorunun bekleyen taslağı `has_pending_changes` alanıyla belirtilir. Listeler varsayılan 20, en fazla 100 kayıt döndürür; cursor ve filtreler sonraki sayfa bağlantısında korunur.

## Soru–ders–sınav ilişkisi

Bir sorunun **dersi** (`version.subject_id`) ile **sınavları** ayrı bilgilerdir: soru tek bir derse aittir, birden çok çıkmış sınavda (her sınavda bir sırada) yer alabilir. Soru tek kayıt olarak durur; sınav üyeliği `official_exam_questions` satırlarıdır, sorunun kendisinde saklanmaz.

- Öğrenci soru yanıtları (`/questions`, `/questions/{id}`, tekrar listeleri) ve alıştırma kayıtları `exams` listesini taşır: sınav kimliği, başlık, sınav numarası, yıl, dönem, sınav türü adı (Deneme/Ders), `subject_name` (Ders sınavında dersin adı), `weapon_status` ve sorunun o sınavdaki sırası. Yalnız **yayımlanmış** sınavlar görünür; liste yeniden eskiye sıralıdır.
- Yönetici soru yanıtları (`/admin/questions`) taslak sınavlar dahil tüm üyelikleri `status` ile verir.
- Çıkmış sınav listesi `exam_type_id` (Deneme/Ders), `weapon_status`, `subject_id`, `year`, `term` ile filtrelenir; her kayıt `exam_type {id,name}`, `subject {id,name}|null` ve `weapon_status` taşır.
- Filtreler bağımsızdır ve birleştirilebilir: `subject_id` (ders), `topic_id`, `official_exam_id` (yalnız o sınavın soruları; öğrencide taslak sınav boş döner).
- Liste yanıtlarında üyelikler tek sorguyla toplu yüklenir; tekil yanıtlarda tek ek sorgu yapılır.
- Ekranlar: öğrenci web ve mobilde soru kartı ve çalışma ekranı "Ders:" ve "Sınav:" satırlarını ayrı gösterir, soru listesinde Ders ve Çıkmış sınav filtreleri vardır; yönetim panelinde soru tablosunda ayrı bir "Sınavlar" sütunu ve sınav filtresi bulunur.

## Çıkmış sınavlar

Merkezi `official_exams` (künye: sınav türü, yıl, dönem, numara, başlık, isteğe bağlı kaynak) ve `official_exam_questions` (`position`, `question_id`, **`question_version_id`**) tabloları orijinal soru sırasını ve cevap anahtarını yayımlanmış, değişmez soru sürümlerine sabitler. Aynı soru birden çok çıkmış sınavda kullanılabilir; bir sınavda bir kez bulunur. Sınav türü (**Deneme / Ders**: kurumun kendi kategorileri; Deneme tam sınavdır, Ders bir dersin o sınavdaki sorularıdır) + `weapon_status` (silahlı/silahsız; türden bağımsız, boş olabilir) + `subject_id` (yalnız Ders sınavında) + yıl + dönem + numara `NULLS NOT DISTINCT` tekildir (409 `duplicate_official_exam`). Yalnız platform yöneticisi yönetir (`manage` kuralı).

- `POST /admin/official-exams` — sıralı `question_version_ids` ile **taslak** oluşturur (1–200 yayımlanmış sürüm; silahlı sınavlar 125 soru taşır; dizi sırası orijinal sıradır).
- `PUT /admin/official-exams/{officialExam}` — taslağı tam snapshot olarak değiştirir; yayımlanmışsa 409 `already_published`. Taslak sınav henüz yayımlanmamış (tamamlanmamış) bir soru sürümünü sabitleyebilir; yönetici yanıtı her satırda sorunun güncel `published_version_id` değerini verir ve editör sürümü güncelleyebilir.
- `POST /admin/official-exams/{officialExam}/publish` — idempotent yayımlama; sabitlenen tüm sürümler yayımlanmış olmalıdır (aksi 422, eksik sıralar listelenir). Yayımdan sonra künye, sıra ve üyelik PostgreSQL trigger'larıyla değiştirilemez/silinemez; yayım boş veya sırası boşluklu şablonu reddeder.
- `GET /admin/question-stats` — ders/konu başına toplam, yayımlanmış, taslak ve bekleyen değişikliği olan soru sayıları (en son sürüme göre; konu `null` = konusuz). `GET /admin/questions?topic_id=none` konusuz soruları listeler.
- `GET /admin/subjects/{subject}/exam-stats` — dersin soruları hangi sınavlarda (silahlı/silahsız ayrı kayıt; tür, numara, yıl, dönem, durum) kaç soruyla yer alıyor, kaçı taslak; `without_exam` hiçbir sınavda olmayan soru sayısıdır. `GET /admin/questions?official_exam_id=none` bu soruları listeler.
- `POST /admin/questions/{question}/apply-to-exams` gövde `{question_version_id}` — sorunun **yayımlanmış** bir sürümünü, daha eski sürümü sabitleyen tüm sınavlara (taslak ve yayımlanmış) uygular; zaten o sürümde veya daha yenisinde olanlara dokunmaz; değişen sınavları döndürür. Aynı soru çoğunlukla silahlı ve silahsız sınavda birlikte bulunduğundan düzeltme tek adımda ikisine de ulaşır.
- Yönetici sınav listesi/ayrıntısı her sınav için `draft_question_count` (sabitlenen sürümü yayımlanmamış soru) ve `outdated_question_count` (sabitlenen sürümden daha yeni sürümü olan soru) verir; ayrıntıdaki her satırda `exam_count` (soruyu içeren sınav sayısı) bulunur.
- `PUT /admin/official-exams/{officialExam}/questions/{question}` gövde `{question_version_id}` — sınavdaki tek bir sorunun sürümünü değiştirir; sıra ve üyelik değişmez. Taslak sınav aynı sorunun herhangi bir sürümünü alır. **Yayımlanmış sınav yalnız sorunun daha yeni yayımlanmış sürümünü alır** (düzeltme); eski sürüme dönüş, taslak sürüm veya başka sorunun sürümü 422 verir. Her değişiklik `official_exam_question_changes` (eski/yeni sürüm, yönetici, zaman) ve `official_exam.question_version_updated` denetim olayıyla kaydedilir. Başlamış denemeler kopyaladıkları sürümleri korur; yalnız sonradan başlayan denemeler düzeltilmiş soruyu görür. Yönetici ayrıntısındaki her soru satırı `question_revision` ve (sabitlenen sürümden farklıysa) `latest_version` taşır; düzenleme en güncel sürümden devam eder.
- `GET /admin/official-exams[/{id}]` — yönetici görünümü (durum filtresi, sorular ve cevap anahtarı).
- `GET /official-exams[/{id}]` — öğrenci yalnız yayımlanmış künyeyi ve soru sayısını görür; sorular ve cevap anahtarı yoktur. Filtre: `exam_type_id`, `year`, `term`. Sorular deneme başlatılınca gelir ([EXAMS](EXAMS.md)).

Soruların `exam_type_id` alanı sınıflandırma içindir; çıkmış sınav aidiyeti `official_exam_questions` ile tutulur. Gerçek çıkmış sınav verisi bu teslimde içe aktarılmadı; import ayrıca onay ister. Resmî sınav süresi/geçme kuralı modellenmez.

## Doğrulama

23 QuestionBank testi PostgreSQL üzerinde çalışır: yetkiler, taslak/cevap gizliliği, katalog/alt konu doğrulaması, yayın şartları, sürüm koruma, stale revision, transaction rollback, filtre/pagination, composite FK ve yayın değişmezliği. Toplam backend sonucu 75 test, 329 assertion'dır. Ayrı yerel API sürecinde `oggaq_test` üzerinde gerçek HTTP oluşturma/yayımlama/düzenleme/409 ve öğrenci/admin erişimi doğrulandı; sentetik veriler temizlendi.

PostgreSQL [constraint](https://www.postgresql.org/docs/18/ddl-constraints.html) ve [trigger](https://www.postgresql.org/docs/18/trigger-definition.html) mekanizmaları ilişkileri ve yayımlanmış içerik korumasını uygular. Migration fonksiyonları `CREATE OR REPLACE` kullanır; test `migrate:fresh` işlemi tabloları silerken kalan fonksiyonlar yeniden kurulabilir. Migration rollback merkezi audit geçmişini silmez ve audit `tenant_id` alanını nullable bırakır.

Sözleşme [OpenAPI](openapi.json) içinde; route eşitliği otomatik testte ve Redocly lint temizdir. Sonraki panel tesliminde [React yönetim arayüzü](../apps/admin/README.md) bu API'ye bağlandı; 8 Chromium E2E ile doğrulandı. Öğrenci web alıştırması ayrı uygulamada geliştirilmiştir. Native mobil ve süreli sınav henüz yoktur.
