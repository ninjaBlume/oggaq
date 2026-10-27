# Dilekçe ve tutanak hazırlama

28 Ekim 2026 kullanıcı düzeltmesi: **Matbu metinler ÖGG SOR için özgün olarak yazılır. Firma/kurum formu veya kurumsal matbu bağlantısı kullanılmaz. Belgelerde tarih gg/aa/yyyy biçimindedir.** İlk araştırmanın kurum katalogları ürün şablonu veya atıf kaynağı değildir; eski araştırma kaydı Git geçmişinde bulunur.

## Örnekler ve kullanım

Yan menüde **Dilekçe hazırla** ve **Tutanak hazırla** bulunur. Ana sınav sekmeleri değişmez. Örnek seç → matbu / bilgilerimle / serbest → düzenle → metni önizle → PDF aç / indir. Tarayıcının PDF görünümünde kaydetme, paylaşma ve yazdırma kullanılır.

`backend/resources/document-templates.json`, sürüm **2026-10-28.2**, 14 özgün metin içerir. Her belge türünün kendi cümleleri ve doldurma alanları vardır; matbu çıktı yalnız alan başlıklarından oluşmaz. Başlık, anlatım, muhatap, ekler ve imza rolleri kişiye göre düzenlenebilir. Kurum logosu, doküman numarası, resmî onay veya zorunlu imza sayısı iddiası eklenmez. Kullanıcının vermediği olay, kişi, tarih veya tanık üretilmez.

- Dilekçeler: genel talep/bildirim, izin, vardiya/nöbet değişikliği, özel güvenlik kimlik yenileme, kayıp kimlik, kimlik bilgisi değişikliği, silah farkı, serbest dilekçe.
- Tutanaklar: olay/tespit, buluntu eşya, teslim-tesellüm, nöbet devir-teslim, malzeme/teçhizat arızası, serbest tutanak.

Matbu örnekte isimler ve kişisel bilgiler otomatik doldurulmaz; boş alanlar elle doldurulabilir. Dilekçelerde adres ve iletişim için de alan ayrılır. Bilgilerimle yönteminde girilen değerler aynı özgün metnin yerlerine yerleştirilir; son metin kullanıcı tarafından düzenlenir. Bilinmeyen isteğe bağlı tarih/saat boş bırakılır. PDF başvuru göndermez veya elektronik imza oluşturmaz. Kullanıcı kurumunun istediği başvuru yolunu ayrıca kontrol eder.

## Tarihler

Belge tarihi, izin başlangıcı/bitişi, kayıp ve tutanak tarihi alanları **gg/aa/yyyy**, örneğin **28/10/2026** biçimindedir. PDF başlığı ve şablon tarihleri de bu biçimde gösterilir; boş tarih `../../....` olur. Olay tarihi ve saat ayrı alanlardır; isteğe bağlı saat `ss:dd` biçimindedir. Serbest metin içindeki kullanıcının kendi ifadeleri otomatik yeniden yazılmaz.

Sunucu gerçek takvim gününü, artık yılı, saat aralığını ve izin bitişinin başlangıçtan önce olmamasını doğrular. `DocumentDates`, API'de eski yayımlanmış istemcilerin ISO `yyyy-aa-gg` değerini de kabul eder; doğrulanan değer içeride ISO olarak tutulur. Bu uyumluluk kullanıcı arayüzünün veya PDF'nin ISO gösterdiği anlamına gelmez. Sınav kartlarının daha önce istenen “29 Ağustos 2026” tarih gösterimi bu belge özelliğiyle değiştirilmez.

## Veri yaşamı ve PDF güvenliği

