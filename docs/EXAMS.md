# Süreli deneme

Exams modülü, web `Deneme` ekranı ve Expo mobil uygulaması gerçek PostgreSQL/API kaydını paylaşır. Kullanıcı 1–100 soru ve 60–7200 saniye seçer. Webde ders/konu filtresi uygulanabilir. Rastgele sorular merkezi havuzun o anda yayımlanmış sürümlerinden, tekrar olmadan seçilir. Yeterli soru yoksa 422 döner; yarım kayıt oluşmaz. Doğru cevap yüzdesi `correct_ratio_v1` kuralıyla hesaplanır. Resmî sınav süre/sayı/başarı kuralı veya geçme kararı uygulanmaz.

## İşlemler

`/api/v1/contexts/{context}/exam-attempts` GET/POST; `/{exam}` GET; `/{exam}/answers/{answer}` PUT; `/{exam}/finish` POST. Tipler [OpenAPI](openapi.json) içinde üretilir.

Başlatma gövdesi `id` UUID, `question_count`, `duration_seconds` ve isteğe bağlı `subject_id`/`topic_id` içerir. Aynı id/ayarlar aynı kaydı döndürür; farklı ayarlar veya bağlam 409. Açılan soru sırası ve sürümleri değişmez; yeni yayın mevcut denemeyi etkilemez.

Cevap PUT gövdesi `base_version` (revision) ve `selected_option_id` (UUID veya açıkça null) içerir. Cevap süre içinde değiştirilebilir/temizlenebilir. Eski revision farklı seçimle 409 verir; zaten aynı kaydedilmiş seçimin tekrarında revision artmaz. Bitirme güncel `base_version` ister. Aynı bitirmenin tekrarı değişmez sonucu döndürür. Süresi dolmuş/tamamlanmış denemeye geç gelen yazı cevapları değiştirmeden nihai kaydı döndürür.

Süreyi backend `started_at`/`deadline_at` belirler. Okuma, yazma ve geçmiş listesi dolan kaydı tamamlar. `exams:expire` komutu uygulama kapalıyken kalan kayıtları tamamlar; scheduler her dakika çalıştırır. Üretimde Laravel scheduler'ın çalışması gerekir. Yerelde `php artisan schedule:work` kullanılabilir. Süre dolan sonuç tam olarak deadline zamanına kaydedilir; cron gecikmesi süreyi uzatmaz.

Web ve mobil sayaç `server_time`/`deadline_at` farkından monotonik saatle çizilir; cihazın duvar saati değerlendirmeyi değiştirmez. Aktif kayıt 15 saniyede yenilenir; mobil ön plana dönüşte de yüklenir. Sayaç sıfıra gelince API'den sonuç istenir. Ağ yokken yerel puan üretilmez. Belirsiz cevabın tekrarında gönderilmiş seçim/revision korunur; başka cevap yazılmadan aynı istek tekrarlanır veya sunucu kaydı yüklenir. Offline outbox yoktur.

## Veri ve erişim

`exam_attempts`: context FK, filtre, sabit sayı/süre/kural, revision, başlangıç/son süre/bitiş ve doğru/yanlış/boş/puan. `exam_answers`: parent FK, soru/sürüm composite FK, sıra, seçilen seçenek/sürüm composite FK ve sunucu değerlendirmesi. Deneme+soru ve deneme+sıra unique'dir. PostgreSQL trigger'ları sabit ayar/sürüm ve tamamlanmış sonuç/cevap değişikliklerini, yanlış grading ve süre sonrası cevap değişimini engeller. Sonuç tüm cevaplarla aynı transaction içinde yazılır; row lock yarışları sıralar.

Yalnız bağlam sahibi erişir. Platform/kurum yöneticisi başkasının kişisel veya kurum denemesini okuyamaz. Aktif hesap, doğrulanmış e-posta ve kurum bağlamında güncel aktif üyelik/kurum gerekir. Kritik işlemler actor/membership/tenant durumunu kilit altında yeniden doğrular. Tamamlanana kadar key/açıklama/puan gizlidir; cevaplar başlangıçtaki sürümden değerlendirilir.

## Kanıt ve sınırlar

15 PostgreSQL feature testi ve iki bağımsız PHP/PostgreSQL bağlantısıyla gerçek eşzamanlı bitirme testi eklendi. Webde 5 gerçek API Chromium senaryosu: doğru/yanlış/boş/kalıcılık, süre sonu, yanıt kaybı, eski sekme, yetersiz havuz/telefon/tablet. Mobil ekranların Bearer API akışı Expo web export üzerinde de doğrulanır; bu kontrol native cihaz testi yerine geçmez. Native derleme durumu [MOBILE](MOBILE.md) içinde ayrıca raporlanır.

Gerçek kaynak aktarımı, resmî çıkmış sınav sırası/şablonu, ders dağılımı raporu, favoriler, yanlışlar listesi ve offline kalıcılık bu teslimde yoktur.
