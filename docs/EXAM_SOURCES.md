# Resmî sınav kaynağı hazırlığı — 26 Ekim 2026

Durum: **76–98. yenileme arşivi ve 122. temel, deneme ve ders sınavlarıyla oggsor.com üzerinde yayında.** 122. temel, kullanıcının açık aktarım talimatıyla ayrıca tamamlandı. Yerel eğitim migration'ı önce ayrı onayla tamamlandı. 98. yenileme aktarımında telefonun API'si olan sunucudaki gerekli migration/kod güncellemesi de kullanıcıya bildirilerek dar kapsamda yapıldı. Normal sunucu operasyonu/backup sorumluluğu Claude'da kalır; deploy ve backup betikleri değiştirilmedi.

## Eski temel arşivindeki eksik içerikler — 26 Ekim 2026

Kullanıcının eksik şık/yanıtları tamamlama talimatıyla canlı soru bankası tarandı: **5 taslak soruda seçenekler ve doğru cevap boştu; 1 taslakta soru kökü yerine kaynak-boş yer tutucusu vardı.** Yayımdaki 4.120 sorunun beş seçeneği ve seçeneklerine ait bir doğru cevap kimliği zaten bulunuyordu. Yangın sınıfı sorularındaki `A`, `B` gibi kısa seçenekler eksik içerik sayılmadı.

| Temel sınav | Cevaplı A kitapçığı sorusu | Önceki uygulama sırası | Tamamlanan içerik | Anahtar |
| --- | --- | --- | --- | --- |
| 115 | 59 | 63 | Yangın sınıfı sorusunun eksik kökü; mevcut beş şık doğrulandı | A |
| 118 | 37 | 41 | Kamera çeşitleri: beş şık ve doğru cevap | E |
| 119 | 19 | 28 | Parmak izi özellikleri: beş şık ve doğru cevap | C |
| 119 | 61 | 67 | Narkotik madde: beş şık ve doğru cevap | A |
| 119 | 71 | 77 | Sempati tanımı: beş şık ve doğru cevap | B |
| 121 | Silah 25 (toplam 125) | 125 | İç balistik: beş şık ve doğru cevap | D |

