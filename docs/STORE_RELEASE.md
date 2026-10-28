# App Store ve Google Play yayın hazırlığı

28 Ekim 2026. Marka **ÖGGSor - Soru Bankası**, kısa yazım **ÖGGSor**; alan adı `oggsor.com`, teknik kimlik `net.codentum.oggsor`, hedef yayıncı Codentum L.L.C. Kullanıcı son yazımı özellikle bu şekilde belirledi; büyük harfe dönüştürülmez. Günlük geliştirme [iOS beta](IOS_BETA.md) ve [Android beta](ANDROID_BETA.md) akışıyla sürer.

**Genel yayın henüz tamamlanmış sayılmaz.** Testlerin geçmesi kullanım hakkı veya hukuki onay değildir. `npm run check:store` kaynak/HTTPS/ikon/mağaza metin limitlerini ve yasal kararları denetler; aşağıdaki insan kontrollerinin yerine geçmez.

## Teknik olarak tamamlananlar

- Kayıt/giriş, kişisel çalışma, e-posta değişimi/parola yenileme, cihaz oturumları, veri dışa aktarma ve uygulama içi hesap silme gerçek API ile çalışır. Öğrencinin soru çözmesi için e-posta doğrulaması gerekmez; iş başvurusu ve kurumsal/yönetim işlemleri ayrıca korunur.
- Hesap silme web yolu: <https://oggsor.com/legal/hesap-silme.html>; gizlilik: <https://oggsor.com/legal/gizlilik.html>; destek: <https://oggsor.com/legal/destek.html>. Mobilde Profil alt bağlantıları; hesap işlemleri Profil → Hesabım.
- Reklam, ödeme, sosyal giriş ve kullanıcı takibi SDK’sı yok. Bu uygulama için abonelik/PRO veya Apple ile Giriş akışı eklemek gerekmiyor.
- HTTPS, güvenli oturum/CSRF/token/tenant kontrolleri mevcut. Host ile sınırlı HSTS canlıda; iki yerel güvenlik yaması kaynak ve gerçek regresyonlarla doğrulanır. [Güvenlik](SECURITY.md).
- Günlük şifreli yedek, saatlik ayrı silme defteri, Mac’e otomatik aktarım kuruldu; gerçek yedek ayrı geçici DB’ye geri yüklenerek doğrulandı. [Kurtarma](../deploy/server-development/backup/README.md).
- Expo/EAS Update teknik veri akışı kamu gizlilik metnine eklendi. Hesap/cevap verileri güncelleme isteğine eklenmez. Sağlayıcı saklama ve yurt dışı aktarımın hukuki değerlendirmesi açık.
- [Mağaza metinleri](store-metadata.tr.json) resmî kurumla bağlantı olmadığını ve görünür EGM/mevzuat kaynak URL’lerini içerir. Otomatik kontrol sahte EGM alan adını/HTTP kaynağını ve metin limit aşımını reddeder.
- Apple’da 1.0.0 sürümü **Prepare for Submission**; tanıtım/açıklama/anahtar kelime/destek/marketing URL/inceleme adımları taslak kaydedildi, yayın seçimi **manuel**. Gizlilik ve hesap silme URL’leri kaydedildi. 10 veri türünün App Privacy taslağı işlev/hesap bağlantısı/takip yok seçimleriyle hazırlandı; Publish yapılmadı. Apple incelemesine gönderilmedi. Hesap üstünde hâlâ Harun Altay görünür; Organization/DSA sürecinin tamamlandığı çıkarılamaz.

Google Play’de mevcut Dahili Test hâlâ 0.1.1 (3) olarak göründü. İlk Safari denemesindeki erişim hatası sonrasında, kullanıcının bu sayfadan devam talimatıyla **varsayılan Türkçe mağaza taslağı kaydedildi**: ÖGGSor - Soru Bankası adı, 77 karakterlik kısa açıklama ve kaynak/bağlantısızlık notunu içeren 1.649 karakterlik tam açıklama. “Değişiklikleriniz kaydedildi” görüldü; sayfa yeniden yüklendiğinde üç alanın korunduğu doğrulandı. Ardından kullanıcı onayıyla 512×512 simge, 1.024×500 özellik grafiği ve dört gerçek Android telefon ekranı taslağa yüklendi. Kaydetme mesajı ve sayfa yeniden yüklemesinde 1/1 simge, 1/1 grafik, 4/8 telefon ekranı doğrulandı. [Görseller ve kaynakları](store-assets/README.md). Daha sonra ayrı Android tablet yapılandırmalarından 7 ve 10 inç alanlarına ikişer ekran eklendi; kaydetme mesajı ve sayfa yeniden yüklemesinde her alanda 2/8 ekran doğrulandı. iOS/iPad ekranları, Data safety, yaş ve inceleme erişimi henüz tamamlanmadı. İncelemeye gönderme veya genel yayın yapılmadı.

