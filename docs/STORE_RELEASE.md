# App Store ve Google Play yayın hazırlığı

28 Ekim 2026. Marka **ÖGGSor - Soru Bankası**, kısa yazım **ÖGGSor**; alan adı `oggsor.com`, teknik kimlik `net.codentum.oggsor`, hedef yayıncı Codentum L.L.C. Kullanıcı son yazımı özellikle bu şekilde belirledi; büyük harfe dönüştürülmez. Günlük geliştirme [iOS beta](IOS_BETA.md) ve [Android beta](ANDROID_BETA.md) akışıyla sürer.

**Genel yayın henüz tamamlanmış sayılmaz.** Testlerin geçmesi kullanım hakkı veya hukuki onay değildir. `npm run check:store` kaynak/HTTPS/ikon/mağaza metin limitlerini ve yasal kararları denetler; aşağıdaki insan kontrollerinin yerine geçmez.

**28 Ekim beta eşitlemesi:** Aynı güncel kaynak `0314c5e` ile iOS **1.0.0 (6)** TestFlight'ta mevcut iç test grubuna, Android **1.0.0 (5)** Play Dahili Test'e dağıtıldı. iPhone, iPad ve Android kurulum/açılışını ve 1.0.0 görünmesini kullanıcı teyit etti; kısa OTA kodlarının cihaz teyidi ayrı izlenir. Yeni runtime'larda kendi beta OTA'ları da yayımlandı. Aşağıdaki eski production adayları 5/4 bu betalarla karıştırılmaz; genel yayın hâlâ yapılmadı. Ayrıntı [iOS](IOS_BETA.md), [Android](ANDROID_BETA.md), [doğrulama](TESTING.md).

