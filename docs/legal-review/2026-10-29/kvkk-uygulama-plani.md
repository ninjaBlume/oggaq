# KVKK uygulama ve işlem dosyası

29/10/2026. Bu dosya uygulama değişikliklerini, işletme politikasını ve imza/başvuru bekleyen işlemleri ayırır. Kodun testten geçmesi hukuki uygunluk belgesi değildir. Bu paket henüz canlıya veya telefonlara dağıtılmadı.

## Uygulama değişiklikleri

- Kayıt, iş başvurusu ve belge hazırlama/PDF işlemlerinde sunulan aydınlatmanın sürümü, SHA-256 özeti, kapsamı ve sunucu kayıt zamanı saklanır. İstemci tarafından bildirilen sunum kaydıdır; kişinin metni okuduğunu, açık rıza verdiğini veya yurt dışı aktarıma izin verdiğini ispatladığı iddia edilmez. IP/cihaz/okuma takibi eklenmedi. Kayıt ekranında koşulların kabulü ile aydınlatma ayrıldı; zorunlu KVKK rıza kutusu eklenmedi.
- Eski uygulama paketleri kaydolmaya devam eder; sürüm göndermeyenlere geçmişe dönük sahte kayıt üretilmez. Yeni istemciler arşivlenmiş metne bağlanır. Arşiv eski sürümleri korur, `npm run privacy:check` içerik özetlerini doğrular. Bir metin değiştiğinde `legal:apply` ardından `node scripts/privacy-notice.mjs --version=YYYY-MM-DD.N` gerekir; arşiv dosyası değiştirilmez.
- Aydınlatma sunum kayıtları kişisel veri dışa aktarmasına dahil; hesap silinince FK ile silinir. Başvuru ve belge alanlarında veri minimizasyonu uyarısı var. Bu uyarı, kullanıcının özel nitelikli veri girmesini teknik/hukuki olarak önlediğimiz anlamına gelmez. Gereksiz sağlık/adli sicil/üçüncü kişi verisi tespit edilirse destek prosedürüyle temizlenir.

## Saklama ve imha politikası — sürüm 2026-10-29.1

**Aşağıdaki 180 gün ve genel denetim için 3 yıl süreleri şirketin bu ürün için belirlediği ölçülülük seçimleridir; kanundaki herkese zorunlu sabit süreler diye sunulmaz.** Altı aylık periyodik imha üst sınırı, bütün kişisel verilerin altı ay tutulabileceği anlamına gelmez. Seçtiğimiz iş günlük çalışır.

| Kayıt | Amaç / azami süre / işlem |
| --- | --- |
| Devam eden açık ilan başvurusu | Başvuruyu değerlendirme; yalnız sırf eski diye silinmez. İlan/değerlendirme durumu yönetici tarafından aylık gözden geçirilir. Süresiz açık bırakılan ilanlar ayrıca kapatılmalıdır. |
| Olumlu/olumsuz sonuçlanan başvuru veya kapanmış/geri çekilmiş/süresi dolmuş ilan başvurusu | Sonucu takip ve kısa süreli itirazları ele alma; sonuçlanma, kapanma/geri çekilme veya son başvuru tarihinden hangisi önce gerçekleşirse 180 gün sonra günlük işte silinir. Aktif hesaba dokunulmaz. Daha erken silme talebi ayrıca yerine getirilir. |
| Belgelenmiş uyuşmazlığa konu başvuru | Yalnız somut hak ihtiyacı süresince, `privacy:hold-application UUID YYYY-MM-DD` ile en fazla birer yıllık süreli erteleme. Gerekçe, belge, kapsam, sorumlu ve gözden geçirme tarihi erişimi kısıtlı dosyada tutulur. Tarih dolunca normal imha; `release` ile erken kaldırılır. Otomatik erteleme/boş gerekçe yok. |
| Güvenlik ve yönetici denetim olayları | Güvenlik/hesap verebilirlik için olaydan itibaren 3 yıl; günlük silme. Hesap silinince aktör bağlantısı daha erken kaldırılır. Devam eden dava için gerekli kayıtlar varsa yalnız gerekli bölüm ayrı, gerekçeli ve süreli işlem dosyasına alınır. |
| Hesap silme HMAC listesi | En çok 12 aylık yedekten hesabın geri gelmesini önleme ve silme ispatı için 3 yıl. HMAC anonim veri sayılmaz. Olağan güncelleme/silme DB tetikleyicisiyle yasak; yalnız süre dolumu işinde eski satır silinebilir. |
| İmha işlem kanıtı | İçerik/iletişim bilgisi yerine politika sürümü, zaman, kategori ve adet; en az 3 yıl. Bu asgari süre İmha Yönetmeliği m.7/3 kaynaklıdır. Güncelleme veya erken silme DB tarafından engellenir. |
| Aydınlatma sunum kaydı | Aktif hesap için sürüm/işlem kaydı; hesap silinirken silinir. Metin arşivi kişi içermez ve sürüm kanıtı için korunur. |
| Belge içeriği | İstemci düzenlemesi; sunucuya hazırlama/PDF için iletilir. PDF aktarım önbelleği şifreli, tek kullanımlık, en çok 5 dakika. PDF'nin kullanıcı tarafından kaydedilen/paylaşılan kopyası şirket arşivi değildir. |
| Sınav geçmişi, hesap, destek, oturum, yedek ve altyapı günlükleri | Mevcut envanterdeki amaç/süreler geçerli. Bu paket sınav geçmişini veya kullanıcı hesaplarını topluca silmez; altyapı günlükleri için henüz tarih esaslı imha kurulmuş değildir. Destek posta kutusunun amaç bazlı temizliği ve 12 aylık yedek politikasının ölçülülük değerlendirmesi açık iştir. |

