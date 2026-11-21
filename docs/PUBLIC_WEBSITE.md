# ÖGG SOR tanıtım ve indirme sitesi

26 Ekim 2026 ürün kararı: **oggsor.com**, mobil uygulamayı tanıtan ve App Store / Google Play bağlantılarını sunan sitedir. Genel web sitesinde soru çözme, öğrenci kaydı veya sınav sonuçları sunulmaz. iOS/Android uygulaması, API, yönetim paneli ve mevcut öğrenci verileri korunur.

`apps/site` bağımlılıksız, Node 24 ile derlenen statik HTML/CSS'tir; ana sayfa JavaScript, oturum veya soru API isteği olmadan açılır. Telefon çerçevesinde gerçek Expo mobil bileşenlerinden alınmış statik ana ekran görüntüsü kullanılır. Kişisel veri göstermeyen tanıtım hesabıyla hazırlanmıştır; görüntünün kaynağı ve yenilenmesi [SCREENSHOTS](../apps/site/SCREENSHOTS.md) içindedir. Marka `config/brand.json`, renkler ortak `design-tokens`, başlık League Spartan Bold 700 kaynağından gelir. Destek ve yasal sayfalar korunur; bu geçiş yasal taslakların onaylandığı anlamına gelmez.

## 21 Kasım 2026 — Uygulama özellikleri

Kullanıcının “Yap” talimatıyla mevcut sade tasarım genişletildi. Ana sayfa; çıkmış, ders, rastgele ve tekrar sınavlarını; sonuç inceleme/başarı istatistiklerini; puan hesaplama, sınav takvimi ve cihazda PDF belge hazırlamayı anlatır. Telefon/tablet, tema ve yazı boyutu tercihleri açıklanır. Beş SSS yerel HTML `details` ile açılır, JavaScript gerekmez. Mağaza bağlantıları sayfanın başında ve sonunda aynı merkezi kaynaktan üretilir. App Store bağlantısı tanımlı olmadığı için iki alanda da “Yakında” gösterir. Çevrimdışı kullanıma ilişkin sürüm farkı netleşmediğinden yeni çevrimdışı kullanım vaadi eklenmedi.

**Yayında:** `oggaq-development-web:site-features-20261121`. Aday nginx/HTTP, dosya manifesti ve indeksleme kontrolleri geçti. Kök/www üzerinden 24 HTTP dosyasının hash'leri ile 10 yolun durum/robots başlıkları doğrulandı; API readiness sağlıklı. Önceki imaj ve `publication/site-features-20261121/services.before.yaml` geri dönüş için korunur; etkinleştirme yalnız web'i yeniledi. Yerel kanıtlar `artifacts/site-features-20261121/` içindedir.

Android deneme listesi ve anonim sonuç özeti, daha önce gerçek uygulamadan alınmış yerel görsellerle gösterilir. Yeni API/ürün işlevi veya veritabanı işlemi eklenmedi. Ortak header/footer ve CSS bilgi sayfalarında eşitlendi; dört sayfanın `<main>` içerikleri yayından önceki kaynakla birebir karşılaştırıldı.

### Arama motorları

Nginx `X-Robots-Tag` artık yalnız `oggsor.com` ve `www.oggsor.com` kök ana sayfası için `index, follow` üretir; query string ve iç index yönlendirmesinde de bu kural korunur. Hesap, yönetim, API, bilgi sayfaları ve eski geliştirme alan adı `noindex, nofollow` kalır. `robots.txt` taramaya izin verir ve marka alan adından üretilen `sitemap.xml` dosyasını gösterir; sitemap yalnız canonical ana sayfayı içerir. Bu ayarlar dizine alınmayı veya sıralamayı garanti etmez. Kaynaklar: [Google X-Robots-Tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag), [robots.txt](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt).

## Mağaza bağlantıları

Mağaza kartları, yerel dosyalardan App Store ve Google Play simgelerini gösterir. Görsellerin kaynağı ve yenileme düzeni [STORE_ICONS](../apps/site/STORE_ICONS.md) içindedir. Mağaza adı ve erişilebilir etiket korunduğu için simgeler dekoratiftir; dosya hash'leri URL'lerde kullanılır.

