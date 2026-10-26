# ÖGG SOR tanıtım ve indirme sitesi

26 Ekim 2026 ürün kararı: **oggsor.com**, mobil uygulamayı tanıtan ve App Store / Google Play bağlantılarını sunan sitedir. Genel web sitesinde soru çözme, öğrenci kaydı veya sınav sonuçları sunulmaz. iOS/Android uygulaması, API, yönetim paneli ve mevcut öğrenci verileri korunur.

`apps/site` bağımlılıksız, Node 24 ile derlenen statik HTML/CSS'tir; ana sayfa JavaScript, oturum veya soru API isteği olmadan açılır. Telefon çerçevesinde gerçek Expo mobil bileşenlerinden alınmış statik ana ekran görüntüsü kullanılır. Kişisel veri göstermeyen tanıtım hesabıyla hazırlanmıştır; görüntünün kaynağı ve yenilenmesi [SCREENSHOTS](../apps/site/SCREENSHOTS.md) içindedir. Marka `config/brand.json`, renkler ortak `design-tokens`, başlık League Spartan Bold 700 kaynağından gelir. Destek ve yasal sayfalar korunur; bu geçiş yasal taslakların onaylandığı anlamına gelmez.

## Mağaza bağlantıları

`config/store-links.json` içindeki `appStoreUrl` ve `googlePlayUrl`, yayımlanmış uygulamanın gerçek HTTPS adresleriyle doldurulur. `null` değerinde ilgili alan **Yakında** gösterir, tıklanabilir sahte bağlantı üretilmez. Apple uygulama sayfası ve marka yapılandırmasındaki Android paket kimliğine ait Google Play adresi kabul edilir. Değişiklikten sonra site yeniden derlenip yayımlanır. Mağaza bağlantıları henüz sağlanmamıştır; bu çalışma mağazaya uygulama yüklemez.

## Hesap işlemleri ve yayın

`apps/web` kaynağı korunur. Normal yerel geliştirme/test modu öğrenci ekranlarını açmaya devam eder. Sunucudaki paket `VITE_WEB_MODE=account` ile derlenir ve yalnız hesap işlemlerini sunar:

- `/account`: giriş, hesap/güvenlik, veri dışa aktarma ve hesap silme.
- `/reset-password`, `/verify-email`, `/confirm-email-change`, `/account-deleted`: mevcut e-posta ve hesap bağlantıları; sorgu parametreleri korunur.
- `/legal/*`: destek, gizlilik, kullanım koşulları ve hesap silme yönergeleri.

Nginx `/` için `/var/www/site`, hesap yolları ve `/assets/` için `/var/www/web`, `/yonetim/` için mevcut yönetim panelini kullanır. Eski `/study` yolları siteye yönlenir. `/api`, `/sanctum` ve `/up` aynı backend'e gider; mobil API adresi değiştirilmez. Bilinmeyen yollar 404'tür. Mevcut güvenlik başlıkları ve geliştirme ortamının `noindex` kararı korunur.

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
