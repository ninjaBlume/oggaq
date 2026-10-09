# Mobil uygulama

React Native + Expo iOS/Android istemcisi; gerçek API, güvenli cihaz oturumu, soru çalışması, geçmiş ve süreli deneme. Kurulum, ortam adresleri, e-posta akışı, test/native paket durumu ve açık bağımlılık sorunları [MOBILE](../../docs/MOBILE.md) içindedir.

Kökte `npm run dev:mobile`; strict kontrol `npm run typecheck`, birim testleri `npm run test:mobile`, native JS paketleri `npm run export:mobile`. Android/iOS derlemesi ilgili SDK ve toolchain gerektirir. E2E için `npm run export:mobile:preview` ardından `npm run test:e2e`; bu önizleme 8001 test API'sini kullanır, gerçek geliştirme DB'sini kullanmaz.
