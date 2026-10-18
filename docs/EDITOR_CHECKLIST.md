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

## 2. Çelişki sanılan, aslında doğru olanlar

- **Silah bakım ve temizliği türlerinden değildir (104: Günlük bakım / 106: Aylık bakım):** iki ayrı sınavın farklı seçenek kümeleri. 104'ün doğru şıkkı resmî A ve B kitapçığında kırmızı işaretli olarak **Günlük bakım**'dır; değişiklik gerekmez.

## 3. Hâlâ çözülemeyenler (resmî kitapçık bulunamadı)

- **Silah sökmeye başlamadan önce ilk işlem (106):** bizdeki doğru şık "Silah ölü noktaya tutulur"; 114. sınavın resmî kitapçığında seçenek "ölü noktaya tutularak horoz düşürülür" biçimine çevrilmiş ve doğru şık **Şarjör çıkartılır**. 106. sınav kitapçığına ulaşılamadı; ürün sahibi 106 anahtarını doğrulamalı.
- **Tabancanın başlıca parçalarından değildir (116: Tırnak):** seçeneklerde hem Tırnak hem Hazne başlıca parça sayılmayabilir; resmî anahtar bulunamadı.

## 4. Resmî cevaplı kitapçıkla otomatik karşılaştırmada farklı çıkan adaylar

Doğrulama yöntemi: 12 sınavın cevaplı kitapçığındaki kırmızı şıklar, soru metni ve seçeneklerle eşleştirilen bölgede bizim anahtarla karşılaştırıldı. Bu otomatik eşleştirme, benzer seçenekli komşu sorular ve I/II/III kombinasyonlu şıklar yüzünden **yanlış alarm üretebilir**; her satır editör tarafından kitapçıkla kontrol edilmelidir. Kaynak sınav numarası, kaynak kayıt numarası ve resmî kitapçıkta kırmızı görünen şık verilmiştir.

| Sınav | Kaynak kayıt | Soru | Bizim doğru | Kitapçıkta kırmızı |
|---|---|---|---|---|
| 108 | #173 | Aşağıdakilerden hangisi veya hangileri bir binaya sadece yetkili/izinli kişilerin giriş çı | Yalnız I | I ve III / I, II ve III |
| 108 | #195 | Narkotik maddelerin sınıflandırılmasına göre aşağıdakilerden hangisi hayal gösterenler (Ha | Esrar | Eroin |
| 108 | #213 | Günlük hayatın akışı içinde, birbirini tanımayan insanların tesadüfen bir araya gelmeleri  | Liderler (Önderler) | Tesir altında kalanlar |
| 107 | #305 | X-Ray cihazından geçen maddelerin ekran üzerinde göründükleri renklerle ilgili aşağıdakile | IV | II- IV |
| 106 | #502 | Aşağıdakilerden hangisi silahı sökmeye başlamadan önce yapılması gereken ilk işlemdir? | Silah ölü noktaya tutulur | Şarjör çıkartılır |
| 105 | #574 | Kontrol noktasında görevli özel güvenlik görevlileri Sevgi ile Ayşe aşağıdaki yetkilerden  | V | III |
| 102 | #866 | Aşağıdakilerden hangisi yarı otomatik tabancanın gövdesinde yer alır? | Tetik | Gez / Tırnak / Tırnak yayı |
| 103 | #964 | Narkotik maddelerin sınıflandırılmasına göre aşağıdakilerden hangisi Merkezi Sinir Sistemi | Metamfetamin | Eroin |
| 103 | #1206 | Fişek çekirdeğinin namlu içerisinde kendi etrafında bir tur dönüşü sonunda aldığı mesafeye | Hatve | Azami menzil |
| 104 | #1268 | Kalabalık içerisinde kişi tipleri bulunmaktadır. Bu tiplerden birisi de; “Bir örgüte girer | Provokatörler | Tesir altında kalanlar ve karşı eylemcil |
| 106 | #1665 | Narkotik maddelerin sınıflandırılmasına göre aşağıdakilerden hangisi Hayal Gösterenler (Ha | Esrar | Eroin / Eroin |
| 101 | #1871 | 5188 sayılı Özel Güvenlik Hizmetlerine Dair Kanun’a göre, özel güvenlik görevlileri koruma | Yalnız I | I ve II / III |
| 110 | #2450 | 5188 sayılı Özel Güvenlik Hizmetlerine Dair Kanun’a göre aşağıdakilerden hangileri ruhsat  | I, II, V | III, IV, V / I, II, III, IV, V |
| 111 | #2775 | . 5188 sayılı Özel Güvenlik Hizmetlerine Dair Kanun’a göre aşağıdakilerinin hangisi/hangil | I ve IV | III / III, IV ve V |
| 112 | #3028 | 5188 sayılı Özel Güvenlik Hizmetlerine Dair Kanuna göre özel güvenlik eğitimini kimler ver | I, II, III | IV, V |
| 112 | #3048 | Aşağıdakilerden hangisi Özel Güvenlik Denetleme Başkanlığı tarafından yapılan sınavlardan  | Ehliyet Sınavı | Görev Köpeği ve İdarecisi Sınavı |
| 114 | #3590 | Bir futbol maçında görev alan özel güvenlik görevlileri maç sonunda sahaya inen topluluk v | Kama düzeni | Hat düzeni |
| 116 | #4013 | Aşağıdakilerden hangisi özel güvenlik görevlilerinin 5188 Sayılı Özel Güvenlik Hizmetlerin | Gözaltına alma | Yakalama / Olay yerini ve delilleri koruma |
| 116 | #4119 | Aşağıdakilerden hangisi MP5 Makinalı tabancanın ana parçalarından değildir? | Kurma kolu | Şarjör |
| 117 | #4200 | Aşağıdakilerden hangisi iletişim sürecinin temel ögelerinden biri değildir? | Yönetici | Kanal |
| 117 | #4220 | Günlük hayatın akışı içinde, birbirini tanımayan insanların tesadüfen bir araya gelmeleri  | Atılganlar | Tesir altında kalanlar |
| 118 | #4625 | Aşağıdakilerden hangisi Özel Güvenlik Denetleme Başkanlığı tarafından yapılan sınavlardan  | Ehliyet Sınavı | Görev Köpeği ve İdarecisi Sınavı |
| 119 | #4671 | Aşağıdakilerden hangisi özel güvenlik görevlilerinin kullandığı yetkiler arasında sayılmaz | Gözaltına alma | Yakalama / Emanete alma |
| 119 | #4710 | Sıvı yanıcı maddelerden kaynaklı yangınların söndürülmesinde hangi söndürme maddesi kullan | Su | Köpük |
| 119 | #4749 | Aşağıdakilerden hangisi Özel Güvenlik Denetleme Başkanlığınca yürütülen projelerden değild | UYUMA | KAAN |
| 119 | #4759 | Aşağıdakilerden hangisi MP5 Makinalı tabancanın başlıca ana parçalarından değildir? | Ateşleme iğnesi | Şarjör |
| 121 | #4943 | CCTV (Kapalı devre kamera kayıt sistemi) için aşağıda verilen ifadelerden hangisi doğrudur | Giriş çıkış gözetlenip kayıt altına alın | Kayıt cihazlarına tüm çalışanlar rahatlı |
| 121 | #4996 | Aşağıdakilerden hangisi Özel Güvenlik Denetleme Başkanlığının dijital projelerinden biri d | KADES | KAAN |
