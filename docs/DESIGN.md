# Tasarım ilkeleri

Durum: Bu belge web, yönetim paneli ve mobil uygulamanın ortak görsel ve etkileşim kuralını tanımlar. Kalıcı marka henüz belirlenmedi; renk tonları geçici marka ile gelir, ancak yapı (rol, kontrast, koyu mod, pencere sınıfları) markadan bağımsızdır. Kod değerleri [packages/design-tokens](../packages/design-tokens/src/index.ts) içindedir; bu belge değerleri değil, kuralları ve nedenlerini anlatır.

## 1. Ürün ilkeleri

1. **İki sınav türü vardır:** Deneme Sınavı (tüm sınav) ve Ders Sınavı (bir dersin sınavı). Soru bankası, tek soru çözme, “temel/yenileme” ayrımı hiçbir ekranda yoktur. Tekrar da bir sınavdır.
2. **Yönetim sınav bazlıdır:** sorular sınavın içinde, alt alta ve yerinde düzenlenir. Soru bazlı liste yoktur.
3. **Üç uygulama aynı yapıdadır:** aynı sözlük, aynı sınav türleri, aynı sıra. Platformun doğal gezinmesi korunur; native bileşenler HTML/CSS ile taklit edilmez.
4. **Çalışma ekranı sakin, özet ekranı ifadelidir:** soru ve sınav ekranında seçenekler yer değiştirmez, ölçeklenmez, süsleme yoktur. Ana sayfa ve sonuç ekranı daha belirgin olabilir.
5. **Süreli sınav kesintisiz akar:** sınav sırasında reklam, tanıtım veya bildirim penceresi çıkmaz.
6. **Dürüst sunum:** uygulama resmî kurum izlenimi vermez; sonuç ekranı “geçti/kaldı” demez. Örnek içerik resmî içerik gibi sunulmaz.
7. **Her ekran dört durumu bilir:** yükleniyor, boş, hata, yeniden dene. Süresi dolmuş deneme “devam ediyor” görünmez; hiç cevaplanmamış deneme sonuç sayılmaz.

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
- **Marka metni tek yerde:** ad, alt başlık (“ÖGG Soru Cevap Platformu”) ve slogan mobilde `apps/mobile/brand.json`, webde ve yönetimde `src/config.ts` içindedir. Ekranlar bu değerleri okur; metni ekrana yazmak yerine yapılandırmadan alın.
- **Başlık altı etiketi:** bireysel kullanımda logonun altında platform alt başlığı görünür; kurumda kurumun adı görünür. Tek erişim alanı olan mobil ve web öğrencisine “kişisel çalışma alanı” etiketi veya seçici gösterilmez. Alan seçimi yalnız birden fazla seçenek olduğunda sunulur.

## 3. Renk

- **Rol temelli:** bileşen renk adını değil rolü kullanır (`surface`, `ink`, `primary`, `onPrimary`, `softRed` …). Koddaki sabit renk kodu hatadır; yeni renk önce rol olarak eklenir.
- **Üç ailenin işi:** lacivert (`navy`) marka ve ana sayfa başlığı, güven mavisi (`primary`) eylem ve seçim, mat altın (`accent`) yalnız lacivert üstünde küçük vurgu. Yüzeyler açık temada soğuk beyaz/mavi-gri, koyu temada lacivert-gri tonlarındadır; ana arayüzde mavi baskındır. Doğru/başarı yeşil, yanlış/hata kırmızı, uyarı kehribardır.
- **Anlam yalnız renkle verilmez:** doğru, yanlış, boş her yerde metin ve ikon/nokta ile birlikte gösterilir.
- **Kontrast (WCAG 2.2 AA):** metin 4,5:1, büyük metin/ikon/grafik 3:1. Her rol çifti açık ve koyu temada otomatik test edilir (`npm run test:tokens`); bu testin geçmediği palet birleştirilmez.
- **Skor bantları:** %60 altı `red`, %60–79 `primary`, %80 ve üstü `success` tonu. Referans, yazılı ÖGG sınavının 60 puanlık eşiğidir (silahsız: en az 60; silahlı: bölümlerin ortalaması en az 60 — EGM sınav talimatı). Bantlar yalnız renk ve tonu belirler; kullanıcıya başarılı/başarısız denmez. Kaynak: `scoreBand` ([study-core](../packages/study-core/src/index.ts)).

## 4. Koyu mod

- **Üç seçenek:** Cihaz ayarı (varsayılan), Açık, Koyu. Seçim her uygulamada profil/kullanıcı menüsünden yapılır ve o cihazda saklanır (hassas veri değildir; sunucuya gönderilmez).
- **Tersine çevirme değil, ayrı palet:** saf siyah yerine lacivert-gri; yükseklik arttıkça yüzey açılır (`paper` < `surface` < `surfaceContainer`); vurgu renkleri koyu zeminde AA geçecek biçimde açılır ve doygunluğu azaltılır; açık mavi üzerindeki yazı koyudur (`onPrimary`).
- **Web ve yönetim paneli:** `tokens.css` CSS değişkenlerini üretir; cihazın koyu tercihi `prefers-color-scheme` ile, kullanıcının zorlaması `data-theme` ile uygulanır. Sayfa açılışında tema, ilk boyamadan önce uygulanır (parlama olmaz).
- **Mobil:** sistem teması dinlenir; tema değişince açık ekranların durumu (sınav, form) kaybolmaz.
- **Mobil okunabilirlik:** sayfa başlığı 26/33px, yardımcı metin 14/21px, soru gövdesi 17/27px. Ölçekler mobil tema yapılandırmasından alınır; sistem yazı büyütmesi kapatılmaz.
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

