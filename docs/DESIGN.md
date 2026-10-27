# Tasarım ilkeleri

Durum: Bu belge web, yönetim paneli ve mobil uygulamanın ortak görsel ve etkileşim kuralını tanımlar. Marka ÖGG SOR - Soru Bankası’dır; mevcut mavi palet korunur. Yapı (rol, kontrast, koyu mod, pencere sınıfları) markadan bağımsızdır. Kod değerleri [packages/design-tokens](../packages/design-tokens/src/index.ts) içindedir; bu belge değerleri değil, kuralları ve nedenlerini anlatır.

## 1. Ürün ilkeleri

1. **İki sınav kategorisi vardır:** Deneme Sınavı (tüm sınav) ve Ders Sınavı (bir dersin sınavı). Deneme ekranında ayrıca Temel eğitim/Yenileme eğitimi ve bağımsız silahlı/silahsız seçilir. Ders sınavları ortak listede kalır; eğitim türü seçimi gösterilmez. Soru bankası veya tek soru alıştırması ayrı menü öğesi değildir. Tekrar da bir sınavdır.
2. **Yönetim sınav bazlıdır:** sorular sınavın içinde, alt alta ve yerinde düzenlenir. Soru bazlı liste yoktur.
3. **Üç uygulama aynı yapıdadır:** aynı sözlük, aynı sınav türleri, aynı sıra. Platformun doğal gezinmesi korunur; native bileşenler HTML/CSS ile taklit edilmez.
4. **Çalışma ekranı sakin, özet ekranı ifadelidir:** soru ve sınav ekranında seçenekler yer değiştirmez, ölçeklenmez, süsleme yoktur. Ana sayfa ve sonuç ekranı daha belirgin olabilir.
5. **Süreli sınav kesintisiz akar:** sınav sırasında reklam, tanıtım veya bildirim penceresi çıkmaz.
6. **Dürüst sunum:** uygulama resmî kurum izlenimi vermez; sonuç ekranı “geçti/kaldı” demez. Örnek içerik resmî içerik gibi sunulmaz.
7. **Her ekran dört durumu bilir:** yükleniyor, boş, hata, yeniden dene. Süresi dolmuş deneme “devam ediyor” görünmez; hiç cevaplanmamış deneme sonuç sayılmaz.
8. **Bütün özellikler ücretsizdir:** PRO/premium katmanı, ücretli abonelik, yükseltme satışı ve ödeme ile açılan özellik arayüzü bulunmaz. Kullanıcının gönderdiği referanslardaki ücretli bölümler ürün kapsamı değildir.

## 2. Sözlük

Sayfa başlığı ve menü girişi `title`, alt sekme gibi dar yerler `short` kullanır. Başka ad kullanılmaz. Kaynak: `vocabulary` ([study-core](../packages/study-core/src/index.ts)).

Sınav başlıklarının parantez içindeki tarihleri gösterilmez: `ÖGG 104. Deneme Sınavı (26.08.2023) — Silahlı` ekranda `ÖGG 104. Deneme Sınavı — Silahlı` olur. Web/mobil ana sayfa ve sonuç başlıkları ile yönetim başlıkları ortak `examDisplayTitle` gösterimini kullanır. Bu yalnız sunum kuralıdır; kayıtlı başlık, kaynak ve puanlama dönemi değiştirilmez. Tarih dışındaki parantezli açıklamalar korunur.

| Yer | Başlık / menü | Kısa |
|---|---|---|
| Ana sayfa | Ana sayfa | Ana sayfa |
| Deneme sınavları | Deneme sınavları | Deneme |
| Ders sınavları | Ders sınavları | Ders |
| Sonuçlar | Sonuçlarım | Sonuçlar |
| Tekrar | Tekrar sınavı | Tekrar |
| Başarı | Başarı durumum | Başarım |
| Profil | Profil | Profil |
| Hesap ve gizlilik | Hesabım | Hesabım |
| Bildirimler (yalnız yönetim) | Bildirimler | Bildirimler |

## 2a. Metin tonu

