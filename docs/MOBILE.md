# Expo mobil uygulaması

## Deneme/Ders kartlarında tam sınav tarihi — 28 Ekim 2026

Kartın tarih satırı mevcut kesin tarih varsa **29 Ağustos 2026** biçiminde gün/ay/yıl gösterir; tarih başlığa yeniden eklenmez. Ortak `examPeriodLabel` eski kayıtların başlığındaki parantezli tarihi veya incelenmiş kitapçık aktarımının kaynak künyesindeki sınav tarihini kullanır. Kitapçık künyesinde sınav numarası ve eğitim türü, her iki kaynakta gerçek takvim günü/yıl/varsa ay eşleşmesi kontrol edilir. Çelişkili veya kesin günü bulunmayan metadata için mevcut ay/yıl ya da dönem/yıl gösterimi korunur; yayın/indirme tarihinden gün çıkarılmaz. Sınav başlıkları, soru sürümleri, puanlama ve veritabanı değiştirilmez.

Yayımdaki **598 kayıt** salt okunur incelendi: Temel 46 tam sınav + 253 ders, Yenileme 46 tam sınav + 253 ders; hepsinde kesin gün çözümlendi. Yeni kaynak veya soru içe aktarılmadı. Ek API isteği, bağımlılık veya bekleme yok; zaten gelen metadata kullanılır. Mobil ve yerel web QA kartları aynı gösterimi kullanır. Device Hub iOS'ta Temel/Yenileme Deneme ve Ders kartları gerçek API ile görüldü; sınav başlatılmadı/cevaplanmadı. [Test ve beta teslimi](TESTING.md).

## Parola yer tutucusu ve takvim metni — 28 Ekim 2026

Ortak mobil `Field` bileşeni parola alanı boşken, açıkça başka yer tutucu verilmediyse `••••••••` gösterir. Giriş, kayıt ve parola tekrar alanları aynı görünümü kullanır; gerçek değer boş kalır, güvenli giriş/göster-gizle/otomatik doldurma davranışı değişmez. Takvimde kullanıcıya gösterilen “Son doğrulama” tarih-saat satırı mobil ve web arayüzünden kaldırıldı; resmî kaynak bağlantıları ve eski veri uyarıları korunur. API'nin kontrol zamanı ve takvim botu değiştirilmez.

## Kompakt takvim ve sonuç listesi — 28 Ekim 2026

Sınavın altında sürekli görünen “Cevaplar sunucuda kayıtlı” metni kaldırıldı. İşlem sürerken “Kaydediliyor…”, uzlaştırma gerektiğinde “Kayıt doğrulanmalı” ve hata/yeniden deneme korunur. Doğru/yanlış geri bildirimi, cevap kilidi ve kayıt işlemleri değişmez.

Takvim sayfasının bölüm arası 12 px, kural maddelerinin arası 8 px oldu. Madde başlığı ve açıklama 14/20 px ortak paragrafta yer alır; kaynak ve yönetmelik eylemleri korunur. Kural/tarih kartları mevcut `Card.compact` görünümünü kullanır (12 px yatay/8 px dikey). Sınav tarihi etiketi ve tarih aynı satırda, eğitim bitişi altında; gereksiz büyük ikonlar küçültüldü. Standart yazıda takvim kartları sentetik örneklerle 320/390/834 px'de en çok 160 px, kurallar en çok 480 px olarak kontrol edilir. Sabit yükseklik ve kırpma yoktur; Büyük yazıda kart büyür.

Sonuçlarım satırı 16 px köşe, 12/8 px iç boşluk ve 6 px iç aralık kullanır. Skor alanı sabit 60 px yükseklik yerine en az 44 px'tir; başlık tam sarılır, meta 12/18 px'tir. Tekrarlanan tür etiketi kaldırıldı. Dağılım çubuğu 4 px, kısa doğru/yanlış/boş açıklaması 12/18 px, liste aralığı 10 px'tir. Yüzde ve dağılım hesabı/API değişmez. Detay ekranının bütün soruları kaydırma/favori/bildirim işlevleri korunur. Genel kartlar ve diğer `SplitLegend` kullanımları aynı kalır. [Doğrulama ve beta teslimi](TESTING.md).

## 27 Ekim 2026: daha ince butonlar

Mobil eylem ölçüleri `src/theme.ts` içindeki `buttonDensity` üzerinden ortaklaştırıldı: standart eylem 48 px / 10 px dikey boşluk, kompakt eylem 44 px / 8 px, bağlı seçim düğmesi 44 px / 8 px. Ana sayfanın Sınava gir/Devam eylemi ve yan menü satırları da standart yoğunluğu izler. Seçim köşeleri 22 px, onay ikonu ve iç aralığı yeni yüksekliğe uyarlandı. Metin boyutları, seçili/disabled durumları ve basış geri bildirimi korunur; sabit yükseklik yoktur, uzun/büyük metin gerektiğinde büyür. Alt gezinme, soru seçenekleri ve içerik kartları bu buton ayarıyla sıkıştırılmaz. [Kontroller ve beta dağıtımı](TESTING.md).

## 27 Ekim 2026: kompakt profil

Profilde büyük, ortalanmış avatar ve tekrarlanan hesap bilgileri birleştirildi: 56 px avatar yanında tam ad ve e-posta tek kartta gösterilir. Hesabım satırı, örnek metin kartı ve varsa çalışma alanları daraltıldı. Görünüm/yazı ayarları kendi içinde 8 px, bölüm grupları 12 px aralıkla toplanır. Uzun ad/e-posta, üç yazı boyutu ve mevcut cihaz tercihleri korunur. Hesabım erişiminden e-posta/parola, oturum, dışa aktarma ve hesap silme; gizlilik/koşullar, güncelleme ve çıkış işlemleri çalışmayı sürdürür. Güncelleme ve çıkış düğmeleri kompakt olsa da en az 44 px'dir. Genel kartların varsayılanı değiştirilmedi; `Card` kompakt görünümü profil kimliği/örnek metinde ve takvimdeki kural/tarih kartlarında seçilir. Doğrulama/beta kayıtları [TESTING](TESTING.md) içindedir.

## 27 Ekim 2026: sade header ve kompakt sınav kartları

Header profil düğmesi kaldırıldı; Profil alt sekmeden veya tablet gezinme rayından açılır. Menü ve marka ana sayfa bağlantısı korunur; marka etkileşimsiz sağ boşlukla ortada kalır. Profil içindeki tam ad ve baş harfler değişmez.

Deneme ve Ders listelerinin ortak kartı kompaktlaştırıldı: büyük kitap ikonu ve yeni sınavdaki “Henüz girmedin” satırı kaldırıldı. Tam başlık üstte, dönem ile soru/süre bilgileri solda, Başla/Devam/Sonuç düğmesi sağda yer alır. Sayı ve birimi aynı grupta kalır. Önceki sonuç/aktif sınav durumu yalnız varsa gösterilir. Süre ve çıkış tercihi formu kart açılınca görünür; API, başlangıç/tekrar/konum/sonuç kuralları değişmez. Dokunma hedefi en az 44 px, yazı ölçekleme ve başlık sarılması korunur; sabit kart yüksekliği yoktur. Kontroller ve beta dağıtımı [TESTING](TESTING.md) içinde kaydedilir.


## 27 Ekim 2026: sekiz karakterli parola alt sınırı

Kayıt ve Hesabım açıklamaları sunucuyla birlikte en az **8 karakter** olarak güncellendi. Parola değiştirme/sıfırlama ve webdeki yeni parola alanları da aynı sınırdadır. iOS **01a17d42**, Android **01a17d43** beta OTA yayımlandı; native paket sürümü 0.1.1 korunur. Cihazın paketi alması ayrıca teyit edilmelidir.

## 27 Ekim 2026: doğrudan öğrenci erişimi

Kayıt sonrasında mobil token alınır ve öğrenci doğrudan ana sayfaya girer. Ders, deneme, tekrar, kişisel sonuçlar ve puan hesaplama e-posta doğrulaması beklemez. Kayıtta doğrulama postası/kodu üretilmez. Profilde doğrulanmış hesap rozeti yoktur; gerçek doğrulama durumu veritabanında korunur.

İlanları incelemek serbesttir; yalnız başvuru formunda e-posta doğrulaması istenir. Öğrenci **Doğrulama kodu gönder** ile istekte bulunur; 6 haneli kodu aynı oturumda girince başvuru formuna döner. Kurumsal bağlamlar ve yönetim işlemleri doğrulanmış e-posta gerektirir. İmzalı bağlantılar ve güvenli e-posta değiştirme akışı korunur. Kod 10 dakika geçerli, yeniden gönderim en erken 60 saniye; tahmin ve gönderim limitleri değişmez.

Kayıt başarılı olup token alma/saklama başarısız olursa hesap yeniden oluşturulmaz; mevcut hesapla girişten devam edilir. Native oturum SecureStore'da korunur; web test önizlemesindeki token yalnız bellektedir. Dağıtım ve cihaz teyidi [TESTING](TESTING.md) içindedir.


## 27 Ekim 2026: Ders sınavlarında Temel/Yenileme ayrımı

Ders sınavları da Deneme gibi **Temel eğitim / Yenileme eğitimi** seçimi sunar. Seçili ders eğitim değişiminde korunur; sekmeden çıkıp dönüldüğünde ders ve eğitim tercihi korunur. Ders kataloğu API'ye `scope=subject`, `subject_id` ve `education_type` gönderir; bellek önbelleği bağlam, ekran türü, eğitim ve dersi ayrı anahtarlarda tutar. Eğitimler karışmaz; seçilen eğitimde sınavı bulunmayan ders için açık boş durum, istek hatasında yeniden deneme vardır.

Ders ve Deneme kartları ortak başlığı kullanır: **122. Temel Eğitim Sınav Soruları / 122. Yenileme Eğitim Sınav Soruları**. Sayı gerçek kaydın sınav numarasıdır; yenileme numarası temel numarasından türetilmez. Bu görünüm değişikliği yayımlanmış sınav başlıklarını, soruları veya geçmiş sonuçları değiştirmez. Daha eski bölümlerdeki “Ders ekranına eğitim seçimi eklenmez” kararı bu kullanıcı talimatıyla güncellenmiştir.

TypeScript, 57 mobil birim testi, başlık testleri ve 10 ilgili gerçek API arayüz testi doğrulandı; iOS/Android/web export başarılı. 320/390/834 px ekranlar `artifacts/education/` içindedir. Device Hub için açık 8082 Metro kaynakları kullanır; otomasyon aracı Simulator uygulamasına erişemediği için native ekranda bu değişikliğin kontrolü ve fiziksel cihaz teyidi yapılmadı. Ders ayrımı da 27 Ekim kayıt güncellemesiyle iOS/Android beta OTA kanallarına yayımlandı; fiziksel cihaz teyidi beklenir. Ayrıntılar [TESTING](TESTING.md) içinde.

