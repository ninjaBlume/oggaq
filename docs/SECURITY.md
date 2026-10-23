# Güvenlik, kişisel veri ve mevzuat

Durum: cookie/CSRF, süreli ve cihaz bazlı Sanctum token, Argon2id, rate limit, aktif hesap/e-posta denetimi, rol/tenant policies, hassas bilgiyi açığa çıkarmayan API hatası, şifreli bildirim payload ve kurum/merkezi içerik audit kayıtları uygulanıp test edildi. QuestionBank merkezi yazmaları yalnız doğrulanmış aktif platform yöneticisine açar; öğrenciden taslak/cevap anahtarını saklar ve yayımlanmış sürüm/seçenekleri PostgreSQL trigger'larıyla korur. Diğer modüller ve KVKK yönetişim süreçleri aşağıda gereksinim olarak yer alır; hukuki uygunluk sağlandığı iddia edilmiyor. Kaynak inceleme tarihi 9 Ekim 2026; üretim öncesinde güncel metinler ve hizmetin fiilî kapsamı ayrıca incelenir.

## Kimlik ve oturum

Web/admin, Sanctum cookie tabanlı oturum kullanır; API ve istemci aynı site alanının altında yerleştirilir. Allowlist CORS, credentials, HTTPS, `HttpOnly`/`Secure` oturum cookie'si, uygun SameSite ve mutasyonlarda CSRF gerekir. XSRF cookie'si frontend tarafından okunabilir; oturum cookie'si okunamaz. Login sonrasında session ID yenilenir; logout/session iptali sunucuda uygulanır. Yönetim ve öğrenci rolleri cookie varlığıyla değil Policy ile doğrulanır.

Mobilde cihaz bazlı, sonlu süreli Sanctum token SecureStore içinde tutulur. İlk güvenlik varsayılanı token için 7 gün üst sınır; süre ve yeniden giriş deneyimi kimlik aşamasında test edilip yapılandırılır. Sanctum'un varsayılan davranışıyla süresiz token bırakılmaz, refresh token sistemi varmış gibi varsayılmaz. Süre dolunca yeni giriş gerekir; offline kayıtlar korunur, yeniden doğrulanmış aynı hesaptan gönderilir. Kayıp cihaz token'ı ve tüm oturumları iptal etme akışı bulunur.

Web oturumu için başlangıç idle hedefi 120 dakika; güvenlik ayarları merkezi ve ortam bazlıdır. Parola sıfırlama/silme gibi hassas işlemler yakın tarihli kimlik doğrulama ister. Parolalar varsayılan olarak Argon2id ile saklanır; üretim varsayılanı 65536 KiB bellek ve dört tur, test ortamı düşük maliyetlidir. Gerçek üretim yükünde maliyet ölçümü ayrıca yapılacaktır. E-posta doğrulaması hassas işlemler için zorunludur; tenant daveti doğrulanmış e-posta hesabıyla eşleştirilir.

Hesap ekranı güvenliği: parola değişimi, e-posta değişimi, dışa aktarma, oturum kapatma ve silme mevcut parolayı yeniden ister (çalınmış oturum tek başına yetmez) ve dakikada 10 çağrıyla sınırlıdır; dışa aktarma günde 3 başarılı indirmeyle sınırlıdır ve yanlış parola bu hakkı harcamaz. Oturum listesi gerçek oturum kimliğini ve token'ı vermez (opak HMAC kimlik). E-posta değişiminde yeni adresin başka hesapta kullanılıp kullanılmadığı yanıttan anlaşılmaz; değişiklik yeni adrese giden imzalı bağlantı açılana kadar yapılmaz, eski adrese bildirim gider. Parola değişince diğer cihazlar kapanır; kullanılan web oturumu Sanctum'un oturum parola özeti güncellenerek açık kalır.

## Tehditler ve teknik kontroller

