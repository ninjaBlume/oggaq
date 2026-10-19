# Editör kontrol listesi

Bu liste içe aktarılan soruların cevap anahtarı için bilinen sorunları ve resmî kaynakla karşılaştırma sonuçlarını içerir. Resmî kaynak: EGM Özel Güvenlik Denetleme Başkanlığı'nın yayımladığı **cevaplı** yazılı sınav kitapçıkları (doğru şık kırmızı işaretli).

## 1. Resmî kaynak veya kanıtla düzeltilenler (içe aktarıcıda uygulandı)

Her kural `backend/app/Modules/Import/LegacyCorrections.php` içinde kanıtıyla birlikte durur; soru metnine, seçeneklere ve yanlış cevaba göre çalışır, aynı sorunun tüm kopyalarını düzeltir.

| Soru | Kaynaktaki hata | Düzeltme | Kanıt |
|---|---|---|---|
| Silahlı çalışan Mehmet'in görev yeri | Doğru: Eğitim kurumu | **Kişi koruma** | EGM 109. Temel (A/B) cevaplı kitapçık |
| Yanığın ciddiyetini belirleyen faktörlerden değildir | Doğru: Derideki derinliği | **Cinsiyet** | EGM 115. Temel (B) cevaplı kitapçık, soru 51 |
| AVM'de aklen malul şahsa tokat atan şahıs | Doğru: Olayın kendiliğinden sona ermesini bekler | **Suçüstü… şikayete bakmaksızın… yakalayıp kolluğa teslim eder** (D) | EGM 115. Temel (B) cevaplı kitapçık, soru 80 |
| Silah temizliğinde gerekli malzemelerden değildir (106) | Aynı soru iki kez: Harbi / Süngü | **Süngü** | Harbi temizlik malzemesidir (EGM 120. sınav kitapçığı seçenekleri); ikinci kopya Süngü diyor |
| ÖGDB tarafından yapılan sınavlardan değildir (107) | Aynı soru iki kez: Temel ve Yenileme Eğitim Sınavı / Bomba İmha Uzmanı Sınavı | **Bomba İmha Uzmanı Sınavı** | Temel ve Yenileme sınavı ÖGDB'nin kendi sınavı; sonraki sınavlarda aynı soruda Bomba İmha seçeneği "Ehliyet Sınavı" olmuştur (EGM 113) |
| Gez ve arpacık yarı otomatik tabancaların hangi ana parçası… (107, seçenekler Kabza/Namlu/Sürgü/Harbi/Horoz) | Başka sorunun metni yapıştırılmış | Metin: **"Aşağıdakilerden hangisi silahların parçalarından biri değildir?"** (doğru: Harbi) | EGM 107. Temel A grubu soru 4 / B grubu soru 22 |
| Tabancanın başlıca parçalarından değildir (117, seçenekler Namlu/Sürgü/Yerine getiren yay ve mili/Çerçeve/Kabza) | Aynı soru iki kez: Namlu / Kabza | **Kabza** | Namlu başlıca parçadır; EGM 114. sınavında aynı kalıpta doğru şık Horoz (başlıca parça olmayan) |
| Doğru nişan alma aşağıdakilerden hangisidir? (101) | Dersi Hukuk girilmiş (soru silah bölümünde, 104. sırada) | Ders: **Silah Bilgisi ve Atış** | 101. sınav tam kaydında silah bölümünde; ders setinde silah sorusu |
| Kontrol noktasında giriş-çıkış kontrolünde dikkat edilecek hususlardan yer almaz | Doğru: Personel kontrolü | **Bina kontrolü** | EGM 102. Temel (A) cevaplı kitapçık, soru 37 |
| Hafif metal yangınlarında kesinlikle kullanılmayan söndürme maddesi | Doğru: Kum | **Su** | EGM 104. Temel (B) cevaplı kitapçık, soru 41; hafif metal yangınında su kullanılmaz |
| Temel koruma prensiplerinden değildir | Doğru: Koruma görevlisi her konuyu rahatça paylaşabilmelidir | **Korunan kişiden daha üst makamdaki… korunmasına geçilmelidir** (B) | EGM 104. Temel (A soru 91, B soru 9) |
| Koruma görevlisinin dikkat edeceği hususlardan değildir | Doğru: Ekip uyumu en üst seviyede olmalıdır | **Koşullara göre değişebilen koruma düzenine hazırlıklı olmamalıdır** (E) | EGM 104. Temel (A soru 92, B soru 8) |
| Geçici ve acil hallerde “…… aranmaksızın” valilik izni | Doğru: Özel güvenlik şirketinin izin talebi | **Komisyon kararı** | EGM 105. Temel (A) soru 7; 5188 s. Kanun md. 3 |
| Isı ile oluşan yanıklarda yanlış uygulama | Doğru: Kişi hâlâ yanıyorsa koşması engellenir | **Su toplamış yerler patlatılır** | EGM 107. Temel (A soru 53, B soru 50) |
| Kimlik sorma yetkisinin bulunduğu yer/durumlar (I–VI) | Doğru: I, II, III, IV, V, VI | **I, III ve IV** | EGM 113. Temel (A) soru 14 |
| Yaya kontrol noktasında dikkat edilecek hususlar arasında yer almaz | Doğru: Birden fazla suç unsuru madde… | **El tipi metal detektör şahsın vücuduna dik tutularak…** (E) | EGM 114. Temel (A soru 30, B soru 65) |
| VIP makam aracında bulunması gereken özelliklerden değildir | Doğru: Motoru güçlü, hızlı ve 4x4 | **Araçta açılır tavan bulunmalıdır** | EGM 116. Temel (A soru 86, B soru 12) |
| Tabanca namlusunun bir parçasıdır | Doğru: Horoz | **Dirsekli kurs** | EGM 117. Temel (A soru 18, B soru 2) |
| Kurulu vaziyetten kurtulup iğneye çarparak ateşlemeyi gerçekleştiren parça | Doğru: Tetik | **Horoz** | EGM 117. Temel (A soru 25, B soru 9) |

