# iPhone ve iPad için kapalı beta

27 Ekim 2026: Uygulamayı App Store'da herkese yayımlamadan telefona kurmak için TestFlight yolu hazırlanıyor. Bu belge kurulmuş/indirilebilir bir beta anlamına gelmez; ilk imzalı paket henüz oluşturulmadı veya yüklenmedi.

## Hazır yapılandırma

`apps/mobile/eas.json` içindeki `testflight` profili `production` ayarlarını devralır; `distribution: store` ve `ios.simulator: false` kullanır. Otomatik build numarası artırımı ve `https://oggsor.com` API/web adresleri korunur. TestFlight ile EAS'in `distribution: internal` seçeneği farklıdır: mevcut `preview`, iOS'ta kayıtlı cihazlara ad hoc dağıtımdır. TestFlight için mağaza imzalı gerçek cihaz paketi gerekir.

Expo/EAS hesabı `ninjablume` doğrulandı; EAS CLI **26.0.0** resmî npm kaynağından geçici araç önbelleğinde çalıştırılıyor (depo bağımlılığı eklenmedi). `@ninjablume/oggaq` projesi oluşturulup `extra.eas.projectId` ile bağlandı. Apple girişini kullanıcı tamamladı; mevcut takım **Harun Altay / CHS5258JRU** olarak doğrulandı. ÖGG SOR için `net.codentum.oggsor` kimliği ve **6827324899** App Store Connect kaydı oluşturuldu. Mevcut başka uygulamalar değiştirilmedi. Kullanıcı yalnız kendi iPhone/iPad'ini seçti; `Harun - iPhone ve iPad` iç test grubu oluşturuldu, hiçbir dış test daveti gönderilmedi.

`.easignore`, şirket belgelerini, backend/deploy verilerini, Git geçmişini ve anahtarları kaynak yüklemesinden çıkarır. `eas build:inspect --stage archive` ile **148 dosya / 4.229.452 bayt** kontrol edildi; gerekli mobil/workspace kaynakları vardı, ilgisiz/gizli dosya ve node_modules kopyası yoktu. Geçici arşiv kopyaları temizlendi.

Kullanıcı CSR/sertifika/profil oluşturma ve EAS'te anahtarı kullanma için açık onay verdi. Apple Distribution sertifikası `3AT6T5YSYM` ve yalnız `net.codentum.oggsor` için App Store profili `H2693L2AJS` oluşturuldu. Profilin takım/uygulama kimliği, `get-task-allow: false`, `beta-reports-active: true` ve sertifika eşleşmesi doğrulandı. İmzalama dosyaları EAS'e yüklendi; özel yedekler depo dışında 0700 klasör/0600 izinlerde saklanır. Geçici credentials.json Git/arşiv dışındaydı ve yüklemeden sonra kaldırıldı.

Kişisel grupta yalnız hesap sahibi vardır (**1 iç tester, 0 dış tester**). İlk EAS build `7d6da679-c05b-4a40-b2c6-af287a6fbc52`, OpenSSL 4 varsayılan PKCS#12 çıktısının macOS Keychain ile uyumsuzluğu nedeniyle `PREPARE_CREDENTIALS` aşamasında durdu. Aynı anahtar/sertifika Apple uyumlu parola korumalı PKCS#12 biçimine aktarıldı; geçici macOS keychain'ine gerçek import başarılıdır, mevcut keychain listesi korundu ve geçici keychain silindi. Uyumlu dosya EAS'te yeniden atandı. Uygulama anahtarı, HTTPS veya uygulamanın veri şifrelemesi değişmedi. Henüz başarılı IPA veya TestFlight paketi yok; düzeltilmiş build ile devam edilir.

## Kurulum sırası

1. Apple Developer üyeliği, doğru takım ve `net.codentum.oggsor` uygulama kaydını doğrula. Sözleşme veya yeni yetki gerekiyorsa kullanıcının ilgili işlemi tamamlaması gerekir.
2. EAS CLI'ı resmî npm kaynağından hazırlayıp mevcut Expo hesabıyla projenin kimliğini doğrula/bağla. Kaynak yüklemeden önce gizli dosya ve ilgisiz belgelerin arşive alınmadığını kontrol et. Yeni ücretli plan/ödeme başlatma.
3. iOS dağıtım sertifikası ve provisioning profilini doğrula. Apple parolası, 2FA kodu veya imzalama anahtarı sohbete/Git'e girmez.
4. Mobil dizininde `eas build --platform ios --profile testflight` ile imzalı IPA oluştur. Build/expo/native kontrollerini değerlendir; mevcut API'ye bağlanan paketi hedefle.
5. `eas submit --platform ios --profile testflight` ile paketi App Store Connect'e yükle. Bu işlem herkese açık App Store yayını değildir. Genel yayına gönderme/otomatik yayın açılmaz; web sitesinin mağaza alanları Yakında kalır.
6. Kullanıcının seçimine göre iç test veya davetli dış test grubunu hazırla. İç test, uygun App Store Connect kullanıcılarına yöneliktir. Dış tester'lara yönetim yetkisi verme; dış testin ilk build'i Apple Beta App Review sürecinden geçer. Kullanıcı istemeden kimseye e-posta daveti gönderme.
7. iPhone/iPad'de TestFlight ile kurulum, giriş, soru yanıtlama/devam, uygulamayı kapatıp açma ve API bağlantısını doğrula. Masaüstü Metro kapalıyken de çalıştığını kontrol et. Yeni sürümler TestFlight'tan dağıtılır; build'ler 90 gün kullanılabilir.

Kullanıcı seçimi, Apple girişi ve ilk imzalı build tamamlanmadan indirme bağlantısı hazır denmez. Bu yol herkese açık mağaza yayınına hazır olduğumuz veya mevcut yasal/ürün incelemelerinin tamamlandığı anlamına gelmez.

Kaynaklar (27 Ekim 2026): [Apple TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/), [Expo TestFlight](https://docs.expo.dev/submit/testflight/), [EAS profilleri](https://docs.expo.dev/build/eas-json/).