| Risk | Uygulanacak kontrol |
| --- | --- |
| SQL injection / mass assignment | Parametreli sorgu, allowlist filtre/sıralama ve sunucuya ait sahiplik alanları |
| XSS | Metin olarak render; gerekli zengin metne allowlist sanitization, CSP |
| CSRF | Web cookie mutasyonlarında CSRF doğrulaması; GET ile mutation yok |
| IDOR / tenant sızıntısı | Aktif üyelik + Policy + scoped query + composite FK + negatif test |
| Brute force / enumeration | IP ve hesap bazlı limitler; genel login/reset hatası; e-posta servisi abuse kontrolü |
| Token sızıntısı | SecureStore/HttpOnly, redacted log, URL'ye token koymama, sonlu süre/iptal |
| Dosya yükleme | MIME içerik doğrulaması, boyut/sayfa/süre sınırı, karantina, özel depo |
| Cache/queue sızıntısı | Kullanıcı/tenant kapsamı ve yürütme zamanında yetki kontrolü |
| Veri kaybı / tekrar | Yerel transaction, kalıcı outbox, PostgreSQL transaction/unique ve restore testleri |
| Offline cihaz erişimi | OS sandbox, hesap bazlı depo, backup politikası, hassas veri minimizasyonu |

Üretimde `APP_DEBUG=false`; iç hata/SQL/stack trace döndürülmez. İstek kimliği loglarda kullanılır; parola, token, cevap içerikleri ve kişisel veri varsayılan olarak loglanmaz. Import hatası hassas kaynak verisini sıradan application log'una dökmez. Gizli anahtarlar kaynak kontrolü dışında, `.env.example` yalnız yer tutucularla bulunur.

Offline kapsamı henüz onaylanmadı. Geliştirildiğinde offline verinin cihazdan okunamayacağı veya üyelik iptalinin bağlantısız cihazda anında uygulanacağı söylenemez. Offline erişim yetkisi başlangıçta son doğrulanan oturum/paket yetkisine bağlı ve yapılandırılabilir süreyle sınırlanır; yeniden bağlantıda hesap/üyelik kontrolü önceliklidir. SQLite/IndexedDB'nin varsayılan olarak uygulama seviyesinde şifreli olduğu varsayılmaz. Sağlık, kimlik numarası ve gereksiz kişisel alanlar toplanmaz.

Soru bildirimleri: öğrenci yalnız kendi biten denemesindeki sorunun bildirimini oluşturabilir (bağlam sahipliği ve deneme/cevap bağı sunucuda doğrulanır; süre işlerken yazılamaz). Uç `throttle:reports` ile kullanıcı başına saatte 20 çağrıya sınırlıdır; öğrenci ve soru başına tek açık bildirim kısmi unique indeksle korunur. Yönetim uçları yalnız doğrulanmış platform yöneticisine açıktır (`manage` policy). Bildirenin kimliği yönetim yanıtlarında bulunmaz; serbest not kişisel veri içerebileceğinden yalnız yönetici okur, loglara ve audit kayıtlarına yazılmaz ve en çok 500 karakterdir. Bildirim içeriği trigger ile değişmezdir.

## KVKK için teknik tasarım

