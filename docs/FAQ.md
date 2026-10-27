# Mobil yardım ve sade profil

27 Ekim 2026: Kullanıcı, uygulamadaki “Yasal ve destek” bölümünün kaldırılmasını ve benzer uygulamalardaki konulardan yararlanılarak menüye SSS eklenmesini istedi.

## Uygulanan düzen

Menüde **Sıkça Sorulan Sorular** vardır; ana alt sekmelerin sayısı değişmez. Sayfa, iki grupta 17 özgün soru/yanıt içerir. Aynı anda tek yanıt açılır; klavye ve ekran okuyucu için düğme/açık durum bilgisi kullanılır. Mevcut büyük yazı, açık/koyu tema ve tablet düzeni korunur. İçerik yereldir; ekranı açmak veya yanıtları okumak yeni API isteği, yükleme beklemesi veya yeni veritabanı gerektirmez. Bu, sınavların çevrimdışı çalıştığı anlamına gelmez.

Profilde **Yasal ve destek** başlığı ve dört büyük bağlantı kartı kaldırıldı. **Gizlilik Politikası** ve **Kullanım Koşulları** küçük, en az 44 birim dokunma alanlı bağlantılar olarak profilde kalır. Hesap silme işlemi **Profil → Hesabım → Hesabı sil** içinde korunur; SSS sonunda dış hesap silme yardım bağlantısı da vardır. Destek iletişimi SSS sonundaki **Destek ekibine yaz** düğmesi ve merkezi marka e-postası üzerinden sunulur. E-posta uygulaması açılmazsa görünür hata/yeniden deneme ve yazılı adres vardır. Resmî kurum bağlantısı bulunmadığı notu SSS sonunda korunur. Giriş/kayıt bağlantıları ve sunucudaki yasal sayfalar değişmez.

Uygulama içi davranışlar mevcut koddan doğrulandı: kaydedilen yanıtın geri bildirimi/kilitlenmesi, kaldığı sorudan devam, öğrenci seçimine bağlı süre, sonuçlar, atış girişi, tekrar, soru bildirimi, internet gereksinimi, hesap/parola/silme, metin boyutu ve güncelleme. Başka uygulamalardaki ödeme, çevrimdışı kullanım veya sınav kuralları ÖGG SOR'a aktarılmadı. Ücret/premium tanıtımı eklenmedi. Bu teslim, uygulamanın tüm hukuki uygunluğunun tamamlandığı anlamına gelmez.

## Araştırma ve kaynaklar

27 Ekim 2026 tarihinde güncel resmî kurallar kontrol edildi:

- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/): **5.1.1(i)** gizlilik bağlantısının hem mağaza kaydında hem uygulamada kolay erişilebilir olmasını; **1.5** uygulama ve destek URL'sinde ulaşılabilir iletişim bilgisini ister. **5.1.1(v)** hesap oluşturulan uygulamalarda uygulama içi hesap silmeyi düzenler. Özel bir “Yasal ve destek” başlığı veya büyük kart yığını zorunlu tutulmaz; seçilen sade düzen bu gereksinimleri koruma yaklaşımıdır.
- [Google Play User Data](https://support.google.com/googleplay/android-developer/answer/10144311?hl=en): uygulama içinde gizlilik bağlantısı/metni ve hesap oluşturulan uygulamalar için içeriden/dışarıdan keşfedilebilir silme yolu gereksinimleri. Bu nedenle bağlantılar tamamen kaldırılmadı.

Konu seçimi için incelenen benzer hizmetlerin herkese açık sayfaları:

- [Özel Güvenlik Sınavı: ÖGG — App Store](https://apps.apple.com/tr/app/%C3%B6zel-g%C3%BCvenlik-s%C4%B1nav%C4%B1-%C3%B6gg/id6808984367): çıkmış soru kaynağı, temel/yenileme ayrımı, sınav provası, tekrar ve takvim konuları.
- [EFEBEY.AI özel güvenlik uygulaması](https://www.efebeyai.com.tr/uygulama.php?slug=ozel-guvenlik): dersler, çalışma düzeni ve yanlışları tekrar etme konuları.
- [Osmaniye Ata sınav hazırlığı SSS](https://www.osmaniyeataguvenlik.com/deneme): soru kaynağı/formatı ve çalışma yöntemleriyle ilgili kullanıcı sorularının sunumu.

Bu sayfalardan metin kopyalanmadı. Yanıtlar `apps/mobile/src/faq-content.ts` içinde ÖGG SOR'un mevcut davranışlarına göre yazıldı; kurum/sertifika uygunluğu veya değişebilen başvuru koşulları hakkında yeni vaat eklenmedi.

Doğrulama ve dağıtım durumu [TESTING](TESTING.md) içinde tutulur. Yerel kaynak değişikliği, TestFlight/Google Play betasına otomatik yayın anlamına gelmez.
