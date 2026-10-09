# Expo mobil uygulaması

`apps/mobile`, React Native 0.86.3 / Expo SDK 57.0.27 ile iOS/Android native bileşenleri kullanır. Kayıt/giriş, doğrulama e-postasını yeniden gönderme ve kontrol etme, parola yenileme e-postası, kişisel/aktif kurum seçimi, ders/konu ve yayımlanmış soru çalışması, geçmiş, süreli deneme/sonuç uygulanmıştır. HTML/web ekranı native içine gömülmez. Ortak API sözleşmesi ve saf sayaç kodu web ile paylaşılır. Uygulamaların React sürümü SDK'nın renderer sürümü 19.2.3'e eşitlendi; Expo Doctor 21/21 geçti.

## Çalıştırma

Node 24 ve yerel API/servisleri hazırlayın. Kökte `npm ci --ignore-scripts`; `npm run dev:mobile` Expo'yu loopback'te açar. Xcode bulunan Mac'te `npm run ios --workspace @oggaq/mobile`; Android SDK/JDK ile `npm run android --workspace @oggaq/mobile`. [Expo yerel geliştirme](https://docs.expo.dev/guides/local-app-development/) gerekli araçları açıklar. [SDK matrisi](https://docs.expo.dev/versions/latest/) SDK 57 için Xcode 26.4+, iOS 16.4+, Android 7+ ve compile/target SDK 36 belirtir.

`apps/mobile/.env.example` kopyalanabilir; gerçek `.env` git dışındadır. iOS Simulator API `http://127.0.0.1:8000`, Android emülatörü `http://10.0.2.2:8000` kullanır. Fiziksel cihaz için erişilebilir HTTPS API ve `EXPO_PUBLIC_WEB_URL` gerekir. Bu adreste backend ayrıca çalışmalı; sunucu LAN'a otomatik açılmaz. `EXPO_PUBLIC_*` ayarları paketin içinde herkes tarafından okunabilir; token/parola içermez.

Normal release paketi HTTPS gerektirir. CI yerel önizlemesi `EXPO_PUBLIC_LOCAL_PREVIEW=1` ile yalnız localhost/127.0.0.1/10.0.2.2 hedeflerine izin verir; Android manifestinde HTTP erişimi, iOS'ta local networking açılır. Bu APK mağaza/üretim paketi değildir. Native klasörler `expo prebuild` ile kilitli bağımlılıklardan üretilir; git dışındadır.

## Oturum ve e-posta

Mobil `/auth/mobile-tokens` cihaz UUID'siyle finite Bearer token verir. Token/expiry ve cihaz kimliği native [SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) içindedir; parola tutulmaz. Yeniden açılışta kayıt yüklenir ve `/me` doğrulanır; 401/aktif olmayan hesap ekranları kapatır. Logout sunucudaki tokenı iptal eder ve secure kaydı siler. Aynı cihaz girişi eski cihaz tokenını iptal eder; diğer cihazlar bağımsızdır. Eski tokenın gecikmiş 401'i yeni oturumu silemez.

Doğrulama/reset e-postaları mevcut web formuna gider. Doğrulama bağlantısını aynı hesapla tarayıcıda açıp uygulamada kontrol edin. Universal Links/App Links ve native reset formu henüz yoktur; bu adımlar kullanıcıya ekranda anlatılır.

Expo web export yalnız ekran/API QA önizlemesidir; oturum bellekte tutulur, localStorage'a token yazılmaz, sayfa yenileme yeniden giriş ister. Native SecureStore davranışını web testinden geçti saymayın. Üyelik/bağlam değişiminde çalışma ekranı yeniden kurulur; başka kullanıcının geçmişi cache'de tutulmaz. Ağ hatalarında sonuç uydurulmaz; tekrar veya güncel kayıt yükleme sunar.

## Doğrulama ve native paketler