21 Kasım simge yayını: `store-icons-20261121` web imajı ana sayfayı, yeni hash'li CSS'i ve iki simgeyi sunar. Kök/www HTTPS üzerinde dört dosyanın SHA-256 değerleri ve API readiness doğrulandı. Önceki web dosyaları ile backend servisleri korunur. Geri dönüş dosyası sunucuda `publication/store-icons-20261121/services.before.yaml`; aktif override üzerine geri konduktan sonra `./manage up -d --no-deps --no-build web` kullanılır.

`config/store-links.json` içindeki `appStoreUrl` ve `googlePlayUrl`, yayımlanmış uygulamanın gerçek HTTPS adresleriyle doldurulur. `null` değerinde ilgili alan **Yakında** gösterir, tıklanabilir sahte bağlantı üretilmez. Apple uygulama sayfası ve marka yapılandırmasındaki Android paket kimliğine ait Google Play adresi kabul edilir. Değişiklikten sonra site yeniden derlenip yayımlanır.

21 Kasım 2026: Google Play'deki **ÖGGSor - Soru Bankası / Codentum** sayfası doğrulandı; Android indirme adresi [Google Play](https://play.google.com/store/apps/details?id=net.codentum.oggsor) olarak yapılandırıldı. App Store adresi henüz tanımlı değildir ve **Yakında** gösterir. Bu değişiklik mevcut mağaza yayınına bağlantı verir.

Yalnız ana sayfa `google-play-link-20261121-r2` web imajıyla yayımlandı. Genel HTTPS üzerinden kök/www HTML hash'leri adayla eşleşti; indirme bağlantısı ve API readiness `ok` doğrulandı. İlk aktivasyonda başlangıç bağlantısı erken denetlendiği için otomatik geri dönüş gerçekleşti; sınırlı bağlantı tekrarıyla ikinci aktivasyon tamamlandı. Hesap/yönetim/yasal dosyalar ve nginx yapılandırması hash ile aynı, diğer servislerin konteyner kimlikleri korunur. Geri dönüş: sunucuda `publication/google-play-link-20261121-r2/services.before.yaml` dosyasını aktif `publication/student-access-20261027/services.compose.yaml` üzerine geri koyup `./manage up -d --no-deps --no-build web` çalıştırılır; önceki web imajı saklanır.

## Hesap işlemleri ve yayın

`apps/web` kaynağı korunur. Normal yerel geliştirme/test modu öğrenci ekranlarını açmaya devam eder. Sunucudaki paket `VITE_WEB_MODE=account` ile derlenir ve yalnız hesap işlemlerini sunar:

- `/account`: giriş, hesap/güvenlik, veri dışa aktarma ve hesap silme.
- `/reset-password`, `/verify-email`, `/confirm-email-change`, `/account-deleted`: mevcut e-posta ve hesap bağlantıları; sorgu parametreleri korunur.
- `/legal/*`: destek, gizlilik, kullanım koşulları ve hesap silme yönergeleri.

Nginx `/` için `/var/www/site`, hesap yolları ve `/assets/` için `/var/www/web`, `/yonetim/` için mevcut yönetim panelini kullanır. Eski `/study` yolları siteye yönlenir. `/api`, `/sanctum` ve `/up` aynı backend'e gider; mobil API adresi değiştirilmez. Bilinmeyen yollar 404'tür. Güvenlik başlıkları korunur; ana sayfanın güncel indeksleme kapsamı yukarıda açıklanmıştır.

```sh
npm run test:site
npm run build:site
VITE_API_URL=/ VITE_WEB_MODE=account npm run build:web
npm run test:site:e2e
```

Son komut yalnız 5187/5188 portlarında statik önizlemeler açar; API/PostgreSQL kullanmaz. Telefon/tablet/masaüstü, açık/koyu görünüm, mağazaların bekleme durumu, ana sayfada API isteği olmaması ve hesap/parola bağlantılarını kontrol eder. Standart öğrenci E2E'si ayrı mevcut test yapılandırmasıyla çalışır.

