# SQL ve PDF soru içe aktarma

Durum: süreç tasarımı. Güncel yönergede kaynak SQL bankalarının MySQL/MariaDB biçiminde olduğu belirtilir. Gerçek SQL/PDF dosyaları sağlanmadı; kaynak şema, kolonlar, PDF yerleşimi, OCR gereksinimi ve kesin eşleme bilinmiyor.

Kaynak dosyalar değiştirilmez. Gerçek kaynak veri aktarımı kullanıcı onayı olmadan başlatılmaz; geliştirme onayı bu veri aktarım onayının yerine geçmez.

## Güvenli iş akışı

1. Platform yöneticisi dosyayı yükler. Dosya boyutu, MIME/içerik, hash ve kaynak/hak bilgisi kaydedilir; kaynak özel karantinaya alınır.
2. Analiz işi sınırlı süre/bellek ve uygulama/üretim veritabanına erişemeyen ortamda çalışır. SQL uygulama connection'ında yürütülmez. SQL için önce lexer/parser veya gerekiyorsa izole geçici inceleme ortamı değerlendirilir.
3. PDF'de metin/tablo/görsel yapısı incelenir. Metin katmanı yoksa OCR ihtiyacı ayrıca belirlenir; seçilmemiş üçüncü taraf servise içerik gönderilmez.
4. Kaynak alanları staging satırlarına çıkarılır. Kaynak–ders/konu–seçenek–cevap anahtarı eşlemesi yöneticiye sunulur; format adaptörü gerçek örneğe göre yazılır.
5. Zorunlu alanlar, seçenek sayısı, tek doğru cevap, görsel bağlantısı, ders/konu tutarlılığı, encoding ve tekrar adayları doğrulanır. Eksik/şüpheli kayıtlar otomatik yayınlanmaz.
6. Yönetici önizleme ve hata raporunu inceler; kaynak hak durumunu ve hedef içeriği onaylar.
7. Onaylanmış staging snapshot'ı bounded batch transaction'larıyla taslak soru sürümlerine aktarılır. Başarılı/hatalı satır sonuçları ayrı raporlanır; yayınlama ayrıca yetkilidir.

## Veri bütünlüğü

`import_batches` kaynak SHA-256, adapter/mapping sürümü, doğrulama raporu hash'i, onaylayan ve onaylanan snapshot'ı tutar. Dosya/eşleme/çıkartılmış içerik değişince eski onay kullanılamaz. `import_rows` benzersiz `(batch_id,source_row_key)` ve hedef aktarım kimliğiyle retry güvenliği sağlar. Bir batch yeniden commit edilince sorular çoğalmaz.

Normalize soru metni, seçenekler ve görsel hash'leri mükerrer adayları bulur; kaynak dönemi ve varyasyonlar inceleme gerektirir. Aynı soru yeni sınav kaynağına bağlanabilir; otomatik yeni soru üretmek veya mevcut soru sürümünü overwrite etmek gerekmez. Yayınlanmış soru değişiyorsa yeni sürüm oluşur.

Hata raporu kaynak sayfa/satır, kararlı hata kodu, eksik alan ve önerilen düzeltmeyi taşır. Satırları önce staging'den incelemek zorunludur. Gerçek sınav sorusu uydurulmaz; test fixture'ları açıkça sentetik ve yalnız test/geliştirme ortamındadır.

## Doğrulama ve bekleyen girdiler

Test kapsamı: kötü SQL/DDL, aşırı dosya boyutu, parser süre aşımı, bozuk PDF, eksik cevap anahtarı, yanlış seçenek eşlemesi, encoding, görsel kaybı, mükerrer aday, onay sonrası içerik değişikliği ve kesilmiş import'u tekrar yürütme.

Gerçek kaynakların örnekleri ve telif/yeniden kullanım belgeleri sağlanınca adapter kararı, tam mapping ve başarı ölçütleri güncellenir. Kaynak yapısı görülene kadar herhangi bir sabit kolon şeması veya yüzde yüz otomatik PDF doğruluğu taahhüt edilmez.
