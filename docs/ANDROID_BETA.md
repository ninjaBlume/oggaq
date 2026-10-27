# Android kişisel beta ve güncelleme düzeni

27 Ekim 2026: Kullanıcı Android için Google Play Dahili Test ve EAS Update akışını hazırlamamızı istedi. Henüz indirilebilir Android beta veya Play yayını doğrulanmadı.

## Hazır yapılandırma ve kontroller

Marka **ÖGG SOR - Soru Bankası**, paket **net.codentum.oggsor**, sürüm **0.1.1** korunur. `play-internal` production profilini devralır: mağaza **AAB**, otomatik versionCode, Node 24.22.0 ve HTTPS API. **android-beta** EAS kanalı / **preview** ortamı, iOS `testflight`, ad hoc `preview` ve genel `production` kanallarından ayrıdır. Ortak fingerprint, 0 ms bekleme ve gömülü kurtarma paketi Android'de de kullanılır. APK veya Expo Go, mağaza AAB'si yerine sunulmaz.

Günlük geliştirme Expo + Device Hub/Android emülatöründe; dağıtılan paketin kontrolü gerçek cihazda Dahili Test üzerinden yapılır. Uyumlu küçük düzeltmeler EAS Update ile; native/SDK/izin/runtime değişiklikleri yeni AAB ile dağıtılır. Her commit otomatik yayın değildir.

**42 mobil + 29 araç/güvenlik testi**, workspace strict TypeScript ve Android Hermes export geçti. Yeni test AAB/store, otomatik kod artırımı ve kanal ayrımını doğrular. Backend/API/DB değişmedi; ortak PostgreSQL testleri çalıştırılmadı. Kanıt `artifacts/android-beta/` içindedir.

## Hesap ve imzalama

Gerçek Google Play Console'da **Codentum kurumsal hesabı / 4811557576086495455** görüldü. Başarılı kimlik doğrulama bildirimi vardı; henüz uygulama kaydı bulunmuyordu. Yeni kayıt formunda ad/paket/dil, ücretsiz uygulama seçimi ve politika/Play App Signing/ihracat beyanları bulunur. Şart ve beyanlar kullanıcı onayı olmadan kabul edilmez. Safari formu yükledikten sonra boş göründüğünden kullanıcıdan kontrol istendi.

EAS'te bu paket için Android credentials bulunmadığı doğrulandı. **oggsor-upload** takma adıyla RSA 2048/JKS upload keystore oluşturuldu. Anahtar/parolalar depo dışında 0700 klasör/0600 dosyalarda; geçici credentials.json Git/arşiv dışındaydı ve EAS yüklemesinden sonra kaldırıldı. EAS varsayılan Android credentials kaydı yerel sertifikayla eşleşti. SHA256:

`2F:66:10:A5:D7:B9:5A:D8:B0:EC:1B:DC:0C:51:D7:29:4C:83:2D:71:A7:1F:59:C8:83:12:FD:52:C0:4B:28:35`

Bu upload anahtarıdır; Google Play App Signing'de cihazlara dağıtılan sertifika farklı olabilir. Google'a imzalama yetkisi/şartlar gerçek ekranda ayrıca doğrulanır. Google Service Account/API anahtarı oluşturulmadı; ilk yükleme Play Console'dan yapılır. Bu anahtar değiştirilmez veya başka paket için kullanılmaz.

## Yayın akışı

Depo kökünde:

```sh
npm run build:android:beta -- --non-interactive --no-wait
npm run update:android:beta -- --message "Düzeltmenin kısa Türkçe açıklaması" --non-interactive
```

İlk OTA başarılı native paket tamamlandıktan sonra yayımlanır. AAB'nin imzası, paket/sürüm/versionCode/SDK/izinleri, kanal/runtime/gömülü paket bilgisi kontrol edilir. Yanlış runtime ve iOS/production kanallarına Android güncellemesinin sunulmadığı doğrulanır. Geri dönüş yalnız ilgili kanal/platform/runtime'a `eas update:roll-back-to-embedded` ile yapılır; [iOS örneğinde](IOS_BETA.md) kanal/platform yerine `android-beta`/`android` seçilir.

Kalan: imzalı AAB; onaylı Türkçe/ücretsiz uygulama kaydı; yalnız **Dahili Test**'e yükleme; ilk tester yalnız hesap sahibi; gerçek test bağlantısı ve cihazda kurulum/OTA teyidi. Başka tester veya genel mağaza yayını yapılmaz. EAS/Play yükleme başarısı cihaz doğrulaması sayılmaz.

Kaynaklar (27 Ekim 2026): [Google test kanalları](https://support.google.com/googleplay/android-developer/answer/9845334?hl=tr), [Expo imzalama](https://docs.expo.dev/app-signing/app-credentials/), [Expo Android gönderimi](https://docs.expo.dev/submit/android/).
