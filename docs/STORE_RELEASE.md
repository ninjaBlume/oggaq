# App Store ve Play Store yayın hazırlığı

Durum (24 Ekim 2026): **yayına hazır değil.** Kod tarafında hesap silme, sorun bildirme, takip SDK'sı olmaması ve HTTPS-yalnızca iletişim gibi mağaza kurallarının teknik şartları karşılanıyor. Eksik olanlar: hukuki metinlerin son hâli, yayıncı ve veri sorumlusu kararı, soru içeriğinin hak teyidi, puanlama uzman onayı, nihai marka ikonu, derleme ve mağaza hesapları. Bu belge neyin hazır, neyin kimde olduğunu ve adım adım ne yapılacağını anlatır. Otomatik ön kontrol: `npm run check:store` (engel varsa çıkış kodu 1).

**Hiçbir mağaza adımı çalıştırılmadı.** Apple Developer, App Store Connect, Play Console, EAS Build ve herhangi bir gönderim yapılmadı; hesap bilgisi, anahtar veya gizli değer bu depoda yok.

## 1. Hazırlık tablosu

| Konu | Durum | Kimde |
| --- | --- | --- |
| Uygulama içi hesap silme (Apple 5.1.1(v), Google) | Hazır: web ve mobilde, parola + onay yazısı | — |
| Hesap silme için herkese açık web sayfası (Google) | Taslak hazır: `/legal/hesap-silme.html` | Hukukçu + e-posta adresi |
| Gizlilik politikası / KVKK aydınlatma metni | **Taslak**: `/legal/gizlilik.html` | Hukukçu |
| Kullanım koşulları | **Taslak**: `/legal/kosullar.html` | Hukukçu |
| Destek sayfası ve iletişim | **Taslak**: `/legal/destek.html`, e-posta yok | Kullanıcı |
| Uygulama içinde yasal bağlantılar | Hazır: web altbilgisi, giriş/kayıt, mobil Profil → Yasal ve destek, giriş ekranı | — |
| "Resmî kurum değildir" uyarısı | Hazır: web altbilgisi, giriş, mobil Profil; kullanım koşullarında | — |
| "Hesaplama resmî sonuç değildir" notu | Hazır: puan hesaplama ekranları (web, mobil) | — |
| Uygulama ikonu, uyumlu (adaptive) ikon, açılış simgesi, favicon | **Geçici** marka: `apps/mobile/assets/` | Kullanıcı (nihai logo) |
| Yerel açılış ekranı (native splash) | Yok: `expo-splash-screen` kurulu değil | Onay gerekir (paket) |
| Derleme yapılandırması | Hazır ama çalıştırılmadı: `apps/mobile/eas.json` | Kullanıcı (Expo hesabı) |
| Paket kimliği | **Geçici**: `net.harunaltay.oggaq` | Kullanıcı (yayıncı kararı) |
| Takip, reklam, analitik SDK'sı | Yok (gizlilik beyanı basit) | — |
| Üçüncü taraf girişi (Apple ile Giriş zorunluluğu) | Yok | — |
| Ödeme / uygulama içi satın alma | Yok | — |
| Soru bildirme (Apple 1.2 benzeri) | Hazır: "Soruyu bildir" + yönetici kuyruğu | — |
| İnceleme demo hesabı | Hazırlanmadı | Kullanıcı |
| Soru içeriğinin hak teyidi | **Engel** | Kullanıcı + hukukçu |
| Puanlama kurallarının uzman onayı | **Engel** | Kullanıcı + uzman |
| Veri sorumlusu, VERBİS, yurt dışı aktarım | **Engel** | Kullanıcı + hukukçu |
| Gerçek e-posta sağlayıcısı | Yok (sunucuda Mailpit) | Kullanıcı |
| Yedekleme | Betikler hazır, sunucuda çalıştırılmadı | Kullanıcı |
| Apple DSA (AB tüccar) doğrulaması | Sürüyor (Codentum hesabı) | Kullanıcı / Apple |

### Yer tutucu alanlar (yasal sayfalarda)