- **Slogan somut bilgi verir:** “Özel güvenlik sınavlarına hazırlan.” Genel motivasyon cümleleri (“bir adım daha”, “kendi hızında”) kullanılmaz; her metin kullanıcıya ne yapabileceğini veya ne olduğunu söyler.
- **Marka metni tek yerde:** ad (ÖGG SOR), tam uygulama adı (ÖGG SOR - Soru Bankası), alt başlık (Soru Bankası), slogan ve iletişim değerleri `config/brand.json` içindedir. Web, yönetim paneli ve mobil bu dosyayı okur. `npm run brand:apply` statik başlıkları, yasal sayfa marka alanlarını, mağaza taslağını ve backend marka yapılandırmasını günceller; `npm run check:brand` sapmayı denetler. Ekranlar bu değerleri okur; metni ekrana yazmak yerine yapılandırmadan alın.
- **Başlık altı etiketi:** bireysel kullanımda logonun altında platform alt başlığı görünür; kurumda kurumun adı görünür. Tek erişim alanı olan mobil ve web öğrencisine “kişisel çalışma alanı” etiketi veya seçici gösterilmez. Alan seçimi yalnız birden fazla seçenek olduğunda sunulur.

## 3. Renk

- **Rol temelli:** bileşen renk adını değil rolü kullanır (`surface`, `ink`, `primary`, `onPrimary`, `softRed` …). Koddaki sabit renk kodu hatadır; yeni renk önce rol olarak eklenir.
- **Üç ailenin işi:** lacivert (`navy`) marka ve ana sayfa başlığı, güven mavisi (`primary`) eylem ve seçim, mat altın (`accent`) yalnız lacivert üstünde küçük vurgu. Yüzeyler açık temada soğuk beyaz/mavi-gri, koyu temada lacivert-gri tonlarındadır; ana arayüzde mavi baskındır. Doğru/başarı yeşil, yanlış/hata kırmızı, uyarı kehribardır.
- **Kart renkleri:** Deneme ve ana eylem kartları yumuşak mavi, Ders kartları indigo, Tekrar ve küçük tamamlanma özetleri kum tonundadır. İnce kenarlık ve ikon alanı aynı aileden gelir; mavi baskın kalır. Dekoratif aileler `cardTone` ve merkezi `cardIndigo*`/`cardSand*` rollerinden okunur; doğru/yanlış/uyarı renklerine anlam yüklemez. Sonuç listeleri ve puan özetleri mavi, ders başarı kartları indigo, tekrar kartları kum tonunu izler. Profil/hesap, iş ilanı ve yardımcı hesaplama kartları aynı isteğe bağlı `Card.tone` ailelerini kullanır; hesap silme ve doğru/yanlış geri bildirimi anlam renklerini korur. Soru çözme yüzeyleri okuma odaklı kalır. Açık/koyu yüzey ve basılı kart üstündeki metinler AA kontrastını korur.
- **Anlam yalnız renkle verilmez:** doğru, yanlış, boş her yerde metin ve ikon/nokta ile birlikte gösterilir.
- **Kontrast (WCAG 2.2 AA):** metin 4,5:1, büyük metin/ikon/grafik 3:1. Her rol çifti açık ve koyu temada otomatik test edilir (`npm run test:tokens`); bu testin geçmediği palet birleştirilmez.
- **Skor bantları:** %60 altı `red`, %60–79 `primary`, %80 ve üstü `success` tonu. Referans, yazılı ÖGG sınavının 60 puanlık eşiğidir (silahsız: en az 60; silahlı: bölümlerin ortalaması en az 60 — EGM sınav talimatı). Bantlar yalnız renk ve tonu belirler; kullanıcıya başarılı/başarısız denmez. Kaynak: `scoreBand` ([study-core](../packages/study-core/src/index.ts)).

## 4. Koyu mod

- **Üç seçenek:** Cihaz ayarı, Açık, Koyu. Mobil uygulamanın ilk kurulum varsayılanı **Açık**, yazı boyutu **Standart** olur; cihaz koyu modda olsa da ilk görünüm açıktır. Web/yönetim paneli cihaz ayarını izleyerek başlar. Seçim profil/kullanıcı menüsünden yapılır ve o cihazda saklanır (hassas veri değildir; sunucuya gönderilmez). Daha önce saklanan tercihler güncellemeyle sıfırlanmaz.
- **Tersine çevirme değil, ayrı palet:** saf siyah yerine lacivert-gri; yükseklik arttıkça yüzey açılır (`paper` < `surface` < `surfaceContainer`); vurgu renkleri koyu zeminde AA geçecek biçimde açılır ve doygunluğu azaltılır; açık mavi üzerindeki yazı koyudur (`onPrimary`).
- **Web ve yönetim paneli:** `tokens.css` CSS değişkenlerini üretir; cihazın koyu tercihi `prefers-color-scheme` ile, kullanıcının zorlaması `data-theme` ile uygulanır. Sayfa açılışında tema, ilk boyamadan önce uygulanır (parlama olmaz).
- **Mobil:** sistem teması yalnız Cihaz ayarı seçildiğinde görünümü belirler; tema değişince açık ekranların durumu (sınav, form) kaybolmaz. Tercih yoksa, geçersizse veya okunamıyorsa Açık görünüm kullanılır; açılışta varsayılan değerler depoya yazılmaz.
- **Mobil okunabilirlik:** standart boyutta sayfa başlığı 26/33px, yardımcı metin 14/21px, normal gövde 17/27px, sınav sorusu 21/32px. Profil → Yazı boyutu üç kademelidir: Küçük (×0,9), Standart (×1, varsayılan), Büyük (×1,2). Yazı ve satır yüksekliği özgün metrikten birlikte ölçeklenir; iç içe metin iki kez büyütülmez. Girdi alanları ve native gezinme başlıkları da tercihi izler. Sistem yazı büyütmesi kapatılmaz; dokunma hedefleri küçültülmez. Tercih cihazda saklanır, açık ekran/sınav/form yeniden kurulmaz; hata halinde boyut o oturumda uygulanır ve kaydetme yeniden denenebilir.
- Resimler ve ikonlar rolden renk alır; koyu modda ayrı görsel gerekmez.

