# Tek soru alıştırması — uygulanmış akış

## 28 Ekim 2026 — Eski parçalar da sınav sayılmaz

**Canlı:** `1c997dd` ile gerçek etkilenen bağlamın ana sayfa ve sonuç sorgularında doğrulandı; migration veya mobil güncelleme gerekmedi. Asıl 18 soruluk sonuç ve tüm cevaplar korundu ([kanıt](TESTING.md)).

1 ve 11 soruluk eski kayıtların `review_kind` alanının boş olması, onları normal sınav yapmaz. Varsayılan Sonuçlarım / Son sınavların ve sınav sayısı/ortalaması artık yalnız **yayımlanmış sınav şablonuna bağlı deneme/ders** veya **tanımlı rastgele sınav** kayıtlarını kullanır. Serbest/eski soru çalışmaları bu listelerden ve sınav özetinden dışlanır. Soru adedine göre eşik yoktur: gerçek bir soruluk ders şablonu korunur. Ham kayıt/cevap, özgün asıl sınav puanı ve çözülen soru/doğruluk istatistiği değişmez; kendi ham çalışma kaydı `scope=all`, doğrudan kimliği ve veri export'uyla erişilebilir kalır. Eski tekrar türü tahmin edilerek DB'ye yazılmaz. Ayrım ortak API sorgusunda olduğundan mevcut telefon sürümü de listeyi yeniden aldığında düzelir; migration veya OTA gerektirmez.

## 28 Ekim 2026 — Tekrar çalışması deneme değildir

Kullanıcı kararı: tekrar cevapları **çözülen soru, doğru/yanlış/boş, doğruluk ve ders istatistiklerine katılır**; **tamamlanan sınav sayısına, deneme ortalamasına ve en iyi deneme puanına katılmaz**. Yanlış/boş listeleri son tamamlanmış cevaba göre güncellenmeye devam eder. `AnswerEvents` ve kaynak sonuç puanları yeniden yazılmaz; yalnız sınav özetinin hesabı tekrarları dışlar.

Başlatma girdisindeki `review_kind` artık `exam_attempts.review_kind` olarak sabitlenir (`incorrect|blank|favorite`, diğer kayıtlarda null). Aynı işlem kimliğiyle farklı tekrar türü 409'dur. Resmî veya ağırlıklı rastgele sınavla birlikte tekrar türü taşınamaz; DB CHECK ve değişmezlik tetikleyicisi bu ayrımı korur. Ayrım migration'ı yokken yeni tekrar isteği 503 döndürür; normal deneme olarak sessizce kaydedilmez.

`GET .../exam-attempts` varsayılan `scope=exams` ile tekrarları dışlar. `scope=review` tekrar geçmişini, `scope=all` bağlamın birleşik geçmişini döndürür. Aynı sahiplik/kurum yetkisi ve cursor sayfalama korunur. Eski istemcilerin normal Sonuçlarım ve ana sayfa listesine yeni tekrarlar eklenmez. Mobil/web Tekrar bölümünde **Tekrar çalışmaların** üzerinden devam veya sonuç inceleme sunulur. Aktif/sonuç başlıkları ve bitirme eylemi tekrar olarak görünür. Eski API scope parametresini yok saysa bile istemci, tekrar etiketi olmayan satırı tekrar geçmişinde göstermez.

Önceden kaydedilmiş tekrarların türü DB'de saklanmadığından eski isimsiz bir denemenin tekrar mı normal çalışma mı olduğu güvenilir şekilde türetilemez. Migration eski satırları tahminle etiketlemez veya puanlarını değiştirmez. Belirli eski kayıtların düzeltilmesi, kimliği doğrulanmış ayrı bir veri düzeltmesi gerektirir. Yeni ayrım, kullanıcının yayın talimatıyla `876c11e` kapsamında canlı API ve iki beta kanalına alındı; migration ve doğrulama durumu [TESTING](TESTING.md) içinde.

27 Ekim 2026: Öğrencinin kişisel çalışması (ders/deneme/tekrar/sonuç/puan) e-posta doğrulaması beklemez. Kayıtta otomatik doğrulama postası gönderilmez. İş başvurusu gönderimi, yönetim ve kurumsal bağlamlar için doğrulama korunur; doğrulanmamış kullanıcıya yalnız kişisel bağlam listelenir. Ayrıntılar [SECURITY](SECURITY.md) ve [MOBILE](MOBILE.md) içindedir.