Yerelde strict TypeScript, 7 mobil saf oturum/HTTP testi, 3 ortak saat testi, iOS/Android Hermes ve web Metro export, native Android/iOS prebuild ve Expo Doctor doğrulandı. Expo ekranları 390px Chromium üzerinde gerçek PostgreSQL/API ile Bearer giriş, tek soru, geçmiş, deneme bitişi, logout ve önizleme yenilemesiyle kontrol edildi. Web ve native davranış kanıtları ayrıdır.

Bu Mac'te tam Xcode, Android SDK ve Java yoktur. `e9148d792ad0fccad0dba352241c0cce628a102f` için [GitHub Actions native derlemesi](https://github.com/ninjaBlume/oggaq/actions/runs/37895000973) Android ve iOS işlerinde başarılıdır; iki artifact indirildi. Android paketi Metro/Hermes kodu gömülü, debug keystore ile imzalı yerel önizleme APK'sıdır. iOS paketi Xcode'un ad hoc imzaladığı `.app` ZIP'idir; iPhone'a yüklenen IPA değildir. Xcode Simulator yetkilerini derleme sırasında yürütülebilir dosyaya gömer; sonradan `codesign --entitlements` uygulamak bunun yerine geçmez. Simulator kimliği/imzası Apple üretim sertifikası yerine geçmez.

| Paket | Boyut (byte) | SHA-256 |
| --- | ---: | --- |
| `app-release.apk` | 42262862 | `bd615c5e76187330cab4bdc39e226dc2e30937232b1fc2afc630c1e8c10b71b2` |
| `oggaq-ios-simulator.zip` | 14464425 | `6d907a0816a47feda2a3118ec8dd23c92930315213bbe39e63f3a81c90cb82d4` |

[Native açılış kontrolü](https://github.com/ninjaBlume/oggaq/actions/runs/37895502143) Android ve iOS işlerinde başarılıdır. APK Android emülatörüne, `.app` iPhone Simulator'a yüklenip açıldı; iki platformun son ekran görüntüleri indirildi ve hatasız giriş ekranı görüldü. Android accessibility ağacında giriş başlığı, iOS'ta uygulama süreci ayrıca doğrulandı. Yerel önizleme açılışında native SecureStore’a sentetik bir probe değeri yazma, okuma ve silme tamamlandı. Aynı kodun [API/uygulama CI sonucu](https://github.com/ninjaBlume/oggaq/actions/runs/37895000957) da başarılıdır.

Bu kontrol gerçek hesapla native API E2E, tokenın uygulama yeniden açılışında korunması veya fiziksel cihaz/arka plan testi yerine geçmez. App Store/Play Store yayını tamamlanmadı. Üretim imzası, canlı HTTPS API, mağaza metinleri ve gizlilik/hesap silme kapıları ayrıdır.

## Açık bağımlılık sorunları

9 Ekim 2026 npm audit: Expo derleme zincirinde **15 etkilenen paket**, iki kök high advisory: [braces recursive pattern DoS](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) (3.0.3) ve [node-forge signature verification](https://github.com/advisories/GHSA-86w9-cpqp-85rv) (1.4.0). İncelenen advisory'lerde düzeltilmiş sürüm yayımlanmamış. Bunlar Metro dosya eşleme ve Expo CLI sertifika araçlarında; native uygulamanın auth/HTTPS uygulamasında kullanılmaz. Derleme sunucusu loopback'te; dışarıdan glob/kod imzası girdisi kabul edilmez, OTA kod imzalama yapılandırılmadı. Bu değerlendirme upstream açığın düzeltildiği anlamına gelmez.

`xcode` altındaki UUID 7, desteklenen CJS UUID 11.1.1 override'ıyla düzeltildi ve prebuild tekrar doğrulandı. `npm run audit` bütün audit raporunu okur, sadece belirtilen iki build advisory'sini açık uyarıyla raporlar; yeni advisory veya mobil dışına çıkan bağımlılık exception'ı CI'ı durdurur. Ham `npm audit` şu anda temiz değildir. Düzeltme yayımlandığında override/exception yeniden incelenmeli; üretim öncesi bu iki risk kapatılmalı.