## 5. Pencere sınıfları ve tablet

Düzen cihaz türüne değil pencere genişliğine bağlıdır (bölünmüş ekran, katlanabilir cihaz ve dönen tablet aynı kuralla çalışır). Sınıflar Material pencere boyutu sınıflarıdır: `compact` < 600, `medium` 600–839, `expanded` ≥ 840 px.

| | Compact (telefon) | Medium (küçük tablet) | Expanded (büyük tablet, masaüstü) |
|---|---|---|---|
| Mobil gezinme | Alt sekmeler | Sol gezinme rayı (ikon + kısa ad) | Sol gezinme rayı |
| Yan boşluk | 14 | 24 | 32 |
| İçerik genişliği | tam | en çok 720 (okuma) | en çok 1120 |
| Listeler / kartlar | tek sütun | tek sütun, geniş kart | iki sütun |
| Sınav çözme | tek sütun, soru haritası alttan | tek sütun | soru + yan panel (soru haritası, süre) |

Kurallar: okuma sütunu (soru, form) 720 pikseli geçmez; satır uzunluğu yaklaşık 60–75 karakterdir. Telefonda içerik kenarlara yakındır: yan boşluk ve kart iç boşluğu 14, kartın içindeki veri kartla birlikte genişler. Dokunma hedefi en az 44 pikseldir; standart eylemler 48 px, kompakt ve seçim düğmeleri 44 px ile başlar. Renkli kartların dikey iç boşluğu telefonda 11, tablette 17 pikseldir; yatay boşluk 14/20 olarak kalır. Kart aralığı ve ikon ölçüleri ortak `cardDensity` değerlerinden gelir. Daha kısa kartlar sabit yüksekliğe zorlanmaz; uzun metin ve Büyük yazı boyutunda büyür.

Web ve yönetim paneli aynı sınıfları kullanır: telefonda üst gezinme kaydırılır, tablette içerik ortalanır ve iki sütuna geçer, masaüstünde yönetim paneli yan menülüdür.

Mobil üst başlıkta profil butonu yoktur; Profil alt sekmeden veya gezinme rayından açılır. Logo ve ÖGG SOR/alt başlık grubu soldaki 44 px menü düğmesi ile sağdaki aynı genişlikte etkileşimsiz boşluğun arasında ortalanır. Marka yazısı 18 px kalın League Spartan, alt başlık 11/14 px ve aynı sol hizada dar satır aralığıyla kullanılır; alt başlığın optik üst boşluğu yazı boyutu tercihine göre ayarlanır, Ö noktalarını koruyan wordmark yüksekliği değiştirilmez. Grup tek dokunma alanıyla ana sayfaya döner; uzun kurum adı ve büyük yazı boyutunda menü üzerine taşmaz. Mobil ana sayfada Sınava hazırlık ve altında kompakt Sıradaki sınav kartı birlikte bir sütundur; tablette kişisel özet bu sütunun yanındadır.

## 6. Kalıplar

