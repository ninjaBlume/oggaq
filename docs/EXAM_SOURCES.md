# Resmî sınav kaynağı hazırlığı — 26 Ekim 2026

Durum: **kaynaklar indirildi ve inceleme çıktıları hazır; veritabanına aktarım/yayın yapılmadı.** Kullanıcı güncel kitapçıkların/cevapların toplanmasını istedi. Mevcut geliştirme DB ve hesaplarına dokunmama, sunucu operasyonunun Claude tarafından yürütülmesi talimatları korunur.

## Kaynak ve kapsam

[EGM 122. temel / 98. yenileme duyurusu](https://egm.gov.tr/ozelguvenlik/ozel-guvenlik-122-temel-egitim-ve-98-yenileme-egitimi-sinavina-ait-soru-kitapciklari-ve-cevap-anahtarlari-yayimlanmistir) arama dizininde dört kitapçığı listeliyor. Duyuruya doğrudan erişim `egm.gov.tr` ve `www.egm.gov.tr` üzerinden HTTP 500 döndü. Bu yüzden orijinal EGM dosyasıyla SHA-256 karşılaştırması yapılamadı. Dosyalar [kaynağı gösterilen ayna sayfasından](https://www.guvenlikkursu.com/sinav/cikmis-sorular/122-temel-98-yenileme) indirildi; henüz birincil kaynağı doğrulanmış sayılmaz.

123/99 için doğrudan resmî kitapçık bulunamadı. Yayımlanmadığı veya hangi gün yayımlanacağı bu incelemede resmî kaynaktan doğrulanamadı; tahmini kitapçık veya cevap oluşturulmadı.

| Eğitim / dönem | Kitapçık | Tarih | Soru / cevap | A-B karşılaştırması |
| --- | --- | --- | --- | --- |
| Temel / 122 | A ve B | 29.08.2026 | Her kitapçıkta 100 genel + 25 silah, her soruda 5 seçenek ve tek kırmızı cevap | 125/125 metin + seçenek + doğru cevap eşleşir |
| Yenileme / 98 | A ve B | 29.08.2026 | Her kitapçıkta 100 genel + 25 silah, her soruda 5 seçenek ve tek kırmızı cevap | 125/125 metin + seçenek + doğru cevap eşleşir |

Karşılaştırma Unicode NFC ve yalnız boşluk normalizasyonu kullanır; noktalama, sayılar ve harf büyüklüğü korunur. A-B ayrı 500 benzersiz soru sayılmaz: aktarım adayı olarak iki A kitapçığında toplam **250 soru kaydı** vardır; bunlar metin/seçenek/doğru cevapla birebir karşılaştırıldığında **176 tam eşleşmeli aday** kalır. Ortak soruların uygulama havuzuyla eşleştirilmesi ayrıca yapılmalıdır. Otomatik birleştirme veya mevcut soru sürümünü değiştirme yapılmadı.

## İnceleme dosyaları

Yerel `artifacts/official-exams/2026-10-26/` git dışında tutulur. `review.html` iki A kitapçığındaki soruları/işaretli cevapları ve kaynak sayfalarını alt alta gösterir. Dört özgün PDF, dört çıkarım JSON, iki karşılaştırma JSON ve `summary.json` saklanır. JSON çıktılarında `publishable: false`, `visual_review_required: true` ve kaynak/kitapçık/hash bilgileri vardır. Hiçbir cevap ağdan bağımsız tahmin edilmez.

İndirilen dosyaların tam SHA-256 değerleri:

- [basic 122 A](https://www.guvenlikkursu.com/api/uploads/egm-122-temel-a.pdf): `05d94ade6c9b095a259e2948049eddfc1053f61364e372b1c63802819ab15152`
- [basic 122 B](https://www.guvenlikkursu.com/api/uploads/egm-122-temel-b.pdf): `2d5280dc841807d25fe234d9998efbdee2189c1f1df390b8f6e9c587341d387e`
- [renewal 98 A](https://www.guvenlikkursu.com/api/uploads/egm-98-yenileme-a.pdf): `062643ead5b3d9add2b3a0d11dce61d0dc6b24e253d01cb2a96b38b271e9bda5`
- [renewal 98 B](https://www.guvenlikkursu.com/api/uploads/egm-98-yenileme-b.pdf): `8970beb62f166572a0a591662fda4148f36aebce9a0193ed85241cbb14d4f404`

## Tekrarlanabilir çıkarım

`scripts/extract-exam-booklet.py`, yalnız bu incelenen iki sütunlu, kırmızı cevaplı 100+25 kitapçık biçimini okur. Bu incelemede PyMuPDF 1.26.5 ayrı bir geçici belge ortamında kullanıldı; uygulama bağımlılığı değildir. Örnek:

```sh
python scripts/extract-exam-booklet.py <kitapcik.pdf> --education basic --number 122 --group A --source-url <indirilen-url> --announcement-url <egm-duyuru-url> --output <inceleme.json>
python scripts/extract-exam-booklet.py <b-kitapcik.pdf> --education basic --number 122 --group B --source-url <indirilen-url> --announcement-url <egm-duyuru-url> --compare-json <a-inceleme.json> --output <b-inceleme.json>
python3 scripts/extract-exam-booklet.test.py
```

20 MiB / 40 sayfa sınırı, doğru başlık/eğitim/dönem/kitapçık kontrolü, 1–100 ardından 1–25 sıra kontrolü, tam beş seçenek, tek işaretli cevap, aynı satırdaki renkli seçenekleri ayırma ve atış bölümü öncesindeki talimatları ayıklama vardır. Farklı soru sayısı/biçim OCR veya resim içeriği otomatik yayımlanmaz. Script veritabanına bağlanmaz.

## Kalan işler

1. EGM duyuru/özgün dosyası erişilebilirken aynaların bütünlüğünü doğrulamak.
2. PDF görünümünü tüm sorular için incelemek; ders/konu eşlemesini, varsa görsel/özel karakterleri doğrulamak. Metin çıkarımı ve A-B tutarlılığı tek başına tam görsel inceleme değildir.
3. Mevcut soru havuzuyla tekrar önizlemesi, kaynak/hak ve editör onayı sonrası normal API/domain işlemleriyle aktarım hazırlamak.
4. Yeni eğitim ayrımı migration/API sürümünü operasyon sahibiyle yayına almak; ardından onaylı içerik aktarımı yapmak. Bu çalışma `deploy/` veya yedek betiklerini değiştirmez.