`apps/web/public/legal/*.html` içinde `data-placeholder` ile işaretli alanlar doldurulmadan ve `id="taslak-bandi"` banner'ı kaldırılmadan `npm run check:store` engel verir. Alanlar:

| Anahtar | Ne yazılacak |
| --- | --- |
| `destek-eposta`, `destek-eposta-baglantisi` | Destek e-posta adresi (ayrıca `apps/mobile/brand.json` ve `apps/web/src/config.ts` içindeki `supportEmail`) |
| `veri-sorumlusu-unvan`, `veri-sorumlusu-adres`, `verbis` | Veri sorumlusunun unvanı, adresi, VERBİS durumu |
| `yayinci-adi` | Mağazadaki yayıncı adı (Apple/Google kaydıyla birebir aynı) |
| `hukuki-sebep` | KVKK m.5/6 hukuki sebepler (hukukçu belirler) |
| `barindirma-konumu`, `eposta-saglayicisi`, `yurt-disi-aktarim` | Sunucu konumu, e-posta sağlayıcısı, yurt dışı aktarım kararı |
| `gunluk-suresi`, `yedek-suresi`, `basvuru-saklama` | Günlük, yedek ve iş başvurusu saklama süreleri |
| `basvuru-sureci` | İş başvurusunun işleyişi (yalnızca platform yöneticisi mi görüyor, işverene iletiliyor mu) |
| `uygulanacak-hukuk` | Uygulanacak hukuk ve yetkili mahkeme |
| `yanit-suresi` | Talebe yanıt süresi |
| `yururluk-tarihi` | Yayın tarihi |

Sayfalar JavaScript olmadan çalışan statik HTML'dir; web uygulamasıyla aynı adreste sunulur (`/legal/...`). Geliştirme sunucusu nginx ayarı `X-Robots-Tag: noindex` ekler; yayın alan adında bu başlık olmamalı. Üretim şablonunda (`deploy/nginx/oggaq-app.conf`) `/legal/` ayrı konumdur: SPA'ya düşmez, bilinmeyen yol 404 verir.

## 2. Kimlik kararları (gönderimden önce)

- **Yayıncı:** mağazada görünen satıcı/yayıncı adı. Gizlilik politikasındaki veri sorumlusuyla uyumlu olmalı. Karar kullanıcıdadır.
- **Paket kimliği:** `apps/mobile/app.config.ts` içinde tek yerdedir (`OGGAQ_BUNDLE_ID` ortam değişkeni, varsayılan `net.harunaltay.oggaq`). İki platformu birlikte değiştirir. İlk App Store Connect / Play Console yüklemesinden sonra değiştirilemez; yayıncı belli olmadan karar verilmemeli.
- **Sürüm:** `version` `0.1.0`; `ios.buildNumber` ve `android.versionCode` `1`. EAS `production` profili derleme numaralarını `autoIncrement` ile artırır.

## 3. Derleme (EAS) — çalıştırılmadı

`apps/mobile/eas.json`: `development` ve `preview` (içeride dağıtım, Android APK; API ve web adresi geliştirme sunucusu), `production` (mağaza paketi). **Üretim adresleri bilerek yer tutucudur** (`https://alan-adi-belirlenmedi.invalid`); gerçek alan adı belli olunca `EXPO_PUBLIC_API_URL` ve `EXPO_PUBLIC_WEB_URL` değerlerini HTTPS olarak yazın (`check:store` yer tutucuyu engel sayar). `development` profili bir geliştirme istemcisi değildir (`expo-dev-client` kurulu değil); geliştirme API'sine bağlı bir sürüm paketidir.

EAS kullanmak **sizin Expo hesabınızı** gerektirir ve ücretsiz plan sınırları geçerlidir; bu çalışmada hesap açılmadı, `eas-cli` kurulmadı, derleme yapılmadı. Sırayla (kendi makinenizde): `eas login`, `eas build --platform android --profile preview` ile deneme APK'sı, sonra `eas build --platform all --profile production`, `eas submit`. iOS imzalı derleme için Apple Developer hesabı gerekir. Bu Mac'te tam Xcode yoktur; imzalı iOS derlemesini EAS yapar.