25 Ekim 2026 ana sayfa örneği: kullanıcı referanslarından bölümleme, belirgin başlangıç alanı, küçük kişisel özet ve ikonlu liste satırları alındı. ÖGG SOR mavi/lacivert paletiyle özgün bir düzen kullanılır. Üstte gerçek aktif denemeye devam veya sınav seçimine geçiş; altında aynı Stats API'den değerlendirilen soru, doğruluk ve biten sınav sayıları; Hızlı başla/Çalışmaların grupları ve son denemeler vardır. Ders seçimi ayrı Ders sınavları ekranındadır. 840 px'den geniş pencerede başlangıç/özet ve araç grupları yan yana gelir. Ana başlangıç alanı 24 px köşelidir. Kullanıcının küçük bir yakınlaştırma isteğiyle özet göstergeleri üç ayrı kompakt kutuda, araç/geçmiş satırları başlıkları altında 10 px aralıklı, ince çerçeveli 16 px kutularda gösterilir. İkon zeminleri ana sayfa satırında 38 px, sınav listesinde 34 px boyutundadır; mavi vurgu ölçülü tutulur. İlk veri istekleri ekranı bütünüyle kapatmaz, yenilemede hazır içerik korunur. Varsayımsal günlük hedef, seri, haftalık grafik, sınav takvimi veya abonelik verisi üretilmez. Bu teslim yalnız mobil ana sayfadır; diğer ekranların görsel yenilemesi ayrı değerlendirilecektir.

- **Sonuç listesi satırı:** skor/ikon · tam başlık + kısa meta · ok. 16 px köşe, 12/8 px yatay/dikey iç boşluk, 6 px iç aralık; skor alanı en az 56 px genişlik/44 px yüksekliğe sahiptir. Başlık sola hizalıdır ve kırpılmadan sarar; tekrarlanan tür etiketi yoktur. Alt dağılım çubuğu 4 px, doğru/yanlış/boş açıklaması 12/18 px ve kart aralığı 10 px olur. Büyük yazıda doğal olarak büyür.
- **Skor kutusu:** skor büyük ve ilk okunan şeydir; altında doğru/yanlış/boş oranı çubuğu ve nokta + sayı + ad açıklaması.
- **Seçim listesi (örn. ders seçimi):** alt panel, sola hizalı tam genişlik düğmeler.
- **Kart:** `surface` zemin, `line` kenar, iç boşluk 14 (geniş pencerede 20), kart içi aralık 12.
- **Profil yoğunluğu:** 56 px avatar, tam ad ve e-posta tek kimlik kartındadır; ad/e-posta ikinci kez başka kartta tekrarlanmaz. Profil kartları isteğe bağlı kompakt `Card` görünümünü (12 px yatay/8 px dikey boşluk, 8 px içerik aralığı, 16 px köşe) kullanır; diğer ekranların varsayılan kartları değişmez. Hesabım satırı en az 52 px, grup aralıkları 12 px, görünüm/yazı ayarı iç aralıkları 8 px'dir. Tam ad ve uzun e-posta kırpılmaz; büyük yazıda satırlar büyür. Güncelleme/çıkış eylemleri en az 44 px, yasal bağlantılar ve bütün hesap işlemleri korunur.
- **Mobil öncelik:** devam eden sınav ana sayfada kısayollardan önce gelir. Alt sekmeler günlük hedefleri taşır; yan menü tekrar/başarı araçları ve çıkış içindir. Birden fazla erişim alanı varsa menü/profil alan seçimini de gösterir.
- **Mobil hızlı başla:** Ders sınavları, Deneme sınavları, Tekrar sınavı sırasıyla alt alta gelir. Ders seçimi Ders sınavları ekranındadır; ana sayfada ayrıca “Derslerini keşfet” bölümü bulunmaz.
- **Mobil eylem:** kart köşesi 24px, düğme köşesi 16px (basışta 12px); kapsül seçim gruplarına ayrılır. Liste/seçim eylemleri en az 44px, normal düğmeler en az 48px yüksekliğindedir. Devam eylemi ana dolgu, yeni sınav ikincil dolgu kullanır.
- **Deneme/Ders sınav kartları:** ortak kompakt düzen; 16 px köşe, 12 px yatay/6 px dikey iç boşluk, 4 px satır aralığı. Tek sütunda kartlar arası boşluk 10 px'dir; geniş ekranın iki sütunlu düzeni korunur. 16/22 px tam başlık üstte; dönem, soru sayısı ve kısa süre bilgisi altta eylemle aynı satırda yer alır. Büyük kitap ikonu ve kullanılmamış sınavdaki “Henüz girmedin” satırı yoktur. Devam/duraklatıldı/süre sonu veya önceki başarı bilgisi yalnız mevcutsa gösterilir. Başlatma ayarları kullanıcı açınca kartın altında genişler. Sabit yükseklik veya başlık kırpma uygulanmaz; Büyük yazıda ve dar ekranda içerik büyüyebilir, eylem hedefi en az 44 px kalır.
- **Bekleme ve hata:** listeler statik iskeletle yerini korur; erişilebilir tek yükleme açıklaması bulunur. Hata ilgili bölümün neyi yükleyemediğini ve uygulanabilir yeniden deneme yolunu gösterir.
- **Mobil giriş formları:** en çok 480px genişlik, kompakt lacivert marka kartı ve ince geometrik çizgiler kullanır. Başlık, açıklama ve belirgin çerçeveli alanlar tek form kartında toplanır; küçük mavi vurgu başlık hiyerarşisini destekler. Tek ana eylem bulunur. Kayıt ve parola yenileme metin bağlantılarıyla açılır. Parola görünürlüğü hedefi en az 44×44px'dir; gönderim sırasında alanlar ve ekran değiştiren bağlantılar kilitlenir. Açık ve koyu temada aynı renk rolleri kullanılır.

