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

Üç uygulama `config/brand.json` dosyasını okur. Küçük başlıklarda `name`, mağaza/kurulum ve profil bilgisinde `displayName` kullanılır. Mevcut mavi kalkan/kitap simgesi eski adın harflerini içermez; korunur. Statik web başlıkları, favicon, yasal sayfalardaki marka, mağaza metni, EAS üretim adresi ve backend marka varsayılanları `npm run brand:apply` ile üretilir; `npm run check:brand` CI'da eşitliği denetler. Backend imajı üretilmiş `backend/config/brand.php` dosyasını taşır; çalışma anında deponun üst dizinine ihtiyaç duymaz. Docker web derlemesine ortak JSON eklenmiştir.

Yasal bilgiler için mevcut `docs/legal-values.json` kaynağı ve `npm run legal:apply` korunur. Destek adresi buradan ortak marka dosyasına aktarılır, ardından statik marka dosyaları yenilenir. Codentum şirket adı değiştirilmez. Mevcut hukuki taslaklar bu işlemle onaylanmış sayılmaz.

Veri indirme adları `oggsor-verilerim-…json` olur. Veriler, sınavlar, hesaplar, parola/tokenlar, veritabanı adı, şifreleme/silme anahtarları, paket adları ve depo adı yeniden adlandırılmaz. Mobil Expo slug'ı ve `net.harunaltay.oggaq` paket kimliği mevcut kurulumları/otomasyonu korumak için aynıdır; yeni `oggsor://` şeması eski `oggaq://` yanında eklenmiştir. İlk mağaza yüklemesinden önce paket kimliği ayrıca kesinleştirilmelidir. Telefonun ana ekranındaki native uygulama adı yeni paket kurulunca değişir; Expo Go JS yenilemesi native yeniden derleme yerine geçmez.

## Canlı geçiş — koddan ayrı durum

Yeni alan adı Squarespace'te kayıtlı; başlangıç NS'leri `nsd1–4.squarespacedns.com`, web park sayfası, SPF `-all`, sıkı DMARC ve DNSSEC vardır. Yeni alanın MX'i ve özel kullanıcı kayıtları yoktur. Ücretsiz Cloudflare bölgesi oluşturuldu; atanan NS'ler `nova.ns.cloudflare.com` ve `yichun.ns.cloudflare.com`. Ad sunucusu geçişi henüz uygulanmadı.

Hazır plan: kök ve `www` mevcut `oggaq-development` tünelindeki `http://web:8080` servisine bağlanır; eski geliştirme adresi geçişte korunur. Web/yönetim paketi aynı hosttaki API'yi kullanır. Sunucuda `APP_NAME`, `MAIL_FROM_NAME`, `APP_URL`, `FRONTEND_URL`, `ADMIN_URL` ve izin verilen oturum hostları güncellenmelidir; Redis/oturum adları ve gizli anahtarlar korunur. Bu bir yeniden markalama ve adres geçişidir; mağaza yayını veya eksik hukuki/operasyonel üretim kontrollerinin tamamlanması değildir.

Yeni alan için sunucuda ayrı 2048 bit DKIM anahtarı hazırlandı; anahtar sunucudan çıkarılmadı. Exim geçişi yalnız proje ağından `oggsor.com` ve önceki `codentum.net` gönderenlerini kabul eder, iki alan için ayrı anahtar kullanır. Diğer alanların anahtar araması, yerel teslimi ve servisleri korunur. Ortak IP'nin PTR'si `smtp.codentum.net` olarak kalır; her marka değişiminde paylaşılan sunucunun kimliği değiştirilmez.

Yeni SPF/DKIM ve Cloudflare alıcı yönlendirmesi henüz yayımlanmadı; gerçek uygulama göndericisi henüz değiştirilmedi. `destek@oggsor.com` → mevcut Gmail hedefi ve aynı hesaba deneme gönderimi açık onay bekliyor. DNSSEC'nin geçiş sırasında kaldırılması ve Cloudflare anahtarıyla yeniden kurulması da aynı onaya dahildir. Eski DS kaydı yeni NS'lerle bırakılmamalıdır; geçişten sonra Cloudflare DNSSEC DS değeri Squarespace'e kaydedilip doğrulayan çözümleyiciyle kontrol edilmelidir.

Son kontrol: web/giriş/yönetim başlığı, CSRF ve oturum, `/api/v1/health/ready`, gerçek doğrulama/reset bağlantısı alan adı, destek adresine gelen posta, yeni göndericinin Gmail SPF/DKIM/DMARC sonucu ve gelen kutusu/spam konumu. Yalnız SMTP `250 OK` veya DNS kaydı, gelen kutusu testi yerine geçmez.