`expo prebuild` ile çıkan yerel yapılandırma gözle kontrol edildi (geçici klasörde): Android izinleri yalnızca `INTERNET` ve `VIBRATE`; Expo şablonunun eklediği `READ/WRITE_EXTERNAL_STORAGE` ve `SYSTEM_ALERT_WINDOW` `blockedPermissions` ile kaldırıldı. iOS `Info.plist` içinde kullanım açıklaması (Face ID vb.) yok; `ITSAppUsesNonExemptEncryption=false` yazılı, çünkü uygulama yalnızca sistemin HTTPS'ini ve anahtar zincirini (`expo-secure-store`) kullanır, kendi şifreleme kodu yoktur (`expo-crypto` yalnızca rastgele kimlik üretir). İhracat uyumluluğu sorularını App Store Connect'te yine de dürüstçe yanıtlayın. iOS App Icon katalogunda 1024×1024 ve alfa kanalsız PNG üretildi.

**Açılış ekranı:** SDK 58'de `splash` anahtarı yoktur; yerel açılış ekranı `expo-splash-screen` eklentisiyle ayarlanır. Paket kurulu değil ve paket eklemek onayınızı ister (`npx expo install expo-splash-screen`, sonra eklenti ayarına `assets/splash-icon.png` ve lacivert arka plan). Hazır görsel: `apps/mobile/assets/splash-icon.png`.

**Simgeler (geçici):** `node apps/mobile/scripts/generate-icons.mjs` tasarım jetonlarından lacivert zeminde beyaz kalkan + açık kitap üretir (Playwright'ın Chromium'unu kullanır). Nihai logo gelince aynı boyutlarda dosyaları değiştirin: `icon.png` 1024×1024 alfa kanalsız, `adaptive-icon.png` 1024×1024 saydam (güvenli bölge: ortadaki yaklaşık %66), `splash-icon.png`, `favicon.png`.

## 4. Apple (App Store) — adım adım