- İşleme amaçları/veri kategorileri/minimum alanlar kayıt altına alınır; aydınlatma metni sürümlenir. Aydınlatma kaydı ile açık rıza aynı şey sayılmaz.
- Rıza gereken amaçlar ayrı ve geri çekilebilir kayıtlardır; reklama/analitiğe rıza çekirdek uygulama giriş şartına otomatik bağlanmaz.
- Kullanıcı kendi verisini indirir (`POST /me/export`, parola ve günlük sınırla; yalnız kendi verisi, doğru şık yalnız biten denemede); şirket raporları sadece yetkili bağlamı ve belirlenen alanları içerir.
- Saklama/imha matrisi veri türü, amaç, hukuki dayanak, süre, yedek ve sorumluyu tanımlar. Süreler hukuki/operasyonel değerlendirme olmadan sabit resmî değer gibi yazılmaz.
- Hesap silme uygulandı ([PRIVACY](PRIVACY.md)): mevcut parola ve yazılı onay, tek transaction, token/session iptali, bağlı bütün geçmişin silinmesi, denetim kayıtlarının aktörsüzleştirilmesi, sonuç korumasının yalnız bu işlem için kaldırılması. Yedekten dönüşte imha kaydının yeniden uygulanması henüz yoktur.
- Yasal saklama gereken kayıtlar ayrıştırılır; soft delete tek başına imha sayılmaz. Yedek dönüşünde silinen hesabın yeniden etkinleşmesini engelleyen imha kaydı uygulandı: kişi bilgisi taşımayan, anahtarlı özetli, yalnızca ekleme kabul eden `account_erasures` ve `accounts:reapply-erasures` ([PRIVACY](PRIVACY.md#silme-listesi-ve-yedekten-dönüş), [DEPLOYMENT](DEPLOYMENT.md) §17.4). Yedekler şifreli yazılır (özel anahtar sunucuda değildir); hazırlık ucu `/api/v1/health/ready` yalnızca mantıksal değer döner ve hız sınırlıdır.
- Erişim ve yönetici değişiklikleri audit edilir; olay müdahale/ihlal tespiti ve bildirim sorumluluğu ayrıca belirlenir.
- Hosting, e-posta, hata izleme, Expo build/push ve analitik sağlayıcılarının veri konumu/aktarımı envantere alınır; değerlendirilmemiş entegrasyon aktive edilmez.

KVKK'nın yurt dışı aktarım düzenlemesindeki değişiklik için [Kurum duyurusu](https://www.kvkk.gov.tr/Icerik/7834/6698-Sayili-Kisisel-Verilerin-Korunmasi-Kanununda-Yapilan-Degisiklikler-Hakkinda-Kamuoyu-Duyurusu) ve [yurt dışı aktarım rehberi](https://www.kvkk.gov.tr/Icerik/8143/Kisisel-Verilerin-Yurt-Disina-Aktarilmasi-Rehberi) başlangıç kaynaklarıdır. Eski kaynakların tek başına güncel hukuki sonucu desteklediği varsayılmaz.

## Mevzuat ve yayın kapıları

| Konu | Kaynak / yapılması gereken |
| --- | --- |
| 5188 ve uygulama yönetmeliği | [EGM mevzuat derlemesi](https://www.egm.gov.tr/kurumlar/egm.gov.tr/IcSite/ozelguvenlik/Ozel-Guvenlik-Mevzuat-Kitabi-06_2023.pdf) bir başlangıç kaynağıdır; 2023 derlemesi güncel konsolide metin yerine kabul edilmez. Güncel Mevzuat Bilgi Sistemi/Resmî Gazete değişiklikleri incelenecek |
| Sınav türü/süre/soru sayısı/puan | Güncel EGM Özel Güvenlik Denetleme Başkanlığı sınav duyurusu ve kitapçığıyla kaynaklı şablon hazırlanacak; bu teslimde resmî sayı/kural belirlenmedi |
| 6698 | [TBMM kanun kaydı](https://www.tbmm.gov.tr/Yasama/Kanun/F72877C0-1377-037B-E050-007F01005610), güncel değişiklikler ve Kurum rehberleriyle veri işleme/şirket raporu hukuki dayanağı değerlendirilecek |
| 5651 / 6563 | Barındırma/hizmet niteliği, reklam ve ticari iletiye uygulanabilirlik hukuki değerlendirme bekliyor; blanket uygunluk veya gereksiz kayıt toplama varsayılmıyor |
| Soru hakları | Kaynak/yayın/yeniden kullanım koşulları batch bazında doğrulanacak; kamuya açık dosya otomatik yeniden yayın hakkı sayılmaz |
| Apple | [Hesap silme rehberi](https://developer.apple.com/support/offering-account-deletion-in-your-app/) hesap oluşturabilen uygulamada uygulama içinden silme başlatma akışını gerektirir; mağaza incelemesinde yeniden doğrulanır |
| Google Play | [Hesap silme gereksinimleri](https://support.google.com/googleplay/android-developer/answer/13327111) uygulama akışı ve erişilebilir web silme yolu için değerlendirilir; Data Safety beyanı gerçek veri akışıyla eşleşir |

Hukuki metinler, veri sorumlusu/işleyen rolleri, şirket öğrenci raporlarının dayanağı, VERBİS uygulanabilirliği, saklama süreleri ve yurt dışı aktarım koşulları henüz kararlaştırılmadı. Bu kayıtlar ilgili üretim akışı açılmadan tamamlanacak; şu aşamada hukuki uygunluk sonucu yoktur.