## Öğrenci süre tercihi — 26 Ekim 2026

Deneme/Ders başlangıç formunda `Çıkınca süre devam etsin` / `Çıkınca süre dursun` seçilir. Tercih sunucuda denemeye kaydolur. Duraklatılabilir ekranda odak/AppState çıkışı durdurur, dönüş devam ettirir; başka cihazda kalan süre aynı kayıttan gelir. Eski oturumun gecikmiş yazısı yeni ekranı durduramaz. Kalan süre saat:dakika:saniye gösterilir; duraklatıldığında ilerlemez. Ani kapanma/ağ kaybında 30 saniyeye kadar işlemeye devam edebilir; formda açıklanır. Süre hatası ve devam eylemi görünür; durakta cevap/bitirme kilitlidir. Sürekli süre seçeneği eski davranışı korur.

## 26 Ekim 2026: yanıt sonrası anında değerlendirme

Deneme/Ders/Tekrar akışında ilk seçim sunucuya kaydedilince doğru seçenek, doğru/yanlış ve varsa açıklama görünür. Yanıtlanan soru yeniden seçilemez/temizlenemez; geriye dönüş ve yeniden girişte de kilit/feedback sunucudan gelir. Diğer soruların anahtarları yanıtlanana kadar gizlidir. Kayıt hatasında aynı seçim yeniden denenebilir; sunucu farklı seçimi reddeder. Sayaç çıkışta durdurulmaz; süre davranışı değiştirilmedi. Web/mobil ortak durum birleştirmesi ve API sözleşmesi birlikte güncellendi. Canlı API/web `74609f6` ile yayındadır; Expo Go projesini yenilemek gerekir. Fiziksel cihaz bu teslimde ayrıca denenmedi.

## 26 Ekim 2026: çıkmış soru açıklamaları

Deneme/Ders açıklamaları web ile ortak sözlükten gelir ve soruların geçmiş ÖGG sınavlarında çıkmış olduğunu belirtir. Ana sayfa rozeti `Çıkmış sorular` olarak güncellendi. `Öğrenciler için ücretsiz.` yalnız giriş ekranında bir kez görünür; kayıt/parola yenileme ve oturum açık ekranlarda tekrarlanmaz. Fiziksel cihaz ayrıca denenmedi; Expo Go projesini yenilemek yeterli. Doğrulamalar [TESTING](TESTING.md) içindedir.

## 26 Ekim 2026: sayısal ayların Türkçe gösterimi

Deneme ve Ders kartlarında `08 2026` yerine **Ağustos 2026**, diğer sayısal aylarda da Türkçe ay adı gösterilir. Ortak `examPeriodLabel` web ve mobilde aynı sonucu üretir; hazır ay adları ve `1. dönem` gibi etiketler korunur. Bu bir görünüm dönüşümüdür, yayımlanmış sınav künyesi/veritabanı değiştirilmez. Web `930613c` paketiyle yayındadır; mobil için mevcut Expo Go projesini yenilemek yeterlidir. Fiziksel cihaz bu teslimde ayrıca denenmedi; doğrulama ve dar kapsamlı web yayını [TESTING](TESTING.md) içinde.

## 26 Ekim 2026: Deneme sınavlarında Temel/Yenileme

Deneme ekranında önce Temel eğitim / Yenileme eğitimi, ardından silahlı/silahsız seçilir. Ders ekranına eğitim seçimi eklenmez. Önbellek anahtarı eğitim türünü de kapsar; farklı eğitimin hazır verisi diğer listede gösterilmez. Aynı kullanıcı/bağlamda sekmeye dönüş seçimi korur. Yeni backend alanı geçiş sırasında yoksa mevcut temel arşiv gösterilmeye devam eder. Yenileme kayıtlarını yönetmek için [EXAMS](EXAMS.md) içindeki migration/API gerekir. Kullanıcı onayıyla yalnız yerel `oggaq` migration'ı 26 Ekim 2026'da uygulandı; 98. yenileme aktarımında gerekli sunucu migration/kod güncellemesi de tamamlandı. `https://oggsor.com` API'sinde **76–98. yenilemenin tümü (30 Ekim 2022’den itibaren) ve 122. temel**, her biri silahlı 125 / silahsız 100 soru olarak yayındadır. Yenilemelerin 253 ders sınavı ve 122. temelin 11 dersi ortak Ders listesine eklendi; eski boş katalog önbelleği varsa Expo Go projesini bir kez yenilemek gerekir. Bu yayında fiziksel Expo Go kontrolü ayrıca yapılmadı.

`apps/mobile`, React Native 0.88.0 / Expo SDK 58.0.19 ile iOS/Android native bileşenleri kullanır. Kayıt/giriş, doğrulama e-postasını yeniden gönderme ve kontrol etme, parola yenileme e-postası, kişisel/aktif kurum seçimi, ders/konu ve yayımlanmış soru çalışması, geçmiş, süreli deneme/sonuç uygulanmıştır. HTML/web ekranı native içine gömülmez. Ortak API sözleşmesi ve saf sayaç kodu web ile paylaşılır. Uygulamaların React sürümü SDK'nın renderer sürümü 19.3.0'a eşitlendi; güncel geçiş kontrolleri aşağıdadır. Tarihsel doğrulamalar ilgili eski sürümlerini anlatır.

## 25 Ekim 2026: referanslara göre ana sayfa örneği

Ana sayfa; belirgin mavi/lacivert başlangıç alanı, üç küçük kişisel özet kutusu, Hızlı başla/Çalışmaların başlıkları altında aralıklı satır kartları ve son sınavlar olarak düzenlendi. Hızlı başla sırası **Ders sınavları → Deneme sınavları → Tekrar sınavı** şeklindedir. Ayrı “Derslerini keşfet” bölümü kaldırıldı; ders seçimi Ders sınavları ekranında yapılır. Kullanıcının referansa yalnız hafifçe yaklaşma isteğiyle kutu ayrımı ve ikon zeminleri belirginleştirildi; genel yapı korundu. Bütün araçlar ücretsizdir; ödeme/PRO/özellik kilidi yoktur. Soru/doğruluk/biten sınav değerleri mevcut gerçek Stats API'sinden gelir; yükleme ve hatada sayı uydurulmaz. Ana sayfa artık yalnız özet ve son sınavlar için iki veri isteği yapar; ders listesi istemez. Yeni bağımlılık veya bekleme animasyonu eklenmez. Aktif sınav öne alınır; mevcut başlatma/devam/tekrar/sonuç yolları korunur. Geniş tablette başlangıç/özet ve araç grupları yan yana, telefonda alt altadır.

Kullanıcının görselleri yalnız tasarım referansıdır; uygulamaya kopyalanmaz. Günlük hedef, seri, ücretli analiz, sınav takvimi gibi referanstaki ek özellikler oluşturulmadı. Bu örnek yalnız `apps/mobile` ana sayfasını değiştirir. Açık/koyu ve büyük yazı ekranları `artifacts/home-reference/` içinde; gerçek cihaz teyidi ayrıca gerekir.

## 25 Ekim 2026: markadan ana sayfaya dönüş

Ana başlıktaki logo ve ÖGG SOR yazısı aynı ana sayfa düğmesidir. Yan menüdeki marka da menüyü kapatarak Ana sayfa sekmesini açar. Profil altındaki marka yazısı aynı hedefe gider. Mevcut kullanıcı/kurum bağlamı korunur; açık sınav bitirilmez veya yeniden başlatılmaz. Klavye ve ekran okuyucu için düğme adı vardır, dokunma alanı en az 44 px'tir.

## 25 Ekim 2026: üç kademeli yazı boyutu

Profil → Yazı boyutu bölümünde **Küçük / Standart / Büyük** seçilir. Varsayılan Standart; çarpanlar 0,9 / 1 / 1,2. Başlık, gövde, soru/seçenek, menü ve giriş alanlarının özgün font/satır yüksekliği ortak metin bileşeninde ölçeklenir; native gezinme başlıkları da tercihi izler. Sistem font büyütmesi açık kalır, ikonlar/dokunma alanları küçültülmez. Tercih hemen uygulanır; native SecureStore, Expo web önizlemede localStorage içinde `oggaq.textSize` anahtarında tutulur. Sunucuya veya başka cihaza aktarılmaz.

Başlangıçta tercih okuması diğer açılış işlerini bekletmez. Geç/bozuk kayıt kullanıcının yeni seçimini ezmez; hızlı seçimlerin yazmaları sırayla tamamlanır. Kayıt hatasında seçili boyut oturumda kalır ve Profil'de hata/yeniden deneme gösterilir. Boyut değişimi açık ekranı/sınavı yeniden kurmaz. İnceleme için 320/390/834/1280 px açık/koyu görüntüler `artifacts/text-size/` içinde; bunlar native cihaz testi değildir. Doğrulama [TESTING](TESTING.md) içinde. Ayrı `apps/web` sitesine bu ayar bu teslimde eklenmedi.

## 25 Ekim 2026: sayfa geçiş logosu kaldırıldı

Güncel açılış ve sekme performansı: tema/oturum işleri ve ardından kimlik/bağlam istekleri paraleldir. Ana beş sekme yalnız ilk ziyaretinde oluşturulur, kullanıcı/bağlam ömründe korunur; görünmeyen ekranlar erişilebilirlik ağacından çıkarılır. Liste yenilemeleri hazır veriyi silmez. Yenileme, sekmeye dönüş ve arka plan ayrıntıları [PERFORMANCE](PERFORMANCE.md) içinde; aşağıdaki logo kaldırma ve soru hızı davranışları korunur.

Kullanıcının isteğiyle sekme, menü, sınav ve hesap ekranlarındaki logo örtüsü, animasyon ve yükleme sayacı kaldırıldı. Ekranların mevcut iskelet/yükleniyor, hata ve yeniden deneme durumları kullanılır. Marka logosu normal arayüzde ve uygulamanın açılışında kalır. Yalnız kaldırılan örtüyü sınayan geçici tarayıcı test betiği ve npm komutu da silindi.

Önceki hız düzeltmeleri korunur: yeni sınav başlatma yanıtındaki sorular doğrudan ekrana aktarılır; aynı sorular ilk açılışta yeniden indirilmez. Normal Devam açılışı sunucudaki konumu alır. Cevap kaydı beklerken soru gezinmesi açıktır. Ortak sayaç `HH:MM:SS` biçimindedir (120 dk `02:00:00`, 150 dk `02:30:00`). Güncel doğrulama [TESTING](TESTING.md) içinde.