Sunucu Dockerfile'ı her iki ön yüzü oluşturur. Yalnız web yayını yeterlidir; backend, veritabanı veya DNS değişikliği gerekmez. Yayın öncesinde aday Nginx yapılandırması, site/hesap dosyaları ve API/yönetim yolları kontrol edilir; önceki web imajı geri dönüş için korunur.

26 Ekim 2026 yayını: `public-site-cf356dc`, yalnız web imajı güncellendi. Origin statik dosyaları/hesap yolları ve genel HTTPS üzerinde tanıtım, www, hesap girişi/çıkışı, parola bağlantısı, API/yönetim erişimi doğrulandı. Mobil kaynak ve veritabanı değiştirilmedi. Mağaza bağlantıları hâlâ `null` / Yakında durumundadır. Ayrıntılı doğrulama [TESTING](TESTING.md) içindedir.

Gerçek mobil ekranı kullanan son tanıtım tasarımı: `site-screen-51b0fd1`. Yeni başlık/mağaza düzeni ve düz özellik listesiyle birlikte yalnız site dosyaları yayımlandı. Mobil arayüz ve API değişmedi; JPEG ve CSS genel HTTPS üzerinden hash ve ekran boyutuyla doğrulandı.

Bilgi sayfaları (26 Ekim 2026): `/legal/*` header/footer'ı `apps/site/index.html` şablonundan, temel CSS'i `apps/site/styles.css` kaynağından `brand:apply` ile üretilir. `legal/site.css` üretilmiş dosyadır. Gizlilik, koşullar, destek ve hesap silme aynı site tasarımını ve cihaz temasını kullanır; JavaScript istemez. İç taslak/hukukçu notları ve boş karar etiketleri genel sayfalardan çıkarıldı. Eksik kararlar ve inceleme durumu `docs/legal-values.json` içinde korunur; `check:store` bunları HTML görünümünden bağımsız denetler. Son güncelleme tarihi, yürürlük veya uygunluk onayı iddiası değildir.

Bilgi sayfalarının ortak tasarımı `site-legal-5af3e01` web imajıyla yayımlandı. Dört genel HTTPS sayfasında yeni CSS/marka çerçevesi ve hesap silme bağlantıları doğrulandı; yalnız web yenilendi. İç inceleme/eksik karar kayıtları mağaza kontrolünde beklemeye devam eder.

28 Ekim 2026: `site-visual-20261028` hero tasarımı kullanıcı tarafından reddedildi; canlı web `documents-20261028` imajına geri alındı. Güncel gerçek uygulama ekranını tek düz telefonda gösteren yeni önizleme, kullanıcının “yayınlasana” onayıyla `site-clean-7f9d88f` web imajı üzerinden yayımlandı. Detaylar [görsel kaynağı ve yayın durumu](../apps/site/SCREENSHOTS.md) ile [TESTING](TESTING.md) içinde.

28 Ekim 2026 sistem ikonları: `system-icons-20261028-r2` site + hesap + yönetim statik yayını etkin. Aynı telefon dekorları kaldırıldı; tanıtım JPEG'i güncel mobil ikonlarla yenilendi. Yönetim kaynak ve eylem ikonları da ayrıldı. İlk base yolu hatası geri alınıp doğru üretim ayarlarıyla düzeltildi; adayda HTML'in referans verdiği dosyalar, son genel tarayıcıda iki giriş ekranı doğrulandı. Backend/DB servisleri değiştirilmedi.

Üretim statik derlemesinde Dockerfile ile aynı ayarları kullanın:

```sh
VITE_API_URL=/ VITE_WEB_MODE=account npm run build:web
VITE_API_URL=/ VITE_ADMIN_BASE_PATH=/yonetim/ npm run build:admin
npm run build:site
```

Admin'i varsayılan `/` base ile yayımlamayın. Tahmini dosya listesi hash kontrolü tek başına yetmez; aday HTML'deki script/stylesheet URL'leri ve gerçek tarayıcıda yönetim/hesap girişleri de doğrulanır.
