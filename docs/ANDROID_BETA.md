# Android kişisel beta ve güncelleme düzeni

27 Ekim 2026, 03:38 İstanbul: **0.1.1 (2)** yalnız Google Play **Dahili Test** kanalında yayımlandı. Kanal **Etkin**, sürüm **Dahili test kullanıcıları tarafından kullanılabilir**. Yalnız hesap sahibinin 1 kişilik listesi seçilidir; genel mağaza yayını yapılmadı. Test daveti kabul edildi; gerçek Google Play indirme sayfası ve cihaz için kullanılabilirlik doğrulandı. Fiziksel Android kurulumu ve OTA alımı henüz teyit edilmedi.

## Hazır yapılandırma ve kontroller

Marka **ÖGG SOR - Soru Bankası**, paket **net.codentum.oggsor**, sürüm **0.1.1** korunur. `play-internal` production profilini devralır: mağaza **AAB**, otomatik versionCode, Node 24.22.0 ve HTTPS API. **android-beta** EAS kanalı / **preview** ortamı, iOS `testflight`, ad hoc `preview` ve genel `production` kanallarından ayrıdır. Ortak fingerprint, 0 ms bekleme ve gömülü kurtarma paketi Android'de de kullanılır. APK veya Expo Go, mağaza AAB'si yerine sunulmaz.

Günlük geliştirme Expo + Device Hub/Android emülatöründe; dağıtılan paketin kontrolü gerçek cihazda Dahili Test üzerinden yapılır. Uyumlu küçük düzeltmeler EAS Update ile; native/SDK/izin/runtime değişiklikleri yeni AAB ile dağıtılır. Her commit otomatik yayın değildir.

**42 mobil + 29 araç/güvenlik testi**, workspace strict TypeScript ve Android Hermes export geçti. Yeni test AAB/store, otomatik kod artırımı ve kanal ayrımını doğrular. Backend/API/DB değişmedi; ortak PostgreSQL testleri çalıştırılmadı. Kanıt `artifacts/android-beta/` içindedir.

## Hesap ve imzalama

Google Play Codentum kurumsal hesabı **4811557576086495455** üzerinde başarılı kimlik doğrulama bildirimi görüldü. Kullanıcı zorunlu politika/ihracat beyanlarını ve Play App Signing şart/yetkisini işlem anında açıkça onayladı. **ÖGG SOR - Soru Bankası / net.codentum.oggsor / Türkçe / Uygulama / Ücretsiz** kaydı oluşturuldu; uygulama ID'si **4975640362108828692**, Dahili Test kanal ID'si **4701026732184970975**.

Kullanıcı `Harun - Android` listesini kendi ekranında kaydetti. Gerçek listede **1 kullanıcı ve seçili** durum görüldü; kanal kaydı tamamlandı. Kullanıcının dosya seçicide tamamladığı AAB yüklemesi Google tarafından işlendi. Sürüm önizlemesinde **Yayınlamaya hazır**, versionCode **2 / 0.1.1**, min API **24+**, target SDK **36**, ReTrace ve yerel hata sembolleri doğrulandı; engelleyici hata görülmedi. Türkçe notlarla **Kaydet ve yayınla** tamamlandı; **27 Eki 03:38 tarihinde kullanıma sunuldu** görüldü. Özel anahtar/keystore/parolalar seçilmedi veya Google'a yüklenmedi.