- **Öğrenci web:** mobildeki 24px kart, 16px eylem, mavi seçim ve tipografi hiyerarşisini kullanır. Girişte geniş ekranda lacivert tanıtım kartı ile form yan yanadır; 840px altında kompakt marka kartı formun üstüne geçer. Form sütunu 480px'i aşmaz. Parola gösterme, yükleme iskeleti ve gönderim kilidi ortak kalıplardır. Masaüstü üst gezinme ve sınav çözme sütunları webin doğal düzenini korur.

## Kişi adları ve avatarlar — 26 Ekim 2026

Kişinin tam adı tek `name` alanında tutulur. İkinci ad ve birleşik soyadı için kayıpsız tek alan kullanılır; kelimeler ayrı kimlik alanlarına tahminle bölünmez. `displayPersonName` NFC/Türkçe karakterleri ve bütün kelimeleri koruyup yalnız boşlukları düzenler. Yazımın harf büyüklüğü değiştirilmez.

Web ve mobil profil aynı `personInitials` hesabını kullanır: **Ayşe Yılmaz → AY**, **Ayşe Deniz Yılmaz → ADY**. Rozet en fazla üç kelimenin harfini alır; daha uzun adlarda ilk iki ve son kelime kullanılır. Profil tam adı eksiksiz gösterir. Türkçe `i/ı`, birleşik Unicode karakterler, tek kelimeli/boş adlar ve tire/apostrof desteklenir. Mobil header profil rozeti kaldırıldı; profil içindeki tam ad ve baş harfler korunur. Webde header rozeti, tam ad ve Hesabım sayfası korunur.

Hesabım içindeki **Ad soyad** alanı ikinci ad dahil en fazla 100 karakterle mevcut `PATCH /api/v1/me` ucuna kaydeder. Başarılı kayıtta hesabın sunucu kaydı ve oturum önbelleğindeki kişi bilgisi güncellenir; webde başka hesaba geçilmişse eski yanıt o hesabın oturumunu değiştirmez. Hata sırasında yazılan değer korunur. Kayıt formu ve mobil klavye tam ad otomatik doldurmasını destekler. E-posta/parola ve diğer hassas hesap işlemlerinin kuralları korunur.

## 7. Reklam yuvası (ileride)

Reklam ilk sürümde yoktur. Eklenirse: yalnızca liste ve özet ekranlarında, içerikten açıkça ayrılmış ve “Reklam” etiketli sabit yuvada görünür; sınav çözme ekranı, sonuç ayrıntısı ve giriş ekranları reklamsızdır. Yuva şimdilik kod olarak eklenmez.

## 8. Doğrulama

- `npm run test:tokens`: tüm rol çiftlerinin açık ve koyu kontrastı; `tokens.css`’in paletle eşitliği.
- E2E: 320/390/834/1280 px genişliklerde açık ve koyu temada yatay taşma yok, seçili ekranlarda hesaplanmış renk kontrastı ve koyu mod uygulanıyor.
- Piksel karşılaştırmalı görsel regresyon kullanılmaz: yazı tipi ve işletim sistemi farkı yüzünden yerel ve CI arasında kararsızdır. Ekran görüntüleri inceleme için üretilir, otomatik hüküm vermez.
- Fiziksel iPhone/iPad/Android tablet doğrulaması ayrıca yapılmalıdır; Chromium görüntüleri bunun kanıtı değildir.

Takvim kuralları: 14/20 px tek paragrafta kalın madde adı + açıklama, maddeler arası 8 px. Kural/tarih kartları `Card.compact`, bölüm arası 12 px kullanır. Tarih etiketi tarihle aynı satırdadır; kaynak ve eğitim bitişi görünür kalır. Dokunma hedefleri en az 44 px ve büyük metinde doğal büyüme korunur.
