# Ogg Sor marka ve alan adı geçişi

Ürün sahibinin 25 Ekim 2026 kararı:

| Kullanım | Değer |
| --- | --- |
| Kısa marka | Ogg Sor |
| Uygulama ve mağaza adı | Ogg Sor - Soru Bankası |
| Ana web/API kökü | https://oggsor.com |
| Yönetim paneli | https://oggsor.com/yonetim/ |
| Destek | destek@oggsor.com |
| Sistem bildirimi göndereni | no-reply@oggsor.com |
| Yayıncı ve veri sorumlusu | Codentum L.L.C. |

## Kod ve yapılandırma

Üç uygulama `config/brand.json` dosyasını okur. Küçük başlıklarda `name`, mağaza/kurulum ve profil bilgisinde `displayName` kullanılır. Ürün sahibinin verdiği güvenlik görevlisi/kitap görseli yeni logodur. Dışındaki gömülü dama deseni Imagegen ile şeffaflığa dönüştürüldü; türetilen boyutlarda dış kenar düzgün yuvarlatılmış maske ile temizlenir. Ana kaynak `config/assets/oggsor-logo.png` ve `config/brand.json` → `logoAsset` alanıdır. `node apps/mobile/scripts/generate-icons.mjs` mobil simge/açılış/logo/favicon boyutlarını üretir; ardından `npm run brand:apply` web, yönetim ve yasal sayfalara kopyalar. Uygulama içi logo 256 px olup büyük kaynak mobil pakete eklenmez. Web/yasal favicon bağlantısı dosyanın SHA-256 içerik sürümünü taşır; önceki simgenin tarayıcı/CDN önbelleğini kullanmaz. iOS simgesi opak 1024×1024 RGB; Android foreground 1024×1024 ve tam logoyu güvenli alanın içinde tutar. Statik web başlıkları, favicon, yasal sayfalardaki marka, mağaza metni, EAS üretim adresi ve backend marka varsayılanları `npm run brand:apply` ile üretilir; `npm run check:brand` CI'da eşitliği denetler. Backend imajı üretilmiş `backend/config/brand.php` dosyasını taşır; çalışma anında deponun üst dizinine ihtiyaç duymaz. Docker web derlemesine ortak JSON eklenmiştir.

Yasal bilgiler için mevcut `docs/legal-values.json` kaynağı ve `npm run legal:apply` korunur. Destek adresi buradan ortak marka dosyasına aktarılır, ardından statik marka dosyaları yenilenir. Codentum şirket adı değiştirilmez. Mevcut hukuki taslaklar bu işlemle onaylanmış sayılmaz.

Veri indirme adları `oggsor-verilerim-…json` olur. Veriler, sınavlar, hesaplar, parola/tokenlar, veritabanı adı, şifreleme/silme anahtarları, çalışma alanı paket adları ve depo adı yeniden adlandırılmaz. Android/iOS uygulama kimliği, ilk mağaza gönderiminden önce marka kararı kapsamında `net.harunaltay.oggaq` yerine **`net.codentum.oggsor`** oldu; ortak kaynak `config/brand.json` içindeki `bundleIdentifier` alanıdır. Expo `app.config.ts` iki platformda bu değeri kullanır; `OGGAQ_BUNDLE_ID` yalnız bilinçli ayrı test kimliği için profil üzerinden değiştirilebilir. Yeni paket eski test kurulumundan ayrı bir uygulama sayılır; yerel oturum/depolama taşınmaz, yeniden giriş gerekir. Sunucudaki hesap ve sonuçlar aynı kalır. Native açılış CI'ı kimliği derlenmiş APK/Info.plist içinden okur. Expo slug'ı `oggaq` korunur; yeni `oggsor://` şeması eski `oggaq://` yanında eklenmiştir. Telefonun ana ekranındaki native uygulama adı yeni paket kurulunca değişir; Expo Go JS yenilemesi native yeniden derleme yerine geçmez.

## Canlı geçiş — koddan ayrı durum

Yeni alan adı Squarespace'te kayıtlı; başlangıçta `nsd1–4.squarespacedns.com` NS’leri, web park sayfası, SPF `-all`, sıkı DMARC ve DNSSEC vardı; MX ve özel kullanıcı kayıtları yoktu. Ücretsiz Cloudflare bölgesi oluşturuldu; atanan NS'ler `nova.ns.cloudflare.com` ve `yichun.ns.cloudflare.com`. Ad sunucusu geçişi kullanıcı onayıyla uygulandı; `.com` üst bölgesinde yalnız bu iki Cloudflare NS doğrulandı.

Uygulanan geçiş: kök ve `www` mevcut `oggaq-development` tünelindeki `http://web:8080` servisine bağlandı; eski geliştirme adresi geçişte korunur. Web/yönetim paketi aynı hosttaki API'yi kullanır. Sunucuda `APP_NAME`, `MAIL_FROM_NAME`, `APP_URL`, `FRONTEND_URL`, `ADMIN_URL` ve izin verilen oturum hostları güncellendi; Redis/oturum adları ve gizli anahtarlar korundu. `HORIZON_PREFIX=oggaq_horizon:` önceki teknik öneke açıkça sabitlendi; uygulama adı izleme namespace’ini yeniden adlandırmaz. Bu bir yeniden markalama ve adres geçişidir; mağaza yayını veya eksik hukuki/operasyonel üretim kontrollerinin tamamlanması değildir.

