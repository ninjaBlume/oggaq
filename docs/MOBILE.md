# Expo mobil uygulaması

`apps/mobile`, React Native 0.86.3 / Expo SDK 57.0.27 ile iOS/Android native bileşenleri kullanır. Kayıt/giriş, doğrulama e-postasını yeniden gönderme ve kontrol etme, parola yenileme e-postası, kişisel/aktif kurum seçimi, ders/konu ve yayımlanmış soru çalışması, geçmiş, süreli deneme/sonuç uygulanmıştır. HTML/web ekranı native içine gömülmez. Ortak API sözleşmesi ve saf sayaç kodu web ile paylaşılır. Uygulamaların React sürümü SDK'nın renderer sürümü 19.2.3'e eşitlendi; Expo Doctor 21/21 geçti.

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
