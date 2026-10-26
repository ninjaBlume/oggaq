# Otomatik sınav takvimi

Takvim, Deneme/Ders soru bankasından ve puanlama dönemlerinden ayrı bir merkezi veridir. Web ve mobil öğrenci menüsündeki **Sınav takvimi** ekranı Temel/Yenileme numaralarını, sınav gününü, eğitim bitişini ve kaynak/son doğrulama bilgisini birlikte gösterir. Eğitim bitişi başvuru son günü olarak sunulmaz; sınav saati veya açıklanmamış tarih üretilmez.

## Kaynak ve kontrol

Birincil kaynak [EGM Özel Güvenlik 2026 sınav takvimi](https://www.egm.gov.tr/ozelguvenlik/2026-sinav-takvimi). 26 Ekim 2026 incelemesinde resmî HTML tablo doğrudan indirildi ve altı Temel/Yenileme çifti ayrıştırıldı. Son satır 124. Temel / 100. Yenileme, 27 Aralık 2026; eğitim bitişi 13 Kasım 2026'dır. Aynı gün uygulama sunucusundan bot kimliğiyle bu sayfa 200, 2027 adresi 404 döndürdü. Üçüncü taraf kurs takvimleri doğrulanmış veri kaynağı değildir.

`calendar:sync` Türkiye saatiyle her gün **03.20**'de bu yıl ve gelecek yılı kontrol eder. Elle tek yıl: `php artisan calendar:sync --year=2026`. Öğrenci API isteği EGM'ye gitmez; yalnız yerel snapshot okunur. Web sorgusu beş dakika önbellekte kalır. Mevcut scheduler ve cache kilidi kullanılır; yeni servis/bot hesabı veya bağımlı tarayıcı çalışmaz.

- Sabit HTTPS EGM adresi, yönlendirme kapalı; keyfî URL alınmaz. Bağlantı 5 saniye, istek 15 saniye timeout ve en fazla 1 MiB gövde sınırı vardır. DOM uzantısı mevcut PHP 8.4 ortamında doğrulanmış ve Composer platform gereksinimine eklenmiştir; paket sürümü değiştirilmemiştir.
- Beklenen yıl/başlık/sütunlar, iki sınav numarası, Türkçe tarih/gün eşleşmesi, eğitim bitiş sırası, benzersizlik ve dönem sırası doğrulanır. Temel numarasından Yenileme numarası türetilmez; tablodaki iki sayı ayrı okunur. Ateşleyici/köpek vb. sınavlar alınmaz.
- Semantik içerik hash'i aynıysa yeni snapshot oluşmaz. Geçerli tarih değişikliği yeni değişmez snapshot oluşturur; önceki veri korunur. Mevcut sınav çifti kaybolursa/değişirse otomatik silme yapılmaz, `review_required` kaydedilir ve son doğrulanmış takvim gösterilir. Bu durumda operatör resmî değişikliği incelemelidir; kaynak biçimi/adresi değişirse ayrıştırıcının güncellenmesi gerekebilir.
- HTTP/ağ/ayrıştırma hatasında `verified_at` yenilenmez. Son doğrulama 48 saati aşarsa veya son kontrol başarısızsa ekran eski veri uyarısı gösterir. Hiç doğrulanmış kayıt yoksa yıl açıkça hazır değil olarak görünür. 404 yayımlanmamış yıl olarak işaretlenir; hayalî sınav oluşturulmaz.
- Tam yıl başına cache kilidi ve transaction/row lock; iki eşzamanlı işlem kopya üretmez. CLI hataları anlamlı durum kodu/başarısız çıkışla görünür; ham HTTP içeriği veya kişisel bilgi loglanmaz.

## Veri ve API

`exam_calendar_sources` her yıl için sabit kaynak, son kontrol/başarı, durum ve aktif snapshot'ı tutar. `exam_calendar_snapshots` yalnız doğrulanmış sayı/tarih dizisini ve içerik hash'ini saklar; PostgreSQL trigger'ı UPDATE/DELETE'i engeller. Bileşik foreign key başka yılın snapshot'ının seçilmesini engeller. Eski soru, deneme ve puanlama kayıtları değiştirilmez.

`GET /api/v1/exam-calendar?year=2026`, giriş yapmış/doğrulanmış aktif kullanıcılara açıktır. Takvim ortaktır ve kişisel/kurumsal veri içermez. Yıl 2020–2100 aralığında doğrulanır; `ready`, `stale`, `unavailable` durumları, yıllar, kaynak, kontrol/başarı zamanı ve entries döner. Yeni sözleşme [openapi.json](openapi.json) içindedir.

Migration `2026_10_26_000004_create_exam_calendar` yalnız takvim tablolarını ekler. Kullanıcının koruduğu yerel `oggaq` DB'sine otomatik uygulanmaz: eksik şemada API boş/hazır değil döner, CLI dış kaynağı sorgulamadan durur. Normal yerel API'ye bu migration'ın uygulanması ayrıca kullanıcı yetkisi gerektirir; `oggaq_test` doğrulaması bu sınıra dahil değildir.

Gerçek takvim aktarımı kullanıcının otomatik takvim çekme talebi kapsamındadır; gerçek soru aktarımı yapılmaz. Yayın ve doğrulama kanıtı [TESTING](TESTING.md) içinde izlenir.