**Kanıt:** [118 EGM A](https://www.egm.gov.tr/kurumlar/egm.gov.tr/IcSite/ozelguvenlik/Sinav-Kitapcik/Ozel-Guvenlik-Sinavi/118-94/TEMEL-A-CEVAPLI.pdf), [119 EGM A](https://www.egm.gov.tr/kurumlar/egm.gov.tr/IcSite/ozelguvenlik/Sinav-Kitapcik/Ozel-Guvenlik-Sinavi/119-95/TEMEL-A-KITAPCIGI.pdf) ve [121 EGM A](https://www.egm.gov.tr/kurumlar/egm.gov.tr/IcSite/ozelguvenlik/Sinav-Kitapcik/Ozel-Guvenlik-Sinavi/121-97/TEMEL_A-KITAPCIGI.pdf) bu işlemde doğrudan indirildi. İlgili soruların kökü, beş seçeneği ve doğru cevap metni EGM B kitapçıklarıyla da eşleşti; B sıraları sırasıyla 60; 67/41/37; silah 6'dır. A'nın ilgili sayfaları görsel incelendi. Dosyalar Alo Güvenlik kopyalarıyla bayt düzeyinde aynıdır. 115 için [Akademi Güvenlik cevaplı A PDF'si](https://www.guvenlikegitimi.com/wp-content/uploads/2025/07/115.-Temel-Sinavi.pdf), sayfa 8 kullanıldı; mevcut beş şık aynı sırayla eşleşir. **115'in EGM asıl dosyasına erişildiği iddia edilmez.** Kaynak URL/hash/inceleme notları yeni sürümlerin dört ayrı kaynak kaydında ve işlem manifestindedir.

**Uygulama:** Altı eski taslak sürüm değiştirilmeden saklandı; mevcut yönetici yetkilendirmeli `SaveQuestion` / `PublishQuestion` eylemleriyle altı yeni yayımlanmış sürüm üretildi. `ApplyQuestionVersionToExams` ile yalnız 17 mevcut soru bağlantısı yeni sürüme taşındı. Bu eksikler yüzünden bekleyen **7 tam deneme seçeneği ve 6 ders sınavı**, `PublishOfficialExam` ile yayımlandı; yeni sınav/soru kaydı eklenmedi, önceki arşiv sıralaması değiştirilmedi. Altı düzeltilmiş soru ve 13 sınav öğrenci HTTP API'sinde doğrulandı; sınav başlatılmadı, cevap/sonuç oluşturulmadı.

**Koruma/doğrulama:** Önce REPEATABLE READ transaction içinde tüm işlem uygulanıp geri alındı; önizleme başarılı olunca aynı manifest canlıya uygulandı. Hesap/kurum/üyelik/çalışma bağlamı, deneme/cevap/puan, favori/konum ve puanlama bağlantılarını içeren 13 tablonun özetleri değişmedi. Önceden var olan bütün soru sürümleri, seçenekler ve kaynak satırları; kapsam dışı soru başlıkları, sınavlar ve bağlantılar da aynı kaldı. Tekrar çalıştırma altı mevcut yeni sürümü tanıdı, ek sürüm üretmedi. Son tarama: **4.126 yayımlanmış soru; güncel sürümlerde eksik şık/doğru cevap 0**. Tarihsel eksik taslaklar sürüm geçmişinde kalır.

İncelenmiş manifest SHA-256: `95f078548d1cc7f95aa1f8a1696a93286ec11b4d9fa0ac77c828b028866c105c`. Kaynak PDF'ler, yürütücü, önizleme ve receipt sunucuda `storage/app/private/imports/question-completeness-20261026/`, yerelde `artifacts/question-completeness/` içindedir. Yerel ortak `oggaq` veritabanı, uygulama kodu, migration, servisler, deploy/backup kaynakları ve Git uzak dalı değiştirilmedi. İlgili mevcut **50 PostgreSQL testi / 520 assertion** geçti; fiziksel cihazda yeniden çözüm denenmedi.

## Ekim 2022’ye uzatılan yenileme arşivi — tamamlandı

Kullanıcının açık aktarım/yayın talimatıyla **30 Ekim 2022–17 Aralık 2023 arasındaki 76–82. yenileme** eklendi: **875 soru kaydı, 14 deneme seçeneği ve 77 ders sınavı**. Böylece canlı `oggsor.com` API'sinde **76–98 arasında 23 yenileme dönemi, 46 tam seçenek ve 253 ders sınavı** vardır. Her dönem 125 silahlı / aynı sürümlerin ilk 100'ünü paylaşan silahsız seçeneği ve 11 ders içerir. Dersler ortak Ders listesine eklenir; ayrı eğitim filtresi yoktur. Aşağıdaki 2024–2026 bölümü önceki aktarımın tarihsel kaydıdır.

| Yenileme | Kitapçık tarihi | Tam A/B eşleşmesi | İncelenmiş snapshot SHA-256 |
| --- | --- | --- | --- |
| [76](https://www.guvenlikegitimi.com/wp-content/uploads/2022/11/76.-Yenileme-Sinavi.pdf) | 2022-10-30 | 121/125 | `f751ad3efe98749ad9348bfc945b276ced44793ffac76cfcbc984209bc7374c1` |
| [77](https://www.guvenlikegitimi.com/wp-content/uploads/2023/01/77.-Yenileme-Sinavi.pdf) | 2022-12-25 | 123/125 | `d1441c80f75c25845ab210813905045f109c8fcd2789661ffe91795b6f5bef00` |
| [78](https://www.guvenlikegitimi.com/wp-content/uploads/2023/05/78.-Yenileme-Sinavi.pdf) | 2023-04-30 | 125/125 | `2b0565d29084d027f187c7a5e1a4789b25d25f5c2936e4ebdddfc8bd76b81432` |
| [79](https://www.guvenlikegitimi.com/wp-content/uploads/2023/07/79.-Yenileme-Sinavi.pdf) | 2023-06-24 | 125/125 | `40b39a44f76f4567dafb93119f3bc00fa11469de9605d0639b798d42dbd7e2d9` |
| [80](https://www.guvenlikegitimi.com/wp-content/uploads/2023/08/80.-Yenileme-Sinavi.pdf) | 2023-08-26 | 125/125 | `5d8f35dee1417c5e04daa40996de2f78455c04892bbca25bfc95ed4b90e7684f` |
| [81](https://www.guvenlikkursu.com/api/uploads/egm-81-yenileme-a.pdf) | 2023-10-21 | 125/125 | `37a34cba67f24e143790eb5ac9eb32a696a9f9c8f35c6e2366786ad14da2d958` |
| [82](https://www.guvenlikegitimi.com/wp-content/uploads/2023/12/82.-Yenileme-Sinavi.pdf) | 2023-12-17 | 125/125 | `c519a6be1f536e2e24f92132920493a18fd9292a4e8618cffb233f3195d49e90` |

**Kaynaklar:** [Akademi Güvenlik arşivi](https://www.guvenlikegitimi.com/yenileme-egitim-sinav-soru-ve-cevaplari/) üzerindeki 76–80 ve 82 A PDF'leri, Efeler Güvenlik arşivinde gözlenen [A](https://efelerozelguvenlik.com/wp-content/uploads/2025/04/76.-Yenileme-A-Kitapcik.pdf) / [B](https://efelerozelguvenlik.com/wp-content/uploads/2025/04/76.-Yenileme-B-Kitapcik.pdf) dosyalarıyla karşılaştırıldı. 81 için Akademi bağlantısı PDF yerine HTML döndürdü; bu belge aktarılmadı. [Alo Güvenlik 105/81 sayfasında](https://www.guvenlikkursu.com/sinav/cikmis-sorular/105-temel-81-yenileme) gözlenen [81 A PDF'si](https://www.guvenlikkursu.com/api/uploads/egm-81-yenileme-a.pdf) kullanıldı. 77–82'nin iki A kopyası bayt düzeyinde aynıdır. 76'nın PDF baytları farklı, ancak 125 soru/metin/seçenek/cevap eşleşir; farklı PDF kanıtı kendi hash'iyle plana bağlandı. EGM duyurusu doğrudan HTTP 500 döndürdü; birincil EGM dosyasına erişilmiş gibi kaydedilmedi. 21 PDF'nin adres/hash bilgileri yerel `download-report.json` içindedir.

**İnceleme:** A kitapçıklarının 14'er sayfalık düzeni ve fark/son bölüm sayfaları görsel olarak incelendi; sorularda aktarımı eksik kalacak bir şekil görülmedi. A/B karşılaştırmasında cevap çelişkisi yok. Altı yazım farkında A korunur: 76 A4/B84 apostrof, A94/B11 `25 mt.` / `25 m`, A109/B121 virgül, A110/B122 `kalibre` harf büyüklüğü; 77 A10/B88 alt çizgi ve A100/B1 boşluk noktası sayısı. 78 A70/A85 aynı kökü farklı seçenek sırasıyla içerir; A70/B28 ve A85/B20 ayrı ayrı eşleşir, ikisi de korunur. Dersler içerik sınırlarından incelendi: 76–80 hukuk ilk 20, 81–82 ilk 18 sorudur; 79 kişi koruma 97'ye kadar, genel kolluk 98–100'dür. Diğer ders sınırları ve adetleri manifestte kayıtlıdır.

**Yayın ve koruma:** 368 yeni soru, 507 aynı ders/metin/sıralı seçenek/anahtara sahip yayımlanmış sürüm kullanıldı. Yeni dersler aynı 125 sürümü paylaşır; tam sınav puanlama bağlantısı taşımaz. Yedi dönem kendi tarihleri ve mevcut `verified_legacy_renewal_armed/unarmed` kurallarıyla bağlıdır; karar türü `level` korunur. Her kitapçık + dersleri REPEATABLE READ transaction içinde önizleme/onayla eklendi; 19 tablonun eski satırları, hesaplar, cevaplar, konumlar, sonuçlar ve kurallar korundu. Tam/ders aktarımının tekrarı aynı kimlikleri verdi; 875 metin/seçenek sırası/anahtar/ders, ilk 100 türev ve puanlama bağlantıları işlemde doğrulandı.

**Canlı kontrol:** Normal öğrenci oturumunda API 23×125 silahlı / 23×100 silahsız ve 253 ders döndürdü. Her dönemde 11 ders ve toplam 125 soru vardır. Webde 390/1280 px'de 76, 82, 98 ve ortak Ders listesinde 122'nin de korunduğu görüldü; 76 kartı **Ekim 2022** gösterir. Sınav başlatılmadı, cevap/geçmiş yazılmadı; kontrol oturumu kapatıldı. Fiziksel Expo Go ayrıca denenmedi. Kaynak ve inceleme `artifacts/renewal-archive-2022/review.html`, kanıt/receipt/ekranlar aynı klasördedir; sunucuda `storage/app/private/imports/renewal-archive-2022/` saklanır. Test edilmiş mevcut import sınıfları yalnız özel storage CLI'sinde kullanıldı; yeni migration, imaj, servis yeniden başlatma, yerel ortak `oggaq` içerik yazması veya Git push yok. Deploy/backup betikleri ve diğer siteler değişmedi.

## 2024–2026 yenileme arşivi ve ders sınavları — tamamlandı

Kullanıcının güncel talimatıyla **83–98. yenilemenin tamamı** yayımlandı: **16 dönem, 2.000 soru kaydı, 32 silahlı/silahsız deneme seçeneği ve 176 yenileme ders sınavı**. Önceden yüklü 98 tekrar çoğaltılmadı. Eksik 15 dönemin 1.875 soru kaydında **819 yeni soru** oluşturuldu, **1.056 yayımlanmış sürüm** yeniden kullanıldı. Bunlara ek olarak 122. temelin **11 ders sınavı** tamamlandı; bu işlemde toplam **187 ders sınavı** eklendi. Ders ekranları ortak kalır; eğitim metaverisi ve sabit sürümler korunur. Aşağıdaki eski “ders oluşturulmadı” kayıtları ilk aktarım anını anlatır; güncel karar bu bölümdür.

| Yenileme | Sınav tarihi | Yeni soru / kullanılan sürüm | Ders sınavı |
| --- | --- | --- | --- |
| 83 | 2024-02-24 | 55 / 70 | 11 |
| 84 | 2024-04-27 | 58 / 67 | 11 |
| 85 | 2024-06-29 | 49 / 76 | 11 |
| 86 | 2024-08-25 | 60 / 65 | 11 |
| 87 | 2024-10-20 | 60 / 65 | 11 |
| 88 | 2024-12-15 | 53 / 72 | 11 |
| 89 | 2025-02-09 | 64 / 61 | 11 |
| 90 | 2025-04-12 | 50 / 75 | 11 |
| 91 | 2025-06-29 | 50 / 75 | 11 |
| 92 | 2025-08-24 | 33 / 92 | 11 |
| 93 | 2025-10-19 | 50 / 75 | 11 |
| 94 | 2025-12-14 | 61 / 64 | 11 |
| 95 | 2026-02-22 | 60 / 65 | 11 |
| 96 | 2026-05-03 | 59 / 66 | 11 |
| 97 | 2026-07-05 | 57 / 68 | 11 |
| 98 | 2026-08-29 | Önceden yüklü 125 soru | 11 |

**Kaynaklar ve inceleme:** [Akademi Güvenlik arşivi](https://www.guvenlikegitimi.com/yenileme-egitim-sinav-soru-ve-cevaplari/), [Efeler Güvenlik arşivi](https://efelerozelguvenlik.com/cikmis-sinav-sorulari/), [Alo Güvenlik arşivi](https://www.guvenlikkursu.com/sinav/cikmis-sorular) ve 91 için [ikinci kurumun A/B belgeleri](https://ozelguvenlik.sinavinahazirlaniyorum.com/category/ders-notlari/) karşılaştırıldı. 14 dönemin A PDF'leri iki hostta bayt düzeyinde aynıdır. 90'da farklı PDF baytları aynı 125 metin/seçenek/cevabı taşır. 96'da yayımlanan Word A/B belgeleri PDF kopyasıyla karşılaştırıldı; her soru içinde doğru cevap rengi de doğrulandı. HTML dönüştürmede kaybolan otomatik Roma madde numaraları PDF sayfa 13 ile ayrıca kontrol edildi. Dosyalar/hashler, karşılaştırmalar, ders adetleri ve inceleme notları `artifacts/renewal-archive-2024/manifest.json` ve dönem alt klasörlerindedir. 224 sayfa genel görünümde incelendi, çıkarım/kaynak anahtarı farkları ayrıntılı sayfalarda kontrol edildi; soru diyagramı atlanmadı. 2024'ün 83–87. dönemlerinde ders sınırları yeni dönemlerden farklıdır; 92'nin cihaz/ilk yardım sınırı ve 94'ün gaz sorusu ayrıca ayrıldı.

**A/B farkları:** Noktalama, harf büyüklüğü ve bir Word liste dönüşümü dahil toplam **13 soru için açıklanmış karşılaştırma farkı** vardır; 125/125 harfiyen A/B eşleşmesi varmış gibi işaretlenmedi. 91 A79/B24 ve A85/B10'da B kitapçığının seçenek sırası farklı olduğu halde işaretli harf aynı kalmış, doğru cevap metinleri çelişmektedir. İki bağımsız eş A kopyasında görülen **A anahtarı aynen korundu**; B anahtarı A'ya taşınmadı, resmî düzeltme ilan edildiği iddia edilmedi. İçe aktarıcı her istisnanın konumunu/gerekçesini onay hash'ine bağlar. EGM asıl dosyasına doğrudan erişim hâlâ doğrulanmadı; 99 için doğrulanmış kitapçık bulunamadığı için soru/cevap üretilmedi veya yayımlanmadı.

**Puanlama ve koruma:** 83–91 yenileme dönemleri mevcut `verified_legacy_renewal_armed/unarmed`, 92–98 ise `verified_guide_2026_renewal_armed/unarmed` kurallarına, kitapçık tarihleriyle bağlandı. Yenileme karar türü `level` kalır. Kısmi ders sınavlarına tam sınav puanlama bağlantısı eklenmez. Her kitapçık ve dersleri tek transaction içinde önizleme/onayla yayımlandı; 19 tablonun önceden var olan satırları korundu, tam/derse bölünmüş kayıtların tekrarında kimlikler çoğalmadı. Sunucudaki 2.000 yenileme ve 122. temelin 125 sorusu metin/seçenek sırası/anahtar/ders bakımından snapshotlarla karşılaştırıldı. Mevcut sürümlerde yalnız satır sonu/boşluk farkı kabul edildi (trim ve boşlukları birleştirme); noktalama, sayılar ve harf büyüklüğü korundu. İlk 83 aktarımı, katı karakter eşitliğinin mevcut sürümdeki satır sonu farkını reddetmesiyle bütünüyle geri alındı; aktarım aracının zaten kullandığı bu boşluk normalizasyonu doğrulamaya da uygulanınca tamamlandı.

**Canlı kontrol:** Normal öğrenci oturumunda API tüm 16 silahlı 125 / 16 silahsız 100 seçeneği ve her dönemin 11 dersini döndürdü; 122'nin 11 dersi de görünür. 390/1280 px'de yenileme listesi ve ortak ders listesi kontrol edildi. Sınav başlatılmadı veya cevap/geçmiş yazılmadı; yalnız kontrol oturumu kapatıldı. Fiziksel Expo Go ayrıca denenmedi. Kaynak incelemesi `artifacts/renewal-archive-2024/review.html`; receipt, ekran ve kontrol raporları aynı klasördedir. Sunucu kalıcı kanıtı `storage/app/private/imports/renewal-archive-2024/` altındadır.

**Operasyon sınırı:** `040d5b0` ile test edilmiş iki import sınıfı, yalnız bu veri işleminin CLI yürütücüsünde özel storage yolundan yüklendi; çalışan HTTP uygulaması/imajı/servisleri değiştirilmedi. Yeni migration, imaj yayını veya yeniden başlatma yok. Kaynak sınıfları, manifest, özgün belgeler, yürütücü ve 17 işlem receipt'i özel storage içinde yeniden denetim için tutulur. Yerel ortak `oggaq` içerik veritabanına yazılmadı; deploy/backup betikleri, Claude'un geliştirme servisleri ve diğer siteler değiştirilmedi. Git push yapılmadı.

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
