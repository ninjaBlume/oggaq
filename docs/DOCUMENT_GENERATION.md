# Dilekçe ve tutanak hazırlama

28 Ekim 2026. **Durum: mobil arayüz, API ve PDF üretimi uygulandı; yayın ve cihaz teyidi aşağıda ayrı kaydedilir.** Yapay zekâ entegrasyonu yoktur.

Kullanıcının isteği: Türkiye'de özel güvenlik görevlilerine uygun Dilekçe hazırla ve Tutanak hazırla menüleri; matbu örnekler ve kişiye/olaya göre özgün düzenleme. Çıktı tercihi **PDF indir/paylaş/yazdır** olarak netleşti. Yapay zekâ yalnız uygun ücretsiz imkân varsa değerlendirilecek; ücretli servis açma veya gerçek belge verisini dış sağlayıcıya aktarma kararı verilmedi.

## Araştırmada incelenen kaynaklar

| Kaynak | İnceleme ve sınırı | Tasarıma etkisi |
| --- | --- | --- |
| [Antalya Emniyet Müdürlüğü, Özel Güvenlik İşlemleri](https://antalya.pol.tr/ozel-guvenlik-islemleri) | Resmî sayfanın arama dizininde temel/yenileme, silah farkı, kimlik bilgisi değişikliği, kayıp dilekçeleri listeleniyor. Doğrudan sayfa açılışı 500 döndü; ek dosyaların güncel içerikleri doğrulanmış sayılmaz. | Kütüphanede işlem türü ayrılmalı; il/kurum özelinde örnekler bütün Türkiye için tek zorunlu form gibi sunulmamalı. |
| [Pamukkale Üniversitesi Güvenlik Hizmetleri, Form ve Dilekçeler](https://www.pau.edu.tr/guvenlik/tr/sayfa/form-ve-dilekceler-56) | Form kataloğu okundu: kayıp eşya, teslim, nöbet değişikliği, saatlik izin ve rapor örnekleri bulunuyor. Ek DOC/DOCX içerikleri bu araştırmada incelenmedi. | Günlük görev belgeleri ile kimlik başvuru dilekçeleri ayrı kategoriler olmalı. |
| [Bursa Uludağ Üniversitesi belge kataloğu](https://kalite.uludag.edu.tr/kiksis/dokuman_main.php) | Güvenlik biriminin nöbet devir-teslim, buluntu eşya, tutanak, olay/faaliyet kayıt formları listeleniyor. Tutanak formunun katalog revizyon tarihi 04.03.2026. Ek DOCX'ler okunmuş sayılmaz. | Şablonların kaynak ve sürüm bilgisi tutulmalı; katalog revizyon tarihi tüm Türkiye'ye ilişkin mevzuat değişikliği değildir. |
| [İstanbul Gelişim Üniversitesi olay tutanağı](https://panel.gelisim.edu.tr/assets/2018/dokumanlar/klk/DH.FR.16%20Olay%20Tutana%C4%9F%C4%B1_c8930a609e9a4db9882317598e7e3e2e.pdf) | Bir sayfalık PDF metin ve sayfa görüntüsü incelendi. 2018 tarihli kurumsal örnek: olay tarihi/saati/yeri, düzenleyen/görevi, anlatım ve rol bazlı imza alanları. | Olay anlatımı genişleyebilmeli; tarih/saat/yer ile düzenleyen bilgisi ayrı alanlar olmalı. Kurumun logosu/doküman numarası kendi çıktımıza kopyalanmamalı. |
| [Boğaziçi Üniversitesi kayıp ve buluntu eşya yönergesi](https://mediastore.cc.bogazici.edu.tr/web/upload/sayfalar/105-bogazici-universitesi-kayip-ve-buluntu-esya-y-20250523-135209.pdf) | Metin okundu; Ek-1 ve Ek-2 sayfaları görsel olarak incelendi. Buluntu kaydı ve sahibine teslim ayrı belgeler; alanlar ve imza rolleri farklı. Yönerge ilgili üniversitenin uygulamasıdır. | Buluntu tespiti ve teslim-tesellüm birbirine karıştırılmamalı. Bütün tutanaklarda sabit iki/üç imza şartı gibi bir genelleme yapılmamalı. |
| [Kültür ve Turizm Bakanlığı 3071 bağlantısı](https://teftis.ktb.gov.tr/TR-263565/3071-sayili-dilekce-hakkinin-kullanilmasina-dair-kanun.html) | Bakanlık sayfası resmî mevzuat metnine yönlendiriyor; hedef PDF web aracında zaman aşımına uğradı. | Üretim şablonlarında zorunlu alanlar/kabul şartları ayrıca güncel resmî metinden doğrulanmalı; yalnız yazılım var diye hukuki uygunluk tamamlanmış sayılmamalı. |

PDF sayfa inceleme kanıtları `artifacts/document-research/2026-10-28/` altındadır. Bunlar referans kopyalardır; ÖGG SOR tarafından hazırlanmış resmî belgeler değildir.

## Uygulanan kullanıcı akışı

Yan menünün yardımcı araçlarında iki öğe: **Dilekçe hazırla**, **Tutanak hazırla**. Ana sınav sekmeleri değişmez. Şablon seç → hazırlanma yöntemi → bilgileri gir → metni düzenle → metni önizle → PDF aç/indir. Tarayıcının PDF görünümünde kaydetme, paylaşma ve yazdırma kullanılır. Önizleme bir A4 ölçüm simülasyonu değildir; son sayfalama PDF’dedir.

1. **Matbu örnek:** boş alanları bulunan, yazdırılıp elle doldurulabilen örnek; ayrıca alanları uygulamada doldurarak PDF alma.
2. **Bilgilerimle oluştur:** belge türüne göre sorulan alanlardan ilgili şablonla taslak oluşturma. Bütün metinleri aynı genel belgeye sıkıştırma.
3. **Serbest düzenleme:** başlık, muhatap, içerik, ekler ve imza rollerini kullanıcı düzenler. Bu yöntem canlı üretken yapay zekâ anlamına gelmez.

Kullanıcının kontrol etmediği olay, tanık, kişi, tarih veya hukuki sonuç üretilmez. Önizlemede düzenlenebilir taslak vardır; uygulama başvuru göndermez, belgeyi imzalamış gibi göstermez ve kurum adına onay üretmez. Geçerli elektronik imza entegrasyonu ilk kapsam değildir.

## İlk şablon kataloğu

**Dilekçe:** genel talep/bildirim; izin; vardiya/nöbet değişikliği; özel güvenlik kimlik yenileme; kayıp kimlik; kimlik bilgisi değişikliği; silah farkı başvurusu. Bunlar genel düzenlenebilir örneklerdir; katalog eklerinin birebir resmî kopyası veya zorunlu başvuru formu olarak sunulmaz. E-Devlet üzerinden yürüyen işlemler için kâğıt dilekçe zorunluymuş izlenimi verilmez.

**Tutanak:** olay/tespit; kayıp-buluntu eşya; teslim-tesellüm; nöbet devir-teslim; malzeme/teçhizat arızası; serbest tutanak. Başlangıç alanları: olay ve düzenleme tarih/saatleri, görev yeri, düzenleyenler, olayın öğrenilme biçimi/anlatımı, gerçekleştirilen işlemler, varsa ekler ve ilgili imza rolleri. Eşya listeleri birden fazla satır alabilmeli. Tanık veya kimlik numarası her tür için otomatik zorunlu tutulmamalı.

PDF gereksinimleri: Türkçe karakterleri gömülü fontla doğru verme; A4 ve okunur kenar boşlukları; uzun metinde taşmama/uygun sayfalama; imza başlığını tek başına sonraki sayfaya bırakmama; kişisel bilgileri her sayfada gereksiz tekrarlamama. İşverenin/kurumun özel formatı varsa genel örnek bu formatın yerini alıyormuş gibi sunulmaz.

## Yapay zekâ: ücretsiz kota ve veri şartları

[Gemini fiyatlandırması](https://ai.google.dev/gemini-api/docs/pricing) bazı modeller için ücretsiz giriş/çıkış kotası sunuyor; ücretsiz sınırsız kapasite veya kalıcı fiyat garantisi değildir. [Gemini ek şartları](https://ai.google.dev/gemini-api/terms), Unpaid Services bölümünde kişisel, gizli ve hassas bilgi gönderilmemesini açıkça belirtiyor; içerik ürün geliştirmede kullanılabilir ve insan incelemesi yapılabilir. Ücretsiz hizmetin bölgesel kullanım şartları da vardır.

Bu nedenle gerçek tutanak/dilekçe içeriğini ücretsiz Gemini'ye doğrudan gönderme önerilmez. Yalnız ad-soyadı maskelemek bir olayın anonim olduğunu garanti etmez. Bu araştırmada hiçbir gerçek belge, olay anlatımı, kişisel veri veya gizli anahtar dış yapay zekâ servisine gönderilmedi; hesap/anahtar/ücretli plan açılmadı.

İlk sürüm **şablon + yönlendirmeli form + serbest düzenleme + PDF** olarak uygulandı; belge başına yapay zekâ API ücreti yoktur. Genel şablon metinleri geliştirme sırasında hazırlanıp kaynaklarıyla incelenebilir. Canlı AI taslak desteği, veri şartları ve maliyeti uygun sağlayıcı/kurulum belirlenirse ayrı iş olarak ele alınır. Bu, öğrenciye PRO/ücretli özellik açılacağı anlamına gelmez; uygulamanın ücretsiz ürün kararı korunur.

## Teknik uygulama ve veri yaşamı

- `backend/resources/document-templates.json`: 8 dilekçe ve 6 tutanak, sürüm `2026-10-28.1`, alan/rol/kaynak tanımları. Katalog verisi kullanıcı belgesi değildir. Kullanıcı alanları dışında olay/kişi/tarih/iddia üretilmez; alanlar taslağa etiketleriyle aktarılır ve bütün metin düzenlenebilir.
- `Documents` modülü: aktif hesapla katalog, alanlardan taslak ve dışa aktarma API’si. Genel öğrenci erişiminde e-posta doğrulama kapısı yoktur. Kurum verisi okunmaz/yazılmaz; belge arşivi veya migration eklenmedi.
- `POST /api/v1/document-exports`: doğrulanmış metin/roller şifrelenerek kısa süreli uygulama cache’inde saklanır. 256 bit rastgele erişim anahtarının yalnız SHA-256 özeti cache anahtarıdır. Geçerlilik 5 dakikadır. Belge verileri/erişim anahtarları loglanmaz; cache temizleme veya gerçek kullanıcı silme işlemi yoktur.
- Mobil, dönen URL’nin API origin/yol ve fragment biçimini doğrular; işletim sisteminin tarayıcısını açar. Bearer oturum anahtarı URL’ye veya tarayıcıya aktarılmaz. Açma sayfası erişim anahtarını fragmentten alıp adres çubuğundan kaldırır ve yalnız POST gövdesiyle gönderir. Bu tek capability endpoint’i CSRF’den muaftır; cookie oturumu ona erişim yetkisi vermez. Diğer CSRF kontrolleri korunur.
- Cache kilidiyle tek kullanım; tüketimde hesap aktifliği ve varsa mobil oturumun hâlâ geçerli oluşu kontrol edilir. Süre bitimi, yeniden kullanım, çıkış/oturum iptali ve hesap silinmesi PDF açılışını engeller. Linki paylaşmak süre içinde belgeye erişim verir; belgeyi paylaşmak için indirilen PDF kullanılmalıdır.
- Dompdf 3.1.6 + gömülü DejaVu Sans; sabit/kaçışlanan Blade görünümü, A4, sayfa numarası. Uzak kaynak erişimi, PHP ve JavaScript yürütme kapalı; dosya okuma kökü font klasörüyle sınırlı. Kullanıcının HTML’i çalıştırılmaz. Bütün matbu örnekler birer sayfa, uzun metin otomatik sayfalanır; imza blokları bölünmez.
- PDF dosyası sunucuda arşivlenmez; bellekte oluşturulup yanıtlanır. Cache kaydı kullanımla tüketilir veya TTL sonunda erişilemez olur. Altyapı/yedeklerin şifreli artık kayıtları normal saklama politikasına tabidir. Cihazda indirilen/paylaşılan/yazdırılan kopya kullanıcı tarafından yönetilir.
- Taslak yalnız ekran belleğindedir; yardımcı menüden çıkıldığında kalıcı taslak tutulmaz. API/bağlantı hatasında aynı ekrandaki metin korunur. Yeni native bağımlılık veya izin eklenmedi; iOS/Android PDF işlemleri sistem tarayıcısına devredilir.
- Gizlilik sayfası belge verisi, geçici şifreli saklama ve kullanıcının indirdiği kopya hakkında güncellendi. Yazılımın varlığı resmî kabul, mevzuat uygunluğu veya elektronik imza yerine geçmez.

## Doğrulama

299 backend testi / 3124 assertion geçti (10 yeni belge testi / 111 assertion dahil). Testler yalnız `oggaq_test` üzerinde ve E2E’den ayrı yürütüldü. 57 mobil, 16 admin, 10 web birim testi; strict TypeScript, OpenAPI lint/tip üretimi, admin/web/site build, Composer lint/validate/audit geçti. Mevcut paketler değişmeden 5 PDF bağımlılığı eklendi; güvenlik duyurusu bulunmadı.

Üç yeni mobil web QA E2E gerçek API ile yönlendirmeli dilekçe düzenleme/önizleme/PDF açma, matbu tutanak/PDF, serbest metin ve rol düzenleme, 320/390/834 px taşmama ve hata sonrası metnin korunmasını doğruladı. Bütün 14 boş PDF ile uzun Türkçe metin PDF’si üretildi; Türkçe metin çıkarımı ve render görüntüleri incelendi. Kanıtlar `artifacts/documents/` içinde. Fiziksel iOS/Android kaydet/paylaş/yazdır ve beta alımı ayrıca kullanıcı teyidi gerektirir; web QA bunların yerine sayılmaz.

## Sunucu ve beta teslimi — 28 Ekim 2026

Sunucu yalnız dar kapsamlı image overlay ile güncellendi. Son app/worker/scheduler image’i `oggaq-development-app:documents-final-20261028`, web image’i `oggaq-development-web:documents-20261028`. Önceki Composer paketleri birebir aynı kaldı; yalnız PDF bağımlılıkları eklendi. Canlı AppServiceProvider’ın önceki console-command farkı korunup yalnız iki rate limiter eklendi. Veritabanı migration’ı, soru/hesap değişikliği, posta/DNS işlemi yapılmadı. Ortak yerel geliştirme servislerine dokunulmadı.

Canlı nginx’in `script-src 'self'` politikası ek CSP olarak uygulandığından inline açma betiği iOS’ta engellendi. Betik aynı origin’de ayrı API kaynağına taşındı; nonce politikası ve mevcut nginx CSP korunur. E2E, iki CSP’yi birlikte uygulayarak PDF açma akışını tekrar doğruladı. Safari’nin aynı sekmede yeni fragmentle açması da dinlenir; önceki anahtarın yeniden kullanılmasına dayanılmaz. Native modül değişikliği veya güvenlik başlığı gevşetme yoktur.

Device Hub iPhone 18 Pro / iOS 27’de gerçek API kataloğu ve kişisel alan içermeyen matbu dilekçe kontrol edildi. Safari’de tek sayfa PDF açıldı; paylaşım paneli `PDF Belgesi` olarak tanıdı ve Dosyalar’a Kaydet / Yazdır seçenekleri görüldü. Dosya bir alıcıya gönderilmedi veya fiziksel yazıcıya iş yollanmadı. Android native ve fiziksel TestFlight/Play cihaz alımı ayrıca teyit edilmeli.

Mobil kaynak `4204b4b`: iOS `testflight / 01a17f7b-c2aa-74f3-a1c9-8ff6681a3644`, grup `44e15b43-8cf9-48dc-b9e0-aaa61b9dac29`; Android `android-beta / 01a17f7c-7648-7448-84da-bcdde5ce896c`, grup `61a8b59d-2272-4415-a836-8c256a0fcec9`. Runtime’lar değişmedi. İki kanalın API/runtime/platform ayrımı, native başlıklarla launch asset ve iOS 18 / Android 19 ek dosyanın SHA-256 kontrolleri geçti. Yanlış runtime/platform 204, üretim kanalı 404. Genel mağaza yayını ve Git push yapılmadı. Sunucudaki CSP/fragment düzeltmesi yalnız backend açma sayfasını değiştirir; yeni OTA gerektirmez.

Geri dönüş: `~/oggaq-development/publication/documents-20261028/services.before-documents.yaml` önceki dört image’i tutar. Uygulama geri alınacaksa `publication/student-access-20261027/services.compose.yaml` bu dosyadan geri yüklenip `~/oggaq-development/manage up -d --no-deps app worker scheduler web` uygulanır. Son küçük adım öncesi `documents-final-20261028/services.before-final.yaml` ara sürümün geri dönüşüdür. Mobil OTA geri dönüş komutları IOS_BETA / ANDROID_BETA içinde; önceki OTA kodları iOS `01a17f61`, Android `01a17f62`.