- Aktif hesapla katalog/taslak/dışa aktarma; öğrenciye genel e-posta doğrulama kapısı yoktur. Kurum verisi okunmaz/yazılmaz; migration veya belge arşivi yoktur.
- `POST /api/v1/document-exports`, doğrulanmış metni/rolleri şifreli uygulama cache’inde en çok 5 dakika erişilebilir tutar. 256 bit rastgele erişim anahtarının SHA-256 özeti cache anahtarıdır. API ve istemci bu bilgileri loglamaz.
- Mobil URL’nin API origin/yol/fragment biçimini doğrular. Bearer oturum anahtarı tarayıcıya taşınmaz. Erişim anahtarı yalnız fragmentten alınıp adresten kaldırılır ve POST gövdesinde gönderilir. Aynı sekmede yeni fragmentle açılış desteklenir.
- Cache kilidiyle tek kullanım; tüketimde hesap aktifliği ve varsa mobil oturum geçerliliği kontrol edilir. İptal edilen oturum, pasif/silinmiş hesap, kullanım veya süre bitimi açılışı engeller. Linki bilen kişi süre içinde belgeye erişebilir; belge paylaşılacaksa indirilen PDF kullanılır.
- Dompdf 3.1.6, gömülü DejaVu Sans, A4, sayfa numarası. Sabit Blade görünümünde metinler kaçışlanır. Uzak kaynak, PHP ve JavaScript yürütme kapalı; dosya okuma kökü font klasörüdür. İmza blokları bölünmez, uzun metin sayfalanır.
- Açma betiği aynı origin'deki `viewer.js` API kaynağıdır; nonce CSP ve mevcut nginx `script-src 'self'` politikası birlikte korunur. Capability endpoint'i cookie ile yetki vermez; yalnız bu POST handoff CSRF'den muaftır.
- PDF bellekte üretilip yanıtlanır; sunucuda dosya arşivi yoktur. Cache kaydı kullanımla tüketilir veya TTL sonunda erişilemez olur. Altyapı/yedeklerin şifreli artık kayıtları normal saklama politikasına tabidir. İndirilen/paylaşılan/yazdırılan kopyayı kullanıcı yönetir.
- Taslak ekran belleğindedir; yardımcı ekrandan çıkınca kalıcı taslak tutulmaz. Hata sırasında aynı ekrandaki metin korunur. Yeni native bağımlılık veya izin eklenmedi.

Yapay zekâ sağlayıcısı kullanılmaz, belge başına API ücreti yoktur. Gerçek belge içeriği dış AI servisine gönderilmez. `sources` API alanı yalnız eski istemcilerle uyumluluk için boş dizi olarak korunur; uygulamada kurum/firma bağlantısı gösterilmez. Gizlilik sayfası geçici belge verisini açıklar. Yazılımın varlığı hukuki uygunluk veya resmî kabul onayı yerine geçmez.

## Doğrulama ve teslim

Yeni sürümün kanıtları `artifacts/original-documents/` içinde tutulur. İlk PDF sürümünün kodu `4204b4b`, CSP/sekme düzeltmesi `16ec316`; ilk beta iOS `01a17f7b`, Android `01a17f7c` idi. Bunlar yeni özgün şablon/düz tarih arayüzünün cihaz teyidi değildir. Güncel kontroller ve teslimler [TESTING](TESTING.md), [IOS_BETA](IOS_BETA.md), [ANDROID_BETA](ANDROID_BETA.md) içinde ayrıca kaydedilir.

İlk sürümün `artifacts/documents/` kanıtları eski örnek metinleri gösterir; yeni şablonların yerine sayılmaz. İlk geri dönüş dosyası sunucuda `publication/documents-20261028/services.before-documents.yaml`, yeni değişiklik öncesi geri dönüş dosyası `publication/original-documents-20261028/services.before-original.yaml` olur. Ortak override `publication/student-access-20261027/services.compose.yaml`; geri alınırken ilgili eski dosya bu konuma kopyalanıp `~/oggaq-development/manage up -d --no-deps app worker scheduler` çalıştırılır ve web nginx yeniden yüklenir. Soru, hesap, sonuç, posta veya DNS değişikliği yapılmaz.

Özgün şablon sürümü `a9566bc` sunucuda `original-documents-20261028` image’iyle yayımlandı; kaynak/sağlık kontrolleri geçti. Yeni OTA kodları iOS `01a17f91`, Android `01a17f92`; native runtime değişmedi. Fiziksel cihaz alımı teyit edilmedi. 303 backend / 3224 assertion, 57 mobil, strict TypeScript/OpenAPI ve 4 belge E2E geçti. 14 matbu PDF birer sayfa; izin, olay ve kayıp kimlik görüntüleri ile uzun PDF tarih metni kontrol edildi.