İlk geçişte geçmişte kapanmış/sonuçlanmış satırların gerçek işlem tarihi bilinmediğinden `closed_at`/`resolved_at` migration zamanı ile başlatılır; kullanıcı verileri kurulum anında 180 günlük varsayımla topluca silinmez. Daha önce süresi dolmuş ilanların gerçek `expires_at` değeri varsa o tarih kullanılır. İmha işinin başarısızlığı Laravel scheduler/uygulama hatasına yansır; sessizce yutulmaz.

Operasyon: `php artisan privacy:prune` yalnız sayı verir; kişisel içeriği yazdırmaz. `--force` imha eder ve aynı işlemde kanıt yazar. Zamanlayıcı İstanbul saatiyle 03:40'ta `--force` çalıştırır. Satır kilitleri kapanma/yeniden açma/değerlendirme ve ertelemeyle yarışı önler; kilitli başvuru bir sonraki günlük çalışmaya kalabilir. İmha, şifreli yedeklerin içini yerinde yeniden yazmaz; bunlar mevcut döngü sonunda düşer. Geri yükleme dış silme listesi ile hesap silmelerini yeniden uygular; ayrıca `privacy:prune --force` çalıştırılmalı ve geri yükleme dışa açılmadan önce yeni hukuki erteleme kayıtları uygulanmalıdır. Başvuru bazında kullanıcı talebiyle erken silmelerin yedekten geri gelmesini önleyen ayrı kalıcı iz henüz yok; hesap silme listesi bunun yerine geçmez.

## İlgili kişi başvurusu prosedürü

İletişim `destek@oggsor.com`; operasyon sorumlusu ürün sahibi Harun Altay. Bu görev, henüz resmî atanmış veri sorumlusu temsilcisi olduğu iddiası değildir. Kanundaki başvuru usulleri e-posta ile sınırlanmaz.

1. Gelen talebe vaka numarası, alınma tarihi, son cevap tarihi (en geç 30 gün), talep kapsamı ve sorumlu ver. Kimlik belgesini varsayılan olarak isteme; uygulama içi yeniden parola doğrulaması veya bilinen hesap üzerinden gerekli ve ölçülü teyit kullan. Parola/token/SMS kodu alma.
2. Erişim/düzeltme/silme/itiraz/alıcılara bildirim kapsamını ayır. İndirme ve hesap silme uçları mevcut; kullanıcının hesabını silmesini her talebin zorunlu şartı yapma. Düzeltme ve alıcıya bildirim gereğini incele.
3. Veri envanterindeki asıl kaynak, destek e-postası, işlemci kopyaları ve yedek etkisini kontrol et. Gerçekten silinemeyen kayıt varsa somut dayanak, süre ve erişim sınırını açıkla; genel “mevzuat gereği” yanıtı verme.
4. Yanıtı güvenli kanaldan ilet; işlem tarihini ve gerekçesini erişimi kısıtlı vaka dosyasında tut. Yanlış adrese kişisel veri gönderme. Kurula şikâyet hakkı ve geçerli usulleri açıklanır.

