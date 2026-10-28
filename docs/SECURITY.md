# Güvenlik, kişisel veri ve mevzuat

## 28 Ekim 2026 — Güvenlik düzeltmeleri

- `deepmerge@4.3.1` / GHSA-gcqx-w48m-w2h4 için dar yerel yama uygulanır. Gerçek Expo yapılandırma çözümündeki `index.js`, `dist/cjs.js` ve `dist/umd.js` kaynakları sürüm ve SHA256 ile sınırlandırılır. Her iki birleştirme döngüsü `__proto__`, `constructor`, `prototype` anahtarlarını reddeder; kopyalama kendi veri özelliğini tanımlar. Null hedefli saldırı yamasız kaynakta yeniden üretildi, yamalı gerçek girişte reddedildi; normal Expo birleştirmeleri korunur. Bu upstream tarafından yayımlanmış bir düzeltme değildir.
- `npm ci` postinstall veya `npm run security:prepare` iki yerel yamayı kurar; `npm run audit` yalnız doğrulanan kaynak/advisory/bağımlılık yolunu kabul eder. **34 araç testi ve audit geçti: 2 doğrulanmış yerel yama, 0 incelenmemiş/yamasız bulgu.** Ham registry audit'i upstream sürümlerini listeler.
- Canlı ÖGGSor vhost'unda `Strict-Transport-Security: max-age=31536000` etkin. `includeSubDomains` ve preload yok; diğer sitelerin ayarı değişmedi.
- Asimetrik şifreli günlük DB yedeği, saatlik silme defteri ve saatlik Mac aktarımı kuruldu. Gerçek yedek Mac'teki ayrı geçici DB'ye geri yüklenip 15 tetikleyici, manifest ve silme defteriyle doğrulandı; geçici DB silindi. Özel age anahtarı sunucuda bulunmaz. [İşletim ve kalan kurtarma sorumlulukları](../deploy/server-development/backup/README.md).
- Expo/EAS teknik veri akışı canlı gizlilik metnine eklendi. Mağaza gizlilik formlarının tamamlanması ve hukuki aktarım değerlendirmesi ayrıca gerekir.
- **Açık risk:** kullanıcı 28 Ekim'de daha önce sohbette paylaşılan sunucu parolasını değiştirmediğini ve değiştirmeyeceğini bildirdi. Tercih kaydedildi; parola döndürülmüş veya risk giderilmiş sayılmadı. Bu işte parola ile giriş denenmedi, SSH anahtarı kullanıldı.

## 28 Ekim 2026 — İlk inceleme bulguları (tarihsel kayıt)

Güncel `npm run audit`, [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) nedeniyle **başarısızdır**. `deepmerge@4.3.1`, `@expo/config` altında kullanılan düşük önem dereceli prototype poisoning bulgusunu taşır. İnceleme anında advisory düzeltilmiş sürüm göstermiyor. Görülen çağrı yolları Expo yapılandırma/eklenti birleştirmesidir; mobil kullanıcı girdisinden çalışan bir saldırı yolu bu incelemede gösterilmedi. Çözüm: SDK 58 uyumluluğu korunarak doğrulanmış upstream düzeltmesi veya dar anahtar doğrulama yaması ve regresyon testi; advisory'yi yalnız susturmak veya `npm audit fix --force` ile Expo sürümünü düşürmek çözüm sayılmaz. Bu tur incelemedir, yama uygulanmadı. Node-forge'un mevcut yaması hash ve imza testlerinden geçmektedir; ham audit'teki yüksek upstream kaydı bu yamanın doğrulanmasıyla ayrı değerlendirilir.

Canlı HTTP HTTPS'e yönleniyor; **HSTS yok**. Alan adına özel HSTS eklenmeli; başka siteleri/alt alanları kapsayacak `includeSubDomains` veya preload, tüm alanlar ayrıca doğrulanmadan açılmamalı. ÖGG SOR için hazırlanmış otomatik şifreli yedek/sunucu dışı kopya ve bağımsız silme listesi dışa aktarımı henüz kurulu değil; işlem öncesi özel snapshot'lar düzenli yedek güvencesi değildir. Canlı gizlilik metni Expo/EAS güncelleme isteklerinin teknik tanımlayıcı, IP ve olası sınırlı hata metni akışını içermiyor; genel yayın öncesi açıklama ve mağaza veri beyanları eşleştirilmeli. Geçmiş konuşmada paylaşılmış sunucu parolası, değiştirilmediyse döndürülmeli; bu incelemede parolayla giriş denenmedi veya parola değiştirilmedi.

