# Mobil uygulama

React Native + Expo iOS/Android istemcisi; gerçek API, güvenli cihaz oturumu, soru çalışması, geçmiş ve süreli deneme. Kurulum, ortam adresleri, e-posta akışı, test/native paket durumu ve açık bağımlılık sorunları [MOBILE](../../docs/MOBILE.md) içindedir.

Renk, şekil ve pencere sınıfı değerleri `packages/design-tokens` paketindendir (açık/koyu tema, [DESIGN](../../docs/DESIGN.md)); ekranlar rengi `useTheme()` ile okur, kodda renk kodu bulunmaz.

Kökte `npm run dev:mobile`; strict kontrol `npm run typecheck`, birim testleri `npm run test:mobile`, native JS paketleri `npm run export:mobile`. Android/iOS derlemesi ilgili SDK ve toolchain gerektirir. E2E için `npm run export:mobile:preview` ardından `npm run test:e2e`; bu önizleme 8001 test API'sini kullanır, gerçek geliştirme DB'sini kullanmaz.

## Hesabım

Profil sekmesindeki **Hesabım** kartı, bir ekran olarak açılan Hesabım sayfasına gider: e-posta adresini değiştir, parolayı değiştir, cihazlar ve oturumlar (tek tek veya diğer hepsinden çıkış), **Verilerimi indir** ve **Hesabı sil**. Mağaza kuralı gereği hesap uygulama içinden silinebilir; silinince onay ekranı ve “Girişe dön” gelir. Dışa aktarma native'de sistem paylaşım sayfasına JSON metnini verir, web önizlemede dosya olarak indirir (yeni paket yok). Giriş, `device_platform` ile cihaz türünü (iOS/Android/Web önizleme) bildirir; yalnızca kullanıcının kendi cihaz listesinde görünür. Native paylaşım sayfası ve klavye davranışı fiziksel cihazda denenmedi. Ayrıntı [PRIVACY](../../docs/PRIVACY.md).