## 25 Ekim 2026: Ogg Sor alan adı

Marka **Ogg Sor - Soru Bankası**, güncel web/API kökü **https://oggsor.com**. EAS development/preview/production profilleri ve mobil örnek ortam dosyası yeni adresi kullanır. Sunucuya bağlı mevcut yerel mobil ortam dosyasındaki eski iki URL de güncellendi; Claude'un 8081 Metro süreci durdurulmadı. Eski geliştirme adresi geçişte desteklenir; DNS önbellekleri yenilenirken bazı ağlarda eski park sayfası görülebilir. Yerel API ve 8001 test önizlemesi ayrıca ortam değişkeniyle seçilebilir. Native kurulum adı Android/iOS prebuild'de doğrulandı; yeni APK/IPA üretilmedi. Ayrıntılı canlı kontroller [BRAND](BRAND.md) içinde.

## 25 Ekim 2026: mağaza için yerel açılış ekranı

Kullanıcının mağaza hazırlığını tamamlama isteğiyle SDK 58 uyumlu `expo-splash-screen@58.0.11` kuruldu. Mevcut simge ve ortak mavi/koyu palet config plugin ile Android/iOS açılış ekranına bağlandı; yeni marka veya yapay açılış gecikmesi eklenmedi. Geçici native projede Android açık/koyu renk XML'leri, iOS storyboard ve renk varlıkları doğrulandı; mevcut node_modules yalnız symlink ile kullanıldı. Expo Doctor 20/20, strict tip, mobil 27/token 63, mağaza 14 ve araç zinciri 19 testleri; Android/iOS/web export geçti. Expo Go nihai splash görünümünü tam göstermez; yeni release paketinde kontrol gerekir. Ürün sahibi gerçek cihaz kontrollerini yürütüyor; bu oturumda yeni imzalı paket oluşturulmadı. Mağaza metinleri ve kalan kararlar [STORE_RELEASE](STORE_RELEASE.md) içinde.

## 25 Ekim 2026: araç zinciri güvenliği

SDK 58 korunarak Expo `58.0.19` / CLI `58.1.15` yama sürümlerine geçildi; CLI altındaki Zod `4.6.6` sürümüne sabitlendi. Gerçek Expo şemaları ve kaynak tüketimi regresyonu geçiyor. Yayımlanmış düzeltmesi bulunmayan `node-forge@1.4.0` için kaynak hash'iyle korunan dar yerel yama eklendi. `npm run audit` yama bütünlüğünü ve gerçek imza davranışını sınar; **ham npm audit upstream forge sürümünü hâlâ listeler**. Kurulum, 19 araç zinciri testi, CI ve geçici çözümün kaldırılma şartları [SECURITY](SECURITY.md#javascript-bağımlılık-güvenliği--25-ekim-2026) içinde. Aşağıdaki eski audit başarısızlıkları bu düzeltmeden önceki tarihsel kayıtlardır.

## 24 Ekim 2026: Expo Go SDK 58 uyumu ve sunucu API'si

Telefondan gelen Metro günlüğü, kurulu Expo Go'nun SDK 58 beklediğini ve SDK 57 projesini reddettiğini gösterdi. Önceki tünelin manifest/paket kontrolleri cihazdaki bu sürüm uyumunu doğrulamıyordu. [Resmî yükseltme akışı](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/) ve [SDK 58 değişiklikleri](https://expo.dev/changelog/sdk-58) izlenerek Expo 58.0.17, React Native 0.88.0 ve desteklenen native paketler kilitlendi. React/React DOM ve React tipleri monorepoda 19.3.0'a eşitlendi; eski native/React kopyaları kaldırıldı. Yeni strict React Native API'sine göre iki `ScrollView` ref'i `ScrollViewInstance` kullanıyor. Dinamik yapılandırmaya SDK 58'in istediği `expo-status-bar` plugin'i eklendi.

`.env.example` sunucudaki geliştirme adresini gösterir. Yeni kurulumda `apps/mobile/.env.example` dosyasını `.env.local` olarak kopyalayın; mevcut dosyanın API ve web değerlerini aynı HTTPS adresine ayarlayın. Komutlar Node 24 ile mobil dizininde:

```sh
EXPO_PUBLIC_API_URL=https://oggsorubankasi.codentum.net \
EXPO_PUBLIC_WEB_URL=https://oggsorubankasi.codentum.net \
npx expo start --go --tunnel ngrok --port 8082
```

SDK 58'in varsayılan Expo tüneli Expo hesabıyla giriş ister; bu oturumda mevcut `@expo/ngrok` aracıyla `--tunnel ngrok` kullanıldı ([sürüm notları](https://expo.dev/changelog/sdk-58#a-faster-more-reliable-expo-cli-tunnel)). API sunucudadır; Mac yalnızca Metro/tünel süreçlerini çalıştırır. Tünel adresi geçicidir; Metro kapanırsa telefon paketi alamaz. QR'ı yeniden tararken Expo Go'daki önceki hata ekranını kapatın. Önceki SDK 57 süreci durduruldu; yeni süreç ayrı `oggaq-mobile-expo58` çalışma ağacını kullanır.

Telefondaki Expo Go bir Expo hesabına giriş yaptıysa CLI da aynı hesapla açık olmalıdır. `npx expo login --browser` resmî tarayıcı girişini başlatır; parolalar dosyaya veya komuta yazılmaz. `npx expo whoami` sonucunu telefondaki hesapla karşılaştırın. QR'ı teslim etmeden önce kökten aşağıdaki salt okunur kontrolü çalıştırın; anonim/yanlış CLI hesabı, eski SDK, yanlış API/web adresi ve tünel dışına yönlenen paket adresleri reddedilir. Manifestin tek başına `200` dönmesi bu şartların karşılandığını göstermez.

```sh
node scripts/check-mobile-preview.mjs https://EXPO_TUNEL_ADRESI EXPO_KULLANICI_ADI
```

Doğrulananlar: tüm workspace'lerde strict tip kontrolü; 23 mobil, 11 admin, 4 web testi; Expo Doctor 20/20; iOS/Android Hermes ve web export; admin/web derlemeleri; iOS/Android `prebuild --no-install`. Gerçek HTTPS tünelinden alınan iOS manifesti `sdkVersion=58.0.0` ve sunucudaki API adresini döndürdü; indirilen iOS JavaScript paketi de doğru HTTPS API adresini içerdi. Sunucuda sentetik öğrenci hesabıyla mobil Bearer giriş/okuma/çıkış akışı ayrıca doğrulanmıştı. Bu geçiş için fiziksel cihazda SDK 58 uygulamasının açılışı/girişinin kullanıcı teyidi, yeni native APK/Simulator derlemesi ve tam backend/E2E koşumu henüz yoktur.

Bu geçiş sırasında, 25 Ekim güvenlik düzeltmesinden önce başarısız kalan kontrol: `npm run audit`, Expo CLI 58.1.14'ün `zod@3.25.76` bağımlılığı için yeni [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) bulgusunu bildirerek çıkış kodu 1 döndürür. Düzeltilmiş sürüm 4.6.6'dır; CLI'nin `^3.25.76` aralığı bu ana sürümü kabul etmez. Üretim uygulamasındaki doğrulama kütüphanesi değildir; geliştirme CLI'sinin devtools/MCP şema kodundadır. SDK yükseltmesi bu bulguyu kapatmış sayılmaz; mevcut audit kapısı yeni bulguyu reddetmektedir. Önceden belgelenmiş `node-forge` build aracı uyarısı da devam eder. Bu yeni audit bulgusu upstream uyumlu düzeltme/ayrı değerlendirme gerektirir.

## 24 Ekim 2026: Baskın mavi palet

Ortak renk tokenları açık temada mavi ve soğuk beyaz, koyu temada açık mavi ve lacivert yüzeylerle güncellendi. Eylemler, seçimler ve ders ikonları mavidir; yeşil yalnız doğru cevap/başarı gibi anlamlı durumları belirtir. Web ve yönetim paneli aynı tokenlardan CSS üretir; tarayıcı tema rengi de yeni zemini izler.

Doğrulama: 63 token/kontrast kontrolü, tüm workspace'lerde strict tip kontrolü, 23 mobil / 11 admin / 4 web testi, web/admin derlemeleri ve iOS/Android Hermes + web export geçti. Ana düğmenin yazı kontrastı açık temada 6.87:1, koyu temada 7.71:1'dir. Device Hub'daki iPhone 18 Pro / iOS 27.0 üzerinde Expo Go 58.0.5 ile ana sayfa ve profil açık/koyu temada görsel olarak kontrol edildi; önceki koyu tercih geri yüklendi. Görüntüler `artifacts/blue-palette/` içinde git dışındadır. Fiziksel telefon ve Android üzerinde bu palet ayrıca denenmedi. Mobil Metro önizlemesi günceldir; sunucudaki web/admin yayını bu değişiklikte güncellenmedi. Yukarıdaki mevcut audit bulgusu devam eder.

## 24 Ekim 2026: Ana sayfa, liste ve geri bildirim düzeni

- Ana sayfada son sınavlar içindeki süresi devam eden deneme karşılama satırından hemen sonra gelir; aynı deneme açılır, yeni kayıt başlatılmaz. Böyle bir deneme yoksa marka yapılandırmasındaki slogan ve küçük sınav giriş kartı görünür. Tekrar ve başarı iki yardımcı kısayoldur; deneme/ders hedefleri alt sekmelerde kalır.
- Sayfa başlığı 26/33px, yardımcı metin 14/21px; soru gövdesi 17/27px olarak korunur. Ders adları üç satıra kadar gösterilir. Mobil ölçekler ve kontrol biçimleri `src/theme.ts` içindedir.
- Sınav kartlarında başlık ve kısa meta üstte, durum ile en az 44px yüksekliğinde eylem alttadır. Devam eden sınav mavi kenar/ana düğme, yeni sınav ikincil düğme kullanır. Süre seçimi, başlatma kilidi, tekrar giriş ve süresi dolmuş denemenin sonucunu açma davranışları korunur.
- Yan menü beş ana sekmeyi tekrarlamaz; Tekrar sınavı, Başarı durumum, çalışma alanları ve çıkış içerir. Alt sekmeler/tablet rayı, odak kapanı, Escape/geri, sürükleyerek kapatma ve kurum izolasyonu korunur.
- Ortak düğmeler 16px köşe, basışta 12px; içerik kartları 24px köşe kullanır. Seçim gruplarının kapsül biçimi seçim durumuna ayrılmıştır. Normal düğmeler en az 48px, kompakt liste ve seçim düğmeleri en az 44px yüksekliktedir; metin büyürse alan da büyür.
- Ana sayfa, sınav ve sonuç listeleri yerleşimi koruyan statik iskeletler gösterir; tek erişilebilir yükleniyor durumu sunulur, dekoratif bloklar okunmaz. Hatalar bölüm başlığı ve yeniden deneme içerir; sunucu doğrulaması korunur, erişim/hız sınırı/ağ sorunları ayrı açıklanır. Beklenmeyen exception ayrıntıları arayüze yazılmaz.