## 27 Ekim 2026: kişisel çalışma erişimi

Kullanıcı kararıyla aktif, giriş yapmış öğrencinin kişisel çalışması e-posta doğrulaması beklemez. Kayıt doğrulama e-postası göndermez; doğrulanmış hesap rozeti sunulmaz. Bu, adresin sahibini doğrulamış saymak değildir: `email_verified_at` boş kalır. İş başvurusu gönderimi, tüm yönetim/tenant uçları ve kurumsal çalışma bağlamları doğrulama gerektirir. Bağlam listesi doğrulanmamış kullanıcıya yalnız kişisel bağlamını döndürür; kurumsal kimliği tahmin etmek policy denetimini aşmaz. Askıya alınmış hesap, rol/sahiplik kontrolleri, CSRF ve mevcut hız sınırları korunur. Parola sıfırlama ve e-posta değişimindeki sahiplik kanıtı kaldırılmadı.



27 Ekim 2026 kullanıcı kararı: yeni parola alt sınırı **8 karakter**, üst sınır 128; büyük/küçük harf, rakam, simge ve doğrulama tekrarı şartları sürer. Ortak kayıt/sıfırlama/değiştirme doğrulaması ve yönetici oluşturma komutu aynı alt sınırı uygular. Mevcut hesapların parolaları değiştirilmedi.

## 27 Ekim 2026: uygulama içi e-posta onayı

E-posta kodu parola yerine giriş veya token üretimi için kullanılmaz. `POST /api/v1/auth/email-verification-code` aktif, giriş yapmış ve `api:access` yetkili hesabın yalnız kendi mevcut adresini doğrular. Altı hane kriptografik `random_int` ile üretilir; süre 10 dakika, kod başına en çok 5 yanlış tahmin, hesap başına kod kontrolü dakikada 10 istektir. Yeniden gönderim en az 60 saniye aralıklı ve saatte en çok 10'dur; yeni kod eskisini geçersizleştirir. Süresi geçmiş/yenilenmiş veya zaten doğrulanmış hesap için kuyrukta kalan kod postası gönderilmez. Hatalı tahminler transaction dışında fırlatılan hata sayesinde geri alınmaz. İş başvurusu, yönetim ve kurumsal işlemler e-posta doğrulamasıyla korunur.

Kod DB'de kullanıcı+e-posta ile bağlanmış HMAC olarak tutulur; düz kod yalnız mevcut şifreli, commit sonrası bildirim kuyruğundan geçer. Kod/token/parola uygulama loglarına eklenmedi. Eski imzalı doğrulama yolu kimlik ve imza denetimleriyle korunur. Tasarım kaynakları: [Laravel e-posta doğrulama](https://laravel.com/framework/docs/13.x/verification), [Laravel commit sonrası kuyruk bildirimi](https://laravel.com/framework/docs/13.x/notifications#queued-notifications-and-database-transactions). Bu bir kimlik güvencesi veya mevzuat uygunluğu sertifikasyonu değildir.


Durum: cookie/CSRF, süreli ve cihaz bazlı Sanctum token, Argon2id, rate limit, aktif hesap/e-posta denetimi, rol/tenant policies, hassas bilgiyi açığa çıkarmayan API hatası, şifreli bildirim payload ve kurum/merkezi içerik audit kayıtları uygulanıp test edildi. QuestionBank merkezi yazmaları yalnız doğrulanmış aktif platform yöneticisine açar; öğrenciden taslak/cevap anahtarını saklar ve yayımlanmış sürüm/seçenekleri PostgreSQL trigger'larıyla korur. Diğer modüller ve KVKK yönetişim süreçleri aşağıda gereksinim olarak yer alır; hukuki uygunluk sağlandığı iddia edilmiyor. Kaynak inceleme tarihi 9 Ekim 2026; üretim öncesinde güncel metinler ve hizmetin fiilî kapsamı ayrıca incelenir.

## JavaScript bağımlılık güvenliği — 25 Ekim 2026

