# Tanıtım sayfasındaki uygulama görselleri

28 Ekim 2026: görseller mevcut `apps/mobile` Expo web önizlemesinden, açık tema / standart yazı / 390 × 844 px / 2× yoğunluk ile yeniden alındı. HTML ile taklit edilmiş ekran veya AI ile üretilmiş resim değildir. Native cihaz testi yerine sayılmaz.

- `public/screens/mobile-home.jpg`: 780 × 1688 px; güncel ortalanmış marka başlığı, kaldırılmış profil kısayolu, kompakt düğmeler ve ana ekran kartları.
- `public/screens/mobile-result.jpg`: 724 × 268 px; doğrudan `exam-result-summary` bileşeninin görüntüsü. Yeni doğru oranı, ince dağılım çubuğu ve doğru/yanlış/boş adetleri; dekoratif yıldız/çiçek yok.

Veriler yalnız çekime özel izole tarayıcı yanıtlarıdır: “Öğrenci” adlı tanıtım kullanıcısı, 100 soru / 72 doğru / 18 yanlış / 10 boş / %72 ve bir tamamlanan çalışma. Ekranda gerçek kişinin adı, e-postası, hesabı veya sınav geçmişi yayımlanmaz. Gerçek kullanıcıyla giriş yapılmadı, sunucuda hesap oluşturulmadı, geliştirme/test/üretim veritabanına yazılmadı. Yanıtlar yerelde karşılandı; dış ağ isteği engellendi. Hiçbir soru veya yapay sorunun resmî içerik gibi gösterimi yoktur; yayımlanan sonuç görseli yalnız özet kartıdır.

Takvimde daha önce platformda doğrulanmış 27 Aralık 2026 / 124. Temel / 100. Yenileme bilgisi kullanıldı; bu çekim yeni bir resmî takvim araştırması değildir. Sayaç çekim gününe göre 28 Ekim 2026 için 60 gündür. Görseller statiktir; sayfadaki “Örnek veriler” açıklaması bunların canlı takvim/istatistik olmadığını belirtir.

Telefon çerçevesi, lacivert/mavi zemin ve öne gelen sonuç kartı sitenin HTML/CSS düzenidir; JPEG içindeki uygulama arayüzü yeniden çizilmez. Mobilde görsel mağaza bölümünden önce, masaüstünde metnin sağında yer alır. Yeni görseller toplam yaklaşık 163 KB'dir; betik/otomatik carousel/izleyici eklenmez.

Mobil arayüz değiştiğinde aynı bileşenleri, pencereyi ve anonim örnek verileri kullanarak görselleri yenileyin. E-posta/parola veya oturum anahtarı yakalamayın. Derleyici her iki görselin SHA-256 içerik sürümünü URL'ye ekler. Mevcut site testleri iki görselin derlenmesini/yüklenmesini/doğru boyutlarını, örnek veri açıklamasını ve 320–1280 px taşmamayı doğrular.

Yerel çekim/önizleme kanıtları `artifacts/site-visual-refresh/` içindedir. Çekim için açılan yalnız 127.0.0.1:5189 önizleme sunucusu (PID 38852) kapatıldı; paylaşılan geliştirme sunucularına dokunulmadı.