Yeni alan için sunucuda ayrı 2048 bit DKIM anahtarı hazırlandı; anahtar sunucudan çıkarılmadı. Exim geçişi yalnız proje ağından `oggsor.com` ve önceki `codentum.net` gönderenlerini kabul eder, iki alan için ayrı anahtar kullanır. Diğer alanların anahtar araması, yerel teslimi ve servisleri korunur. Ortak IP'nin PTR'si `smtp.codentum.net` olarak kalır; her marka değişiminde paylaşılan sunucunun kimliği değiştirilmez.

SPF/DKIM yayımlandı; SPF tek kayıt olarak `v=spf1 include:_spf.mx.cloudflare.net ip4:212.68.34.90 -all`, DMARC `p=reject; sp=reject; adkim=s; aspf=s` korundu. Üç Cloudflare MX ve ayrı Cloudflare yönlendirme DKIM seçicisi eklendi. `destek@oggsor.com` doğrulanmış mevcut Gmail hedefiyle Active durumundadır; gerçek destek testi gelen kutusuna ulaştı. Uygulama göndereni ve görünen adı `no-reply@oggsor.com` / **Ogg Sor - Soru Bankası** oldu.

Squarespace özel NS geçişinde eski DNSSEC DS kaydını kaldırdı. Cloudflare DNSSEC etkinleştirildi ve yeni DS (anahtar etiketi 2371, algoritma 13, SHA-256) Squarespace’e kaydedildi. Cloudflare ekranı **“Success! oggsor.com is protected with DNSSEC.”** durumunu gösterdi. `.com` yetkili yanıtı yeni DS ile eşleşti; Quad9 `9.9.9.9` doğrulayan çözümleyicisinde yeni A/RRSIG yanıtı **AD** bayrağıyla doğrulandı. Bazı genel çözümleyiciler eski NS/A/DS önbelleğini tutuyordu; bu sırada eski park sayfası veya geçici DNS doğrulama hatası görülebilir. Mevcut kayıtları yeniden değiştirmek yerine TTL’nin dolması beklenir ([Cloudflare](https://developers.cloudflare.com/dns/zone-setups/troubleshooting/pending-nameservers/)); registrar 48 saate kadar yayılım bildirmektedir.

Canlı uygulama/web imajları `brand-16a73c3` sürümünde etkinleştirildi; mevcut `initial` sürüm ve korumalı `.env`/`manage` geri alma kopyaları sunucuda saklandı. Yalnız proje app/worker/scheduler/web servisleri yenilendi; DB, Redis, tünel ve diğer projelerin servisleri değiştirilmedi. Yeni imajdan salt okunur migration durumu kontrol edildi: hepsi uygulanmış, migration veya veri aktarımı yapılmadı. Son gizlilik sağlayıcı metni için web `brand-d3b4286` imajına geçirildi; backend imajının içeriği aynı olduğundan app/worker/scheduler yeniden başlatılmadı. Güncel yayın bağlantısı `releases/brand-d3b4286` oldu; önceki sürümler geri alma için korundu. Posta kurulum yardımcılarının sunucudaki kopyaları güncellendi. Yedekleme kaynak betikleri sürüme değişiklik yapılmadan eklendi; yedekleme kurulumu veya zamanlaması çalıştırılmadı.

Canlı kontrol: kök ve www için geçerli TLS ile `/api/v1/health/ready` tüm kontrollerde `ok`; yeni web başlığı **Ogg Sor - Soru Bankası**. Mevcut öğrenciyle yeni hostta CSRF 204, giriş 200, `/me` ve bağlamlar 200, çıkış 200, çıkıştan sonra `/me` 401 doğrulandı; parola/tokenlar kayda alınmadı. Doğrulama/reset bildirimlerinin bağlantı hostları sunucuda gönderim yapmadan `oggsor.com` olarak doğrulandı; bu, son kullanıcının bağlantıya tıklama testi değildir.

Doğrudan Horizon kuyruğundan Gmail’e gönderilen yeni markalı test ulaştı; özgün ileti ekranında SPF/DKIM/DMARC **PASS**, fakat klasörü **Spam**. Destek adresine ikinci gönderimin Cloudflare üzerinden Gmail **gelen kutusuna** ulaşması alıcı yönlendirmesini doğrular; doğrudan uygulama gönderiminin gelen kutusu sorunu çözülmüş sayılmaz. SPF/DKIM başarısı tek başına gelen kutusu garantisi değildir. Yeni bir SMTP sağlayıcısına geçilmedi. Mağazaya paket gönderilmedi; yasal taslaklar ve yayın öncesi kontroller sürer.

25 Ekim logo yayını: seçilen görsel `logo-9d4aa2e` paketinde uygulama servislerine alındı; favicon önbellek düzeltmesiyle güncel yayın bağlantısı `releases/logo-76000da` oldu. Son düzeltmede yalnız web yenilendi; backend imajı aynı içeriktedir. Web/yönetim logo ve sürümlü favicon dosyaları canlı HTTPS yanıtlarında eşleşti; kök/www readiness başarılı. Önceki sürümler ve korumalı `manage` geri alma kopyaları saklandı. Yeni imzalı mobil paket bu işlemde üretilmedi.
