# Dönem bazlı ÖGG puan hesaplama

24 Ekim 2026. Gereksinim [SCORE](SCORE.md), doğrulanmış kurallar ve açık belirsizlikler [EXAM_SCORING_RULES](EXAM_SCORING_RULES.md). Web ve Expo istemcileri aynı Laravel Scoring modülünü kullanır; istemcilerde puanlama formülü çalıştırılmaz.

## Kullanım

Mobil yan menüde **Diğer seçenekler → Puan hesapla**, web ana menüsünde **Puan hesapla** bulunur. Eğitim türü, silahlı/silahsız ve açıkça tanımlanmış dönem seçilir. Doğru/yanlış sayıları ve atış isabetleri kaydırmalı kontrollerle girilir; boş sayısı kalan sorulardır. Atış alanı başlangıçta bilinmiyor durumundadır. Silahsızda silah/atış alanları gizlenir. Silah farkında önceki temel puanı ayrıca istenir.

Kaydırma sonrasında kısa beklemeyle API önizlemesi alınır; eski istekler iptal edilir ve hata/yeniden deneme gösterilir. Eksik veri kesin başarı kararına dönüşmez. **Hesaplamayı kaydet** kişisel geçmişe yeni kayıt ekler; önizleme veritabanına yazmaz. Kullanıcının son bağımsız hesaplamaları ve kaynaklı açıklaması ekranda açılabilir.

Yönetim paneli `/yonetim/puanlama`: kural taslağı oluşturma/düzenleme, kaynak ve dönem doğrulama beyanıyla yayımlama, yeni sürüm, arşivleme, dönem oluşturma/kural sürümünü değiştirme ve mevcut tam sınava dönem bağlama. Yenileme ve temel numaraları bağımsızdır. Yayımlanmış ayarlar doğrudan değiştirilemez. Yeni tam sınav editöründe uygun puanlama dönemi seçilebilir. Ders sınavı veya rastgele karışık deneme, yalnız sayısına bakılarak resmî sınav olarak puanlanmaz.

## Deneme sonuçları ve geçmiş

`StartExam`, açıkça puanlama dönemine bağlanmış tam sınav için kural kimliğini ve dönemini başlangıçta sabitler. `FinalizeExam`, cevapları kendi sabit soru sürümlerinden değerlendirdikten sonra genel/silah bölümlerinin doğru/yanlış sayılarını sunucuda çıkarır. ÖGG hesabı aynı transaction içinde tamamlanır; atış bulunmayan silahlı sınav `Atış sonucu bekleniyor` ve olası puan aralığı döndürür. Atış sıfır sayılmaz.

Cevap doğruluğu ve `correct_ratio_v1` doğru yüzdesi korunur. ÖGG hesabı ayrı kayıttır ve ayrı başlıkla gösterilir. Kullanıcının sonradan bildirdiği atış/önceki temel puanı deneme cevaplarını veya bitmiş sınav yüzdesini değiştirmez; yeni hesaplama sürümü ekler. Eski sürüm silinmez. Dönemin kuralı sonradan değiştirilse de başlamış deneme ve saklanmış hesap kendi kuralını korur. Kişi atış bilgisini kendi beyanıyla girer; uygulama fiziksel atış başarısını doğruladığını ileri sürmez.

Özellikten önce bitmiş denemeye GET isteği yazma yapmaz. Uygun dönemi bağlanmış eski denemede **ÖGG puanını hesapla** ile ek hesap açıkça oluşturulur; eski doğru yüzdesi korunur. Dönemi bilinmeyen kayıtta mevzuat kuralı tahmin edilmez.

## Merkezi motor ve veri modeli

`app/Modules/Scoring/ExamScoringService.php`: bölüm sayıları/üst puanları, baz puan ağırlıkları, eşikler, karar türü, önceki puan gereksinimi ve gösterim yuvarlaması üzerinden hesaplar. Tam sayılı kesir hesabı eşik karşılaştırmasından önce yuvarlanmaz. `decision_mode`: `pass_fail`, `level`, `unverified`. Kaynak veya karar belirsizliği sonuçla birlikte taşınır.