**Yeni native paketler hazır:** iOS 1.0.0 (5) / `2eb481cf-0d3f-41d1-ae8d-dfec271948b0`, Android 1.0.0 (4) / `1bd0045c-9172-4a63-a795-d6d1f01c9004`. Production kanalı, gömülü gerçek API/önizleme kapalı, imza/manifest ve Android 16 KB statik kontrolleri geçti. Paketler `~/.config/oggaq-development/store-release-2026-10-28/` içinde; mağazalara yüklenmedi ve fiziksel kurulum denenmedi. Yeni paketlerin hazırlanması kamu yayını değildir.

## Gerçek yayın engelleri ve çözümleri

| Açık nokta | Gerekli çözüm |
| --- | --- |
| Hukuki inceleme taslak; yürürlük tarihi, VERBİS ve uygulanacak hukuk boş | Codentum’un mevcut kayıtları ve hizmet kapsamıyla hukuki değerlendirme; gerçek kararları `legal-values.json` içine kaydet, metinleri onaylandıktan sonra uygula. Boş alanı uydurarak veya yalnız `taslak:false` yaparak geçme. |
| Soru kitapçıkları ve logodaki amblem için kullanım hakkı belgesi yok (kullanıcı 28 Ekim teyidi) | Hak sahibinden/lisans koşullarından yeniden dağıtım yetkisini belgelemek veya hakları teyit edilmiş içerik/amblem seçmek. Kamuya açık PDF tek başına lisans kanıtı değildir. Yazılı izin talebi göndermek ayrıca açık talimat gerektirir. |
| Apple/Google mağaza gizlilik, yaş/kitle ve hesap uyumu son durumları tamamlanmış değil | Aşağıdaki envanterle panelleri doldur, son paket ve sağlayıcı davranışıyla karşılaştır. Apple yayıncı/DSA ve Google kuruluş doğrulamasını panellerden teyit et. |
| Yeni 1.0.0 paketlerinin native ve temiz kurulum kontrolü | Son kaynak gömülü, production kanallı imzalı IPA/AAB oluştur; iPhone/iPad ve Android temiz kurulum, eski hesaptan yükseltme ve bağlantı kesintisini gerçek cihazda kontrol et. Eski beta gömülü kodunu doğrudan genel sürüme yükseltme. |
| Diğer cihaz görselleri ve inceleme erişimi | Google telefon ve iki tablet sınıfının görselleri taslakta kayıtlı. Apple/iPad ekranlarını ilgili cihazdan al; özel inceleme hesabı ve iletişim bilgisini yalnız mağazanın güvenli alanlarına gir. Parolayı depoya koyma. |

## Veri beyanı için teknik envanter

Bu tablo nihai hukuk görüşü veya mağazaya gönderilmiş form değildir. Apple ve Google tanımları farklıdır. Özellikle üçüncü taraf hizmet işleyenleri Google’ın paylaşım istisnalarıyla ayrıca karşılaştırılır; otomatik olarak “veri toplanmıyor” seçilmez.

| Veri | Kullanım / gerekli oluşu | Hesapla bağlantı |
| --- | --- | --- |
| Ad, e-posta, hesap kimliği | Hesap ve hizmet; zorunlu | Evet |
| Telefon, iş başvurusu/ön yazı | İsteğe bağlı iş başvurusu | Evet |
| Cevaplar, süre, sonuç, favoriler/çalışma geçmişi | Çalışma, kaldığı yerden devam, istatistik | Evet |
| Soru bildirimi/destek metni | İsteğe bağlı kalite/destek | Evet; silmede bildiren/not kaldırılır |
| Rastgele kurulum tanımlayıcısı, platform/runtime/kanal | Expo/EAS güncellemesi ve cihaz oturumu; reklam kimliği değil | API oturumu hesapla bağlantılı; Expo güncelleme kimliğine hesap eklenmez |
| Sınırlı ciddi hata metni / teknik istek bilgisi | Expo/EAS hatadan kurtarma; IP hizmet sağlayıcısına görünür | Hesap/cevap bilerek eklenmez; sağlayıcı kapsamı ayrıca değerlendirilir |
| Dilekçe/tutanak alanları ve PDF | Kullanıcı isteğiyle HTTPS üretim; şifreli geçici dosya en çok 5 dakika, tek kullanımlık bağlantı | Kalıcı belge arşivi yok; geçici işlem/sağlayıcı ve isteğe bağlı veri türleri ayrıca beyan değerlendirmesine katılır |

