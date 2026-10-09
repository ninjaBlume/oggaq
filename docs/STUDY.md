# Tek soru alıştırması — uygulanmış akış

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

## Kanıt ve sınır

18 yeni PostgreSQL testi: grading, empty answer, idempotency/conflict, eski sürüm, yetki/bağlam ayrımı/üyelik iptali, stale actor, cursor ve constraint/trigger koruması. Toplam 93 backend testi/450 assertion. Web için 9 Chromium E2E; gerçek API/CSRF, notification/broker linkleri, iki sekmede conflict ve gerçek yazmadan sonra kontrollü yanıt kaybını kapsar. Offline cevap kalıcılığı yoktur; gönderilmemiş seçim yenilemede kaybolabilir. Native iOS/Android geliştirilmedi.
