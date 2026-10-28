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

## Tablet ekranları

`android/tr-TR/tablet-7/` ve `tablet-10/` klasörlerinde ana sayfa ve deneme listesi için ikişer ayrı **1440×2560** ekran bulunur. Android emülatörünün ekran yapılandırması değiştirildi; mevcut telefon görüntülerine ölçekleme veya düzenleme uygulanmadı. Küçük tablet görünümü 360 dpi / 640 dp genişlik, büyük tablet görünümü 272 dpi / yaklaşık 847 dp genişlikle alındı. Bunlar Google Play'in tablet boyut sınıfları için önizlemedir; fiziksel 7/10 inç cihaz testi değildir. Küçük tablette Standart, büyük tablette uygulamanın Küçük yazı tercihi kullanıldı. Ayrıntılar ve hash'ler `tablet-manifest.json` içindedir.

Yalnız ayrı geçici içerik veritabanındaki sentetik öğrenci kullanıldı. İş sonunda yazı tercihi Standart'a döndürüldü; ekran boyutu/yoğunluğu ve ADB yönlendirmesi geri alındı, kendi API/Metro/emülatör süreçleri kapatıldı ve geçici DB silindi. Canlı ve ortak geliştirme verileri değiştirilmedi. iPad/App Store ekranları bu dosyaların kapsamında değildir.

Kullanıcı onayıyla dört tablet dosyası ilgili Google Play taslak alanlarına yüklendi; kaydetme başarı mesajı ve sayfa yeniden yüklemesinde her iki tablet alanında 2/8 ekran doğrulandı.

### Yatay tablet ekranları

Her tablet klasöründeki `03-home-landscape.png` ve `04-exams-landscape.png`, ayrı yatay ekran yapılandırmasında alınan **2560×1440** özgün görüntülerdir. 7 inç sınıfı için 360 dpi, 10 inç sınıfı için 272 dpi; ikisinde de Standart yazı tercihi kullanıldı. Dosyalar döndürülmüş/büyütülmüş dikey görüntüler değildir; yan gezinme ve iki sütunlu gerçek yerleşimi gösterir. Dört dosyanın boyut/hash kaydı `landscape-manifest.json` içindedir. Kullanıcının düzeltmesiyle telefon için yatay ekran hazırlanmadı.

Çekim yine yalnız geçici DB'deki sentetik öğrenciyle yapıldı; canlı/ortak geliştirme verisi kullanılmadı. Çekim servisleri kapatıldı, ekran ayarları geri alındı, geçici DB'nin silindiği ve mevcut 8082 Metro'nun korunduğu doğrulandı. iPad/App Store ekranları değildir.

Kullanıcının açık onayıyla dört yatay görüntü Google Play'de ilgili 7/10 inç tablet alanlarına eklendi; “Değişiklikleriniz kaydedildi” mesajı görüldü. Sayfa yenilenince her tablet alanında iki dikey + iki yatay olmak üzere 4/8 ekran ve yatay dosya adları korundu. Telefon görselleri değişmedi, inceleme veya genel yayın yapılmadı.