Study modülü ve [öğrenci web uygulaması](../apps/web/README.md) yayımlanmış merkezi soruyu açma, cevap/boş bırakma, sunucu değerlendirmesi ve kişisel/kurum bağlamında geçmiş sunar. Süreli çok sorulu sınav, resmî kural/puanlama ve istatistik değildir. Gerçek kaynak verisi aktarılmadı.

## Kalıcı kayıt ve sürüm

`practice_attempts`: istemci UUID `id`, `study_context_id`, `question_id`, `question_version_id`, nullable `selected_option_id`/`is_correct`/`answered_at`, `created_at`. Model başlandığında güncel yayımlanmış sürüme sabitlenir; sonraki yayın pointer değişikliği bu kaydı etkilemez. Yayımlanmış sürümler/seçenekler zaten PostgreSQL ile değişmezdir.

Composite FK sürümün soruya ve seçeneğin aynı sürüme ait olmasını zorunlu kılar. CHECK pending/answered durumunu tutarlı tutar. Trigger taslak sürümle çalışma açılmasını, çalışma kimliği/sahipliği/sürümünün değiştirilmesini, yanlış sunucu sonucu yazılmasını ve tamamlanmış sonucun güncellenmesini reddeder. Silme API'si bulunmaz; ileride hesap silme/saklama süreçleri ayrı geliştirilecek.

## API

Bütün yollar `/api/v1` öneklidir; doğrulanmış aktif Sanctum kimliği gerekir.

| Yöntem / yol | Davranış |
| --- | --- |
| `POST /contexts/{context}/practice-attempts` | `id`, `question_id`, `question_version_id`; yeni/tekrar istekte 200 |
| `GET /contexts/{context}/practice-attempts` | Başlanmış ve tamamlanan kendi çalışmalar; created_at/id azalan cursor sırası |
| `GET /contexts/{context}/practice-attempts/{attempt}` | Sabit soru snapshot'ı ve varsa değerlendirme |
| `POST /contexts/{context}/practice-attempts/{attempt}/answer` | `selected_option_id` sürüm seçeneği veya açık null; nihai tek değerlendirme |

Yeni çalışma güncel yayın ile `question_version_id` eşleşmezse `question_changed` 409 verir; kullanıcı listeyi yeniler. Aynı UUID/aynı bağlam/soru/sürüm tekrarı aynı kaydı döndürür; yayın sonradan değişse de mevcut çalışma sürdürülebilir. Aynı UUID/farklı içerik/bağlam `idempotency_conflict` 409'dur. Aynı cevap tekrarı aynı sonuç/zamanı döndürür; farklı cevap `answer_locked` 409 verir. Null boş bırakma da nihai cevaptır; tekrar çözmek yeni çalışma açar. Bu semantik katalog/soru oluşturma POST'larının tekrar güvenli olduğu anlamına gelmez.

`outcome`: `pending`, `correct`, `incorrect`, `skipped`. `question` her zaman cevap anahtarı/açıklama içermeyen public sürümdür. `feedback` pending için null, cevaplandıktan sonra `correct_option_id` ve nullable `explanation` içerir. Cevap göndermeden öğrenci public soru veya geçmiş endpoint'i doğru cevabı açıklamaz. Çalışma çözme amacıyla açıldığından cevaptan sonra öğrenme bilgisi görünür; gözetimli sınav güvenliği iddiası yoktur.

## Yetki ve transaction

Önce bağlam `user_id` üzerinden scoped bulunur, mevcut StudyContextPolicy uygulanır. Başka kullanıcının bağlamı 404, iptal üyelik/kapalı kurum 403'tür. Kurum veya platform yöneticisi bu uçlarla başka öğrencinin kişisel/kurum geçmişini okuyamaz. Kurum raporları ayrı izin ve veri minimizasyonuyla ileride geliştirilecek.

Yazmada tenant, kullanıcı, membership ve çözüm kilitleri transaction içinde güncel durumla alınır. Böylece eski actor/context nesnesi yetki sağlamaz; üyelik iptaliyle aynı tenant lock sırası kullanılır. Sunucu cevap anahtarını sabit sürümden okur; istemcinin kullanıcı/tenant/puan/sonuç alanları reddedilir. Okuma/yazma request cache'i kullanıcılar arasında paylaşılmaz.

## Tekrar listeleri, favoriler ve istatistik

Üç uç, çalışma geçmişinin bağlam başına türetilmiş görünümüdür. Hepsi mevcut bağlam yetkisini kullanır (kendi bağlamı; başka kullanıcı/yönetici 404, iptal üyelik 403) ve e-posta doğrulaması ister.