## İhlal müdahalesi

Şüphe anında erişimi sınırla, ilgili token/anahtarları iptal et, gerekli delili erişimi kısıtlı olarak koru; logları topluca silme. Olay numarası, ilk belirti, **ihlalin öğrenildiği an**, etkilenen sistem/veri/kişiler, yapılan işlemler ve sorumlu kayda alınır. Harun Altay şirket adına karar verebilen yetkiliyi bilgilendirir; yetki belgesi ayrı doğrulanır.

KVKK 2019/10 kararı uyarınca Kurula gecikmeksizin ve öğrenmeden itibaren en geç 72 saatte bildirim; bilgi eksikse aşamalı bildirim, gecikme varsa nedeninin açıklanması. Etkilenen kişiler belirlendikten sonra makul en kısa sürede uygun kanalla bilgilendirilir. Bu bir otomatik her hata bildirimi değildir; olağan zaman aşımı banner'ı tek başına veri ihlali kanıtı sayılmaz. Karar ve olay etkisi belgelenir. İşleyenlerden gecikmeksizin bildirim ve alt işleyen desteği istenir. Plan üç ayda bir ve önemli sistem değişikliklerinde gözden geçirilir.

## Resmî işlemler ve aktarım — kapanmayan işler

1. [Temsilci karar taslağı](temsilci-atama-taslagi.md): vatandaşlık ve Türkiye yerleşikliği kullanıcı beyanı alındı. İmza yetkisi, kimlik/tebligat adresi, karar tarihi-numarası, yetkili imza ve tasdik özel dosyada tamamlanacak; sonra Kurumun kabul ettiği yöntemle temsilci/VERBİS başvurusu ve envanter. Git'e kimlik numarası yazılmaz. Taslak, atama alındısı değildir.
2. [Aktarım envanteri](aktarim-envanteri.md): Cloudflare, Resend, Expo ve destek posta kutusu Google için sözleşme/rol/alt işleyen/ülke/veri kategorisi belirlenip uygun KVKK m.9 güvencesi somutlaştırılacak. [Sağlayıcı talep taslakları](saglayici-aktarim-talebi.txt) hazır; gönderilmedi. AB SCC veya internette bulunan DPA, imzalı Türk standart sözleşmesi diye kaydedilmez. Standart sözleşme yolu seçilip imzalanırsa 5 iş günü bildirim süresi izlenir. Sağlayıcı uygun çözüm sunmazsa ilgili akış için Türkiye'de işleme ve yabancı erişimi önleyen alternatif tasarlanır; öğrenciden tek kutuda zorunlu aktarım rızası alıp sürekli akış açığı kapatılmaz. Altyapı değiştirilmedi.
3. Özel nitelikli/üçüncü kişi veri içeren serbest belge metinlerinde her somut işlemin m.5/6 dayanağı bu uyarıyla sağlanmış sayılmaz. Gereksiz içerikleri almama, tespit edileni kısıtlama/silme ve belgeyi cihazda üretme seçeneği sonraki risk azaltma adımıdır; mevcut PDF sunucu davranışı metinde açık.

## Kaynaklar

- [Aydınlatma Tebliği m.4–5](https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig): kapsam, ispat yükü, açık rızadan ayrım. Belirli bir UI kutusu veya veritabanı sütunu zorunlu tutulmaz.
- [İmha Yönetmeliği m.5,7,11,12](https://www.kvkk.gov.tr/Icerik/5441/KISISEL-VERILERIN-SILINMESI-YOK-EDILMESI-VEYA-ANONIM-HALE-GETIRILMESI-HAKKINDA-YONETMELIK): amaç bitiminde imha, kanıtın en az üç yıl saklanması, periyodik imha ve talepler.
- [İhlal kararı 2019/10](https://www.kvkk.gov.tr/Icerik/5362/Veri-Ihlali-Bildirimi): 72 saat ve müdahale planı.
- [Yurt dışına aktarım](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim), [standart sözleşmeler](https://www.kvkk.gov.tr/Icerik/7929/Standart-Sozlesmeler), [bildirim modülü](https://www.kvkk.gov.tr/Icerik/8043/Standart-Sozlesme-Bildirim-Modulu-Hakkinda-Kamuoyu-Duyurusu).
