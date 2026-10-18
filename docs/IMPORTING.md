# SQL ve PDF soru içe aktarma

Durum: ilk gerçek kaynak (`u987447310_asvip.sql`, kurum arşiv veritabanı dökümü) için **adapter `asvip-1` uygulandı ve 18 Ekim 2026'da geliştirme veritabanına aktarıldı** (aşağıda). SQL dışındaki kaynaklar (PDF) ve diğer şemalar için süreç tasarımı geçerlidir; kaynak şema bilinmeden başka adapter yazılmaz.

Kaynak dosyalar değiştirilmez. Gerçek kaynak veri aktarımı kullanıcı onayı olmadan başlatılmaz; geliştirme onayı bu veri aktarım onayının yerine geçmez.

## Güvenli iş akışı

1. Platform yöneticisi dosyayı yükler. Dosya boyutu, MIME/içerik, hash ve kaynak/hak bilgisi kaydedilir; kaynak özel karantinaya alınır.
2. Analiz işi sınırlı süre/bellek ve uygulama/üretim veritabanına erişemeyen ortamda çalışır. SQL uygulama connection'ında yürütülmez. SQL için önce lexer/parser veya gerekiyorsa izole geçici inceleme ortamı değerlendirilir.
3. PDF'de metin/tablo/görsel yapısı incelenir. Metin katmanı yoksa OCR ihtiyacı ayrıca belirlenir; seçilmemiş üçüncü taraf servise içerik gönderilmez.
4. Kaynak alanları staging satırlarına çıkarılır. Kaynak–ders/konu–seçenek–cevap anahtarı eşlemesi yöneticiye sunulur; format adaptörü gerçek örneğe göre yazılır.
5. Zorunlu alanlar, seçenek sayısı, tek doğru cevap, görsel bağlantısı, ders/konu tutarlılığı, encoding ve tekrar adayları doğrulanır. Eksik/şüpheli kayıtlar otomatik yayınlanmaz.
6. Yönetici önizleme ve hata raporunu inceler; kaynak hak durumunu ve hedef içeriği onaylar.
7. Onaylanmış staging snapshot'ı bounded batch transaction'larıyla taslak soru sürümlerine aktarılır. Başarılı/hatalı satır sonuçları ayrı raporlanır; yayınlama ayrıca yetkilidir.

## Kaynak dosyayı güvenle inceleme

`python3 scripts/inspect_sql_dump.py DUMP.sql` MySQL/MariaDB dökümünü **çalıştırmadan, hiçbir veritabanına bağlanmadan** metin olarak çözümler ve JSON rapor yazar: dosya SHA-256'sı, tablolar, kolon tanımları, anahtarlar, motor/karakter kümesi, INSERT satır sayıları, ifade türü sayıları ve riskli ifadeler (`GRANT`, `DROP` (IF EXISTS dışı), `CREATE USER/TRIGGER/PROCEDURE`, `LOAD DATA`, `INTO OUTFILE` vb.). Satır örnekleri varsayılan olarak kapalıdır; `--samples N` her tablo için en çok N kısaltılmış satırı yalnız terminale yazar. Rapor, adapter ve eşleme kararı için ham girdidir; import değildir ve onay yerine geçmez. `/*! ... */` koşullu yorumları atlanır (ör. `SET NAMES`); karakter kümesi raporda ayrıca kontrol edilmelidir. Sınırları: tek dosya akışı, tam MySQL ayrıştırıcısı değildir (örn. `DELIMITER` ile tanımlanan gövdeler riskli olarak işaretlenir ama çözümlenmez).

## Uygulanan adapter: `asvip-1` (kurum arşiv dökümü)

Kaynak dosya `docs/*.sql` git dışıdır ve kişisel veri içerir (öğrenci, sözleşme, ödeme, başvuru, cevap kayıtları). Adapter yalnızca beş tabloyu okur: `dersler`, `sinavlar`, `sorular`, `yanitlar`, `ogg_sinavlari`; diğer ifadeler ayrıştırılmadan atlanır. Dosya hiçbir veritabanında çalıştırılmaz ve değiştirilmez (`LegacyDump` yalnız metin okur).

