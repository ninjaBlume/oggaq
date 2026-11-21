# Mağaza simgeleri

Ana sayfadaki mağaza kartları, sağlayıcıların yayımladığı özgün simgeleri yerel dosyalardan gösterir. Boyut 36 × 36 CSS pikselidir; renk ve en/boy oranı korunur. Yanlarındaki mağaza adı ve kartın erişilebilir etiketi aynı bilgiyi verdiği için görsellerin `alt` değeri boştur. Dosya hash'i URL'ye eklenir.

21 Kasım 2026 kaynakları:

- App Store: [Apple Developer PNG](https://developer.apple.com/assets/elements/icons/app-store/app-store-128x128_2x.png), `public/store-icons/app-store.png`.
- Google Play: [Google Play uygulama sayfası](https://play.google.com/store/apps/details?id=net.codentum.oggsor&hl=tr) üstbilgisindeki SVG, `public/store-icons/google-play.svg`. Yalnız sayfaya özel CSS sınıfı çıkarıldı.

Simgeler siteyle birlikte derlenir; ziyaretçinin tarayıcısı mağaza sağlayıcılarından görsel istemez. Google Play kartı mevcut indirme adresini kullanır; App Store bağlantısı tanımlanana kadar kart “Yakında” gösterir.
