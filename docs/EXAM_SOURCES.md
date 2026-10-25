# Resmî sınav kaynağı hazırlığı — 26 Ekim 2026

Durum: **122. temel ve 98. yenileme eğitimi, her biri silahlı 125 ve silahsız 100 soru olarak oggsor.com üzerinde yayımlandı.** 122. temel, kullanıcının açık aktarım talimatıyla ayrıca tamamlandı. Yerel eğitim migration'ı önce ayrı onayla tamamlandı. 98. yenileme aktarımında telefonun API'si olan sunucudaki gerekli migration/kod güncellemesi de kullanıcıya bildirilerek dar kapsamda yapıldı. Normal sunucu operasyonu/backup sorumluluğu Claude'da kalır; deploy ve backup betikleri değiştirilmedi.

## Tamamlanan 122. temel aktarımı

- [Akademi Güvenlik 122. temel PDF](https://www.guvenlikegitimi.com/wp-content/uploads/2026/09/122.-Temel-Sinavi.pdf), Alo Güvenlik A kopyasıyla bayt düzeyinde aynıdır: SHA-256 `05d94ade6c9b095a259e2948049eddfc1053f61364e372b1c63802819ab15152`. A/B **125/125** karşılaştırmasına ek olarak A'nın 14 sayfası, 125 işaretli cevap ve 11 ders grubu incelendi. EGM asıl dosyasına doğrudan erişilmiş gibi işaretlenmedi. İncelenmiş `basic-122-reviewed-import.json` SHA-256: `03f8238d5d26efd1bd8e508fdbc8b5ba9ac7bb5997806bd30e7334e287c61cb4`.
- **51 yeni soru** eklendi, **74 yayımlanmış soru sürümü** aynı ders/metin/seçenek sırası/doğru cevap eşleşmesiyle yeniden kullanıldı. Silahlı 125 ve silahsız ilk 100 aynı sürümleri paylaşır. Yeni ders sınavı oluşturulmadı. İki seçenek `29.08.2026` tarihli 122. **temel** dönemine ve mevcut `verified_guide_2026_basic_armed` / `unarmed` kurallarına bağlandı. Önceki karar türleri korundu: silahlı `unverified` (puan hesaplanır, başarı koşulu doğrulanmış sayılmaz), silahsız `pass_fail`. Yenilemenin `level` kuralı temel sınava uygulanmadı; eski kurallar değiştirilmedi.
- Batch `01a1752d-2971-731c-b4ef-b45058c09330`; silahlı `01a1752d-459c-711d-830a-3bc36632c09c`; silahsız `01a1752d-4764-70ad-863f-1c63a5c624b2`. Yayın `2026-10-25T22:27:45Z` (26 Ekim 01:27 Türkiye saati). REPEATABLE READ transaction içinde **19 tablonun önceden var olan satırları korundu**; aynı batch tekrarı aynı sonucu verdi. Eski 286 temel sınava iki seçenek eklendi (**288 basic**); 98. yenilemenin iki seçeneği ve hesap/sonuç verileri korundu.
- Ayrı READ ONLY kontrolünde 125 metin/seçenek/doğru cevap/ders kodu snapshot ile birebir eşleşti; paylaşılan ilk 100 sürüm ve iki temel dönem bağlantısı doğrulandı. Canlı webde normal öğrenci girişiyle 390/1280 px'de 122. Deneme Sınavı ve 125/100 soru görüldü; silah değişince Temel eğitim seçimi korundu. Sınav başlatılmadı, cevap/geçmiş oluşturulmadı; kontrolün kendi oturumu kapatıldı. Fiziksel Expo Go ayrıca kullanılmadı.
- Kanıt/receipt sunucuda `storage/app/private/imports/basic-122-20261026/`, yerelde `artifacts/basic122-live/` içinde. Yeni migration, imaj yayını, servis yeniden başlatma, yerel ortak geliştirme DB'sine içerik yazması veya Git push yapılmadı. Deploy/backup betikleri ve diğer siteler değiştirilmedi.

## Tamamlanan 98. yenileme aktarımı

- Ek bağımsız kaynak: [Akademi Güvenlik 98. yenileme PDF](https://www.guvenlikegitimi.com/wp-content/uploads/2026/09/98.-Yenileme-Sinavi.pdf). İndirilen dosya, Alo Güvenlik kopyasıyla **birebir aynı SHA-256** değerini verdi: `062643ead5b3d9add2b3a0d11dce61d0dc6b24e253d01cb2a96b38b271e9bda5`. EGM asıl dosyasına doğrudan erişilmiş gibi işaretlenmedi; kanıt iki ayna, 125/125 A-B karşılaştırması ve 14 sayfanın görsel kontrolüdür. Önceki “asıl dosya hash'i olmadan bekle” yaklaşımı, bu ek kanıt ve inceleme tamamlanınca aktarımın önünde tutulmadı.
- 125 sorunun 11 ders grubuna eşleştirmesi tamamlandı. İncelenmiş snapshot `renewal-98-reviewed-import.json`; SHA-256: `4e2dcd1d5790c4a43cf07244b0c9cd4f0646eb6426a839f8b374a8a2d9c02377`. Son kullanıcı talimatı, açık önizlemenin bu kapsamda aktarım onayı olarak uygulandı.
- **123 yeni soru** oluşturuldu, aynı ders/metin/seçenek sırası/doğru cevaba sahip **2 yayımlanmış soru** yeniden kullanıldı. Mevcut soru sürümleri değiştirilmedi. Tek silahlı kaynak, ilk 100 sabit soru sürümünü paylaşan silahsız seçeneği üretti. Yeni ders sınavı oluşturulmadı.
- İki 98. yenileme dönemi, `29.08.2026` tarihiyle mevcut yayımlanmış `verified_guide_2026_renewal_armed` / `unarmed` kurallarına bağlandı. Karar türü `level`; mevcut puanlama kuralları veya eski hesaplar değiştirilmedi.
- Aktarım batch: `01a17518-4a3c-72b8-83aa-54befcf4592e`; silahlı sınav: `01a17518-7ea1-719b-870f-7980396c022f`; silahsız sınav: `01a17518-80d0-734a-8684-03cf49f262cb`. Aynı batch tekrarının aynı sonucu verdiği doğrulandı. İşlem 26 Ekim 2026 **01:05 Türkiye saati** civarında tamamlandı (makine kaydı `2026-10-25T22:05:03Z`).
- REPEATABLE READ transaction içinde **19 tablonun önceden var olan satırlarının** özetleri korundu. Hesaplar, eski sorular/sınavlar, cevaplar, konumlar, puan sonuçları ve kural kayıtları değiştirilmedi. Eski **286 temel sınav** korundu; iki yenileme seçeneği eklendi. Bu işlem yerel geliştirme `oggaq` veritabanına gerçek içerik yazmadı.
- Commit sonrasında sunucuda 125 sorunun metin, seçenek, doğru cevap ve ders kodu incelenmiş JSON ile birebir karşılaştırıldı. Silahsız sürüm ilk 100 sürümü paylaşır, iki dönem bağlantısı yenileme/seviye modelidir. `oggsor.com` webinde kayıtlı geliştirme öğrencisiyle yalnız giriş/liste görüntüleme/çıkış yapıldı: 390/1280 px'de 125/100 soru görünür, eğitim seçimi silah değişiminde korunur. Sınav başlatılmadı veya cevap/geçmiş yazılmadı; kontrolün kendi oturumu kapatıldı. Expo Go API'si aynı hosttur; fiziksel telefon bu teslimde ayrıca kullanılmadı.

## Sınırlı sunucu güncellemesi

`eedc82f` import aracı ve daha önce test edilmiş eğitim ayrımı dosyaları, mevcut `font-fa7c255` imajlarından türetilen `oggaq-development-app:renewal98-eedc82f` / `oggaq-development-web:renewal98-eedc82f` imajlarına alındı. Önceki AppServiceProvider tabanı yerel HEAD ile SHA-256 eşleşti. Yalnız 12 backend dosyası ve hazırlanmış öğrenci/admin dosyaları eklendi; eski hashli web varlıkları imajda kaldı. Paket bağımlılıkları/config/secrets değiştirilmedi. Yalnız adlandırılmış eğitim migration'ı çalıştırıldı.

Aktif kaynak `/home/harun/oggaq-development/releases/renewal98-eedc82f`; `manage` aynı release etiketiyle güncellendi. app/worker/scheduler/web yeniden oluşturuldu; PostgreSQL, Redis, posta ve tünel servisleri ile diğer siteler korunur. Önceki release/imajlar tutulur. Yeniden üretilebilir yayın girdileri `publication/` altında saklanır. Sunucu kayıtları `app-build.log`, `web-build.log`, `migration.log`, `activation.log` ve `renewal-manifest.json`; önceki manage betiği `manage.before` içinde. Hiçbir `deploy/` veya backup betiği değiştirilmedi.

İçerik kanıtı/snapshot ve receipt sunucu özel storage alanında `storage/app/private/imports/renewal-98-eedc82f/` altında. Yerel kontrol kanıtları `artifacts/renewal98-live/` içinde; gerçek credential/cookie/token kayda alınmadı. Git push yapılmadı.

## İlk hazırlığın kaynak ve kapsam kaydı

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

## İlk hazırlıkta kalanlar ve güncel sınır

26 Ekim tekrar kontrolü: EGM duyurusu iki alan adında da yeniden HTTP 500 döndü. Yerel `oggaq` üzerinde açıkça READ ONLY transaction ile yalnız yayımlanmış 2.759 soru/sürüm/seçenek ve ders bilgisi karşılaştırıldı; hesap verisi okunmadı ve içerik yazılmadı. Unicode NFC/boşluk normalizasyonuyla metin, seçenek sırası ve doğru cevap birlikte eşleştirildi. 98 yenileme A kitapçığında **2 birebir yayımlanmış eşleşme, 123 editör incelemesi gerektiren kayıt** var. 122 temel A için de sonuç 2/123. Eşleşmeyen soru aynı metin veya kaynak numarası varsayımıyla otomatik birleştirilmedi. Raporlar `renewal-98-mapping-preview.json` / `basic-122-mapping-preview.json`; bunlar da `publishable: false` durumundadır. Bu tarihsel kontrolün ardından yukarıdaki bağımsız PDF/görsel kontrolü tamamlandı ve 98. yenileme aktarımı yapıldı.

1. Doğrudan EGM dosyası tekrar erişilebilir olduğunda ek birincil kaynak kontrolü yapılabilir; mevcut 98. yenileme yayını, kayda alınan ayna karşılaştırması/görsel kontrolüyle tamamlandı.
2. 98. yenilemenin 14 sayfası ve ders eşleştirmesi incelendi. 122. temelin de 14 sayfası/ders eşleştirmesi incelendi ve aktarımı yukarıdaki kayıtla tamamlandı.
3. 98. yenileme için tekrar önizlemesi ve onaylı domain aktarımı tamamlandı. 122. temel de ayrı incelenmiş snapshot ve receipt ile yayımlandı. İlk çıkarım JSON'ları tarihsel önizleme durumlarını korur; güncel tüm tarihsel dönemlerin yüklendiği iddia edilmez.
4. Yerel ve sunucu eğitim migration'ı/API sürümü uygulandı; canlı API/web okuma kontrolü tamamlandı. Sunucu/yedek betikleri ve diğer projeler değiştirilmedi.
