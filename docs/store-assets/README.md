# Google Play görselleri

28 Ekim 2026, Türkçe mağaza taslağı için hazırlandı. Dosyalar `android/tr-TR/` altında; boyut, dosya uzunluğu ve SHA-256 değerleri `manifest.json` içindedir.

- `play-icon-512.png`: mevcut onaylı uygulama simgesinin 512×512 çıktısı; amblem değiştirilmedi.
- `play-feature-1024x500.png`: merkezi marka/palet, League Spartan Bold ve gerçek Android ana ekranıyla hazırlanan tanıtım görseli.
- `01-home.png`, `02-exams.png`, `03-question.png`, `04-score.png`: Android 16 ARM64 emülatöründe Expo Go/SDK 58 ile alınmış, değiştirilmemiş 1080×1920 PNG ekran görüntüleri. Telefon ekranlarıdır; tablet veya iOS ekranı olarak kullanılmaz.

Ekranlarda yalnız sentetik öğrenci hesabı kullanıldı. Ayrı geçici PostgreSQL veritabanına şema ve yayımlanmış soru/takvim içerikleri aktarıldı; gerçek kullanıcı, oturum, sonuç veya başvuru verileri aktarılmadı. Soru ekranı gerçek yayımlanmış soru sürümünü gösterir. Puan hesaplama örneği 63 genel bilgi doğrusu, 13 silah doğrusu ve 4/5 atışla 64,5 tahmini puan gösterir; resmî sonuç olarak sunulmaz.

Görüntüler fiziksel cihaz veya imzalı production paketinin doğrulaması değildir. Geçici veritabanı silindi; yalnız bu işlem için başlatılan 8003 API, 8083 Metro ve emülatör kapatıldı. Emülatör çözünürlük/yoğunluk ayarları geri alındı. Mevcut 8082 geliştirme sunucusu korundu.

Yeniden üretim (Node 24, depodaki mevcut Playwright kurulumu):

```sh
node apps/mobile/scripts/generate-store-assets.mjs <gercek-android-ekran-klasoru> docs/store-assets/android/tr-TR
```

Kaynak klasörü yukarıdaki dört ekran dosyasını içermelidir. Üreteç ekranların boyutunu doğrular ve bunları değiştirmeden kopyalar; eksik/yanlış boyutlu ekranı reddeder. Simge/tanıtım çıktıları yerel Chromium ile üretilir. Yeni bağımlılık kurulmaz.

Kullanıcı bu altı görselin Google Play Türkçe mağaza taslağına yüklenmesini onayladı. Taslak yüklemesi kullanım hakkı beyanı, incelemeye gönderim veya genel yayın değildir; [açık yayın koşulları](../STORE_RELEASE.md) korunur.