Doğrulama: strict TypeScript, 25 mobil birim testi, 63 ortak token/kontrast kontrolü ve yalnız `oggaq_test` PostgreSQL üzerinde 16 mobil Chromium E2E geçti. E2E; mevcut sınav/sonuç/kurum/çıkış akışlarına ek olarak devam kartının önceliğini ve aynı cevabı koruyarak açılmasını, yükleme iskeletini, sunucu hatasından gerçek listeye yeniden denemeyi, sade menüyü ve 320/390/834px ile yatay görünümü kapsar. iOS/Android Hermes ve web export başarılıdır. Device Hub iPhone 18 Pro / iOS 27.0 / Expo Go 58.0.5 üzerinde ana sayfa ve kompakt liste açık/koyu temada, menü ve yükleme durumu native olarak incelendi; koyu tercih geri yüklendi. Görüntüler `artifacts/mobile-polish/` içinde git dışındadır. Fiziksel iPhone/Android ve Android emülatörü bu değişiklik için denenmedi. Web/admin ekranları ve sunucu yayını bu mobil düzenlemede değiştirilmedi; önceki audit bulgusu devam eder.

## 24 Ekim 2026: Bireysel öğrencide gereksiz alan seçimini gizleme

Tek erişim alanı olan öğrenci için profil ve yan menüdeki “Çalışma alanın / ÇALIŞMA ALANIM” bölümleri gösterilmez. Profil açıklaması “Hesabın ve uygulama tercihlerin.” olarak sadeleştirildi; ana sayfanın kişisel alan dipnotu kaldırıldı. Erişim hataları normal öğrenciye alan seçmesini söylemez; iptal edilmiş kurum erişiminden bireysel sınavlarına dönüş düğmesi “Sınavlarıma dön” yazar. Sunucudan dönen birden fazla alanı olan kullanıcı menü/profil üzerinden geçiş yapabilir; aynı API bağlamı ve kişisel/kurum geçmişi izolasyonu kullanılır.

Doğrulama: strict TypeScript, 25 mobil birim testi ve `oggaq_test` PostgreSQL üzerinde 17 mobil Chromium E2E geçti. Yeni senaryo kurumsuz sentetik öğrencinin ana sayfa, profil ve menüsünde gereksiz metin/seçim bulunmadığını; mevcut senaryolar kurum seçimi, geçmiş ayrımı ve çıkışı doğrular. iOS/Android Hermes ve web export başarılıdır. Device Hub Expo Go üzerinde kurumsuz öğrenci profili ve menüsü incelendi. Fiziksel cihazlar bu değişiklik için denenmedi; web arayüzü bu mobil değişikliğin kapsamında değildir.

## 24 Ekim 2026: Mac üzerinde Android 16 Expo Go önizlemesi

Kullanıcı Android SDK lisansını onayladıktan sonra OpenJDK 21, Android komut satırı araçları, Emulator 37.2.12, platform-tools 37.0.1 ve Google APIs Android 16 / API 36 ARM64 sistem imajı (revizyon 7) kuruldu. SDK yolu `~/Library/Android/sdk`; Java yolu `/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`. Pixel 7 profiliyle `OGGAQ_Android_16` AVD'si oluşturuldu; Hypervisor.Framework kontrolü başarılıdır. Bu kurulum Expo Go önizlemesi içindir; yerel APK derlemesi için gereken platform/build-tools ayrıca kurulmalıdır.

Yeniden açmak için Mac Terminal'inde:

```sh
export ANDROID_HOME="$HOME/Library/Android/sdk"
"$ANDROID_HOME/emulator/emulator" -avd OGGAQ_Android_16 -no-boot-anim -no-snapshot
```

Ardından mevcut Expo Metro terminalinde `a` tuşuna basın. Expo Go 58.0.5 resmi Expo indirme mekanizmasıyla alındı ve emülatöre kuruldu. ADB `sys.boot_completed=1`, çalışan Expo Go süreci, öndeki `ExperienceActivity`, Metro'nun başarılı Android paket üretimi ve React Native `main` başlangıç kaydı doğrulandı. Başlangıç manifesti SDK 58 ve sunucudaki HTTPS API adresini içerir; filtrelenmiş React Native hata günlüğünde hata bulunmadı.

Emülatörün Qt penceresi bilgisayar kullanım aracının uygulama listesine alınamadı. Bu nedenle Android'de görsel ekran kontrolü, öğrenci girişi ve sınav çözme akışı bu oturumda doğrulanmış sayılmaz. Mac'teki Metro/tünel açık kalmalıdır; bu bir mağaza dağıtımı değildir.

## 24 Ekim 2026: Giriş, kayıt ve parola yenileme tasarımı

Kimlik formları mavi temayla yeniden düzenlendi. Kullanıcının daha belirgin fakat gösterişsiz görünüm isteğiyle kompakt lacivert marka kartı, ince geometrik çizgiler ve başlıkta küçük mavi vurgu eklendi. Başlık, açıklama ve alanlar 480px sınırında tek form kartında toplandı; görünür alan kenarları, odakta mavi vurgu ve tek ana düğme korunur. Kayıt ve parola yenileme metin bağlantılarıyla açılır. Mevcut marka yapılandırması ve ortak renk rolleri kullanılır; yeni görsel bağımlılık eklenmedi. Giriş düğmesi 320/390px telefon görünümünde ilk ekrana sığar; yatay ekranda form kaydırılabilir. Parola göster/gizle kontrolü 44×44px hedefe sahiptir. Otomatik doldurma ipuçları e-posta / mevcut parola / yeni parola olarak ayrılır; gönderim sırasında alanlar salt okunur, görünürlük ve yön değiştiren bağlantılar devre dışıdır. Kayıt/parola yenileme API işlemleri, sunucu doğrulaması ve SecureStore oturumu korunur.

Son görsel düzenlemeden sonra strict TypeScript, 25 mobil birim testi ve 20 mobil Chromium E2E tek koşumda geçti. Senaryolar açık/koyu 320/390/834px ve yatay yerleşimi, parola görünürlüğünü, gerçek PostgreSQL/API ile kayıt doğrulaması/kayıt oluşturmayı, parola yenilemeyi ve gönderim kilidini kapsar; yalnız `oggaq_test` veritabanı kullanıldı. Açık 320px ve koyu 390px ekran görüntüleri görsel olarak incelendi. iOS/Android Hermes ve web export başarılıdır.

Device Hub iPhone 18 Pro / Expo Go üzerinde açık temada güncel giriş, kayıt ve parola yenileme formları ile uzun kayıt formunun kaydırılması incelendi. Güncel formdan sunucu API'siyle mevcut sentetik öğrenci girişi doğrulandı; simülatör önceki açık tema ve Tekrar ekranına geri getirildi. Web QA görüntüleri `artifacts/mobile-preview/redesign/auth-*`, güncel native görüntüler ve üç platform export'u `artifacts/auth-refinement/` içinde git dışındadır. Fiziksel Android/iPhone ve gerçek parola yöneticisiyle otomatik doldurma bu değişiklikte ayrıca test edilmedi. Sunucudaki web/admin arayüzleri bu mobil düzenlemede değiştirilmedi; önceki audit bulgusu devam eder.

## 24 Ekim 2026: Mağaza hazırlığı (simge, derleme, yasal bağlantılar)