- `scoring_rules`: kod+sürüm tekil; eğitim/seçenek, yürürlük ve dönem aralıkları, JSONB ayarlar/kaynaklar, doğrulama notu, yayın/arşiv zamanı. Aynı eğitim/seçenekte etkin kuralların hem tarih hem dönem aralıklarının kesişmesi engellenir. PostgreSQL advisory lock yayın yarışlarını sıralar. Yayımlanmış hesap ayarları değişmez.
- `scoring_periods`: eğitim+seçenek+numara tekil; kesin tarih, kaynak ve kural FK. Eğitim/numara/tarih sabittir; yayımlanmış uygun yeni kural sürümü bağlanabilir. Geçmiş hesapların kural FK'sı değişmez.
- `official_exam_scoring`: yayımlanmış soru şablonunu değiştirmeden tam sınavı döneme bağlayan metaveri. Uyum yıl, numara, seçenek ve tam soru sayısıyla doğrulanır. Bağlı silahlı/silahsız çiftte karşı dönem birlikte bağlanır.
- `exam_score_results`: kullanıcı FK, nullable deneme FK, kural/dönem FK, hesaplama sürümü, normalize giriş ve çıktı JSONB, zaman. Deneme+sürüm tekil. Başlangıç kaydı yalnız bitirme sırasında bir kez doldurulabilir; hesaplanmış kayıt değiştirilemez. Sonraki atış yazıları ek sürümdür. Aynı işlem UUID'si aynı kaydı döndürür, farklı gövde/kişi/deneme 409 verir.

PostgreSQL tetikleyicileri deneme sahibini, kural/dönem ilişkisini, bitmiş deneme şartını ve girişteki bölüm sayılarının gerçek cevaplardan gelmesini de denetler. Sıra ayrımı kuraldaki genel soru sayısıyla yapılır; başlık veya soru metni üzerinden silah sorusu tahmin edilmez.

Kural yazmaları yalnız platform yöneticisine açıktır; yeniden rol/aktif hesap doğrulaması ve audit kullanılır. Deneme puan yazması aktif bağlam sahibi/üyelik politikasıyla korunur. Bağımsız geçmiş yalnız kendi kullanıcısınındır; kurumlara veya diğer yöneticilere açılmaz. Hesap dışa aktarımı `score_calculations` içerir; silme mevcut transaction kapsamındaki erasure mekanizmasıyla bu kayıtları da siler.

## API

Tipler [OpenAPI](openapi.json) üzerinden üretilir. Uçlar mevcut cookie/CSRF veya Bearer kimliği, aktif hesap ve e-posta doğrulamasını kullanır.

| İşlem | Uç |
| --- | --- |
| Doğrulanmış dönemler/ayarlar | `GET /api/v1/scoring-periods` |
| Kayıtsız hesap önizlemesi | `POST /api/v1/me/score-calculations/preview` |
| Kendi bağımsız geçmişi / yeni kayıt | `GET / POST /api/v1/me/score-calculations` |
| Bitmiş denemede atış veya ek puan hesabı | `POST /api/v1/contexts/{context}/exam-attempts/{exam}/score` |
| Yönetici kural listesi / taslak | `GET / POST /api/v1/admin/scoring-rules` |
| Taslak düzenle | `PUT /api/v1/admin/scoring-rules/{rule}` |
| Kaynak doğrulayıp yayımla / arşivle | `POST /api/v1/admin/scoring-rules/{rule}/publish` / `/archive` |
| Dönem oluştur / sürümünü bağla | `POST /api/v1/admin/scoring-periods`, `PUT /{period}` |
| Mevcut tam sınavı eşleştir | `PUT /api/v1/admin/official-exams/{officialExam}/scoring` |