**App Store görselleri:** Güncel gerçek iPhone/iPad simülatörlerinden sekiz ekran hazırlandı. Türkçe 1.0.0 taslağında iPhone dört dosya/4 of 10, 13 inç iPad iki dikey+iki yatay dosya/4 of 10 olarak yüklendi. Tam sayfa yenilemesinden sonra iki sınıfın dosya adları ve sayıları korundu; `Save` pasif, görseller otomatik kalıcı. İncelemeye/genel yayına gönderilmedi. [Görsel kaydı](store-assets/README.md#app-store-iphone-ve-ipad-ekranları--28-ekim-2026).

**28 Ekim mağaza beyanları:** Apple ana kategori **Education**, yaş anketi hesaplanan **16+**; mevcut yetişkin hedef kitleye uygun üst seçimle **18+** kaydedildi. Silah ve ilk yardım eğitim içeriği düzenli; madde kullanımı atıfları, yetişkin temaları ve gerçekçi şiddet nadir; reklam, açık web gezintisi, herkese açık kullanıcı içeriği, sohbet, kumar/yarışma yok olarak yanıtlandı. Özel PDF oluşturma, Apple'ın geniş dağıtılan kullanıcı içeriği özelliği olarak işaretlenmedi. Uygulama tıbbi cihaz değildir beyanı kaydedildi. Kullanıcının son onayıyla **10 veri türünün App Privacy beyanı yayımlandı**; panelde `Published … by Harun Altay` görüldü ve tam sayfa yenilemesinden sonra korundu. Bu gizlilik beyanının yayınıdır; uygulama sürümü hâlâ **Prepare for Submission**.

Apple Business ekranında **DSA: In Review**, son güncelleme **16 Ekim 2026**, Free Apps Agreement **Active** görüldü. Görünen yasal kişi **Harun Altay**; Codentum Organization dönüşümünün tamamlandığı doğrulanmadı. Bekleyen DSA başvurusu yeniden gönderilmedi ve yasal kişi bilgisi körlemesine değiştirilmedi. Google Play gizlilik URL'si `https://oggsor.com/legal/gizlilik.html` olarak taslağa kaydedildi; `Değişiklik kaydedildi` mesajı görüldü.

**29 Ekim inceleme erişimi:** Kullanıcı onayıyla yalnız mağaza incelemesine ayrılmış ve önceden doğrulanmış bir öğrenci hesabı hazırlandı. Gerçek API'de giriş/profil ve geçici oturum iptali doğrulandı. Apple inceleme kullanıcı/parola alanları, iletişim ve örnek hesap notu kaydedildi; tam sayfa yenilemesinde korundu. Kimlik bilgileri depoda tutulmaz. Google formunu kullanıcı açtıktan sonra aynı hesap ve 393 karakterlik İngilizce erişim notu eklendi; “Değişiklik kaydedildi” görüldü, sayfa yenilendiğinde giriş gerekli seçimi ve ek iş ortağı test paylaşımının kapalı seçimi korundu. Bu hesap normal kullanıcı temizliğine karıştırılmamalı ve inceleme süresince erişilebilir tutulmalıdır.

Google reklam yok ve resmî kurum adına geliştirilmedi beyanları kaydedildi. Veri güvenliğinin toplama/HTTPS/kullanıcı adı+parola/silme URL'leri ve cihaz kimliği seçimi taslak kaydedildi; diğer veri türü etiketleri güvenilir okunamadığından tamamlandı sayılmadı. Google hedef kitle anketi, inceleme erişimi tamamlandıktan sonra **18 yaş ve üstü** olarak kaydedildi; isteğe bağlı ek küçük kullanıcı engeli etkinleştirilmedi. Yalnız App Privacy yayımlandı; mağaza uygulaması veya Google incelemesi gönderilmedi.

**VERBİS:** Kullanıcı, bildiği kadarıyla kayıt ve Türkiye'de atanmış temsilci olmadığını belirtti. [Kurumun Ekim 2025 rehberi, soru 51/s.46](https://www.kvkk.gov.tr/SharedFolderServer/CMSFiles/2f2fbcf4-932b-4dad-af8a-cd32e315d815.pdf#page=46) yurt dışında yerleşik veri sorumlularında çalışan/bilanço sınırlarının dikkate alınmadığını belirtir. Codentum'a küçük işletme istisnası otomatik uygulanmadı; `legal-values.json` iç inceleme notuna kaynaklarıyla kaydedildi. Bu kayıt hukuki inceleme tamamlandı veya VERBİS başvurusu yapıldı anlamına gelmez.


**29 Ekim son çapraz kontrol:** Dilekçe PDF formundaki isteğe bağlı fiziksel adres, hesapla bağlantılı/yalnız uygulama işlevi/takip yok olarak Apple beyanına ayrıca eklendi. Kullanıcı bu somut düzeltmeyi onayladı; panelde yeni `Published …` ve **11 veri türü** doğrulandı. Önceki 10 türlük kayıt ilk yayın aşamasıdır. IARC şartları kullanıcı onayıyla kabul edilip çevrimiçi eğitim sorularındaki metinsel şiddet/madde referansları doğru olarak belirtildi; içerik odağı bunlar değildir, cinsellik/argo yok, paketle gelen derecelendirme içeriği ve kullanıcılar arası paylaşım yok, ürün eğitimdir. Google anketi **PEGI 3 / IARC Generic 3+ / USK 6** hesapladı ve `Değişiklik kaydedildi` görüldü. Bu içerik derecesi hedef kitle değildir: hedef kitle **18+**, Apple üst seçimi **18+** kalır.

Veri güvenliği için Google’ın resmî CSV şablonundan 12 veri türünü kapsayan, gerçek kullanıcı kaydı/parola içermeyen `artifacts/store-compliance-20261029/oggsor-data-safety.csv` hazırlandı. Tüm örnek yanıtlar önce temizlenip veri türleri, zorunlu/isteğe bağlı seçimler, amaçlar, konum/reklam/paylaşım yok kontrolleriyle doğrulandı. Ardından gerçek Play Console dışa aktarımındaki 782 satırla birleştirildi; hesap oluşturma yöntemi ve iki silme URL’sinin korunduğu ayrıca denetlendi. Google tanımı teknik çökme tanılamasını Analytics amacı içinde de saydığından yalnız çökme/tanılama türlerine bu amaç eklendi. Henüz içe aktarılmadı; somut dosya yükleme onayı bekleniyor. Kamu gizlilik metnindeki bu ayrımı netleştiren ifade kaynakta hazır; bu görevde sunucuya dağıtılmadı.

## Teknik olarak tamamlananlar

- Kayıt/giriş, kişisel çalışma, e-posta değişimi/parola yenileme, cihaz oturumları, veri dışa aktarma ve uygulama içi hesap silme gerçek API ile çalışır. Öğrencinin soru çözmesi için e-posta doğrulaması gerekmez; iş başvurusu ve kurumsal/yönetim işlemleri ayrıca korunur.
- Hesap silme web yolu: <https://oggsor.com/legal/hesap-silme.html>; gizlilik: <https://oggsor.com/legal/gizlilik.html>; destek: <https://oggsor.com/legal/destek.html>. Mobilde Profil alt bağlantıları; hesap işlemleri Profil → Hesabım.
- Reklam, ödeme, sosyal giriş ve kullanıcı takibi SDK’sı yok. Bu uygulama için abonelik/PRO veya Apple ile Giriş akışı eklemek gerekmiyor.
- HTTPS, güvenli oturum/CSRF/token/tenant kontrolleri mevcut. Host ile sınırlı HSTS canlıda; iki yerel güvenlik yaması kaynak ve gerçek regresyonlarla doğrulanır. [Güvenlik](SECURITY.md).
- Günlük şifreli yedek, saatlik ayrı silme defteri, Mac’e otomatik aktarım kuruldu; gerçek yedek ayrı geçici DB’ye geri yüklenerek doğrulandı. [Kurtarma](../deploy/server-development/backup/README.md).
- Expo/EAS Update teknik veri akışı kamu gizlilik metnine eklendi. Hesap/cevap verileri güncelleme isteğine eklenmez. Sağlayıcı saklama ve yurt dışı aktarımın hukuki değerlendirmesi açık.
- [Mağaza metinleri](store-metadata.tr.json) resmî kurumla bağlantı olmadığını ve görünür EGM/mevzuat kaynak URL’lerini içerir. Otomatik kontrol sahte EGM alan adını/HTTP kaynağını ve metin limit aşımını reddeder.
- Apple’da 1.0.0 sürümü **Prepare for Submission**; tanıtım/açıklama/anahtar kelime/destek/marketing URL/inceleme adımları taslak kaydedildi, yayın seçimi **manuel**. Gizlilik ve hesap silme URL’leri kaydedildi. 10 veri türünün App Privacy beyanı işlev/hesap bağlantısı/takip yok seçimleriyle kullanıcı onayından sonra yayımlandı. Apple incelemesine gönderilmedi. Organization/DSA durumu yukarıda ayrıca kayıtlıdır.

Mağaza taslağı hazırlanırken Google Play Dahili Test 0.1.1 (3) idi; sonraki beta eşitlemesinde 1.0.0 (5) yayımlandı. İlk Safari denemesindeki erişim hatası sonrasında, kullanıcının bu sayfadan devam talimatıyla **varsayılan Türkçe mağaza taslağı kaydedildi**: ÖGGSor - Soru Bankası adı, 77 karakterlik kısa açıklama ve kaynak/bağlantısızlık notunu içeren 1.649 karakterlik tam açıklama. “Değişiklikleriniz kaydedildi” görüldü; sayfa yeniden yüklendiğinde üç alanın korunduğu doğrulandı. Ardından kullanıcı onayıyla 512×512 simge, 1.024×500 özellik grafiği ve dört gerçek Android telefon ekranı taslağa yüklendi. Kaydetme mesajı ve sayfa yeniden yüklemesinde 1/1 simge, 1/1 grafik, 4/8 telefon ekranı doğrulandı. [Görseller ve kaynakları](store-assets/README.md). Daha sonra ayrı Android tablet yapılandırmalarından 7 ve 10 inç alanlarına ikişer ekran eklendi; kaydetme mesajı ve sayfa yeniden yüklemesinde her alanda 2/8 ekran doğrulandı. Sonrasında her tablet sınıfına iki ayrı 2560×1440 yatay ekran eklendi; yeniden kaydetme/yenilemede her tablet alanında 4/8 ekran ve yatay dosya adları korundu. Telefon görselleri değişmedi. iOS/iPad ekranları yukarıdaki sonraki teslimde tamamlandı; Data safety, yaş ve inceleme erişimi henüz tamamlanmadı. İncelemeye gönderme veya genel yayın yapılmadı.

**Yeni native paketler hazır:** iOS 1.0.0 (5) / `2eb481cf-0d3f-41d1-ae8d-dfec271948b0`, Android 1.0.0 (4) / `1bd0045c-9172-4a63-a795-d6d1f01c9004`. Production kanalı, gömülü gerçek API/önizleme kapalı, imza/manifest ve Android 16 KB statik kontrolleri geçti. Paketler `~/.config/oggaq-development/store-release-2026-10-28/` içinde; mağazalara yüklenmedi ve fiziksel kurulum denenmedi. Yeni paketlerin hazırlanması kamu yayını değildir.

## Gerçek yayın engelleri ve çözümleri

| Açık nokta | Gerekli çözüm |
| --- | --- |
| Hukuki inceleme taslak; yürürlük tarihi, VERBİS ve uygulanacak hukuk boş | Codentum’un mevcut kayıtları ve hizmet kapsamıyla hukuki değerlendirme; gerçek kararları `legal-values.json` içine kaydet, metinleri onaylandıktan sonra uygula. Boş alanı uydurarak veya yalnız `taslak:false` yaparak geçme. |
| Soru kitapçıkları ve logodaki amblem için kullanım hakkı belgesi yok (kullanıcı 28 Ekim teyidi) | Hak sahibinden/lisans koşullarından yeniden dağıtım yetkisini belgelemek veya hakları teyit edilmiş içerik/amblem seçmek. Kamuya açık PDF tek başına lisans kanıtı değildir. Yazılı izin talebi göndermek ayrıca açık talimat gerektirir. |
| Apple/Google mağaza gizlilik, yaş/kitle ve hesap uyumu son durumları tamamlanmış değil | Aşağıdaki envanterle panelleri doldur, son paket ve sağlayıcı davranışıyla karşılaştır. Apple yayıncı/DSA ve Google kuruluş doğrulamasını panellerden teyit et. |
| Yeni 1.0.0 paketlerinin native ve temiz kurulum kontrolü | Son kaynak gömülü, production kanallı imzalı IPA/AAB oluştur; iPhone/iPad ve Android temiz kurulum, eski hesaptan yükseltme ve bağlantı kesintisini gerçek cihazda kontrol et. Eski beta gömülü kodunu doğrudan genel sürüme yükseltme. |
| İnceleme erişimi | Google telefon/tablet ve Apple iPhone/iPad görselleri taslaklarda kayıtlı. Özel inceleme hesabı ve iletişim bilgisini yalnız mağazanın güvenli alanlarına gir. Parolayı depoya koyma. |

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