- **Simgeler (25 Ekim güncellemesi):** Kullanıcının son seçtiği, yıldız/ay-yıldız ve ÖGG SOR yazılı Ogg Sor logosu `config/assets/oggsor-logo.png` kaynağından `node apps/mobile/scripts/generate-icons.mjs` ile üretilir. `icon.png` opak 1024×1024 RGB, `adaptive-icon.png` saydam ve Android güvenli alanına sığar; `splash-icon.png`, `favicon.png` ve 256 px `brand-logo.png` aynı kaynaktan gelir. Giriş, uygulama yükleme ekranı, üst başlık ve menü gerçek logoyu gösterir. Ana ekran simgesi ve native açılış görseli yeni paket kurulunca değişir.
- **`app.config.ts`:** `icon`, `android.adaptiveIcon` (arka plan lacivert), `web.favicon`, `ios.buildNumber`, `android.versionCode`, `ios.infoPlist.ITSAppUsesNonExemptEncryption=false` (yalnızca HTTPS ve sistem anahtar zinciri; `expo-crypto` yalnızca rastgele kimlik üretir), `android.blockedPermissions` (şablonun eklediği `READ/WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`), `expo-secure-store` için `faceIDPermission: false` (biyometrik koruma kullanılmıyor). Uygulama adı `brand.displayName` (**ÖGG SOR - Soru Bankası**). Android/iOS paket kimliği `config/brand.json` içindeki `bundleIdentifier` (**`net.codentum.oggsor`**) alanından gelir; bilinçli ayrı test paketleri için `OGGAQ_BUNDLE_ID` profil değişkeni kullanılabilir. Geçici bir klasörde `expo prebuild` çalıştırılarak Android manifesti (yalnızca `INTERNET` ve `VIBRATE`) ve iOS `Info.plist` (kullanım açıklaması yok) gözle kontrol edildi.
- **Yerel açılış ekranı yok:** SDK 58'de `splash` anahtarı yoktur, `expo-splash-screen` kurulu değildir (paket eklemek onay ister); görsel `splash-icon.png` hazır.
- **`eas.json`:** `development`, `preview` (içeride dağıtım, APK) ve `production` (`autoIncrement`); üretim adresleri yer tutucudur. EAS çalıştırılmadı; Expo hesabı gerekir.
- **Yasal bağlantılar:** Profil → "Yasal ve destek" (Gizlilik, Koşullar, Destek, Hesap silme; "resmî kurum değildir" notu; `brand.json`'da `supportEmail` doluysa e-posta) ve giriş/kayıt ekranının altında; kayıt formunda "Kayıt olarak … kabul edersin" bildirimi (onay kaydı tutulmaz). Bağlantılar `legalUrl(frontendUrl, …)` ile web kaynağındaki statik sayfaları sistem tarayıcısında açar (`src/legal.tsx`). Puan hesaplama ekranı "Hesaplama bir tahmindir ve resmî sınav sonucu değildir." der.
- Kaynak, adımlar ve engeller: [STORE_RELEASE](STORE_RELEASE.md). Fiziksel iPhone/iPad/Android, Expo Go ve EAS derlemesi denenmedi.

## Mobil tasarım ve gezinme

10 Ekim 2026 mobil arayüzü telefon uygulaması olarak yenilendi. `apps/web` ve `apps/admin` masaüstü arayüzlerinden bağımsızdır; ortak API istemcisi ve iş kuralları korunur. Renkler `src/theme.ts`, bileşenler `src/ui.tsx`, marka başlığı `brand.json` içindedir.

- Renk sistemi artık [design-tokens](../packages/design-tokens/src/index.ts) paketindendir ve açık/koyu iki palettir ([DESIGN](DESIGN.md)): lacivert marka/ana sayfa başlığı, mavi eylem ve seçim, soğuk beyaz `paper` zemin, `surface` kartlar ve mat altın küçük vurgu. Bileşenler renk kodu değil rol adı kullanır (`surface`, `ink`, `primary`, `onPrimary`, `softRed` …); `src/` içinde renk kodu yoktur, yalnız `theme.ts` paletleri paketten alır. Güncel ölçüler: yan boşluk ve kart iç boşluğu telefonda 14px, ana metin 17px / 27px satır aralığı.
- Sabit üst çubuktaki menü düğmesi soldan açılan native Modal panelini gösterir. Menü; ana sayfa, deneme sınavları, ders sınavları, sonuçlarım, tekrar listelerim, başarı durumum, profil, gerçek kişisel/kurum alanları ve API üzerinden çıkışa bağlanır. Seçili bölüm/alan belirtilir; alan değişimi mevcut gezinme sıfırlamasını kullanır. Panel kaydırılabilir; güvenli alan ve sabit çıkış bölümü dar/yatay ekranlarda korunur. Dışarı dokunma, kapatma düğmesi, sola sürükleme, Android geri, VoiceOver escape ve web önizlemede Escape kapanışı uygulanır. Sistem hareket azaltma tercihi gözetilir; açılış tercihi bilinmeden animasyon başlatılmaz. Açıkken alttaki ekran erişilebilirlik ağacından gizlenir; web Modal odağı panelde tutup kapanışta geri verir. Soru/deneme ayrıntıları mevcut geri gezinmesini korur.
- Alt gezinme: Ana sayfa, Deneme, Ders, Sonuçlar ve Profil. Cihaz/işlem kimlikleri `src/ids.ts` içindeki `newId()` ile üretilir: web önizlemesi düz HTTP LAN adresinde (`http://192.168.x.x`) açıldığında `crypto.randomUUID` yoktur, rastgele baytlardan v4 UUID kurulur. **Soru bankası yoktur**: öğrenci yalnız iki sınav türüne girer (Deneme Sınavı = tam sınav, Ders Sınavı = bir dersin sınavı). Deneme sekmesi silahlı/silahsız ayrımıyla sınavları, Ders sekmesi dersi bir düğme + alttan açılan listeyle seçtirip (11 uzun ders adı tek satırlık seçim çubuğuna sığmaz) o dersin sınavlarını listeler; her sınav önceki sonucunu gösterir, “Sınava gir” süre sorar (önerilen: silahlı 150, silahsız 120 dk — EGM sınav talimatı 4.3; ders sınavı 1,2 dk/soru) ve açık denemede “Devam et” sunar. Tekrar ve Başarım ana sayfa/menüden açılır; tekrar listesindeki soru tek soru çalışması olarak çözülür. Seçili sekme, tekrar dokunarak başa kaydırma, güvenli alan ve klavye açıkken sekmeleri gizleme uygulanır.
- Ana sayfa: kişisel karşılama, “Sınava gir”, Deneme sınavları / Ders sınavları / Tekrar sınavı / Başarı durumum kısayolları, gerçek ders kataloğu (ders sınavlarına gider), son üç sınav ve devam eden sınav. Toplam başarı/günlük seri gibi API’de olmayan sayılar gösterilmez.
- Ders/konu filtreleri, soru dizini ve bitirme onayı alttan açılan panellerdir. Katalog ve geçmiş sayfalaması korunur. Soru/deneme ayrıntılarında alt sekmeler gizlenir; cevaplama/soru geçişi kontrolleri ekranın altında sabit kalır.
- Ayrıntılar [React Navigation native stack](https://reactnavigation.org/docs/native-stack-navigator/) ile açılır; iOS kenardan geri hareketi ve Android geri düğmesi desteklenir. Android’de ana sekmelerin geri hareketi Ana sayfa’ya döner. Güvenli alan, soru/cevap durumları ve sunucuya dayalı süre/değerlendirme korunur.
- Sonuçlar sekmesi girilen tüm sınavları (devam eden ve tamamlanan) listeler. Profilde hesap bilgileri, kişisel/kurum alanı ve çıkış bulunur. Alan değişimi gezinmeyi sıfırlar; diğer alandaki geçmiş gösterilmez.
- İkonlar [Lucide React Native](https://lucide.dev/guide/react-native) / SVG bileşenleridir; tek tek import edilir. Soru listesine döndükten sonra aynı soruyu yeniden çözmek yeni çalışma UUID’si oluşturur. Denemeden dönünce yeni deneme başlatma kilidi kaldırılır; başarısız isteğin tekrarında UUID korunur.

İlk arayüz yenilemesi için 17 mobil birim testi, tüm istemcilerin strict TypeScript kontrolü, 5 gerçek PostgreSQL/API mobil Chromium E2E testi ve Expo Doctor 21/21 geçti. iOS/Android Hermes ve web export ile iki platformun prebuild yapılandırması doğrulandı. Android prebuild `super.onCreate(null)` ve `enableOnBackInvokedCallback=false` üretir. E2E; tekrar soru çözme, cevap/deneme sonucu, filtre panelleri, soru dizini, geçmiş, alan ayrımı, çıkış, boş içerik ve 320/390/834px gezinmeyi kapsar. Ekran görüntüleri `artifacts/mobile-preview/redesign/` içinde git dışındadır. Kullanıcı 10 Ekim 2026’da yeni tasarımın fiziksel iPhone’da Expo Go üzerinden açıldığını doğruladı. Jest, klavye ve arka plan davranışlarının fiziksel cihazda ayrıca doğrulandığına dair teyit yoktur; Chromium görüntüleri bu davranışların kanıtı değildir.

`bb2a237541c4b9085e5e63fdb8c57729d3f69857` için [uygulama/API CI](https://github.com/ninjaBlume/oggaq/actions/runs/38032789048) başarılıdır: 109 backend testi / 584 assertion, 35 Vitest, 27 Chromium E2E, strict tip, web build, mobil export ve Expo Doctor geçti. [Yeni Android/iOS native paket derlemesi](https://github.com/ninjaBlume/oggaq/actions/runs/38032789058) ve bu derlemenin paketleriyle [Android emülatörü / iOS Simulator açılış kontrolleri](https://github.com/ninjaBlume/oggaq/actions/runs/38033655306) başarılıdır. Açılış kontrolünün workflow commit’i `9eb3bf5` olsa da indirilen paketler `38032789058` numaralı `bb2a237` derlemesindendir; önceki native artifact hashleri aşağıda ayrı tutulur. Güncel iOS Expo Go JavaScript paketi geçici HTTPS geçidinden doğrulandı ve Safari düğmesine bağlandı; fiziksel Expo Go paketi indirdikten sonra API giriş/veri istekleri başarılı döndü. Kullanıcı yeni tasarımın geldiğini ve uygulamayı artık doğrudan Expo Go üzerinden açtığını doğruladı.

Palet/yan menü güncellemesinde strict TypeScript, 17 mobil birim testi, Expo Doctor 21/21, iOS/Android Hermes ve web export geçti. Güncel 9 mobil Chromium E2E; önceki çalışma akışlarına ek olarak tüm menü hedeflerini, seçili bölümü, klavye odağını, kapanış yollarını, 320/390/834px ve yatay ekran yerleşimini, çalışma alanı izolasyonunu ve çıkış tokenının API’de iptalini kapsar. Çıkış isteği başarısız olduğunda giriş ekranına geçilmediği ve tekrar denemeyle gerçek API çıkışının tamamlandığı da kontrol edilir. Ana renk çiftlerinde hesaplanan kontrast oranları: beyaz/petrol 5.47:1, füme/kırık beyaz 13.46:1, gri/beyaz 4.97:1, altın/lacivert 6.41:1, başarı/açık yeşil 4.78:1, hata/açık kırmızı 4.95:1. Bu ölçümler tüm erişilebilirlik davranışlarının test edildiği anlamına gelmez. Fiziksel iPhone’da bu yeni palet ve yan menünün görünüm/jest teyidi henüz yoktur; önceki iPhone teyidi ilk tasarıma aittir. Güncel Expo Go JavaScript paketi yeni menü etiketleri, renkleri ve korunmuş API yolu ile mevcut geçici HTTPS geçidinden doğrulandı; `2a3dcc0` palet/menü sürümünün [uygulama/API CI](https://github.com/ninjaBlume/oggaq/actions/runs/38035763073), [Android/iOS paket derlemesi](https://github.com/ninjaBlume/oggaq/actions/runs/38035763116) ve [emülatör/Simulator açılış kontrolü](https://github.com/ninjaBlume/oggaq/actions/runs/38036664235) başarılıdır.

## Material 3 Expressive uyarlaması

10 Ekim 2026: mobil tasarım, OGGAQ renkleri ve sistem yazı tipleriyle Material 3 Expressive yaklaşımına uyarlandı. Özel React Native bileşenleridir; Android Compose Material kütüphanesi kullanılmaz ve bütün Material bileşenlerinin uygulanmış olduğu iddia edilmez. Masaüstü arayüzü ayrı kalır.

- `src/theme.ts` paketten gelen paletleri, 8/16/24/32px ve kapsül şekilleri, başlık/metin ölçeğini ve yay hareketlerini merkezileştirir; `primaryContainer` / `onPrimaryContainer` ve `secondaryContainer` / `onSecondaryContainer` açık renkli eylem yüzeylerini tanımlar.
- `src/expressive.tsx` ortak eylemlerde basışla 16px → 12px köşe değişimi ve hafif ölçek tepkisi uygular. Giriş/kayıt, soru/deneme geçmişi ve soru sayısı bağlı seçim gruplarıdır: dış köşeler 22px, iç köşeler 6px; seçili düğme kapsüle dönüşür, dolgu, onay ikonu ve erişilebilir seçili durumuyla belirtilir. Güncel mobil yoğunlukta standart düğmeler en az 48px, seçimler en az 44px yüksekliğindedir.
- Ana sayfada daha büyük tipografi, farklı köşeli lacivert başlık ve açık renkli hızlı eylemler bulunur. Ana sayfa ve gerçek deneme sonucu için küçük dilimli SVG rozetleri kodla çizilir; skor API’den gelir. Alt sekme göstergesi ve yan menü aynı şekil/hareket dilini kullanır. Soru ve deneme sırasında seçenekler yer değiştirmez veya ölçeklenmez; seçimin harf rozeti kısa bir şekil tepkisi verir, doğru/yanlış metni ve ikonları korunur.
- Hareketler [resmî AndroidX ExpressiveMotionTokens v0_14_0](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt) yay değerlerinden uyarlanır: hızlı uzamsal sertlik 800 / sönüm oranı 0.6, varsayılan uzamsal 380 / 0.8, hızlı görsel etki 1600 / 1. React Native için kütle 1 ve `damping = 2 × dampingRatio × sqrt(stiffness × mass)` kullanılır. Yerel platformlarda Animated native driver, web QA’da JS driver çalışır.
- `src/motion.tsx` sistemin hareket azaltma tercihini bir kez dinleyen ortak sağlayıcıdır. Tercih okunana kadar hareket kapalıdır; geciken ilk okuma daha yeni sistem olayını ezmez. Basış/seçim hareketleri uygulama açıkken tercih değişimine uyar. Okuma başarısızsa hareket kapalı kalır. Yan menü açılışında panel/scrim sınırları yay taşmasına karşı kısıtlanır.

Strict TypeScript, 17 mobil birim testi, Expo Doctor 21/21 ve iOS/Android Hermes + web export geçti. Gerçek PostgreSQL/API ile 11 mobil Chromium E2E geçti: mevcut 9 çalışma/menü testine basış geri bildiriminin eylemi bozmaması, soru sayısı seçimi, 320/390/834px yerleşim ve canlı hareket azaltma tercihi eklendi. Ekran görüntüleri giriş animasyonu son durumuna ulaştıktan sonra alınır. Mevcut geçici HTTPS geçidinden indirilen iOS Expo Go UTF-8 JavaScript paketinde yeni başlık, renk rolleri, Expressive bileşenler ve korunmuş API taban yolu doğrulandı. Bu sürümün fiziksel iPhone animasyon/jest teyidi ve yeni native paket CI sonucu henüz yoktur; önceki başarılı native derlemeler yukarıdaki commit’lere aittir.

## Koyu mod, pencere sınıfları ve tablet

Kurallar ve nedenleri [DESIGN](DESIGN.md) içindedir; burada mobil uygulamada nasıl uygulandığı ve neyin doğrulandığı yazılır.

- **Tema sistemi:** `src/themeContext.tsx` `ThemeProvider` ve `useTheme()` sağlar (`palette`, paylaşılan `styles`, `scheme`, `preference`, `setPreference`). Renk kullanan her bileşen rengi `useTheme()` ile okur; tema değişince açık ekranlar yerinde yeniden çizilir, sınav/form durumu ve gezinme konumu kaybolmaz (NavigationContainer yeniden kurulmaz). `src/styles.ts` paylaşılan stilleri palet başına bir kez üretir. Sistem teması `useColorScheme` ile izlenir; `app.config.ts` içindeki `userInterfaceStyle` bunun için `automatic` yapıldı. Durum çubuğu, React Navigation teması, alttan paneller, giriş alanları (`keyboardAppearance`, yer tutucu rengi) ve kök arka plan (`expo-system-ui`) temayı izler.
- **Tercih:** Profil → Görünüm: Cihaz ayarı / Açık (ilk kurulum varsayılanı) / Koyu. Yazı boyutu varsayılanı Standart'tır. Önceki kullanıcı tercihleri korunur. Seçim yalnız kullanıcı değiştirdiğinde saklanır, uygulama açılışında hiçbir şey yazılmaz: native’de `expo-secure-store` içinde gizli olmayan `oggaq.theme` anahtarı, web önizlemesinde `localStorage` (oturum bilgisi web önizlemesinde yine hiçbir yere yazılmaz; “localStorage boş” testi normal girişte değişmeden geçer). Okunamayan depo varsayılan Açık görünümü korur; yazma hatasında seçim o oturumda geçerli kalır.
- **Pencere sınıfları** (`src/layout.ts`, pencere genişliğine göre, cihaz türüne göre değil): compact < 600, medium 600–839, expanded ≥ 840 px. Compact: alt sekmeler, tek sütun, 14px yan boşluk. Medium: 80px sol gezinme rayı (simge + kısa ad; sekmelerle aynı `tab` rolü ve adları), 24px yan boşluk, içerik 720px okuma sütunu. Expanded: ray, 32px yan boşluk, içerik en çok 1120px; bağımsız öğeler (ana sayfa kısayolları, ders kutuları, sınav ve sonuç kartları, ders istatistikleri) iki sütunda; sınav çözmede soru sütunu (en çok 720px) yanında soru haritası, kalan süre, cevaplanan sayısı ve “Denemeyi bitir” düğmesi olan 320px yan panel. Form ekranları (Profil, Tekrar) ve alttan paneller okuma genişliğinde kalır. Cevap/süre davranışı pencere sınıfından etkilenmez.
- **Sözlük ve skor:** sekmeler/ray `vocabulary.*.short`, başlık ve yan menü `vocabulary.*.title` kullanır (Ana sayfa, Deneme/Deneme sınavları, Ders/Ders sınavları, Sonuçlar/Sonuçlarım, Tekrar/Tekrar sınavı, Başarım/Başarı durumum, Profil). Sonuç kartlarındaki ve son sınavlar listesindeki skor tonu `scoreBand` ile belirlenir (%60 altı kırmızı, %60–79 mavi, %80+ yeşil); “geçti/kaldı” denmez.

Doğrulama: strict TypeScript, 23 mobil birim testi (yeni: pencere sınıfı/yerleşim ve skor tonu) geçti; web önizleme export’u çalıştı; Chromium ile 320/390/600/834/1024/1280 px ve 844×390 yatay boyutta, açık ve koyu temada ana sayfa, deneme, ders, sonuçlar, başarı, tekrar, profil, sınav ve yan menü ekranları açılıp ekran görüntüleri incelendi; yatay taşma ölçüldü, yoktur. Bu ekranlarda API yanıtları (sonuç listesi, istatistik, sınav) örnek veriyle taklit edilerek çizildi. Fiziksel iPhone/iPad/Android tablet ve Expo Go üzerinde koyu mod, tema değişiminde durum korunması, ray ve iki panelli sınav ekranı doğrulanmadı; Chromium görüntüleri bunun kanıtı değildir.

## Tekrar, başarı ve çıkmış sınav

Alt sekme çubuğu beş ana sekmede kalır. Ana sayfada Tekrar ve Başarım karoları bulunur (Başarım karosu mevcut doğruluk yüzdesini gösterir; istatistik alınamazsa yalnızca ipucu gizlenir). Yan menüde ek olarak `Tekrar sınavı` ve `Başarı durumum` bulunur. Tekrar bir sınavdır: Yanlışlarım, Boş bıraktıklarım ve Favorilerim listelerinin soru sayısı gösterilir, öğrenci soru sayısı ve süreyle o listeden süreli sınav başlatır; tek soru gezme/çözme yoktur. Favori ekleme/çıkarma sınav sonucu ekranındadır. Deneme ve Ders sekmelerinde yalnız yayımlanmış çıkmış sınavlar (orijinal sırayla) başlatılır. API ayrıntıları [STUDY](STUDY.md#tekrar-listeleri-favoriler-ve-istatistik) ve [EXAMS](EXAMS.md) içindedir. Doğrulama: Expo web export üzerinde Chromium E2E (`mobile.spec.ts` yeni senaryo), strict tip ve 17 birim testi geçti; native paket derlemesi ve fiziksel cihaz bu değişiklik için yeniden denenmedi.

**Soruyu bildir:** biten denemenin sonucunda her sorunun geri bildirim kutusunda “Soruyu bildir” düğmesi vardır (süre işlerken yoktur). Düğme alt panel açar: neden için beş seçenekli radyo listesi (`reportReasons`, [study-core](../packages/study-core/src/index.ts)), en çok 500 karakterlik isteğe bağlı not (çok satırlı `Field`, sayaç) ve “Bildirimi gönder”. Başarıda “Bildirimin alındı, teşekkürler.” gösterilir ve düğme “Bildirdin” olur; durum sunucudaki `reported` alanından gelir. Hata `ErrorNotice` ile yeniden denenir. Kaynak: `src/report.tsx`; kural ve gizlilik [QUESTION_BANK](QUESTION_BANK.md#soru-bildirimleri) içindedir. Chromium E2E ile doğrulandı; fiziksel cihazda ve klavyenin alt panelle davranışı denenmedi.

## Çalıştırma

Node 24 ve yerel API/servisleri hazırlayın. Kökte `npm ci --ignore-scripts` ardından `npm run security:prepare`; `npm run dev:mobile` Expo'yu loopback'te açar. Xcode bulunan Mac'te `npm run ios --workspace @oggaq/mobile`; Android SDK/JDK ile `npm run android --workspace @oggaq/mobile`. [Expo yerel geliştirme](https://docs.expo.dev/guides/local-app-development/) gerekli araçları açıklar. [SDK matrisi](https://docs.expo.dev/versions/latest/) SDK 57 için Xcode 26.4+, iOS 16.4+, Android 7+ ve compile/target SDK 36 belirtir.

`apps/mobile/.env.example` kopyalanabilir; gerçek `.env` git dışındadır. iOS Simulator API `http://127.0.0.1:8000`, Android emülatörü `http://10.0.2.2:8000` kullanır. Fiziksel cihazdaki bağımsız release paketi için erişilebilir HTTPS API ve `EXPO_PUBLIC_WEB_URL` gerekir. Expo Go geliştirme testi aynı yerel ağda HTTP API kullanabilir; aşağıdaki kurulum bu geliştirme yoludur. Bu adreste backend ayrıca çalışmalı; sunucu LAN'a otomatik açılmaz. `EXPO_PUBLIC_*` ayarları paketin içinde herkes tarafından okunabilir; token/parola içermez.

API taban adresi reverse proxy yolunu içerebilir: `https://example.test/preview/backend` yapılandırması `/api/v1/me` isteğini `/preview/backend/api/v1/me` yoluna gönderir. İstemci `/api/v1` yollarını kendisi ekler; taban adrese bu uçları eklemeyin. Sondaki eğik çizgiler kaldırılır; URL içinde kullanıcı bilgisi, sorgu veya fragment kabul edilmez. Release için HTTPS zorunluluğu korunur.

Normal release paketi HTTPS gerektirir. CI yerel önizlemesi `EXPO_PUBLIC_LOCAL_PREVIEW=1` ile yalnız localhost/127.0.0.1/10.0.2.2 hedeflerine izin verir; Android manifestinde HTTP erişimi, iOS'ta local networking açılır. Bu APK mağaza/üretim paketi değildir. Native klasörler `expo prebuild` ile kilitli bağımlılıklardan üretilir; git dışındadır.

## iPhone'da aynı Wi-Fi üzerinden geliştirme testi

iPhone'a [Expo Go](https://apps.apple.com/app/expo-go/id982107779) kurun. Mac ve iPhone aynı yerel ağda olmalı. Fiziksel iOS cihazında [Expo CLI ve Expo Go aynı Expo hesabına giriş ister](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/). Mac'te `apps/mobile` içinde Node 24 ile `npx expo login`; telefonda Expo Go'nun hesap ekranında aynı Expo hesabına giriş yapın. Expo oturumu geliştirme aracına aittir; uygulamadaki kullanıcı oturumu OGGAQ API'si tarafından doğrulanır. Expo CLI oturumu sunucu açıkken açılabilir; telefonda yeniden deneyin.

Mac'in Wi-Fi IPv4 adresini `ipconfig getifaddr en1` ile bulun; aktif Wi-Fi arayüzü farklıysa onu kullanın. Aşağıdaki `192.168.1.20` yalnız örnektir; kendi Mac adresinizle değiştirin. `apps/mobile/.env.local` git dışındadır:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:8002
EXPO_PUBLIC_WEB_URL=http://192.168.1.20:5175
EXPO_PUBLIC_LOCAL_PREVIEW=0
```

Yerel PostgreSQL/Redis açıkken ayrı terminallerde, PHP 8.4 ve Node 24 PATH'e seçilerek:

```sh
# backend/ içinde; yalnız özel ağ arayüzüne bağlanır.
APP_DEBUG=false APP_URL=http://192.168.1.20:8002 FRONTEND_URL=http://192.168.1.20:5175 SANCTUM_STATEFUL_DOMAINS=192.168.1.20:5175 php artisan serve --host=192.168.1.20 --port=8002 --tries=1 --no-reload

# apps/web/ içinde; telefon tarayıcısı ve mobilde web bağlantıları için.
VITE_API_URL=http://192.168.1.20:8002 npx vite --host 192.168.1.20 --port 5175 --strictPort

# apps/mobile/ içinde.
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.20 npx expo start --go --lan --port 8081
```

Kamerayla Expo QR kodunu tarayıp Expo Go'da açın; iOS yerel ağ iznini istiyorsa verin. API bağlantısını iPhone Safari'de `http://192.168.1.20:8002/up` ile kontrol edebilirsiniz. Uygulamada mevcut doğrulanmış hesabınızla giriş yapın. Mac açık ve bu üç terminal çalışır durumda kalmalıdır; durdurmak için her terminalde Ctrl+C. Wi-Fi/IP değişirse yerel adresleri güncelleyip Expo'yu yeniden başlatın. Bu geliştirme erişimi TestFlight/App Store dağıtımı değildir. Bildirim e-postaları yerel Mailpit'e gider; mevcut loopback Horizon worker'ının e-posta bağlantıları Mac tarayıcısında açılır.

9 Ekim 2026 yerel hazırlığında özel ağ üzerinden API/web erişimi, mobil login endpoint validation, web origin CORS, iOS Expo manifesti, LAN adresleri gömülü native geliştirme bundle'ı ve QR çözümleme kontrol edildi. Fiziksel iPhone'da açma, giriş ve yeniden açılış kontrolü kullanıcının Expo oturumu ve cihaz erişimiyle ayrıca doğrulanmalıdır.

### Telefon yerel sunucuya ulaşamıyorsa

Önce iPhone Safari'de `http://MAC_IP:8081/status` açılmalı ve `packager-status:running` görülmelidir. API için `http://MAC_IP:8002/up` ayrıca kontrol edilir. Mac'in kendi adresine yaptığı başarılı istek, telefon bağlantısını doğrulamaz. Aynı Wi-Fi adı ve aynı IP aralığı da erişimi garanti etmez; misafir ağı/cihaz izolasyonu veya VPN yerel bağlantıyı engelleyebilir. Expo Go için [Yerel Ağ iznini](https://support.apple.com/en-gb/102229) kontrol edin.

[Expo tüneli](https://docs.expo.dev/more/expo-cli/#tunneling) geliştirme paketini taşır; API'yi kendiliğinden erişilebilir yapmaz. Yerel bağlantı engelliyse mobil paketin API ayarı da erişilebilir HTTPS adresine yönelmelidir. [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) geçici bir HTTPS adresi sağlayabilir; tünel süreci kapanınca adres çalışmaz. Yerel geliştirme API'sini doğrudan herkese açmayın; önizleme erişimini ayrıca sınırlandırın.

10 Ekim 2026 bu cihazdaki LAN bağlantısı Safari'de başarısız kaldı. Geçici HTTPS önizlemesi rastgele erişim anahtarı isteyen bir geçit üzerinden hazırlandı; anahtarsız uygulama/API erişimi, yönetici API yolları ve yol geçişi reddedildi. Anahtarsız bağlantı testi yalnız sabit bir metin döndürür; bu HTTPS testi iPhone Safari'de başarılı oldu ve geçitte `200` yanıtı görüldü. Expo manifestinin hesap bilgisi ve iOS JavaScript paketinin HTTPS API ayarı kontrol edildi; paket HTTPS üzerinden indirildi, kimliksiz API isteği `401`, eksik giriş isteği `422` döndü. Expo Go önizlemesinde bytecode yerine UTF-8 JavaScript ve tek paket kullanıldı; QR kodu çözülerek adresi doğrulandı. Tünel, geçit, anahtar ve QR dosyaları `artifacts/iphone-preview/https/` içinde git dışındadır; normal `.env.local` LAN ayarı korunur. Bu erişim App Store/TestFlight dağıtımı değildir.

Safari açılış sayfasındaki “Expo Go’da aç” düğmesiyle fiziksel iPhone Expo Go manifest ve JavaScript paketini indirdi (`200`). Kullanıcı giriş ekranını gördüğünü bildirdi; ardından uygulama API taban adresinin geçit yolunu reddeden bir JS hatası gösterdi. `validateApiUrl` HTTPS taban yolunu koruyacak şekilde düzeltildi. 17 mobil test ve strict TypeScript kontrolü geçti; HTTPS üzerinden yeniden indirilen minify paketteki gerçek doğrulama fonksiyonu geçici API adresiyle ayrıca çalıştırıldı. HTTP, kullanıcı bilgisi, sorgu ve fragment reddi korundu. Safari düğmesi yenilenen pakete yönlendirildi. Kullanıcı düzeltme sonrası fiziksel iPhone’da OGGAQ hesabıyla giriş yaptığını ve uygulamanın açıldığını doğruladı. Aynı zaman aralığında geçitte Expo istemcisinden API için bir `201` ve ardından başarılı `200` yanıtları görüldü. Oturumun uygulama kapatılıp yeniden açıldığında korunması, arka plan davranışı ve gerçek içerikle soru/deneme akışları bu doğrulama kapsamında henüz test edilmedi.

Fiziksel iPhone’daki ilk çıkış denemesinde geçit `413` döndürdü: boş POST isteğinin `Transfer-Encoding: chunked` çerçevesi geçit tarafından reddediliyordu. Geçit artık `scripts/preview_http_body.py` ile chunked veya Content-Length gövdelerini en fazla 64 KiB olacak şekilde okur; belirsiz/bozuk çerçeve, fazla chunk ve trailer reddedilir, okuma zaman aşımı uygulanır. Dokuz regresyon testi `python3 -m unittest discover -s scripts -p test_preview_http_body.py -v` ile geçer ve CI’a eklendi. Boş chunked çıkış isteğinin yerel geçit ve gerçek HTTPS tüneli üzerinden kimliksiz API’ye ulaşıp JSON `401` döndürmesi doğrulandı; yönetici/anahtarsız yolların engeli korundu. PostgreSQL test veritabanında mevcut mobil çıkış testi de geçti (1 test, 3 assertion): yalnız ilgili token iptal edilir. Geçit yeniden başlatıldı; bu düzeltme için mobil paketin yeniden yüklenmesi gerekmez. Kullanıcı düzeltme sonrası fiziksel iPhone’da çıkışın başarılı olduğunu ve giriş ekranına döndüğünü doğruladı.

## Oturum ve e-posta

Mobil `/auth/mobile-tokens` cihaz UUID'siyle finite Bearer token verir. Token/expiry ve cihaz kimliği native [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) içindedir; parola tutulmaz. Yeniden açılışta kayıt yüklenir ve `/me` doğrulanır; 401/aktif olmayan hesap ekranları kapatır. Logout sunucudaki tokenı iptal eder ve secure kaydı siler. Aynı cihaz girişi eski cihaz tokenını iptal eder; diğer cihazlar bağımsızdır. Eski tokenın gecikmiş 401'i yeni oturumu silemez.

Doğrulama/reset e-postaları mevcut web formuna gider. Doğrulama bağlantısını aynı hesapla tarayıcıda açıp uygulamada kontrol edin. Universal Links/App Links ve native reset formu henüz yoktur; bu adımlar kullanıcıya ekranda anlatılır.

Expo web export yalnız ekran/API QA önizlemesidir; oturum bellekte tutulur, localStorage'a token yazılmaz, sayfa yenileme yeniden giriş ister. Native SecureStore davranışını web testinden geçti saymayın. Üyelik/bağlam değişiminde çalışma ekranı yeniden kurulur; başka kullanıcının geçmişi cache'de tutulmaz. Ağ hatalarında sonuç uydurulmaz; tekrar veya güncel kayıt yükleme sunar.

## Doğrulama ve native paketler

Yerelde strict TypeScript, 17 mobil oturum/URL/HTTP testi, 3 ortak saat testi, iOS/Android Hermes ve web Metro export, native Android/iOS prebuild ve Expo Doctor doğrulandı. Expo ekranları 390px Chromium üzerinde gerçek PostgreSQL/API ile Bearer giriş, tek soru, geçmiş, deneme bitişi, logout ve önizleme yenilemesiyle kontrol edildi. Web ve native davranış kanıtları ayrıdır.

Bu Mac'te tam Xcode, Android SDK ve Java yoktur. `e9148d792ad0fccad0dba352241c0cce628a102f` için [GitHub Actions native derlemesi](https://github.com/ninjaBlume/oggaq/actions/runs/37895000973) Android ve iOS işlerinde başarılıdır; iki artifact indirildi. Android paketi Metro/Hermes kodu gömülü, debug keystore ile imzalı yerel önizleme APK'sıdır. iOS paketi Xcode'un ad hoc imzaladığı `.app` ZIP'idir; iPhone'a yüklenen IPA değildir. Xcode Simulator yetkilerini derleme sırasında yürütülebilir dosyaya gömer; sonradan `codesign --entitlements` uygulamak bunun yerine geçmez. Simulator kimliği/imzası Apple üretim sertifikası yerine geçmez.

| Paket | Boyut (byte) | SHA-256 |
| --- | ---: | --- |
| `app-release.apk` | 42262862 | `bd615c5e76187330cab4bdc39e226dc2e30937232b1fc2afc630c1e8c10b71b2` |
| `oggaq-ios-simulator.zip` | 14464425 | `6d907a0816a47feda2a3118ec8dd23c92930315213bbe39e63f3a81c90cb82d4` |

[Native açılış kontrolü](https://github.com/ninjaBlume/oggaq/actions/runs/37895502143) Android ve iOS işlerinde başarılıdır. APK Android emülatörüne, `.app` iPhone Simulator'a yüklenip açıldı; iki platformun son ekran görüntüleri indirildi ve hatasız giriş ekranı görüldü. Android accessibility ağacında giriş başlığı, iOS'ta uygulama süreci ayrıca doğrulandı. Yerel önizleme açılışında native SecureStore’a sentetik bir probe değeri yazma, okuma ve silme tamamlandı. Aynı kodun [API/uygulama CI sonucu](https://github.com/ninjaBlume/oggaq/actions/runs/37895000957) da başarılıdır.

Bu kontrol gerçek hesapla native API E2E, tokenın uygulama yeniden açılışında korunması veya fiziksel cihaz/arka plan testi yerine geçmez. App Store/Play Store yayını tamamlanmadı. Üretim imzası, canlı HTTPS API, mağaza metinleri ve gizlilik/hesap silme kapıları ayrıdır.

API adresi düzeltmesini içeren `268607fee5906e11bec79ad9d5925ea1e75bbf09` için [uygulama/API CI](https://github.com/ninjaBlume/oggaq/actions/runs/38030347645), [Android/iOS native paket derlemesi](https://github.com/ninjaBlume/oggaq/actions/runs/38030347637) ve [emülatör/Simulator açılış kontrolü](https://github.com/ninjaBlume/oggaq/actions/runs/38030710699) de başarılıdır. Yukarıdaki artifact boyutları ve hashleri önceki `e9148d7` derlemesine aittir.

## Açık bağımlılık sorunları

9 Ekim 2026 npm audit: Expo derleme zincirinde **15 etkilenen paket**, iki kök high advisory: [braces recursive pattern DoS](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (3.0.3) ve [node-forge signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv) (1.4.0). İncelenen advisory'lerde düzeltilmiş sürüm yayımlanmamış. Bunlar Metro dosya eşleme ve Expo CLI sertifika araçlarında; native uygulamanın auth/HTTPS uygulamasında kullanılmaz. Varsayılan geliştirme sunucusu loopback'tedir; yukarıdaki iPhone testi Metro'yu yerel Wi-Fi ağına açar ve güvenilen geliştirme ağı içindir. OTA kod imzalama yapılandırılmadı. Bu değerlendirme upstream açığın düzeltildiği anlamına gelmez.

`xcode` altındaki UUID 7, desteklenen CJS UUID 11.1.1 override'ıyla düzeltildi ve prebuild tekrar doğrulandı. `npm run audit` bütün audit raporunu okur, sadece belirtilen iki build advisory'sini açık uyarıyla raporlar; yeni advisory veya mobil dışına çıkan bağımlılık exception'ı CI'ı durdurur. Ham `npm audit` şu anda temiz değildir. Düzeltme yayımlandığında override/exception yeniden incelenmeli; üretim öncesi bu iki risk kapatılmalı.

## Hesabım (hesap yaşam döngüsü)

Profil → **Hesabım** kartı yığında yeni bir ekran açar (`src/account.tsx`): e-posta ve parola değiştirme, cihazlar ve oturumlar (opak kimlikli liste, “Bu cihaz” işareti, tek tek ve toplu çıkış), veri dışa aktarma ve hesap silme. Her işlem mevcut parolayı ister; silme ayrıca “HESABIMI SİL” yazısını ister ve ardından uygulama içi onay ekranına geçer (App Store uygulama içi silmeyi şart koşar; politika metni resmî kaynaktan ayrıca doğrulanmalıdır). Dışa aktarma native'de `Share.share` ile JSON metnini sistem paylaşım sayfasına verir, web önizlemede Blob indirmesi kullanır. Yedek ve yasal metin kararları [PRIVACY](PRIVACY.md) içindedir. Doğrulama: Chromium'da web önizleme (cihaz listesi, silme akışı, koyu mod); fiziksel iPhone/Android, Expo Go ve paylaşım sayfası denenmedi.

## 24 Ekim 2026: Sınava son sorudan devam

Sınav ekranı yeniden açılınca indis 0'a dönmesi düzeltildi. Web ile ortak `resumeQuestionIndex` ve `ExamPositionSaver` son görüntülenen soruyu API'den geri yükler; sıralı konum yazımı, kayıt hatası ve yeniden deneme uygulanır. Kaydedilmiş cevaplar korunur, süre uygulama dışında işlemeye devam eder. Yeni oturum/başka cihaz yalnız sunucudaki konum kaydını kullanır; cihaz deposuna yeni öğrenci verisi yazılmaz. Eski sınavlarda konum yoksa ilk cevapsız soru açılır. Ayrıntı ve sınırlar [EXAMS](EXAMS.md#son-sorudan-devam-etme-24-ekim-2026).

## 24 Ekim 2026: Katalog ve cevap trafiği

Deneme ekranı yalnız seçilen silah seçeneğinin tam sınavlarını, Ders ekranı yalnız seçilen dersin sınavlarını sunucudan ister. Ders seçimi için bütün sınavları indirmek yerine katalogdaki yayımlanmış sınav sayıları kullanılır. Merkezi katalog metaverisi en çok 12 anahtarlı, 60 saniyelik bellek cache'inde bağlam+filtre anahtarıyla tutulur; sekmeye geri dönmek aynı kataloğu yeniden indirmez. Kişisel geçmiş, sonuçlar, cevap anahtarları ve kimlik bilgileri bu cache'e girmez. Bağlam/hesap değişimi başka anahtar kullanır. Bu kalıcı çevrimdışı depolama değildir. Başarısız veya iptal edilmiş yükleme saklanmaz; süre dolduğunda yeniden sunucuya gidilir.

Cevap yazmaları küçük kanonik seçim yanıtını kullanır; aynı sabit soru nesneleri korunur. Eski sürüm, bağlam karışması, eksik/tekrarlanan cevap kimliği ve süre dolması kontrolleri ortak modülde test edilir. Kayıt hatası ve başka cihazla çakışma akışları korunur. Tam deneme sonucu yine sunucudan değerlendirilir ve bütün sorular incelenebilir.

## Sınav takvimi

Yan menüde Sınav takvimi vardır; beş ana sekmenin sırası korunur, İş İlanları en altta kalır. Yıl seçimi, Temel/Yenileme çiftleri, eğitim bitişi, resmî kaynak bağlantısı ve güncel/eski/hazır değil durumları gerçek Calendar API'sine bağlıdır. API veriyi saklanan snapshot'tan okur; mobil cihazda kazıma veya zamanlayıcı yoktur. [Takvim işletimi](EXAM_CALENDAR.md).

Ana sayfada Sınava hazırlık kartının hemen altında Sıradaki sınav kartı vardır. Kalan gün sunucudan gelir; tarih/Temel/Yenileme numaraları ve günlük sayaç tek kartta, geniş yazı boyutunda akışla büyür. Kart takvimin ilgili yılını açar. Ziyaret edilmiş ana sayfa arka planda tutulsa bile bu takvim kartı yalnız aktif/ön planda yenilenir.


## Ekran verilerinde bağlantı yenileme (28 Ekim 2026)

Ana sayfa özeti/son sınavlar, sınav listeleri, başarı/tekrar, takvim, iş ilanları/başvurular, puan geçmişi ve cihaz listesi ortak salt okunur kaynak akışını kullanır. İlk okuma ve normal yenileme geçici bağlantı/408/5xx hatasında 800 ms sonra en fazla bir kez tekrar edilir. Başarılı okumaya gecikme eklenmez. 401/403/422/429 ve beklenmeyen uygulama hataları bu yolla tekrar edilmez veya gizlenmez.

Yenileme sürerken yüklenmiş içerik korunur. İki okuma da bağlantı nedeniyle başarısızsa önceden yüklenen veri ekranda kalır; kalıcı kesinti nötr “Bağlantı yenilenemedi” bilgisi ve yeniden deneme eylemiyle belirtilir. İlk yükleme de başarısızsa veri uydurulmaz. Yetki/doğrulama ve yazma hataları normal hata akışında kalır. Kırmızı hata alanını yalnızca zamanlayarak saklayan bir çözüm kullanılmaz.

Arka plana geçiş devam eden okumayı iptal eder; dönüşte yalnız görünür/odaktaki ekran yenilenir. Eski iptal edilmiş isteğin cevabı yeni okumaya hata ekleyemez. Bağlam/hesap/sayfalama değişiminde önceki kaynak verisi temizlenir. Bu yalnız mevcut ekranın bellek durumu olup kalıcı çevrimdışı soru/cevap deposu değildir.

Oturum/bağlam yenilemesi ve sınav ekranının kendi yaşam döngüsü korunur. Sınavın 15 saniyelik durum okuması arka planda başlamaz; periyodik okuma kontrollü tek istek olarak kalır, ön plana dönüşte bir kez okuma kurtarma uygulanır. Cevap, soru konumu, süre ve bitirme yazmaları otomatik yeniden gönderilmez; mevcut idempotent tekrar/uzlaştırma akışları korunur.
