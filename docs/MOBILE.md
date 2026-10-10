# Expo mobil uygulaması

`apps/mobile`, React Native 0.86.3 / Expo SDK 57.0.27 ile iOS/Android native bileşenleri kullanır. Kayıt/giriş, doğrulama e-postasını yeniden gönderme ve kontrol etme, parola yenileme e-postası, kişisel/aktif kurum seçimi, ders/konu ve yayımlanmış soru çalışması, geçmiş, süreli deneme/sonuç uygulanmıştır. HTML/web ekranı native içine gömülmez. Ortak API sözleşmesi ve saf sayaç kodu web ile paylaşılır. Uygulamaların React sürümü SDK'nın renderer sürümü 19.2.3'e eşitlendi; Expo Doctor 21/21 geçti.

## Mobil tasarım ve gezinme

10 Ekim 2026 mobil arayüzü telefon uygulaması olarak yenilendi. `apps/web` ve `apps/admin` masaüstü arayüzlerinden bağımsızdır; ortak API istemcisi ve iş kuralları korunur. Renkler `src/theme.ts`, bileşenler `src/ui.tsx`, marka başlığı `brand.json` içindedir.

- Güncel renk sistemi: lacivert `#182B45` marka/başlık, petrol `#0F766E` eylemler, kırık beyaz `#F7F8F6` zemin, beyaz yüzeyler ve mat altın `#D6A64F` küçük vurgu. Doğru/yanlış için ayrı başarı/hata renkleri, ikonlar ve metinler korunur. Renk rolleri merkezi temadan yönetilir; eski mavi/yeşil isimleri yerine `softPrimary`, `softSuccess`, `accent` kullanılır. Ana sayfa sadeleştirildi; güncel kartlar 24px, ana metin 17px / 27px satır aralığıdır.
- Sabit üst çubuktaki menü düğmesi soldan açılan native Modal panelini gösterir. Menü; ana sayfa, soru bankası, deneme, geçmiş, profil, gerçek kişisel/kurum alanları ve API üzerinden çıkışa bağlanır. Seçili bölüm/alan belirtilir; alan değişimi mevcut gezinme sıfırlamasını kullanır. Panel kaydırılabilir; güvenli alan ve sabit çıkış bölümü dar/yatay ekranlarda korunur. Dışarı dokunma, kapatma düğmesi, sola sürükleme, Android geri, VoiceOver escape ve web önizlemede Escape kapanışı uygulanır. Sistem hareket azaltma tercihi gözetilir; açılış tercihi bilinmeden animasyon başlatılmaz. Açıkken alttaki ekran erişilebilirlik ağacından gizlenir; web Modal odağı panelde tutup kapanışta geri verir. Soru/deneme ayrıntıları mevcut geri gezinmesini korur.
- Alt gezinme: Ana sayfa, Soru çöz, Deneme, Geçmiş ve Profil. Seçili sekme, tekrar dokunarak başa kaydırma, güvenli alan ve klavye açıkken sekmeleri gizleme uygulanır.
- Ana sayfa: kişisel karşılama, çalışmaya başlama, gerçek ders kataloğu, son sorular ve son üç denemedeki devam eden deneme. Toplam başarı/günlük seri gibi API’de olmayan sayılar gösterilmez.
- Ders/konu filtreleri, soru dizini ve bitirme onayı alttan açılan panellerdir. Katalog ve geçmiş sayfalaması korunur. Soru/deneme ayrıntılarında alt sekmeler gizlenir; cevaplama/soru geçişi kontrolleri ekranın altında sabit kalır.
- Ayrıntılar [React Navigation native stack](https://reactnavigation.org/docs/native-stack-navigator/) ile açılır; iOS kenardan geri hareketi ve Android geri düğmesi desteklenir. Android’de ana sekmelerin geri hareketi Ana sayfa’ya döner. Güvenli alan, soru/cevap durumları ve sunucuya dayalı süre/değerlendirme korunur.
- Geçmişte sorular ve denemeler ayrı seçilir. Profilde hesap bilgileri, kişisel/kurum alanı ve çıkış bulunur. Alan değişimi gezinmeyi sıfırlar; diğer alandaki geçmiş gösterilmez.
- İkonlar [Lucide React Native](https://lucide.dev/guide/react-native) / SVG bileşenleridir; tek tek import edilir. Soru listesine döndükten sonra aynı soruyu yeniden çözmek yeni çalışma UUID’si oluşturur. Denemeden dönünce yeni deneme başlatma kilidi kaldırılır; başarısız isteğin tekrarında UUID korunur.

İlk arayüz yenilemesi için 17 mobil birim testi, tüm istemcilerin strict TypeScript kontrolü, 5 gerçek PostgreSQL/API mobil Chromium E2E testi ve Expo Doctor 21/21 geçti. iOS/Android Hermes ve web export ile iki platformun prebuild yapılandırması doğrulandı. Android prebuild `super.onCreate(null)` ve `enableOnBackInvokedCallback=false` üretir. E2E; tekrar soru çözme, cevap/deneme sonucu, filtre panelleri, soru dizini, geçmiş, alan ayrımı, çıkış, boş içerik ve 320/390/834px gezinmeyi kapsar. Ekran görüntüleri `artifacts/mobile-preview/redesign/` içinde git dışındadır. Kullanıcı 10 Ekim 2026’da yeni tasarımın fiziksel iPhone’da Expo Go üzerinden açıldığını doğruladı. Jest, klavye ve arka plan davranışlarının fiziksel cihazda ayrıca doğrulandığına dair teyit yoktur; Chromium görüntüleri bu davranışların kanıtı değildir.

`bb2a237541c4b9085e5e63fdb8c57729d3f69857` için [uygulama/API CI](https://github.com/ninjaBlume/oggaq/actions/runs/38032789048) başarılıdır: 109 backend testi / 584 assertion, 35 Vitest, 27 Chromium E2E, strict tip, web build, mobil export ve Expo Doctor geçti. [Yeni Android/iOS native paket derlemesi](https://github.com/ninjaBlume/oggaq/actions/runs/38032789058) ve bu derlemenin paketleriyle [Android emülatörü / iOS Simulator açılış kontrolleri](https://github.com/ninjaBlume/oggaq/actions/runs/38033655306) başarılıdır. Açılış kontrolünün workflow commit’i `9eb3bf5` olsa da indirilen paketler `38032789058` numaralı `bb2a237` derlemesindendir; önceki native artifact hashleri aşağıda ayrı tutulur. Güncel iOS Expo Go JavaScript paketi geçici HTTPS geçidinden doğrulandı ve Safari düğmesine bağlandı; fiziksel Expo Go paketi indirdikten sonra API giriş/veri istekleri başarılı döndü. Kullanıcı yeni tasarımın geldiğini ve uygulamayı artık doğrudan Expo Go üzerinden açtığını doğruladı.

Palet/yan menü güncellemesinde strict TypeScript, 17 mobil birim testi, Expo Doctor 21/21, iOS/Android Hermes ve web export geçti. Güncel 9 mobil Chromium E2E; önceki çalışma akışlarına ek olarak tüm menü hedeflerini, seçili bölümü, klavye odağını, kapanış yollarını, 320/390/834px ve yatay ekran yerleşimini, çalışma alanı izolasyonunu ve çıkış tokenının API’de iptalini kapsar. Çıkış isteği başarısız olduğunda giriş ekranına geçilmediği ve tekrar denemeyle gerçek API çıkışının tamamlandığı da kontrol edilir. Ana renk çiftlerinde hesaplanan kontrast oranları: beyaz/petrol 5.47:1, füme/kırık beyaz 13.46:1, gri/beyaz 4.97:1, altın/lacivert 6.41:1, başarı/açık yeşil 4.78:1, hata/açık kırmızı 4.95:1. Bu ölçümler tüm erişilebilirlik davranışlarının test edildiği anlamına gelmez. Fiziksel iPhone’da bu yeni palet ve yan menünün görünüm/jest teyidi henüz yoktur; önceki iPhone teyidi ilk tasarıma aittir. Güncel Expo Go JavaScript paketi yeni menü etiketleri, renkleri ve korunmuş API yolu ile mevcut geçici HTTPS geçidinden doğrulandı; `2a3dcc0` palet/menü sürümünün [uygulama/API CI](https://github.com/ninjaBlume/oggaq/actions/runs/38035763073), [Android/iOS paket derlemesi](https://github.com/ninjaBlume/oggaq/actions/runs/38035763116) ve [emülatör/Simulator açılış kontrolü](https://github.com/ninjaBlume/oggaq/actions/runs/38036664235) başarılıdır.

## Material 3 Expressive uyarlaması

10 Ekim 2026: mobil tasarım, OGGAQ renkleri ve sistem yazı tipleriyle Material 3 Expressive yaklaşımına uyarlandı. Özel React Native bileşenleridir; Android Compose Material kütüphanesi kullanılmaz ve bütün Material bileşenlerinin uygulanmış olduğu iddia edilmez. Masaüstü arayüzü ayrı kalır.

- `src/theme.ts` renk rolleri, 8/16/24/32px ve kapsül şekiller, başlık/metin ölçeği ve yay hareketlerini merkezileştirir. Lacivert/petrol/kırık beyaz ve küçük altın vurgu korunur; `primaryContainer` / `onPrimaryContainer` ve `secondaryContainer` / `onSecondaryContainer` açık renkli eylem yüzeylerini tanımlar.
- `src/expressive.tsx` ana eylemlerde basışla 28px → 16px köşe değişimi ve hafif ölçek tepkisi uygular. Giriş/kayıt, soru/deneme geçmişi ve soru sayısı bağlı seçim gruplarıdır: dış köşeler 26px, iç köşeler 6px; seçili düğme kapsüle dönüşür, dolgu, onay ikonu ve erişilebilir seçili durumuyla belirtilir. Düğmeler en az 54px, seçimler en az 52px yüksekliğindedir.
- Ana sayfada daha büyük tipografi, farklı köşeli lacivert başlık ve açık renkli hızlı eylemler bulunur. Ana sayfa ve gerçek deneme sonucu için küçük dilimli SVG rozetleri kodla çizilir; skor API’den gelir. Alt sekme göstergesi ve yan menü aynı şekil/hareket dilini kullanır. Soru ve deneme sırasında seçenekler yer değiştirmez veya ölçeklenmez; seçimin harf rozeti kısa bir şekil tepkisi verir, doğru/yanlış metni ve ikonları korunur.
- Hareketler [resmî AndroidX ExpressiveMotionTokens v0_14_0](https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt) yay değerlerinden uyarlanır: hızlı uzamsal sertlik 800 / sönüm oranı 0.6, varsayılan uzamsal 380 / 0.8, hızlı görsel etki 1600 / 1. React Native için kütle 1 ve `damping = 2 × dampingRatio × sqrt(stiffness × mass)` kullanılır. Yerel platformlarda Animated native driver, web QA’da JS driver çalışır.
- `src/motion.tsx` sistemin hareket azaltma tercihini bir kez dinleyen ortak sağlayıcıdır. Tercih okunana kadar hareket kapalıdır; geciken ilk okuma daha yeni sistem olayını ezmez. Basış/seçim hareketleri uygulama açıkken tercih değişimine uyar. Okuma başarısızsa hareket kapalı kalır. Yan menü açılışında panel/scrim sınırları yay taşmasına karşı kısıtlanır.

Strict TypeScript, 17 mobil birim testi, Expo Doctor 21/21 ve iOS/Android Hermes + web export geçti. Gerçek PostgreSQL/API ile 11 mobil Chromium E2E geçti: mevcut 9 çalışma/menü testine basış geri bildiriminin eylemi bozmaması, soru sayısı seçimi, 320/390/834px yerleşim ve canlı hareket azaltma tercihi eklendi. Ekran görüntüleri giriş animasyonu son durumuna ulaştıktan sonra alınır. Mevcut geçici HTTPS geçidinden indirilen iOS Expo Go UTF-8 JavaScript paketinde yeni başlık, renk rolleri, Expressive bileşenler ve korunmuş API taban yolu doğrulandı. Bu sürümün fiziksel iPhone animasyon/jest teyidi ve yeni native paket CI sonucu henüz yoktur; önceki başarılı native derlemeler yukarıdaki commit’lere aittir.

## Çalıştırma

Node 24 ve yerel API/servisleri hazırlayın. Kökte `npm ci --ignore-scripts`; `npm run dev:mobile` Expo'yu loopback'te açar. Xcode bulunan Mac'te `npm run ios --workspace @oggaq/mobile`; Android SDK/JDK ile `npm run android --workspace @oggaq/mobile`. [Expo yerel geliştirme](https://docs.expo.dev/guides/local-app-development/) gerekli araçları açıklar. [SDK matrisi](https://docs.expo.dev/versions/latest/) SDK 57 için Xcode 26.4+, iOS 16.4+, Android 7+ ve compile/target SDK 36 belirtir.

`apps/mobile/.env.example` kopyalanabilir; gerçek `.env` git dışındadır. iOS Simulator API `http://127.0.0.1:8000`, Android emülatörü `http://10.0.2.2:8000` kullanır. Fiziksel cihazdaki bağımsız release paketi için erişilebilir HTTPS API ve `EXPO_PUBLIC_WEB_URL` gerekir. Expo Go geliştirme testi aynı yerel ağda HTTP API kullanabilir; aşağıdaki kurulum bu geliştirme yoludur. Bu adreste backend ayrıca çalışmalı; sunucu LAN'a otomatik açılmaz. `EXPO_PUBLIC_*` ayarları paketin içinde herkes tarafından okunabilir; token/parola içermez.

API taban adresi reverse proxy yolunu içerebilir: `https://example.test/preview/backend` yapılandırması `/api/v1/me` isteğini `/preview/backend/api/v1/me` yoluna gönderir. İstemci `/api/v1` yollarını kendisi ekler; taban adrese bu uçları eklemeyin. Sondaki eğik çizgiler kaldırılır; URL içinde kullanıcı bilgisi, sorgu veya fragment kabul edilmez. Release için HTTPS zorunluluğu korunur.

Normal release paketi HTTPS gerektirir. CI yerel önizlemesi `EXPO_PUBLIC_LOCAL_PREVIEW=1` ile yalnız localhost/127.0.0.1/10.0.2.2 hedeflerine izin verir; Android manifestinde HTTP erişimi, iOS'ta local networking açılır. Bu APK mağaza/üretim paketi değildir. Native klasörler `expo prebuild` ile kilitli bağımlılıklardan üretilir; git dışındadır.

## iPhone'da aynı Wi-Fi üzerinden geliştirme testi

iPhone'a [Expo Go](https://apps.apple.com/app/expo-go/id982107779) kurun. Mac ve iPhone aynı yerel ağda olmalı. Fiziksel iOS cihazında [Expo CLI ve Expo Go aynı Expo hesabına giriş ister](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/). Mac'te `apps/mobile` içinde Node 24 ile `npx expo login`; telefonda Expo Go'nun hesap ekranında aynı Expo hesabına giriş yapın. Expo oturumu geliştirme aracına aittir; uygulamadaki kullanıcı oturumu OGGAQ API'si tarafından doğrulanır. Expo CLI oturumu sunucu açıkken açılabilir; telefonda yeniden deneyin.

Mac'in Wi-Fi IPv4 adresini `ipconfig getifaddr en1` ile bulun; aktif Wi-Fi arayüzü farklıysa onu kullanın. Aşağıdaki `192.168.1.20` yalnız örnektir; kendi Mac adresinizle değiştirin. `apps/mobile/.env.local` git dışındadır:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:8002
EXPO_PUBLIC_WEB_URL=http://192.168.1.20:5175
EXPO_PUBLIC_LOCAL_PREVIEW=0
```

Yerel PostgreSQL/Redis açıkken ayrı terminallerde, PHP 8.4 ve Node 24 PATH'e seçilerek:

```sh
# backend/ içinde; yalnız özel ağ arayüzüne bağlanır.
APP_DEBUG=false APP_URL=http://192.168.1.20:8002 FRONTEND_URL=http://192.168.1.20:5175 SANCTUM_STATEFUL_DOMAINS=192.168.1.20:5175 php artisan serve --host=192.168.1.20 --port=8002 --tries=1 --no-reload

# apps/web/ içinde; telefon tarayıcısı ve mobilde web bağlantıları için.
VITE_API_URL=http://192.168.1.20:8002 npx vite --host 192.168.1.20 --port 5175 --strictPort

# apps/mobile/ içinde.
REACT_NATIVE_PACKAGER_HOSTNAME=192.168.1.20 npx expo start --go --lan --port 8081
```

Kamerayla Expo QR kodunu tarayıp Expo Go'da açın; iOS yerel ağ iznini istiyorsa verin. API bağlantısını iPhone Safari'de `http://192.168.1.20:8002/up` ile kontrol edebilirsiniz. Uygulamada mevcut doğrulanmış hesabınızla giriş yapın. Mac açık ve bu üç terminal çalışır durumda kalmalıdır; durdurmak için her terminalde Ctrl+C. Wi-Fi/IP değişirse yerel adresleri güncelleyip Expo'yu yeniden başlatın. Bu geliştirme erişimi TestFlight/App Store dağıtımı değildir. Bildirim e-postaları yerel Mailpit'e gider; mevcut loopback Horizon worker'ının e-posta bağlantıları Mac tarayıcısında açılır.

9 Ekim 2026 yerel hazırlığında özel ağ üzerinden API/web erişimi, mobil login endpoint validation, web origin CORS, iOS Expo manifesti, LAN adresleri gömülü native geliştirme bundle'ı ve QR çözümleme kontrol edildi. Fiziksel iPhone'da açma, giriş ve yeniden açılış kontrolü kullanıcının Expo oturumu ve cihaz erişimiyle ayrıca doğrulanmalıdır.

### Telefon yerel sunucuya ulaşamıyorsa

Önce iPhone Safari'de `http://MAC_IP:8081/status` açılmalı ve `packager-status:running` görülmelidir. API için `http://MAC_IP:8002/up` ayrıca kontrol edilir. Mac'in kendi adresine yaptığı başarılı istek, telefon bağlantısını doğrulamaz. Aynı Wi-Fi adı ve aynı IP aralığı da erişimi garanti etmez; misafir ağı/cihaz izolasyonu veya VPN yerel bağlantıyı engelleyebilir. Expo Go için [Yerel Ağ iznini](https://support.apple.com/en-gb/102229) kontrol edin.

[Expo tüneli](https://docs.expo.dev/more/expo-cli/#tunneling) geliştirme paketini taşır; API'yi kendiliğinden erişilebilir yapmaz. Yerel bağlantı engelliyse mobil paketin API ayarı da erişilebilir HTTPS adresine yönelmelidir. [Cloudflare Quick Tunnel](https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/) geçici bir HTTPS adresi sağlayabilir; tünel süreci kapanınca adres çalışmaz. Yerel geliştirme API'sini doğrudan herkese açmayın; önizleme erişimini ayrıca sınırlandırın.

10 Ekim 2026 bu cihazdaki LAN bağlantısı Safari'de başarısız kaldı. Geçici HTTPS önizlemesi rastgele erişim anahtarı isteyen bir geçit üzerinden hazırlandı; anahtarsız uygulama/API erişimi, yönetici API yolları ve yol geçişi reddedildi. Anahtarsız bağlantı testi yalnız sabit bir metin döndürür; bu HTTPS testi iPhone Safari'de başarılı oldu ve geçitte `200` yanıtı görüldü. Expo manifestinin hesap bilgisi ve iOS JavaScript paketinin HTTPS API ayarı kontrol edildi; paket HTTPS üzerinden indirildi, kimliksiz API isteği `401`, eksik giriş isteği `422` döndü. Expo Go önizlemesinde bytecode yerine UTF-8 JavaScript ve tek paket kullanıldı; QR kodu çözülerek adresi doğrulandı. Tünel, geçit, anahtar ve QR dosyaları `artifacts/iphone-preview/https/` içinde git dışındadır; normal `.env.local` LAN ayarı korunur. Bu erişim App Store/TestFlight dağıtımı değildir.

Safari açılış sayfasındaki “Expo Go’da aç” düğmesiyle fiziksel iPhone Expo Go manifest ve JavaScript paketini indirdi (`200`). Kullanıcı giriş ekranını gördüğünü bildirdi; ardından uygulama API taban adresinin geçit yolunu reddeden bir JS hatası gösterdi. `validateApiUrl` HTTPS taban yolunu koruyacak şekilde düzeltildi. 17 mobil test ve strict TypeScript kontrolü geçti; HTTPS üzerinden yeniden indirilen minify paketteki gerçek doğrulama fonksiyonu geçici API adresiyle ayrıca çalıştırıldı. HTTP, kullanıcı bilgisi, sorgu ve fragment reddi korundu. Safari düğmesi yenilenen pakete yönlendirildi. Kullanıcı düzeltme sonrası fiziksel iPhone’da OGGAQ hesabıyla giriş yaptığını ve uygulamanın açıldığını doğruladı. Aynı zaman aralığında geçitte Expo istemcisinden API için bir `201` ve ardından başarılı `200` yanıtları görüldü. Oturumun uygulama kapatılıp yeniden açıldığında korunması, arka plan davranışı ve gerçek içerikle soru/deneme akışları bu doğrulama kapsamında henüz test edilmedi.

Fiziksel iPhone’daki ilk çıkış denemesinde geçit `413` döndürdü: boş POST isteğinin `Transfer-Encoding: chunked` çerçevesi geçit tarafından reddediliyordu. Geçit artık `scripts/preview_http_body.py` ile chunked veya Content-Length gövdelerini en fazla 64 KiB olacak şekilde okur; belirsiz/bozuk çerçeve, fazla chunk ve trailer reddedilir, okuma zaman aşımı uygulanır. Dokuz regresyon testi `python3 -m unittest discover -s scripts -p test_preview_http_body.py -v` ile geçer ve CI’a eklendi. Boş chunked çıkış isteğinin yerel geçit ve gerçek HTTPS tüneli üzerinden kimliksiz API’ye ulaşıp JSON `401` döndürmesi doğrulandı; yönetici/anahtarsız yolların engeli korundu. PostgreSQL test veritabanında mevcut mobil çıkış testi de geçti (1 test, 3 assertion): yalnız ilgili token iptal edilir. Geçit yeniden başlatıldı; bu düzeltme için mobil paketin yeniden yüklenmesi gerekmez. Kullanıcı düzeltme sonrası fiziksel iPhone’da çıkışın başarılı olduğunu ve giriş ekranına döndüğünü doğruladı.

## Oturum ve e-posta

Mobil `/auth/mobile-tokens` cihaz UUID'siyle finite Bearer token verir. Token/expiry ve cihaz kimliği native [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) içindedir; parola tutulmaz. Yeniden açılışta kayıt yüklenir ve `/me` doğrulanır; 401/aktif olmayan hesap ekranları kapatır. Logout sunucudaki tokenı iptal eder ve secure kaydı siler. Aynı cihaz girişi eski cihaz tokenını iptal eder; diğer cihazlar bağımsızdır. Eski tokenın gecikmiş 401'i yeni oturumu silemez.

Doğrulama/reset e-postaları mevcut web formuna gider. Doğrulama bağlantısını aynı hesapla tarayıcıda açıp uygulamada kontrol edin. Universal Links/App Links ve native reset formu henüz yoktur; bu adımlar kullanıcıya ekranda anlatılır.

Expo web export yalnız ekran/API QA önizlemesidir; oturum bellekte tutulur, localStorage'a token yazılmaz, sayfa yenileme yeniden giriş ister. Native SecureStore davranışını web testinden geçti saymayın. Üyelik/bağlam değişiminde çalışma ekranı yeniden kurulur; başka kullanıcının geçmişi cache'de tutulmaz. Ağ hatalarında sonuç uydurulmaz; tekrar veya güncel kayıt yükleme sunar.

## Doğrulama ve native paketler

Yerelde strict TypeScript, 17 mobil oturum/URL/HTTP testi, 3 ortak saat testi, iOS/Android Hermes ve web Metro export, native Android/iOS prebuild ve Expo Doctor doğrulandı. Expo ekranları 390px Chromium üzerinde gerçek PostgreSQL/API ile Bearer giriş, tek soru, geçmiş, deneme bitişi, logout ve önizleme yenilemesiyle kontrol edildi. Web ve native davranış kanıtları ayrıdır.

Bu Mac'te tam Xcode, Android SDK ve Java yoktur. `e9148d792ad0fccad0dba352241c0cce628a102f` için [GitHub Actions native derlemesi](https://github.com/ninjaBlume/oggaq/actions/runs/37895000973) Android ve iOS işlerinde başarılıdır; iki artifact indirildi. Android paketi Metro/Hermes kodu gömülü, debug keystore ile imzalı yerel önizleme APK'sıdır. iOS paketi Xcode'un ad hoc imzaladığı `.app` ZIP'idir; iPhone'a yüklenen IPA değildir. Xcode Simulator yetkilerini derleme sırasında yürütülebilir dosyaya gömer; sonradan `codesign --entitlements` uygulamak bunun yerine geçmez. Simulator kimliği/imzası Apple üretim sertifikası yerine geçmez.

| Paket | Boyut (byte) | SHA-256 |
| --- | ---: | --- |
| `app-release.apk` | 42262862 | `bd615c5e76187330cab4bdc39e226dc2e30937232b1fc2afc630c1e8c10b71b2` |
| `oggaq-ios-simulator.zip` | 14464425 | `6d907a0816a47feda2a3118ec8dd23c92930315213bbe39e63f3a81c90cb82d4` |

[Native açılış kontrolü](https://github.com/ninjaBlume/oggaq/actions/runs/37895502143) Android ve iOS işlerinde başarılıdır. APK Android emülatörüne, `.app` iPhone Simulator'a yüklenip açıldı; iki platformun son ekran görüntüleri indirildi ve hatasız giriş ekranı görüldü. Android accessibility ağacında giriş başlığı, iOS'ta uygulama süreci ayrıca doğrulandı. Yerel önizleme açılışında native SecureStore’a sentetik bir probe değeri yazma, okuma ve silme tamamlandı. Aynı kodun [API/uygulama CI sonucu](https://github.com/ninjaBlume/oggaq/actions/runs/37895000957) da başarılıdır.

Bu kontrol gerçek hesapla native API E2E, tokenın uygulama yeniden açılışında korunması veya fiziksel cihaz/arka plan testi yerine geçmez. App Store/Play Store yayını tamamlanmadı. Üretim imzası, canlı HTTPS API, mağaza metinleri ve gizlilik/hesap silme kapıları ayrıdır.

API adresi düzeltmesini içeren `268607fee5906e11bec79ad9d5925ea1e75bbf09` için [uygulama/API CI](https://github.com/ninjaBlume/oggaq/actions/runs/38030347645), [Android/iOS native paket derlemesi](https://github.com/ninjaBlume/oggaq/actions/runs/38030347637) ve [emülatör/Simulator açılış kontrolü](https://github.com/ninjaBlume/oggaq/actions/runs/38030710699) de başarılıdır. Yukarıdaki artifact boyutları ve hashleri önceki `e9148d7` derlemesine aittir.

## Açık bağımlılık sorunları

9 Ekim 2026 npm audit: Expo derleme zincirinde **15 etkilenen paket**, iki kök high advisory: [braces recursive pattern DoS](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (3.0.3) ve [node-forge signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv) (1.4.0). İncelenen advisory'lerde düzeltilmiş sürüm yayımlanmamış. Bunlar Metro dosya eşleme ve Expo CLI sertifika araçlarında; native uygulamanın auth/HTTPS uygulamasında kullanılmaz. Varsayılan geliştirme sunucusu loopback'tedir; yukarıdaki iPhone testi Metro'yu yerel Wi-Fi ağına açar ve güvenilen geliştirme ağı içindir. OTA kod imzalama yapılandırılmadı. Bu değerlendirme upstream açığın düzeltildiği anlamına gelmez.

`xcode` altındaki UUID 7, desteklenen CJS UUID 11.1.1 override'ıyla düzeltildi ve prebuild tekrar doğrulandı. `npm run audit` bütün audit raporunu okur, sadece belirtilen iki build advisory'sini açık uyarıyla raporlar; yeni advisory veya mobil dışına çıkan bağımlılık exception'ı CI'ı durdurur. Ham `npm audit` şu anda temiz değildir. Düzeltme yayımlandığında override/exception yeniden incelenmeli; üretim öncesi bu iki risk kapatılmalı.