[Teste katılım bağlantısı](https://play.google.com/apps/internaltest/4701026732184970975) gerçek oturumda açıldı; doğru `hcbilisimtr@gmail.com` hesabı ve **Accept invite** ekranı görüldü. Kullanıcı telefonda “Öğe bulunamadı” bildirdikten sonra tekrar kontrolde hesap **You’re a tester** durumuna geçti; davet kabulü doğrulandı. **Download test app** bağlantısı gerçek mağaza sayfasını açtı; doğru hesap, **This app is available for your device** ve yükleme düğmesi görüldü. Telefonda aynı bağlantı üzerinden indirme henüz teyit edilmedi. Ekran, Google'ın e-posta ve test kullanım bilgisini geliştiriciyle paylaşacağını belirtiyor. Android telefonda bu hesapla bağlantıyı açıp daveti kabul ederek Google Play'den indirmek gerekir. İlk Play kurulumu tamamlanana kadar geçici ad **net.codentum.oggsor (unreviewed)** görünür; bu durum uygulama içi markayı değiştirmez. İlk dağıtımın yayılması gecikebilir; konsol bildirimi genellikle 1 saat, bazen daha uzun der.

EAS'te bu paket için Android credentials bulunmadığı doğrulandı. **oggsor-upload** takma adıyla RSA 2048/JKS upload keystore oluşturuldu. Anahtar/parolalar depo dışında 0700 klasör/0600 dosyalarda; geçici credentials.json Git/arşiv dışındaydı ve EAS yüklemesinden sonra kaldırıldı. EAS varsayılan Android credentials kaydı yerel sertifikayla eşleşti. SHA256:

`2F:66:10:A5:D7:B9:5A:D8:B0:EC:1B:DC:0C:51:D7:29:4C:83:2D:71:A7:1F:59:C8:83:12:FD:52:C0:4B:28:35`

Bu upload anahtarıdır; Google Play App Signing'de cihazlara dağıtılan sertifika farklı olabilir. Google'a Play App Signing yetkisi/şartları kullanıcı onayıyla kabul edildi. Google Service Account/API anahtarı oluşturulmadı; ilk yükleme Play Console'dan yapılır. Bu anahtar değiştirilmez veya başka paket için kullanılmaz.

EAS build **`5757b204-6f67-459e-b057-6fa4e1bd92ca`** 27 Ekim 03:28 İstanbul'da tamamlandı: **0.1.1 / versionCode 2**, Android runtime **`ddd888fad4be168fb997d3e5994db524de32d6fb`**. İndirilen 59.309.458 bayt AAB, Google resmî bundletool **1.18.3** ve mevcut OpenJDK 21 ile doğrulandı. JAR imzası/upload sertifikası, paket/sürüm/kod, min SDK 24/target SDK 36, debugger kapalı, yalnız gerekli izinler, gerçek API ve `android-beta` kanalı eşleşti. Gömülü fingerprint EAS/yerel runtime ile aynıdır; 0 ms açılış beklemesi korunur. AAB SHA256: `0b3cc849ba935bfa94159f5f5932a47b7f756c1c3368ae5d9512aa03c73f1125`.

Native build tamamlandıktan sonra yalnız Android kanalına OTA **`01a17ac4-c093-72e8-9953-1ed10de67099`** yayımlandı (grup `3bad90b3-d5c6-45e9-9fc3-3a244e77e379`, kaynak `c1c6c61`; çalışma ağacındaki fark yalnız bu durum belgesiydi). Gerçek endpoint doğru runtime için 200/doğru güncelleme, uyumsuz runtime ve iOS için 204, production için beta olmadan 404 verdi. SDK assetRequestHeaders protokolüyle indirilen **2.078.848 bayt** launch asset'in SHA256'sı manifestle eşleşti; OTA tarihi gömülü paketten yenidir. Bunlar sunucu/paket doğrulamasıdır; cihazdan OTA alındığı henüz teyit edilmedi.

## Yayın akışı

Depo kökünde:

```sh
npm run build:android:beta -- --non-interactive --no-wait
npm run update:android:beta -- --message "Düzeltmenin kısa Türkçe açıklaması" --non-interactive
```

İlk OTA başarılı native paket tamamlandıktan sonra yayımlanır. AAB'nin imzası, paket/sürüm/versionCode/SDK/izinleri, kanal/runtime/gömülü paket bilgisi kontrol edilir. Yanlış runtime ve iOS/production kanallarına Android güncellemesinin sunulmadığı doğrulanır. Geri dönüş yalnız ilgili kanal/platform/runtime'a `eas update:roll-back-to-embedded` ile yapılır; [iOS örneğinde](IOS_BETA.md) kanal/platform yerine `android-beta`/`android` seçilir.

Kalan: fiziksel Android kurulumu ve OTA teyidi. Profilde **Sürüm 0.1.1 · Güncelleme 01a17ac4** beklenir; uygulama bir kez açılıp arka planda güncelleme alındıktan sonra tekrar açılmalıdır (sınav sırasında kapatma istenmez). Başka tester veya genel mağaza yayını yapılmaz. EAS/Play yükleme başarısı cihaz doğrulaması sayılmaz.

Kaynaklar (27 Ekim 2026): [Google test kanalları](https://support.google.com/googleplay/android-developer/answer/9845334?hl=tr), [Expo imzalama](https://docs.expo.dev/app-signing/app-credentials/), [Expo Android gönderimi](https://docs.expo.dev/submit/android/).