Aktarım HTTPS ile şifrelenir; silme uygulamada ve webden talep edilebilir. Reklam amaçlı veri paylaşımı/takip yok. Barındırma Türkiye; Cloudflare, Resend, Google destek posta kutusu ve Expo/EAS sağlayıcı akışları [PRIVACY](PRIVACY.md) ve kamu metninde açıklanır. Saklama/silme kararlarının hukuki onayı açık.

## Paket ve dağıtım

Kaynak sürüm **1.0.0**; EAS uzaktaki iOS build ve Android versionCode değerlerini otomatik artırır. `production`: Node 24.22.0, store dağıtımı, gerçek HTTPS adresleri, iOS simulator=false, Android app-bundle, production EAS kanalı. Genel kanalda beta OTA dağıtımı yapılmaz. `testflight` ve `play-internal` profilleri kendi kanal/ortamlarını korur.

Onaylar tamamlandığında `npm run build:ios:production` ve `npm run build:android:production` önce `check:store` çalıştırır. Teknik inceleme için hazırlanmış imzalı paket, incelemeye gönderilmiş veya kamuya açılmış demek değildir. Native bağımlılık/SDK/runtime değişiminde yeni paket gerekir; uyumlu JS/görsel değişikliği kanal ve runtime doğrulanarak OTA olabilir. İnceleme sırasında incelenen paketin davranışı farklılaştırılmaz.

Ekran görüntüleri gerçek uygulamadan ve sentetik hesapla alınır. Silah bilgisi içeren eğitim soruları nedeniyle yaş derecelendirme/IARC soruları dürüstçe yanıtlanır; 18+ hedef kitle, anket sonucunu kendimiz seçme yetkisi vermez. Çocuk/aile kategorisi hedeflenmez. Android güncel target API/16 KB gereği ve iOS SDK gereği son paket üzerinde tekrar doğrulanır; eski arşivlerin statik incelemesi [TESTING](TESTING.md) içindedir.

## Resmî kaynaklar

28 Ekim 2026’da kontrol edildi: [Apple inceleme](https://developer.apple.com/app-store/review/guidelines/), [Apple App Privacy](https://developer.apple.com/app-store/app-privacy-details/), [Google resmî kurum bilgisi](https://support.google.com/googleplay/android-developer/answer/9514050), [Google Data safety](https://support.google.com/googleplay/android-developer/answer/10787469), [Google hesap silme](https://support.google.com/googleplay/android-developer/answer/13327111), [Expo gizlilik](https://expo.dev/privacy-explained). Politika ve nihai form yanıtı, ilgili güncel sayfa/hesap üzerinde doğrulanır.

## Elle kontrol

- [ ] Hukuki inceleme ve üç eksik karar tamamlandı; metinlerin son hâli onaylandı
- [ ] Soru kitapçıkları ve amblem kullanım hakkı belgelendi
- [ ] Apple yayıncı/Organization ve DSA, Google kuruluş doğrulaması son durumu teyit edildi
- [ ] Apple App Privacy ve Google Data safety son paket/sağlayıcı envanteriyle tamamlandı
- [ ] Yaş derecelendirmesi, hedef kitle, reklam yok ve resmî kurumla bağlantı yok beyanları dolduruldu
- [ ] Güncel gerçek ekran görüntüleri ve güvenli inceleme hesabı hazır
- [ ] 1.0.0 imzalı paketleri gerçek iPhone/iPad ve Android’de temiz kurulum/yükseltme kontrolünden geçti
- [ ] Parola yenileme/isteğe bağlı iş başvurusu kod postası farklı sağlayıcılarda doğrulandı; Outlook spam durumu ayrıca takip edildi
- [x] Sunucuda şifreli yedek ve Mac aktarımı çalıştı, gerçek geri yükleme provası geçti
- [ ] Özel yedek anahtarı ve ayrı silme defteri anahtarının çevrimdışı kopyası kullanıcıda
- [ ] Son sürümün kamuya açılması kullanıcı tarafından ayrıca istendi