1. **Apple Developer hesabı:** Codentum hesabı (kurumsal) üzerinden. DSA (AB tüccar) doğrulaması Apple'da sürüyor ([resmî sayfa](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/)): doğrulanmamış uygulamalar AB mağazasından kaldırılır.
2. **App Store Connect kaydı:** ad, ikincil ad, paket kimliği (bölüm 2), birincil dil Türkçe.
3. **Zorunlu URL'ler:** Gizlilik politikası URL'si = `<alan adı>/legal/gizlilik.html`; destek URL'si = `<alan adı>/legal/destek.html`. Gizlilik politikası uygulamanın içinden de erişilebilir olmalı (Profil → Yasal ve destek).
4. **Gizlilik "besin etiketi"** (bölüm 6'daki taslağı kullanın).
5. **Yaş derecelendirmesi** (bölüm 7).
6. **İhracat uyumluluğu:** `ITSAppUsesNonExemptEncryption=false` zaten yazılı; soruları dürüstçe yanıtlayın.
7. **Ekran görüntüleri** (bölüm 9) ve açıklama metni (bölüm 8).
8. **İnceleme bilgisi:** demo hesap ve notlar (bölüm 5).
9. **TestFlight:** önce iç test grubuyla; ardından incelemeye gönderin.
10. Kaynak: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — özellikle 5.1.1 (gizlilik politikası, onay, hesap silme), 1.2 (kullanıcı içeriği), 2.1 (tam ve çalışır uygulama, demo hesap), 5.2 (fikri mülkiyet).

## 5. İnceleme notları ve demo hesap

- **Demo hesap:** hedef sunucuda uygulamanın kayıt ekranından normal bir öğrenci hesabı oluşturun, e-posta doğrulamasını tamamlayın (gerçek e-posta sağlayıcısı kurulmadan doğrulama bağlantısı alınamaz; yerel geliştirme sunucusunda Mailpit'ten alınır). Kimlik bilgilerini **yalnızca** App Store Connect "App Review Information" ve Play Console "App access" alanlarına yazın; depoya, belgeye veya sohbete yazmayın. İnceleme boyunca sunucu açık olmalı (Apple 2.1).
- **İnceleme notu taslağı:** "Uygulama özel güvenlik sınavlarına hazırlık için deneme ve ders sınavları sunar. Giriş için ekteki demo hesabı kullanın. Hesap silme: Profil → Hesabım → Hesabı sil. Yasal sayfalar: Profil → Yasal ve destek. İş ilanları menüden açılır (isteğe bağlı özellik; başvuru için ad, e-posta, telefon istenir). Uygulama resmî bir kurum uygulaması değildir ve resmî sonuç üretmez; puan hesaplama bir tahmindir."
- Ekran görüntülerinde gerçek kişi verisi kullanmayın (Apple 2.3.9).

## 6. Gizlilik beyanı taslakları (gerçek veriden)

Toplanan veri: hesap (ad, e-posta, parola özeti), kullanım içeriği (sınav cevapları, sonuçlar, favoriler, puan hesaplama geçmişi, soru bildirim notu), iş başvurusu (ad, e-posta, telefon, ön yazı; isteğe bağlı özellik), oturum bilgisi (tarayıcıda IP ve tarayıcı bilgisi; mobilde uygulamanın kuruluma özel ürettiği rastgele cihaz numarası ve cihaz türü etiketi), sunucu günlükleri. Takip, reklam, analitik, konum, rehber, fotoğraf, sağlık, ödeme verisi yoktur.

**Apple — App Privacy (taslak; kategorileri App Store Connect'in güncel açıklamasıyla karşılaştırın):**

| Veri türü | Toplanıyor mu | Kullanıcıya bağlı | Takip | Amaç |
| --- | --- | --- | --- | --- |
| İletişim bilgisi: ad, e-posta | Evet | Evet | Hayır | Uygulama işlevi, hesap yönetimi |
| İletişim bilgisi: telefon | Evet (yalnızca iş başvurusu) | Evet | Hayır | Uygulama işlevi |
| Kullanıcı içeriği: diğer kullanıcı içeriği (cevaplar, bildirim ve başvuru notları) | Evet | Evet | Hayır | Uygulama işlevi |
| Tanımlayıcılar: kullanıcı kimliği (hesap kimliği) | Evet | Evet | Hayır | Uygulama işlevi |
| Tanımlayıcılar: cihaz kimliği (kuruluma özel rastgele numara; reklam kimliği değil) | Evet | Evet | Hayır | Uygulama işlevi (oturum yönetimi) |
| Kullanım verisi, tanılama, konum, satın alma, arama/gezinme geçmişi | Hayır | — | — | — |

IP adresi oturum güvenliği için sunucuda tutulur; Apple'ın hangi kategoriye saydığını (ör. "diğer veri") teyit edin. Barındırma ve e-posta sağlayıcıları verileri bizim adımıza işler; Apple tanımında "üçüncü taraf toplama" saymayın ama sağlayıcıyı gizlilik politikasında belirtin.

**Google — Data safety (taslak; formdaki güncel alanları kontrol edin):**

| Veri | Toplanıyor | Paylaşılıyor | İsteğe bağlı | Amaç |
| --- | --- | --- | --- | --- |
| Kişisel bilgi: ad, e-posta | Evet | Hayır | Hayır (hesap için gerekli) | Uygulama işlevi, hesap yönetimi |
| Kişisel bilgi: telefon | Evet | Hayır | Evet (yalnızca iş başvurusu) | Uygulama işlevi |
| Uygulama etkinliği: diğer kullanıcı tarafından oluşturulan içerik (cevaplar, notlar) | Evet | Hayır | Hayır | Uygulama işlevi |
| Cihaz veya diğer kimlikler (kuruluma özel rastgele numara) | Evet | Hayır | Hayır | Uygulama işlevi |
| Konum, finansal bilgi, sağlık, mesajlar, fotoğraf/video, kişiler | Hayır | — | — | — |

Aktarımda şifreleme: evet (yalnızca HTTPS). Kullanıcı silme talep edebilir: evet (uygulama içi yol + herkese açık web sayfası). Aile politikası kapsamında değil. Hizmet sağlayıcıya (barındırma, e-posta) aktarım Google tanımında "paylaşma" sayılmayabilir; formdaki tanıma göre karar verin.

## 7. Yaş derecelendirmesi ve kitle

Hedef kitle: özel güvenlik görevlisi adayları ve görevlileri, **18 yaş üstü**. Çocuk kategorisine veya "Designed for Families"e girmeyin. Sorularda silah bilgisi (kullanma, güvenlik, mevzuat) geçer; Apple derecelendirme anketi ve Google IARC anketini bu içeriği düşünerek **dürüstçe** doldurun (soru metinlerindeki şiddet/silah ifadesinin eğitim amaçlı olması anketin yerine geçmez). Sonucu siz seçersiniz; ben tahmin etmiyorum.

## 8. Mağaza metni taslağı (Türkçe; yalnızca gerçek özellikler)

- **Ad:** OGGAQ · ÖGG Soru Cevap Platformu (Apple ad sınırı 30 karakter: "OGGAQ" yeterli olabilir; sınırı App Store Connect'te kontrol edin)
- **Alt başlık (Apple):** Özel güvenlik sınavlarına hazırlan
- **Kısa açıklama (Google, en çok 80 karakter):** Özel güvenlik sınavlarına deneme ve ders sınavlarıyla hazırlan.
- **Uzun açıklama:** "OGGAQ, özel güvenlik görevlisi adayları ve görevlileri için ücretsiz bir sınav hazırlık platformudur. Deneme Sınavı: geçmiş sınavların tamamını gerçek sınav düzeninde ve süreyle çöz. Ders Sınavı: bir dersin sorularını sınav olarak çöz. Sonuçlarını ve doğru/yanlış/boş dağılımını görürsün; yanlış ve boş bıraktığın sorulardan Tekrar sınavı kurarsın. Başarı durumunu derslere göre izlersin. Puan hesaplama aracıyla cevap sayılarından tahmini puanını hesaplarsın. Hatalı bir soru görürsen sonuç ekranından bildirirsin. Açık ve koyu tema; telefon ve tablet düzeni. Hesabını ve verilerini istediğin zaman uygulamadan silebilirsin. Bu uygulama resmî bir kurum uygulaması değildir; Emniyet Genel Müdürlüğü veya başka bir resmî kurumla bağlantılı değildir. Puan hesaplama bir tahmindir ve resmî sınav sonucu değildir."
- **Anahtar kelimeler (Apple, en çok 100 karakter):** özel güvenlik,ÖGG,sınav,deneme sınavı,soru çöz,silahlı,silahsız,temel eğitim
- **Kullanmayın:** "resmî", "garantili geçiş", kurum logoları ve adları (EGM logosu vb.), kurumun sınav adını başlıkta kendi markanız gibi kullanmak (Apple 2.3.7 ve 5.2; Google yanıltıcı beyan kuralı).

## 9. Ekran görüntüsü rehberi (ölçüleri yükleme ekranından doğrulayın)

Ölçüleri yükleme ekranları belirler ve zamanla değişir; bu çalışmada doğrulanmadı. Bilinen kural: Apple en az bir iPhone boyutu ister; uygulama iPad'i destekliyor (`supportsTablet: true`) olduğundan iPad ekran görüntüsü de gerekir; her cihaz boyutu için 1–10 görüntü. Google: telefon için en az 2, en çok 8 görüntü, her kenar 320–3.840 px, en–boy oranı en çok 2:1; mağaza simgesi 512×512 PNG; öne çıkan görsel 1.024×500. Görüntüleri, örnek (gerçek olmayan) bir öğrenci hesabıyla ve yalnızca gerçek ekranlardan alın; kişisel veri ve geliştirme sunucusu adresi görünmesin.

## 10. Google Play — adım adım

1. **Play Console hesabı** ve uygulama kaydı (paket adı bölüm 2).
2. **Gizlilik politikası URL'si:** `/legal/gizlilik.html`. Politika uygulamada ve mağaza sayfasında kolay bulunmalı.
3. **Hesap silme:** hem uygulama içinde yol (`Profil → Hesabım → Hesabı sil`) hem de Data safety formundaki "veri silme" sorularına **herkese açık web bağlantısı** girilir: `<alan adı>/legal/hesap-silme.html`. Sayfa hatasız yüklenmeli, uygulama ve yayıncı adını mağazadaki gibi anmalı, silme talebi yolunu belirgin göstermeli ([resmî gereksinim](https://support.google.com/googleplay/android-developer/answer/13327111)).
4. **Data safety formu** (bölüm 6), **içerik derecelendirme anketi** (bölüm 7), hedef kitle ve içerik, reklam beyanı: **reklam yok**.
5. **Hedef API düzeyi:** Expo SDK 58 / React Native 0.88 şablonu güncel bir hedef düzey kullanır; yayından önce Play Console'un güncel zorunlu düzeyini kontrol edin (bu çalışmada doğrulanmadı).
6. **Test şartı:** Google'ın resmî sayfasına göre 13 Kasım 2023'ten sonra açılan **kişisel** geliştirici hesaplarında üretim erişimi için en az 12 test kullanıcısı kapalı testte kesintisiz 14 gün katılmış olmalıdır ([resmî sayfa](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)). Hesap **kurumsal** ise bu kuralın geçerli olup olmadığını aynı sayfadan ve Play Console'dan **doğrulayın**; okuduğum sayfa kişisel hesapları anlatıyor.
7. **Yanıltıcı beyan:** hükûmetle bağlantı ima eden ad, ikon, metin kullanmayın; "resmî değildir" uyarısı uygulamada ve mağaza metninde var ([resmî kural](https://support.google.com/googleplay/android-developer/answer/9514050)).

## 11. Engeller ve kimde oldukları

### 11.1 Soru içeriğinin hakkı (Apple 5.2.1 — yalnızca kendi ürettiğiniz veya lisanslı içerik)

Sorular, bir kurumun eski veritabanı dökümünden ve EGM'nin yayımladığı sınav soru kitapçıklarından geliyor. Mağaza incelemesi talep ederse yetkiyi gösterebilmelisiniz. Yazılı teyit isteyin:

1. Eski veritabanının (`u987447310_asvip.sql`) sahibi kim; soruları platformda **ücretsiz ve herkese açık** yayımlama (mağaza dağıtımı dahil) için yazılı izni var mı; ticari kullanım ve reklam geliri (ileride) kapsanıyor mu?
2. Veritabanındaki soruları kimler yazdı (eğitmenler, yayınevi, EGM kitapçıkları); telif devri veya lisans var mı?
3. EGM'nin yayımladığı çıkmış soru kitapçıklarının yeniden yayımlanmasına ilişkin kullanım koşulu nedir? Kamuya açık olmak yeniden dağıtım izni anlamına gelmeyebilir; resmî kurumdan yazılı görüş veya hukukçu değerlendirmesi isteyin.
4. Hak sahibi kaldırma talep ederse süreç ne (uygulamada "Soruyu bildir" yalnızca hata içindir; hak ihlali bildirimi için destek e-postası)?

Bu soruların cevabı alınmadan mağazaya gönderilmesini önermem. **Kimde: kullanıcı + hukukçu.**

### 11.2 Puanlama doğruluğu (Apple 1.1.6 yanıltıcı bilgi)

Puan hesaplama modülü resmî kaynaklarla belgelenmiştir (`docs/EXAM_SCORING_RULES.md`) ama bir uzmanın metinlerle kural kural karşılaştırması yapılmadı. 2025 yönetmeliğinin dönem geçişi tahmin edilerek etkinleştirilmemiştir. Uygulama "geçtin/kaldın" demez ve her hesaplamada "tahmindir" notu vardır. **Kimde: kullanıcı + uzman.**

### 11.3 KVKK ve hukuk

Veri sorumlusunun belirlenmesi, aydınlatma metninin ve kullanım koşullarının hukukçu onayı, VERBİS kaydı gerekip gerekmediği, saklama sürelerinin hukuki dayanağı (özellikle iş başvuruları), yurt dışı aktarım koşulları (sunucunun konumuna bağlı) ve yedeklerde silinen verinin kalma süresi. Teknik envanter `docs/PRIVACY.md` içindedir; o belge hukuki metin değildir. **Kimde: kullanıcı + hukukçu.**

## 12. Yayından hemen önce kuralları yeniden doğrulayın

Mağaza kuralları sık değişir; bu belgedeki bilgi 24 Ekim 2026 tarihli okumaya dayanır.

- Apple: [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/), [DSA tüccar gereksinimleri](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/)
- Google: [hesap silme](https://support.google.com/googleplay/android-developer/answer/13327111), [yeni kişisel hesap test şartı](https://support.google.com/googleplay/android-developer/answer/14151465), [hükûmet bilgisi ve yanıltıcı beyan](https://support.google.com/googleplay/android-developer/answer/9514050)

## 13. Doğrulanamayanlar

- Apple yönergelerinin son bölümü (metnin yaklaşık son 14 bin karakteri) okunamadı; hükûmet veya sınav uygulamalarına özel bir kural görülmedi ama okunmayan kısımda olabilir.
- Google Data safety formunun güncel alanları ve Google Play politikalarının tam metni okunmadı; yalnızca hesap silme, test şartı ve hükûmet bilgisi sayfaları okundu.
- Ekran görüntüsü ölçüleri, Apple ad/alt başlık/anahtar kelime sınırları ve Play'in güncel hedef API düzeyi yükleme ekranlarından doğrulanmalı.
- EAS derlemesi, TestFlight, Play iç testi, gerçek iPhone/iPad/Android cihaz ve Expo Go denemeleri yapılmadı.
- Apple "App Privacy" ve Google "Data safety" kategorileri taslaktır; son seçim sizindir.

## Elle kontrol

- [ ] Hukukçu dört yasal sayfayı onayladı, işaretli alanlar dolduruldu ve TASLAK bandı kaldırıldı
- [ ] Yayıncı adı ve paket kimliği kararı verildi (mağaza hesabıyla uyumlu)
- [ ] Soru veritabanının ve EGM yayınlarının kullanım hakkı yazılı teyit edildi
- [ ] Puanlama kuralları uzman tarafından resmî metinlerle karşılaştırıldı
- [ ] Veri sorumlusu, VERBİS durumu ve yurt dışı aktarım kararı yazıldı
- [ ] Geçici ikon nihai logoyla değiştirildi (yerel açılış ekranı için `expo-splash-screen` onayı verildi)
- [ ] Gerçek e-posta sağlayıcısı kuruldu; doğrulama ve parola yenileme e-postaları gerçek adrese ulaşıyor
- [ ] İnceleme demo hesabı sunucuda oluşturuldu, e-postası doğrulandı; sunucu inceleme boyunca açık
- [ ] Apple gizlilik etiketleri ve Google Data safety formu bu belgedeki taslakla karşılaştırılıp dolduruldu
- [ ] Yaş derecelendirme anketleri dürüstçe dolduruldu
- [ ] Google hesap silme URL'si Play Console'a girildi
- [ ] Kişisel Play hesabıysa 12 test kullanıcısı / 14 gün kuralı karşılandı (kurumsal hesapta geçerliliği doğrulandı)
- [ ] Ekran görüntüleri örnek hesapla alındı, kişisel veri ve geliştirme adresi içermiyor
- [ ] Gerçek iPhone ve Android cihazda tam akış denendi: kayıt, doğrulama, sınav, soru bildirme, hesap silme
- [ ] Sunucuda yedekleme çalışıyor ve geri yükleme provası yapıldı
- [ ] Yayından hemen önce Apple ve Google kuralları yeniden okundu