- **Zod:** [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) için düzeltilmiş `4.6.6`, yalnız kilitli `@expo/cli@58.1.15` altında override edildi. SDK 58 ve React Native 0.88 korundu; Expo uyumluluk kontrolünün istediği `58.0.19` yama sürümüne geçildi. CLI'nin gerçek devtools ve MCP şemalarıyla uyumluluk; fazla büyük array/set/map girdisinin elemanları işlemeden reddi test ediliyor. Bu advisory audit istisnası değildir; yeniden bulunursa kontrol başarısız olur.
- **node-forge:** [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) için bu tarihte yayımlanmış düzeltilmiş npm sürümü yoktur. `1.4.0` içindeki RSA `DigestAlgorithm` iç eleman sayısı kontrolüne dar bir yerel yama uygulanır. Kaynak [upstream sorun 1149](https://github.com/digitalbazaar/forge/issues/1149) ve henüz birleştirilmemiş [katkıcı PR 1152](https://github.com/digitalbazaar/forge/pull/1152)'dir; bu, upstream tarafından yayımlanmış bir düzeltme değildir. Sentetik anahtarla yeniden üretilen bozuk iç ASN.1 yapısı yamasız kabul edilirken yama sonrası reddedilir. Geçerli RSA, isteğe bağlı NULL ve RSA-PSS imzaları korunur.
- `scripts/forge-security-patch.mjs`, CLI ile CLI/`expo-updates` altındaki `@expo/code-signing-certificates` yardımcılarının gerçekten çözdüğü bütün `rsa.js` kopyalarını denetler. Yalnız `1.4.0` ve incelenmiş SHA256 kabul edilir; değişmiş kaynak/sürümde kurulum durur. Yama tekrarlanabilir ve idempotenttir. 27 Ekim'de OTA için `expo-updates@58.0.18` eklendiğinde aynı yamanın bu yeni çözüm yolunda da doğrulanması zorunlu kılındı; bu yardımcı dışındaki yeni forge yolları hâlâ reddedilir.

Normal `npm ci` yaması `postinstall` ile uygular. `npm ci --ignore-scripts` kullanıldığında ardından **`npm run security:prepare`** zorunludur; CI işleri bunu açıkça çalıştırır. `npm run test:toolchain` Zod/Expo şemaları, gerçek imza davranışı, yama bütünlüğü, audit kapısı ve EAS/OTA yapılandırmasını doğrular (27 Ekim: 28 test). Kaynak/sürüm değiştiğinde bu korumaları devre dışı bırakmak yerine düzeltme yeniden incelenmelidir.

**Ham `npm audit` temiz değildir:** registry, yerel kaynak yamasını bilmediğinden upstream `node-forge@1.4.0` ve ona bağlı Expo paketlerini listeler. `npm run audit` bunu açıkça raporlar; ancak yamanın her gerçek çözüm yolunda hash doğrulaması ve imza regresyonları geçerse yalnız bu tek advisory'yi yerel olarak düzeltilmiş sayar. Başka yol, yeni advisory, eksik/değişmiş yama veya Zod bulgusu hata verir. Bu sonuç bütün olası açıkların yokluğunu göstermez.

Bakım: düzeltilmiş resmî forge/Expo sürümü yayımlandığında bağımlılığı yükseltip gerçek şema/imza/export ve E2E testlerini çalıştırın; ardından yerel yamayı, `postinstall`/`security:prepare` adımlarını ve audit'teki yalnız bu yamaya özgü tanımayı birlikte kaldırın. Yeni sürüm güvenliği doğrulanmadan sürüm/hash allowlist'ini genişletmeyin. Zod override'ı da CLI'nin düzeltilmiş sürüme kendisi geçtiği doğrulandığında kaldırılmalıdır.

Çalışan eski Metro süreçleri bellekte önceki bağımlılığı tutabilir; süreç sahibinin kontrollü yeniden başlatması gerekir. Bu değişiklik sunucuya dağıtım veya mağaza yayını yapmaz. Sunucu/deploy işlemleri Claude'a aittir; salt web/admin çıktı üreten ve Node'u son imaja taşımayan Docker aşaması mobil CLI çalışma ortamıyla aynı değildir.

## Kimlik ve oturum

25 Ekim 2026 mobil oturum düzeltmesi: arka plandan dönüşte başlatılan `/me` isteği, döndüğünde aynı token hâlâ geçerli değilse başarı/hata sonucunu ekrana uygulamaz. Böylece eski hesabın geciken kullanıcı verisi yeni profili değiştiremez; eski 401/403 yeni hesabı kapatamaz. `session-race.spec.ts` gerçek API ve iki sentetik hesapla üç gecikmiş yanıtı sınar. Web/admin oturum değişimi mevcut sorguları iptal eder; bu düzeltme mobil `refresh()` yolundadır.

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