## 2. Çelişki sanılan, aslında doğru olanlar

- **Silah bakım ve temizliği türlerinden değildir (104: Günlük bakım / 106: Aylık bakım):** iki ayrı sınavın farklı seçenek kümeleri. 104'ün doğru şıkkı resmî A ve B kitapçığında kırmızı işaretli olarak **Günlük bakım**'dır; değişiklik gerekmez.
- **Silah sökmeye başlamadan önce ilk işlem:** iki ayrı soru vardır. 106'daki seçenek "Silah ölü noktaya tutulur" doğru şıktır (EGM 106. Temel A cevaplı kitapçığı, soru 13); 114'te aynı seçenek "ölü noktaya tutularak horoz düşürülür" biçiminde değişmiş ve doğru şık **Şarjör çıkartılır**'dır (EGM 114. Temel). İkisi de bizdeki anahtarla uyumludur.
- **Tabancanın başlıca parçalarından değildir (116: Tırnak/Hazne):** doğru şık **Tırnak**'tır (EGM 116. Temel B cevaplı kitapçığı, soru 5); bizdeki anahtar aynıdır.
- **MP5 makinalı tabanca ana parçalarından değildir (116: Kurma kolu):** resmî 116 kitapçığında doğru şık **Kurma kolu**'dur; önceki otomatik karşılaştırmanın "Şarjör" uyarısı komşu soruya aitmiş.
- Önceki sürümdeki 28 “otomatik aday” listesi, komşu sorunun kırmızı şıkkıyla karıştığı için yanlış alarm üretiyordu ve kaldırıldı. Yerine daha katı yöntem kullanıldı (bölüm 4): gerçek hatalar bölüm 1'e eklendi, geri kalanı yanlış alarmdı (ör. Esrar halüsinojendir, il milli eğitim müdürlüğü komisyon üyesi değildir, Liderler (Önderler) 113 kitapçığıyla doğrulandı).

## 3. Hâlâ çözülemeyenler

- **Özel Güvenlik Denetleme Başkanlığınca hazırlanan eğitim projesi (yeknesaklık, 119):** seçenekler ÖZGE / ÖGNET / PATBİS / ASİP / SEP. EGM 119. Temel **A** kitapçığında doğru şık **SEP**, **B** kitapçığında aynı seçeneklerle **ÖZGE** işaretlidir; resmî kitapçıklar birbiriyle çelişiyor. Bizdeki anahtar ÖZGE'dir. Editör resmî nihai cevap anahtarıyla (kitapçık sayfasındaki cevap anahtarı) kontrol etmeli.
- **Resmî kitapçığı bulunamayan sınavlar (100, 101, 103, 108):** bu sınavların soruları, başka sınavlarda aynen çıkmışsa o kitapçıkla doğrulanır; yalnız bu sınavlara özgü sorular kaynaktaki anahtarla bırakıldı.
- **Seçenekleri kaynakta olmayan 6 taslak soru** ve bunlara bağlı 7 taslak sınav: editörler soruyu resmî kitapçıktan tamamlayıp yayımlamalı ([IMPORTING](IMPORTING.md) içinde listelenmiştir).

## 4. Resmî cevaplı kitapçıkla karşılaştırma (19 Ekim 2026)

Yöntem: EGM'nin yayımladığı cevaplı kitapçıklarda (A ve B grupları) doğru şık kırmızıdır. 90, 102, 104–107 ve 109–121 sınavlarının (19 sınav) kitapçıkları ayrıştırılıp içe aktarılmış her sorunun metni, **bütün** seçenekleri ve doğru şıkkı kitapçıktaki aynı soruyla karşılaştırıldı (soru metni sözcük kümesi ve tüm seçenekler eşleşmeli; komşu soruların işaretleri hariç tutulur).

- **1.864 soru** resmî kitapçıkla birebir aynı anahtara sahip (düzeltmeler uygulandıktan sonra).
- **158 soru** belirsiz kaldı (kitapçıkta eşleşti, ancak kırmızı şık güvenle çözülemedi — ör. I/II/III birleşik şıklar).
- **736 soru** hiçbir kitapçıkta bulunamadı (yalnız 100, 101, 103, 108 gibi kitapçığı bulunmayan sınavlara ait ya da farklı sözcüklerle çıkmış sorular); bunların anahtarı kaynak veriye dayanır.
- **2 uyuşmazlık** kaldı ve ikisi de açıklandı: silah sökme sorusunun 114'teki farklı seçenekli sürümü (bölüm 2) ve A/B kitapçıkları birbiriyle çelişen proje sorusu (bölüm 3).

Bu karşılaştırma, bu 19 sınav için resmî anahtarla uyumu gösterir; kitapçığı olmayan sorular için “doğrulandı” denemez. Karşılaştırmayı yeniden yapmak için kitapçıklar `egm.gov.tr/ozelguvenlik` duyuru sayfalarındaki bağlantılardan indirilip `pdftohtml -xml` ile renkleri okunabilir.