**Kaynak yapısı (gerçek dosyadan):** `sinavlar.kategori_id = 2` bir sınavın tamamı (yaklaşık 125 soru, soru bazında `ders_id`), `3` aynı sınavın derse bölünmüş kopyasıdır; sınav numarası ad içindeki `N.` değeridir (100–121) ve resmî ÖGG Temel Eğitim sınav numaralarıyla örtüşür. 125 sorunun 25'i Silah Bilgisi ve Atış dersidir: silahsız adaylar 100, silahlı adaylar 125 soruluk sınava girer. Her numara için iki çıkmış sınav oluşturulur (`ogg-temel-silahli`, `ogg-temel-silahsiz` sınav türleri). 100 numaralı sınavın tam sınav kaydı yoktur, yalnız ders setleri vardır (125 soru): sorular ders sırasına göre dizilir; rapor `reconstructed_order` ile işaretler. Ürün sahibi soru sırasının önemli olmadığını belirtti; öncelik soru–seçenek–doğru cevap eşleşmesinin doğruluğudur.

**Kurallar:** metin HTML karakter kodlarından arındırılır; baştaki soru numarası (`12. `) ve seçenek harfi (`A) `) temizlenir; aynı soru (metin+seçenekler+doğru cevap) tek kayıt olur ve birden çok sınava bağlanır; aynı numaralı tam sınavla çelişen ders seti kopyası **ezilir** (tam sınav özgün kabul edilir). Tam sınavdaki seçeneksiz soru, aynı sınavın ders setinde aynı metinle tam kopyası varsa o kopyadan **tamamlanır** (`repaired_from_subject_set`). Güvenilir cevap anahtarı olmayan sorular (seçenek yok/eksik, tek doğru cevap yok, boş metin, doğru cevabı tekrar eden) **reddedilmez**: eldeki haliyle (boş kalan alanlar boş) **taslak** soru olarak aktarılır ve hiçbir zaman otomatik yayımlanmaz; çünkü cevap anahtarı olmayan soru öğrencide yanlış puanlanır. Boş metin için yer tutucu bir metin yazılır. Yalnız yanlış seçeneği tekrar eden sorular (kaynak yazım hatası) uyarıyla yayımlanır. Taslak soru içeren çıkmış sınav **taslak sınav** olarak aktarılır (soru sırası korunur); yönetici editör soruyu tamamlayıp yayımladıktan sonra sınav editöründe "Güncel yayımlanmış sürümü kullan" ile sürümü günceller ve sınavı yayımlar (yayımlamak için sabitlenen tüm sürümler yayımlanmış olmalıdır; PostgreSQL trigger'ı da bunu zorlar). Soru yayımlama `SaveQuestion` + `PublishQuestion`, sınav `SaveOfficialExam` + `PublishOfficialExam` ile yapılır. Soru kaynağı sınav numarası başına bir `question_sources` kaydıdır; atıf metni sınavın EGM tarafından uygulanan resmî sınav olduğunu ve yeniden kullanım hakkının ürün sahibince beyan edildiğini yazar. Sınav dönemi alanı ay adıdır (`Şubat`), yıl ayrı alandadır.

**Sınav tarihleri** `ogg_sinavlari` tablosundan (107–118) gelir; eksik olanlar kamuya açık EGM kaynaklı haberlerden araştırılıp adapter'a sabitlendi. Çelişki olursa önizleme `date_conflicts` uyarısı verir ve döküm kazanır:

| Sınav | Tarih | Kaynak |
| --- | --- | --- |
| 100 | 30.10.2022 | [Milliyet](https://www.milliyet.com.tr/galeri/ogg-sinavi-ne-zaman-basvuru-ucreti-ne-kadar-ozel-guvenlik-100-temel-egitim-ve-76-yenileme-egitimi-sinav-tarihi-2022-6829738), EGM sınav talimatı |
| 101 | 25.12.2022 | [EGM sonuç istatistiği](https://www.egm.gov.tr/ozelguvenlik/ozel-guvenlik-101-temel-egitim-ve-77-yenileme-egitimi-sinavina-ait-sonuc-istatistigi) |
| 102 | 30.04.2023 | EGM duyurusu (19.02.2023'ten depremle ertelendi); [Milliyet](https://www.milliyet.com.tr/galeri/ogg-sinavi-ne-zaman-yapilacak-102-ozel-guvenlik-sinav-ertelendi-mi-hangi-tarihte-yapilacak-6911389) |
| 103 | 24.06.2023 | [EGM sonuç istatistiği](https://www.egm.gov.tr/ozelguvenlik/ozel-guvenlik-103-temel-egitim-ve-79-yenileme-egitimi-sinav-sonuc-istatistigi) |
| 104 | 26.08.2023 | [Hürriyet](https://www.hurriyet.com.tr/bilgi/galeri/ogg-sinav-sonuclari-sorgulama-egm-gov-tr-egm-104-donem-ozel-guvenlik-sinav-sonuclari-aciklandi-mi-ne-zaman-aciklanacak-nereden-ogrenilir-42330863) |
| 105 | 21.10.2023 | [Takvim](https://www.takvim.com.tr/memur/2023/09/20/105-ogg-sinavi-ne-zaman-hangi-tarihte-yapilacak-2023-ozel-guvenlik-105-temel-egitim-sinav-giris-belgeleri-yayimlandi-mi) ve eğitim kurumu takvimi |
| 106 | 17.12.2023 | Milliyet (sonuç haberi), eğitim kurumu takvimi |
| 119 | 22.02.2026 | [Yeni Şafak](https://www.yenisafak.com/foto-galeri/ozgun/ozel-guvenlik-gorevlisi-sinavi-2026-subat-takvimi-ogg-sinavi-ne-zaman-ozel-guvenlik-119-temel-egitim-ve-95-yenileme-egitimi-tarihleri-4795917) |
| 120 | 03.05.2026 | [Hürriyet](https://www.hurriyet.com.tr/bilgi/galeri/ogg-sinavi-ne-zaman-yapilacak-ozel-guvenlik-120-temel-egitim-ve-96-yenileme-egitimi-sinavi-tarihi-2026-43141991), Türkiye Gazetesi |
| 121 | 05.07.2026 | Milliyet 2026 takvimi (tek kaynak; EGM sayfasıyla ayrıca doğrulanmalı) |

105, 106 ve 121 için resmî EGM sayfası bulunamadı; bu tarihler ikincil kaynaklara dayanır.

**Süreç (önizleme → onay → aktarım):** `php artisan import:legacy-preview DOSYA` dosyayı çözümler ve `import_batches` kaydına rapor (soru/sınav sayıları, hata listesi, ezilenler, çelişen ders/seçenekler, temizlenen numaralar), dosya SHA-256'sı ve eşleme hash'ini yazar; içerik oluşturmaz. `php artisan import:legacy-commit BATCH DOSYA --approve=KOD --by=YONETICI` yalnız rapordan türeyen onay koduyla, aynı dosya ve aynı eşleme için, doğrulanmış aktif platform yöneticisi onayıyla çalışır; dosya veya eşleme değiştiyse reddeder. Soru/sınav başına `import_records` birincil anahtarı (kaynak sistemi, tablo, anahtar) yeniden çalıştırmada içeriğin çoğalmasını engeller; her soru kendi transaction'ında yazılır. Audit olayı `import.committed` kaydedilir.

**18 Ekim 2026 geliştirme aktarımı:** 5.003 kaynak sorudan 2.789 benzersiz soru, 11 ders, 22 kaynak ve 44 çıkmış sınav (22 sınav × silahlı/silahsız) aktarıldı: **2.783 yayımlanmış + 6 taslak soru, 37 yayımlanmış + 7 taslak sınav**. Taslak sorular: kaynak kayıtları #3945 (boş metin, sınav 115), #4568 (118), #4679, #4718, #4728 (119) ve #5148 (121) — seçenekleri kaynakta yok (büyük olasılıkla görselli); taslak sınavlar 115, 118, 119 ve 121 numaralıların silahlı, 115, 118 ve 119 numaralıların silahsız sürümleridir. İki seçeneksiz soru ders setindeki kopyasından tamamlandı, 93 ders seti kopyası tam sınav kopyası ezildiği için alınmadı. Editörlerin işi: bu 6 soruyu tamamlayıp yayımlamak, taslak sınavlarda sürümü güncelleyip yayımlamak; ayrıca aynı metinli farklı seçenek/doğru cevap grupları, ders çelişkileri ve tekrarlı yanlış seçenek uyarıları raporda (`import_batches.report`). Yayımlanmış soru yönetim panelinde yeni sürümle düzeltilir; mevcut yayımlanmış sınavlar eski sürüme sabit kalır. Aktarım yalnız geliştirme veritabanına yapıldı (veritabanı sıfırlanıp yeniden aktarıldı). Doğrulama: yayımlanan 2.783 sorunun tamamı, bağımsız (Python) bir ayrıştırıcıyla kaynak dökümle soru metni, seçenek sırası ve doğru cevap bakımından birebir karşılaştırıldı; aynı metin ve aynı seçenek kümesinde farklı doğru cevap bulunmadı. Aynı metni farklı seçeneklerle taşıyan 92 grubun 6'sında bir sınavın doğru cevabı başka sınavda yanlış şık olarak geçiyor (ör. silah sökmede ilk işlem); bunlar [editör kontrol listesindedir](EDITOR_CHECKLIST.md); üretim aktarımı ayrıca yapılmalıdır.

## Veri bütünlüğü

`import_batches` kaynak SHA-256, adapter/mapping sürümü, doğrulama raporu hash'i, onaylayan ve onaylanan snapshot'ı tutar. Dosya/eşleme/çıkartılmış içerik değişince eski onay kullanılamaz. `import_rows` benzersiz `(batch_id,source_row_key)` ve hedef aktarım kimliğiyle retry güvenliği sağlar. Bir batch yeniden commit edilince sorular çoğalmaz.

Normalize soru metni, seçenekler ve görsel hash'leri mükerrer adayları bulur; kaynak dönemi ve varyasyonlar inceleme gerektirir. Aynı soru yeni sınav kaynağına bağlanabilir; otomatik yeni soru üretmek veya mevcut soru sürümünü overwrite etmek gerekmez. Yayınlanmış soru değişiyorsa yeni sürüm oluşur.

Hata raporu kaynak sayfa/satır, kararlı hata kodu, eksik alan ve önerilen düzeltmeyi taşır. Satırları önce staging'den incelemek zorunludur. Gerçek sınav sorusu uydurulmaz; test fixture'ları açıkça sentetik ve yalnız test/geliştirme ortamındadır.

## Doğrulama ve bekleyen girdiler

Test kapsamı: kötü SQL/DDL, aşırı dosya boyutu, parser süre aşımı, bozuk PDF, eksik cevap anahtarı, yanlış seçenek eşlemesi, encoding, görsel kaybı, mükerrer aday, onay sonrası içerik değişikliği ve kesilmiş import'u tekrar yürütme.

Gerçek kaynakların örnekleri ve telif/yeniden kullanım belgeleri sağlanınca adapter kararı, tam mapping ve başarı ölçütleri güncellenir. Kaynak yapısı görülene kadar herhangi bir sabit kolon şeması veya yüzde yüz otomatik PDF doğruluğu taahhüt edilmez.
