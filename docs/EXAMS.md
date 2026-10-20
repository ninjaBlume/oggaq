# Süreli deneme

Exams modülü, web `Deneme` ekranı ve Expo mobil uygulaması gerçek PostgreSQL/API kaydını paylaşır. Kullanıcı rastgele denemede 1–100 soru (çıkmış sınav şablonu en fazla 200 soru) ve 60–10800 saniye (silahlı çıkmış sınav için 150 dk gerekir) seçer. Webde ders/konu filtresi uygulanabilir. Rastgele sorular merkezi havuzun o anda yayımlanmış sürümlerinden, tekrar olmadan seçilir; seçim tek SQL ifadesiyle yapılır ve yayımlanmış sürümler değişmez olduğundan soru satırı kilidi alınmaz (yayımlama beklemez). Yeterli soru yoksa 422 döner; yarım kayıt oluşmaz.

**İstemciler.** Web ve mobil öğrenci arayüzleri yalnızca yayımlanmış çıkmış sınavları ve tekrar sınavını başlatır: *Deneme Sınavı* (konusuz tam sınav) ve *Ders Sınavı* (`subject` dolu). Rastgele deneme ve tek soru çalışması API'de durur ancak arayüzde sunulmaz; tekrar, `review_kind` ile başlatılan bir sınavdır (yanlış, boş veya favori sorulardan; bkz. [STUDY](STUDY.md)). Önerilen süre silahlı 150, silahsız 120 dakika (EGM sınav talimatı 4.3), ders sınavı soru başına 1,2 dakikadır; süre öğrencinin seçimidir.

**Çıkmış sınav.** Başlatma gövdesine `official_exam_id` verilirse yayımlanmış çıkmış sınavın tüm soruları orijinal sırası ve sabit sürümleriyle kopyalanır. `question_count`, `subject_id` ve `topic_id` bu durumda gönderilemez (422); süre yine kullanıcıya aittir ve resmî sınav süresi veya geçme kararı değildir. Yanıtta `official_exam` künyesi bulunur. Yeni soru sürümü yayımlansa da şablon ve mevcut denemeler değişmez. PostgreSQL trigger'ları, resmî denemenin yayımlanmış şablonun tamamıyla sayı, sıra ve sürüm olarak eşleşmesini zorunlu kılar. Doğru cevap yüzdesi `correct_ratio_v1` kuralıyla hesaplanır. Resmî sınav süre/sayı/başarı kuralı veya geçme kararı uygulanmaz.

## İşlemler

`/api/v1/contexts/{context}/exam-attempts` GET/POST; `/{exam}` GET; `/{exam}/answers/{answer}` PUT; `/{exam}/finish` POST. Tipler [OpenAPI](openapi.json) içinde üretilir.

Başlatma gövdesi `id` UUID, `question_count`, `duration_seconds` ve isteğe bağlı `subject_id`/`topic_id` içerir. Aynı id/ayarlar aynı kaydı döndürür; farklı ayarlar veya bağlam 409. Açılan soru sırası ve sürümleri değişmez; yeni yayın mevcut denemeyi etkilemez.

Cevap PUT gövdesi `base_version` (revision) ve `selected_option_id` (UUID veya açıkça null) içerir. Cevap süre içinde değiştirilebilir/temizlenebilir. Çakışma **cevap bazındadır**: `exam_answers.changed_revision`, cevabın son değiştiği deneme revision'ını tutar; bir cevap istemcinin `base_version` değerinden sonra başka değere değiştiyse ve istenen değer farklıysa 409 verilir. Aynı denemenin başka sorusuna ait eski revision'la yazı (ör. yanıt gelmeden sonraki soruyu işaretleme) kabul edilir ve revision'ı artırır. Zaten kaydedilmiş seçimin tekrarında revision artmaz. Bitirme yine güncel `base_version` ister. Aynı bitirmenin tekrarı değişmez sonucu döndürür. Süresi dolmuş/tamamlanmış denemeye geç gelen yazı cevapları değiştirmeden nihai kaydı döndürür.

