# Uygulama ekran görüntüsü

`public/screens/mobile-home.jpg`, 26 Ekim 2026 tarihinde mevcut Expo uygulamasının web önizlemesinden, 390 × 844 px ve 2× piksel yoğunluğuyla alınmıştır. Aynı `apps/mobile` bileşenleri kullanılmıştır; HTML ile yeniden çizilmiş bir uygulama ekranı veya native cihaz testi değildir.

Görselde kişisel veri bulunmaz. “Öğrenci” adlı tanıtım hesabı ve boş çalışma özeti tarayıcıda izole yanıtlarla gösterilmiştir; yeni sunucu hesabı oluşturulmamış, mevcut öğrencinin ad/geçmiş/sonuçları yayımlanmamıştır. Takvim, çekim anında sunucudaki mevcut takvimden okunmuştur. Ekran görüntüsündeki kalan gün ve tarih statiktir; sitede canlı takvim hizmeti sunulmaz. Sorular veya örnek cevaplar görselde yer almaz.

Mobil arayüz değiştiğinde görüntüyü aynı ekran boyutu ve açık tema ile yenileyin. Giriş bilgilerini veya API anahtarlarını görüntüye/kaynak kontrolüne koymayın. Derleyici, dosya hash’ini görsel URL’sine ekleyerek yeni görüntüde önbelleği yeniler. Görselin yüklenmesi ve boyutları mevcut site tarayıcı testinde kontrol edilir.