- `GET /contexts/{context}/review-summary` — üç listenin (`incorrect`, `blank`, `favorite`) o anki soru sayısı. Öğrenci arayüzleri tekrarı **sınav** olarak sunar: `POST /contexts/{context}/exam-attempts` gövdesindeki `review_kind` (`incorrect|blank|favorite`, `official_exam_id` ile birlikte gönderilemez, `subject_id` ile daraltılabilir) sorularını öğrencinin o listesinden rastgele seçer; liste yeterli değilse 422. Web ve mobil artık tek soru gezme/çözme ekranı sunmaz; aşağıdaki `review-questions` ve `practice-attempts` uçları API'de durur.
- `GET /contexts/{context}/review-questions?kind=incorrect|blank|favorite` — `incorrect`/`blank`, her sorunun bağlamdaki **son** değerlendirilmiş sonucuna bakar. Kaynak, cevaplanmış alıştırmalar ile **tamamlanmış** denemelerin cevaplarıdır (`AnswerEvents` SQL'i); devam eden denemenin cevapları sayılmaz. "Son" sonuç `answered_at`/`finished_at` zaman damgasına göredir (saniye çözünürlüğü); aynı saniyedeki iki cevapta sıra belirsizdir. Soru sonradan doğru çözülürse listeden çıkar, boş bırakılan sonradan yanlış çözülürse `blank`ten `incorrect`e geçer. Dönen kayıt güncel yayımlanmış sürümdür (cevap anahtarı/açıklama yok); çözmek için mevcut `practice-attempts` akışı kullanılır. `id` sırasıyla cursor.
- `PUT|DELETE /contexts/{context}/favorites/{question}` — açık durum, idempotent; toggle yok. Yalnız yayımlanmış soru favoriye eklenebilir (aksi 404). Favori `(study_context_id, question_id)` anahtarıyla bağlama aittir: kişisel favori kurum bağlamında görünmez. Sürüm/`base_version` kuralı offline sync tasarımı kesinleşince eklenecektir.
- `GET /contexts/{context}/stats` — `answers` (doğru/yanlış/boş/toplam/doğruluk %), ders kırılımı (`subjects`, sürümün dersine göre, ad sırasıyla) ve `exams` (tekrar çalışmaları hariç tamamlanan sınav sayısı, ortalama ve en iyi puan). Tekrarlanan çözümler ayrı cevaplardır; boş cevap doğru sayılmaz; toplam 0 ise yüzde `null`. Hiçbir soru cevaplanmadan biten (terk edilmiş) deneme `exams` sayımına ve cevap istatistiklerine girmez ([EXAMS](EXAMS.md)).

Veri: `favorite_questions(study_context_id, question_id, created_at)`, bileşik birincil anahtar ve `RESTRICT` FK'ler. Başka tablo eklenmedi; listeler ve istatistik mevcut `practice_attempts`/`exam_answers`tan sorgu anında hesaplanır. Çok büyük geçmişte bu hesap ölçülmedi; gerekirse projeksiyon tablosu ayrıca düşünülür.

Kanıt: `StudyInsightsTest` (PostgreSQL feature testi) son sonuç mantığını, tamamlanmamış denemenin hariç tutulmasını, anahtar gizliliğini, sayfalamayı, bağlam/kullanıcı/yönetici ayrımını, üyelik iptalini, favori idempotency'sini ve istatistik toplamlarını kapsar. Yerelde geçti (toplam 126 backend testi). Alıştırma yanıtlarında (`PracticeAttempt`) `is_favorite` bulunur; liste ve tekil okumada tek sorguyla, yeni açılan/cevaplanan kayıtta tek ek sorguyla hesaplanır. Web `Tekrar`/`Başarım`, mobilde yan menüdeki `Tekrar listelerim`/`Başarı durumum` bu uçları kullanır.

## Kanıt ve sınır

18 yeni PostgreSQL testi: grading, empty answer, idempotency/conflict, eski sürüm, yetki/bağlam ayrımı/üyelik iptali, stale actor, cursor ve constraint/trigger koruması. Toplam 93 backend testi/450 assertion. Web için 9 Chromium E2E; gerçek API/CSRF, notification/broker linkleri, iki sekmede conflict ve gerçek yazmadan sonra kontrollü yanıt kaybını kapsar. Offline cevap kalıcılığı yoktur; gönderilmemiş seçim yenilemede kaybolabilir. Native istemci [MOBILE](MOBILE.md), ayrı süreli deneme [EXAMS](EXAMS.md) içinde raporlanır.