Kurallar: okuma sütunu (soru, form) 720 pikseli geçmez; satır uzunluğu yaklaşık 60–75 karakterdir. Telefonda içerik kenarlara yakındır: yan boşluk ve kart iç boşluğu 14, kartın içindeki veri kartla birlikte genişler. Dokunma hedefi en az 44 pikseldir (düğmeler 54).

Web ve yönetim paneli aynı sınıfları kullanır: telefonda üst gezinme kaydırılır, tablette içerik ortalanır ve iki sütuna geçer, masaüstünde yönetim paneli yan menülüdür.

## 6. Kalıplar

- **Liste satırı:** sol blok (skor ya da ikon) · tür etiketi + başlık + meta · ok. Başlık sola hizalıdır, uzun başlık kesilmez sarar (en çok 3 satır). Sayı ve yüzde sabit genişlikli sütundadır; uzun ad onu itmez.
- **Skor kutusu:** skor büyük ve ilk okunan şeydir; altında doğru/yanlış/boş oranı çubuğu ve nokta + sayı + ad açıklaması.
- **Seçim listesi (örn. ders seçimi):** alt panel, sola hizalı tam genişlik düğmeler.
- **Kart:** `surface` zemin, `line` kenar, iç boşluk 14 (geniş pencerede 20), kart içi aralık 12.
- **Mobil öncelik:** devam eden sınav ana sayfada kısayollardan önce gelir. Alt sekmeler günlük hedefleri taşır; yan menü tekrar/başarı araçları ve çıkış içindir. Birden fazla erişim alanı varsa menü/profil alan seçimini de gösterir.
- **Mobil eylem:** kart köşesi 24px, düğme köşesi 16px (basışta 12px); kapsül seçim gruplarına ayrılır. Liste eylemleri en az 44px, normal düğmeler en az 54px yüksekliğindedir. Devam eylemi ana dolgu, yeni sınav ikincil dolgu kullanır.
- **Bekleme ve hata:** listeler statik iskeletle yerini korur; erişilebilir tek yükleme açıklaması bulunur. Hata ilgili bölümün neyi yükleyemediğini ve uygulanabilir yeniden deneme yolunu gösterir.
- **Mobil giriş formları:** en çok 480px genişlik, kompakt lacivert marka kartı ve ince geometrik çizgiler kullanır. Başlık, açıklama ve belirgin çerçeveli alanlar tek form kartında toplanır; küçük mavi vurgu başlık hiyerarşisini destekler. Tek ana eylem bulunur. Kayıt ve parola yenileme metin bağlantılarıyla açılır. Parola görünürlüğü hedefi en az 44×44px'dir; gönderim sırasında alanlar ve ekran değiştiren bağlantılar kilitlenir. Açık ve koyu temada aynı renk rolleri kullanılır.

- **Öğrenci web:** mobildeki 24px kart, 16px eylem, mavi seçim ve tipografi hiyerarşisini kullanır. Girişte geniş ekranda lacivert tanıtım kartı ile form yan yanadır; 840px altında kompakt marka kartı formun üstüne geçer. Form sütunu 480px'i aşmaz. Parola gösterme, yükleme iskeleti ve gönderim kilidi ortak kalıplardır. Masaüstü üst gezinme ve sınav çözme sütunları webin doğal düzenini korur.

## 7. Reklam yuvası (ileride)

Reklam ilk sürümde yoktur. Eklenirse: yalnızca liste ve özet ekranlarında, içerikten açıkça ayrılmış ve “Reklam” etiketli sabit yuvada görünür; sınav çözme ekranı, sonuç ayrıntısı ve giriş ekranları reklamsızdır. Yuva şimdilik kod olarak eklenmez.

## 8. Doğrulama

- `npm run test:tokens`: tüm rol çiftlerinin açık ve koyu kontrastı; `tokens.css`’in paletle eşitliği.
- E2E: 320/390/834/1280 px genişliklerde açık ve koyu temada yatay taşma yok, seçili ekranlarda hesaplanmış renk kontrastı ve koyu mod uygulanıyor.
- Piksel karşılaştırmalı görsel regresyon kullanılmaz: yazı tipi ve işletim sistemi farkı yüzünden yerel ve CI arasında kararsızdır. Ekran görüntüleri inceleme için üretilir, otomatik hüküm vermez.
- Fiziksel iPhone/iPad/Android tablet doğrulaması ayrıca yapılmalıdır; Chromium görüntüleri bunun kanıtı değildir.
