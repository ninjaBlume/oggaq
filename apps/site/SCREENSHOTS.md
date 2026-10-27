# Tanıtım sayfasındaki uygulama görselleri

**Güncel durum (28 Ekim 2026):** Kullanıcı lacivert panel, eğik telefon ve öne bindirilmiş sonuç kartını reddetti. Canlı site yalnız web imajı `oggaq-development-web:documents-20261028` seçilerek önceki sade görünüme geri alındı. Ardından kullanıcı “yayınlasana” diyerek tek düz telefon önizlemesini onayladı; bu görünüm `site-clean-7f9d88f` web imajıyla yayımlandı.

28 Ekim 2026: görseller mevcut `apps/mobile` Expo web önizlemesinden, açık tema / standart yazı / 390 × 844 px / 2× yoğunluk ile yeniden alındı. HTML ile taklit edilmiş ekran veya AI ile üretilmiş resim değildir. Native cihaz testi yerine sayılmaz.

- `public/screens/mobile-home.jpg`: 780 × 1688 px; güncel ortalanmış marka başlığı, kaldırılmış profil kısayolu, kompakt düğmeler ve ana ekran kartları.
Önceki sonuç kartı görseli ve şablon alanı kaldırıldı; yeni hero yalnız ana ekran JPEG'ini kullanır (143.081 byte).

Veriler yalnız çekime özel izole tarayıcı yanıtlarıdır: “Öğrenci” adlı tanıtım kullanıcısı, 100 soru / 72 doğru / 18 yanlış / 10 boş / %72 ve bir tamamlanan çalışma. Ekranda gerçek kişinin adı, e-postası, hesabı veya sınav geçmişi yayımlanmaz. Gerçek kullanıcıyla giriş yapılmadı, sunucuda hesap oluşturulmadı, geliştirme/test/üretim veritabanına yazılmadı. Yanıtlar yerelde karşılandı; dış ağ isteği engellendi. Hiçbir soru veya yapay sorunun resmî içerik gibi gösterimi yoktur; yayımlanan sonuç görseli yalnız özet kartıdır.

Takvimde daha önce platformda doğrulanmış 27 Aralık 2026 / 124. Temel / 100. Yenileme bilgisi kullanıldı; bu çekim yeni bir resmî takvim araştırması değildir. Sayaç çekim gününe göre 28 Ekim 2026 için 60 gündür. Görseller statiktir; sayfadaki “Örnek veriler” açıklaması bunların canlı takvim/istatistik olmadığını belirtir.

Telefon düz ve tek başına gösterilir; üstüne başka içerik bindirilmez. Büyük renkli panel, çapraz şerit ve eğim yoktur. JPEG içindeki gerçek uygulama arayüzü yeniden çizilmez. Mobilde mağaza alanı önce, telefon görseli sonra; masaüstünde telefon metnin sağındadır. Betik/carousel/izleyici eklenmez.

Mobil arayüz değiştiğinde aynı bileşenleri, pencereyi ve anonim örnek verileri kullanarak görselleri yenileyin. E-posta/parola veya oturum anahtarı yakalamayın. Derleyici ana ekran görselinin SHA-256 içerik sürümünü URL'ye ekler. Site testleri görselin yüklenmesini/boyutunu, telefon çerçevesi içinde kalmasını, ortasının başka içerikle örtülmemesini, örnek veri açıklamasını ve 320–1280 px taşmamayı doğrular.

Yerel çekim/önizleme kanıtları `artifacts/site-visual-refresh/` içindedir. Çekim için açılan yalnız 127.0.0.1:5189 önizleme sunucusu (PID 38852) kapatıldı; paylaşılan geliştirme sunucularına dokunulmadı.

Önceki yayın: `8937c44` kaynaklı kompozisyon `site-visual-20261028` web imajıyla yayımlandı, ardından kullanıcı geri bildirimiyle geri alındı. Geri alımda 10 hesap/yönetim/bilgi/marka dosyasının hash'i ve diğer 7 servisin kimliği korundu; origin ve genel HTTPS readiness kontrolleri geçti. Mobil uygulama veya OTA paketi değiştirilmedi.

Yeni önizleme: `artifacts/site-clean-preview/preview-light.png`, `preview-dark.png`, `mobile-light.png`, `mobile-dark.png`. Geçici 5189 önizleme sunucusu yalnız kendi süreç kimliğiyle kapatıldı. 4 Node testi, 6 Chromium E2E, site build ve marka tutarlılık kontrolü geçti. Kullanıcı onayından sonra bu taslak oggsor.com'a yayımlandı; Git push yapılmadı. Son kontrol `artifacts/site-clean-preview/live-report.json`, canlı görünümler `live-*.png` içinde. Dokuz site/bilgi dosyası origin üzerinde hash ile, ana HTML/CSS/görsel ve bilgi CSS'leri genel HTTPS üzerinde hash ile kontrol edildi. Dört bilgi sayfası tarayıcıda açıldı; 320/390/834/1280 px koyu düzen, sıfır API isteği/sayfa hatası ve genel API readiness geçti. Mobil uygulama/OTA/DB değiştirilmedi.