Süreyi backend `started_at`/`deadline_at` belirler. Tek denemeyi okuma ve yazma dolan kaydı tamamlar. Geçmiş listesi **salt okunurdur**: süresi dolmuş ama henüz kapatılmamış kayıt `status=active` ve `deadline_at < server_time` ile görünür (istemciler "Sonucu gör" gösterir); kayıt `exams:expire` komutuyla veya açıldığında tamamlanır. `exams:expire` scheduler tarafından her dakika çalıştırılır; üretimde Laravel scheduler'ın çalışması zorunludur, aksi halde listelerde süresi dolmuş kayıtlar açılana kadar `active` kalır. Yerelde `php artisan schedule:work` kullanılabilir. Süre dolan sonuç tam olarak deadline zamanına kaydedilir; cron gecikmesi süreyi uzatmaz.

Web ve mobil sayaç `server_time`/`deadline_at` farkından monotonik saatle çizilir; cihazın duvar saati değerlendirmeyi değiştirmez. Aktif kayıt 15 saniyede yenilenir; mobil ön plana dönüşte de yüklenir. Sayaç sıfıra gelince API'den sonuç istenir. Ağ yokken yerel puan üretilmez. Belirsiz cevabın tekrarında gönderilmiş seçim/revision korunur; başka cevap yazılmadan aynı istek tekrarlanır veya sunucu kaydı yüklenir. Offline outbox yoktur.

## Veri ve erişim

`exam_attempts`: context FK, filtre, isteğe bağlı `official_exam_id`, sabit sayı/süre/kural, revision, başlangıç/son süre/bitiş ve doğru/yanlış/boş/puan. `exam_answers`: parent FK, soru/sürüm composite FK, sıra, seçilen seçenek/sürüm composite FK ve sunucu değerlendirmesi. Deneme+soru ve deneme+sıra unique'dir. PostgreSQL trigger'ları sabit ayar/sürüm ve tamamlanmış sonuç/cevap değişikliklerini, yanlış grading ve süre sonrası cevap değişimini engeller. Sonuç tüm cevaplarla aynı transaction içinde yazılır; row lock yarışları sıralar.

Yalnız bağlam sahibi erişir. Platform/kurum yöneticisi başkasının kişisel veya kurum denemesini okuyamaz. Aktif hesap, doğrulanmış e-posta ve kurum bağlamında güncel aktif üyelik/kurum gerekir. Kritik işlemler actor/membership/tenant durumunu kilit altında yeniden doğrular. Tamamlanana kadar key/açıklama/puan gizlidir; cevaplar başlangıçtaki sürümden değerlendirilir.

## Kanıt ve sınırlar

Çıkmış sınav denemesi ve cevap bazlı çakışma dahil PostgreSQL feature testleri (toplam backend sonucu 126 test/875 assertion) ile tarayıcı senaryoları geçti. İlk teslimdeki 15 PostgreSQL feature testi ve iki bağımsız PHP/PostgreSQL bağlantısıyla gerçek eşzamanlı bitirme testi eklendi. Webde 5 gerçek API Chromium senaryosu: doğru/yanlış/boş/kalıcılık, süre sonu, yanıt kaybı, eski sekme, yetersiz havuz/telefon/tablet. Mobil ekranların Bearer API akışı Expo web export üzerinde de doğrulanır; bu kontrol native cihaz testi yerine geçmez. Native derleme durumu [MOBILE](MOBILE.md) içinde ayrıca raporlanır.

Gerçek kaynak aktarımı, kurum/platform deneme şablonları, kurum raporları ve offline kalıcılık yoktur. Çıkmış sınav, yanlışlar/boşlar/favoriler ve istatistik API'si eklendi ([STUDY](STUDY.md#tekrar-listeleri-favoriler-ve-istatistik)); bunların web, yönetim paneli ve mobil ekranları da vardır; sınav sonuç ekranında (web ve mobil) soruyu favoriye ekleme/çıkarma vardır; deneme yanıtındaki her soru `is_favorite` taşır.