Önizleme örneği (kimlikler ilgili API'den alınır):

```json
{
  "period_id": "<doğrulanmış dönem UUID>",
  "general_correct": 70,
  "general_wrong": 10,
  "weapon_correct": 15,
  "weapon_wrong": 5,
  "shooting_hits": null,
  "previous_general_score": null
}
```

`expected_rule_id` istemcinin görüntülediği sürümü belirtir; dönem arada değişirse önizleme/yeni kayıt 409 ile yenileme ister. Başarılı eski işlemin tekrarı kendi sabit kuralıyla döner. Bölüm eşikleri ve karşılanma durumu da sunucudan gelir.

Kaydetme aynı gövdeye `id` işlem UUID'si ekler. Deneme uç noktası yalnız `id`, nullable `shooting_hits` ve nullable `previous_general_score` alır; doğru sayısı/puan/kural/kullanıcı istemciden kabul edilmez. Sınav özet/ayrıntı yanıtına `scoring_available` ve nullable `score_result` eklenmiştir. Mevcut `result.score_percent` sözleşmesi korunur.

## Kurulum, yedek ve doğrulama

Önce `2026_10_24_000006_create_exam_scoring` migration'ı, sonra `php artisan scoring:install-verified --link-existing` çalıştırılır. Komut tekrar edilebilir; kurulu ayarları sessizce ezmez. Gerçek soru aktarımı yapmaz. Tanımlı ilk dönemler ve belirsizlikler kurallar belgesindedir. Yönetici kaynak kontrolü olmadan taslak yeni yönetmelik modelini etkinleştirmemelidir.

İçerik dışa/içe aktarımı kural, dönem ve sınav bağlantısını içerir; kullanıcı puan kayıtları içerik arşivine alınmaz. Tam PostgreSQL yedeği kişisel sonuçları da kapsar. İçerik özeti yeni merkezi metaveriyi de denetler. Geçmiş dönemin arşivlenmiş kuralı içerik aktarımında korunabilir; API yeni dönem atamasında yalnız etkin yayımlanmış kuralı kabul eder.

Otomatik kontroller: beş eğitim/seçenek, eski formül sınırları, sentetik yeni modelin bağımsızlığı, sıfır/tam puan, yanlışların etkisizliği, eksik atış/önceki puan, geçersiz sayılar, eşik öncesi yuvarlamama, özel geçmiş ve yanıt kaybı, aralık çakışması, sürüm değişiminde eski sonucun korunması, gerçek cevaplardan bölüm hesabı, yetki/bağlam izolasyonu, hesap dışa aktarma/silme ve doğrudan SQL değişmezliği. Arayüz senaryoları web, Expo web export ve yönetim panelinde gerçek PostgreSQL/API ile çalışır. Testler yalnız `oggaq_test` kullanır; PHPUnit/E2E sırayla çalıştırılır. Güncel teslim sonuçları yayın kaydıyla ayrıca belirtilir; tarayıcı testleri fiziksel iPad/Android testi sayılmaz.

### 24 Ekim 2026 yerel doğrulama

PHP 8.4/PostgreSQL üzerinde 230 backend testi (2.279 assertion), 83 Chromium E2E ve 119 workspace birim testi geçti. OpenAPI lint/tip üretimi, strict TypeScript, Pint, public API adresiyle öğrenci/admin build ve iOS/Android/web export başarılıdır. Web ve Expo web export ekranları 320/834/1280 px ile kontrol edildi. Native SDK 58'in içerdiği slider sürümü kullanılır; tarayıcı ve export sonuçları fiziksel Android/iPad veya tam VoiceOver/TalkBack testi değildir.

Composer strict manifest ve lock audit geçti. Node audit başarısız: mevcut Expo araç zincirindeki Zod için `GHSA-mrhx-c7xc-m3w5` hâlâ açık; yeni slider bağımlılığı bu mevcut sürümü değiştirmez. Önceden belgelenmiş node-forge duyurusu da upstream araç zinciri kapsamındadır. Bu teslim bağımlılık güvenlik denetimini geçmiş gibi sunulmaz; ayrıntılar [MOBILE](MOBILE.md) ve audit çıktısındadır.
