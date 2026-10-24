# ÖGG puanlama kuralları ve kaynak doğrulaması

İnceleme tarihi: **24 Ekim 2026**. Bu belge hangi kuralların uygulandığını, hangilerinin belirsiz kaldığını ayırır. Ürün gereksinimi [SCORE](SCORE.md); uygulama ve API [EXAM_SCORING](EXAM_SCORING.md).

## Resmî kaynaklar

| Kaynak | Doğrulanan bilgi |
| --- | --- |
| [4 Temmuz 2025, RG 32946 değişikliği](https://www.resmigazete.gov.tr/eskiler/2025/07/20250704-2.htm), md.4–5 ve 9 | Temel 80+20, yenileme 40+20 soru; üç bölüm ayrı 100 üzerinden; silahlı temelde her bölüm en az 60; %50/%25/%25 ağırlık; yayımlandığı gün yürürlük. |
| [17 Temmuz 2025, RG 32958 değişikliği](https://www.resmigazete.gov.tr/eskiler/2025/07/20250717-1.htm) ve [güncel konsolide yönetmelik](https://www.mevzuat.gov.tr/mevzuatmetin/yonetmelik/7.5.7190.pdf), md.37–39 | Silahsızda birinci kısım en az 60; yenilemede seviye tespiti; MYO fark sınavı hakkında ayrıca hüküm. Uygulamalı sınav beş fişek üzerinden. |
| [EGM Sınav SSS](https://www.egm.gov.tr/ozelguvenlik/sinav-sikca-sorulan-sorular), soru 3–4 | Sayfada hâlâ 100 genel / 25 silah sorusu, 50+50 silah/atış, iki bölüm en az 50 ve ortalama 60 modeli anlatılıyor. Yenilemede kalma sistemi bulunmadığı açıklanıyor. |
| [104. Temel / 80. Yenileme sınav talimatı](https://www.egm.gov.tr/kurumlar/egm.gov.tr/IcSite/ozelguvenlik/02_104Temel-80-Yenileme-SINAV-TALIMATI-WEB-19072023.pdf), §4.3–4.10, §5.1–5.2 | 26 Ağustos 2023; 100+25 soru; yanlış cevap doğruları etkilemez. Silahsız sertifikadan silah farkında silah+atış en az 50 ve önceki başarılı silahsız temel puanıyla ortalama en az 60. |
| [114. Temel / 90. Yenileme kılavuzu](https://www.egm.gov.tr/kurumlar/egm.gov.tr/IcSite/ozelguvenlik/Kilavuz/114-90/SINAV-KILAVUZU-WEB.pdf), §1–2 | 12 Nisan 2025; 100 genel + 25 silah sorusu, her genel doğru 1, silah doğru 2 puan. |
| [123. Temel / 99. Yenileme kılavuzu](https://www.egm.gov.tr/kurumlar/egm.gov.tr/IcSite/ozelguvenlik/Kilavuz/123-99/02_SINAV-KILAVUZU_WEB.pdf), §1–2 | 24 Ekim 2026; 2025 değişikliğine rağmen kılavuzda 100+25 düzeni sürüyor. Kılavuz tek başına temel sınavın bütün başarı eşiklerini açıklamıyor. |
| [EGM 2026 sınav takvimi](https://www.egm.gov.tr/ozelguvenlik/2026-sinav-takvimi) | Temel 119–123 tarihleri; yenileme numaraları ayrı belirtilir. 124. dönem tarihi bilinse de bu teslimde puanlama düzeni otomatik atanmaz. |

Resmî Gazete ve Mevzuat Bilgi Sistemi metinleri ile EGM PDF'leri doğrudan resmî URL'lerinden indirilip metinleri karşılaştırıldı. Arama aracının bazı resmî sayfalarda zaman aşımına uğraması kaynak yerine özel kurs sitesi kullanılmasına yol açmadı. Soru içerikleri alınmadı.

## Uygulanan modeller

### Temmuz 2025 öncesi temel eğitim

Silahsız: `general_correct`; en az 60. Silahlı: `(general_correct + weapon_correct × 2 + shooting_hits × 10) / 2`; genel bölüm en az 50, silah+atış en az 50, toplam en az 60. Genel bölüm 100, silah yazılı bölüm 50, atış 50 puan üzerinden gösterilir. Yanlışlardan puan düşülmez.

### Yenileme

Aynı dönemin doğrulanmış soru sayıları ve puan bileşenleriyle hesaplanır; sonuç **Seviye tespit puanı**dır. Düşük puanda başarısız/geçemedi kararı üretilmez. Atış bilgisi eksikse tam seviye puanı yerine bekleme ve olası puan aralığı gösterilir.

### Silah farkı

Bu teslimde doğrulanmış **104. temel sınav dönemi, silahsız sertifikadan silahlıya geçiş** desteklenir. `weapon_correct × 2 + shooting_hits × 10` en az 50; bu toplamın önceki silahsız temel puanıyla ortalaması en az 60 olmalıdır. Önceki başarılı silahsız temel puanı en az 60 olmalıdır ve ayrıca istenir; eksikse karar verilmez. MYO mezunlarına özel fark sınavı aynı kurala otomatik sokulmaz. 2025 sonrası sıradan sertifika sahiplerinin fark sınavı geçiş kuralı kesinleştirilemediği için bu dönemler kullanıcıya etkin seçenek olarak sunulmaz.

### 2025 sonrası kılavuz dönemi

Kılavuzda 100+25 soru gösterilen dönemlerde puan bileşenleri bu düzende hesaplanır. Silahsızda 60 puan koşulu hem SSS hem konsolide yönetmelikle uyumludur. Silahlı temel için eski SSS'deki 50+50/ortalama 60 eşikleri ile yeni yönetmelikteki her bölüm 60 eşiği birbirinin yerine kullanılmaz: `decision_mode=unverified`, `passed=null`, kullanıcıya **Tahmini puan — başarı koşulu doğrulanmadı** gösterilir. Atış bilinmiyorsa ayrıca puan aralığı verilir. Bu bir geçiş hükmü veya kesin resmî başarı kararı değildir.

2025 yönetmeliğinin 80+20 / 40+20, normalize %50/%25/%25 modeli motor tarafından desteklenir; başlangıç kurulumunda bu tanımlar **taslaktır**, hiçbir döneme bağlanmaz. Dönem numarası yalnız yürürlük tarihine bakılarak tahmin edilmez. Yeni dönemin resmî uygulaması doğrulandığında yönetici ilgili kapsamı düzenleyip yeni sürümü yayımlar ve açıkça dönem atar.

## Dönem eşleştirmesi

Kurulum `scoring:install-verified` ile yapılır. Temel 104 ve 114 kılavuz/talimat tarihleriyle; 119–123 resmî 2026 takvimiyle tanımlanır. Yenileme **80, 90, 99** ayrı kayıtlar olarak kendi resmî belgelerine dayanır; temel numarasından çıkarma/toplama yapılmaz. Silah farkı 104 ayrı eğitim türüdür.

`--link-existing` kullanılırsa yalnız kaynak başlığı tam olarak `Özel Güvenlik <numara>. Temel Eğitim Sınavı soruları` ve tür kodu `ogg-deneme` olan yayımlanmış tam sınavlar incelenir. Diğer eski temel dönemlerinin tarihleri mevcut içe aktarılmış sınav başlığından alınır; bu tarihlerin her biri bu teslimde ayrı resmî takvim belgesinden yeniden teyit edilmiş değildir. Puan modelinin kaynakları ve bu tarih kökeni ayrı değerlendirilmelidir. Başlık/tür tek başına yenileme kabul edilmez. Kaynak başlığı, yıl, seçenek ve soru sayısı uyuşmazsa kural bağlanmaz/işlem reddedilir; daha önce elle yapılmış eşleştirme ezilmez.

Bu işlem soru, sürüm, yayımlanmış künye veya geçmiş deneme puanlarını değiştirmez. Yeni `official_exam_scoring` metaverisi ekler. Yeni sınav girişinde yönetici yılı/numarası/seçeneği eşleşen puanlama dönemini açıkça seçebilir. Bağlı 125/100 çiftte silahsız dönem karşılığı da bulunmalıdır.

## Sayısal örnekler ve sınırlar

- Eski silahsız temel: 60 doğru → 60; 59 → 59. Yanlış sayısı puanı düşürmez.
- Eski silahlı temel: 70 genel doğru, 15 silah doğru, 2 isabet → `(70 + 30 + 20) / 2 = 60`; bölüm koşulları sağlanır.
- Aynı yazılı cevaplarda atış bilinmiyorsa: 50–75 aralığı; kesin puan/başarı yoktur.
- Eski silah farkı: önceki temel 70, silah doğru 20, isabet 1 → `(70 + 40 + 10) / 2 = 60`.
- Yenilemede sıfır puan başarısız etiketi üretmez; seviye puanıdır.

Motor kesirli hesaplamayı tam sayılarla yapar; yalnız gösterimde yarım yukarı yuvarlar. Başarı eşiği yuvarlanmış gösterimden değerlendirilmez. 100 doğru + 1 yanlış, 26 silah doğrusu, altıncı isabet veya negatif değer reddedilir. Kaynak kuralın ondalık basamak sayısı saklanır. Hiçbir uygulama çıktısı resmî sınav sonuç belgesi değildir.
