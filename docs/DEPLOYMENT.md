# Üretim barındırma, dağıtım ve yedekleme

Durum: **hazırlık belgesidir, canlıya çıkış yapılmadı.** Kullanıcı bir sunucusu olduğunu bildirdi; işletim sistemi, erişim biçimi, konum ve kaynakları, alan adı, e-posta sağlayıcısı ve yedek hedefi henüz bilinmiyor/seçilmedi; her şey yer tutucu ve parametreli yazıldı (`example.com` gibi). Aşağıdaki betikler ve şablonlar yalnızca yerelde, geçici veritabanları ve geçici dizinlerle denendi; gerçek bir sunucuda, Cloudflare'de veya e-posta sağlayıcısında denenmedi. Neyin denendiği ve neyin denenmediği en altta ayrıca listelenir.

Bu belge, kodu yazan kişi olmayan bir işletmen için yazıldı. **⚠ SİZ YAPACAKSINIZ** işareti, bir insanın kendi hesabıyla yapması gereken adımı gösterir (hesap açma, DNS, anahtar saklama, onay vermek). Gizli değerleri (parola, anahtar, token) bu depoya, sohbete veya e-postaya yazmayın; yalnızca sunucuda, izni kısıtlı dosyalarda tutulur.

## 1. Genel bakış

```
tarayıcı / mobil ──HTTPS──> Cloudflare ──(A: tünel)──> cloudflared ──> nginx 127.0.0.1:8080 ─┐
                                        └─(B: 443)────────────────────> nginx :443 ──────────┤
                                                                                              ├─ app.example.com   -> statik web (öğrenci)
                                                                                              ├─ admin.example.com -> statik web (yönetim)
                                                                                              └─ api.example.com   -> PHP-FPM -> Laravel
                                                                                                   │
                                          PostgreSQL 18 (yerel) ◄── Laravel ──► Redis (yerel) ◄── Horizon (kuyruk), zamanlayıcı
```

- **Üç ana makine adı:** `app` (öğrenci web), `admin` (yönetim paneli), `api` (Laravel). Mobil uygulama yalnızca `api` ile konuşur.
- **Aynı kayıtlı alan adı:** üçü de aynı alan adının altında olmalıdır (örn. `app.example.com`, `admin.example.com`, `api.example.com`). Aksi hâlde tarayıcı oturum çerezini API'ye göndermez (bkz. §11).
- **Servisler (hepsi aynı makinede, yalnızca yerel arayüze bağlı):** nginx, PHP-FPM 8.4, PostgreSQL 18, Redis, Horizon (kuyruk işleyicisi), zamanlayıcı (`schedule:work`). Veritabanı ve Redis dışarıya açılmaz.
- **Sürüm dizinleri:** her dağıtım `/srv/oggaq/releases/<zaman>-<commit>` altına kurulur, `current` sembolik bağı atomik değişir; geri dönüş aynı tek adımdır (bkz. §16).
- **Cloudflare Workers Laravel'i çalıştıramaz.** Bu tasarım Workers'a dayanmaz; Cloudflare yalnızca DNS, TLS ve proxy/tünel olarak kullanılır.

## 2. Sizin sağlamanız gerekenler

| # | Ne | Neden |
|---|---|---|
| 1 | Sunucu (VPS ya da kendi makineniz): en az 2 vCPU, 4 GB RAM, 40 GB disk, Ubuntu LTS 24.04 (Debian'da §5'te belirtilen farklar) | Tüm servisler tek makinede. Boyut bir başlangıç tahminidir, ölçülmedi. |
| 2 | SSH ile erişim, kendi anahtar çiftiniz | Sunucuyu siz yöneteceksiniz; bu depo sunucuya bağlanmaz. |
| 3 | Alan adı ve Cloudflare hesabı (alan adı Cloudflare bölgesinde) | TLS ve DNS. Alan adı seçilmedi. |
| 4 | E-posta gönderim sağlayıcısı (SMTP bilgileri) | Hesap doğrulama, parola sıfırlama, e-posta değişikliği. |
| 5 | Sunucu dışı yedek hedefi | Yedekler yalnızca sunucuda kalırsa sunucu kaybında yedek de gider. |
| 6 | Kod deposuna salt-okunur "deploy key" | Özel depodan dağıtım için. |
| 7 | Kararlar: veri sorumlusu, sunucu konumu (Türkiye/yurt dışı), saklama süreleri, hukuki metinler | [PRIVACY](PRIVACY.md) — yazılım bunları belirleyemez. |

## 3. Giriş yolu: iki seçenek, öneri A

TLS'i bitiren ve trafiği sunucuya getiren iki belgelenmiş yol vardır. **Önerilen: A (Cloudflare Tunnel).** Nedeni: sunucuda gelen port açılmaz, sertifika yenilemek zorunda kalmazsınız, sunucunun gerçek IP adresi herkese açık olmaz. Bedeli: `cloudflared` servisine ve Cloudflare hesabına bağımlılık.

| | **A — Cloudflare Tunnel (önerilen)** | **B — Proxy'li DNS + Origin CA** |
|---|---|---|
| Bağlantı yönü | Sunucudan Cloudflare'e **dışarıya** (outbound-only) | Cloudflare sunucuya gelir |
| nginx dinleme adresi | `127.0.0.1:8080`, düz HTTP (yalnızca yerel) | `:443`, TLS (Origin CA sertifikası) + `:80` yönlendirme |
| Sertifika | Sunucuda sertifika yok; TLS Cloudflare'de biter | Cloudflare Origin CA sertifikası, nginx'e kurulur |
| Güvenlik duvarı | Gelen: yalnızca SSH (22). 80/443 **kapalı** | Gelen: 22 + 80/443 **yalnızca Cloudflare aralıklarına** |
| nginx giriş dosyası | `snippets/ingress-tunnel.conf` | `snippets/ingress-public.conf` (+ `oggaq-redirect-http.conf`) |
| Gerçek istemci IP'si | Bağlantıyı yalnızca yerel `cloudflared` yapar; `set_real_ip_from 127.0.0.1` + `CF-Connecting-IP` | Cloudflare aralıkları `set_real_ip_from` ile listelenir (`update-cloudflare-ips.sh`) + `CF-Connecting-IP` |
| Laravel tarafı | Değişiklik gerekmez | Değişiklik gerekmez |
| DNS kayıtları | `cloudflared tunnel route dns` CNAME'leri oluşturur | A/AAAA kayıtları, "proxied" (turuncu bulut) |
| SSL modu | Tünel için uygulanmaz (uçtan uca TLS tünelle sağlanır) | **Full (strict)** |

**Gerçek istemci adresi ve hız sınırları.** Laravel'in hız sınırları (`login`, `registration` …) IP'ye bağlıdır. Cloudflare arkasında nginx'in gördüğü adres Cloudflare'in (ya da yerel `cloudflared`'in) adresidir; bu yüzden nginx `real_ip` modülüyle `CF-Connecting-IP` başlığından gerçek adresi alır ve PHP-FPM'e `REMOTE_ADDR` olarak iletir. Böylece Laravel'de ayrıca `TRUSTED_PROXIES` ayarına **gerek kalmaz**; `https` bilgisi nginx'ten `fastcgi_param HTTPS on` ile gider. Güvenlik koşulu: `CF-Connecting-IP`'ye yalnızca güvenilen kaynaktan gelirse güvenilir. A'da nginx yalnızca `127.0.0.1`'de dinlediği için bunu sağlar; B'de güvenlik duvarının yalnızca Cloudflare aralıklarına izin vermesi şarttır, aksi hâlde biri başlığı kendisi yazıp adresini sahte gösterebilir. (Laravel `TRUSTED_PROXIES` yalnızca PHP'ye doğrudan, nginx olmadan bağlanılırsa gerekir; bu kurulumda öyle bir yol yoktur.)

### 3.1 Geçici HTTPS ile deneme (alan adı yokken)

Alan adı yokken HTTPS'i denemek için Cloudflare **Quick Tunnel** kullanılabilir: hesap gerektirmez, rastgele bir `*.trycloudflare.com` adresi üretir.

```sh
cloudflared tunnel --url http://localhost:PORT
```

- Yalnızca **deneme** içindir: adres her çalıştırmada değişir, süre/kullanım garantisi yoktur.
- **Geliştirme API'sini ve geliştirme verisini bu yolla yayınlamayın.** Yerel veritabanında gerçek soru içeriği ve test hesapları vardır; geçici adres herkese açıktır (bkz. [MOBILE](MOBILE.md) içindeki geçici HTTPS uyarısı). Denemek için ayrı, boş bir veritabanı ve ayrı bir `.env` ile çalıştırın.
- Quick Tunnel tek bir yerel porta bağlanır; üç ana makine adı olan kalıcı kurulumun (§3, seçenek A) yerine geçmez.

## 4. Sunucu hazırlığı ve sertleştirme

Aşağıdaki liste Ubuntu LTS 24.04 içindir. Komutlar `admin` adlı sudo yetkili bir kullanıcıyla çalıştırılır; **`root` ile doğrudan oturum açmayın**.

1. **Kullanıcılar.**
   ```sh
   sudo adduser --disabled-password --gecos "" oggaq            # uygulama: kodu çalıştırır, SSH ile girilmez
   sudo adduser --system --group --no-create-home oggaq-backup  # yedek: yalnızca yedek betiği
   sudo usermod -aG oggaq www-data                              # nginx statik dosyaları okuyabilsin
   sudo usermod -aG oggaq-backup oggaq                          # silme listesi dışa aktarımı yazılabilsin
   ```
   Dağıtımı siz `admin` ile girip `sudo -iu oggaq` ile `oggaq` kullanıcısına geçerek yaparsınız.
2. **SSH.** Yalnızca anahtarla giriş, parola kapalı, `root` girişi kapalı: `/etc/ssh/sshd_config.d/oggaq.conf` içine `PasswordAuthentication no`, `PermitRootLogin no`, `KbdInteractiveAuthentication no`. Değişiklikten sonra **ikinci bir oturum açıp** girebildiğinizi doğrulayın, sonra `sudo systemctl reload ssh`.
3. **Güvenlik duvarı (ufw).** Seçenek A: `sudo ufw default deny incoming; sudo ufw allow OpenSSH; sudo ufw enable` — **80/443 açılmaz.** Seçenek B: ek olarak 80/443'ü yalnızca Cloudflare aralıklarına açın (aralıklar [Cloudflare'in yayımladığı listeden](https://www.cloudflare.com/ips/) alınır; `deploy/nginx/update-cloudflare-ips.sh` aynı listeyi nginx için yazar). Giden trafik açık kalır (A'da `cloudflared` Cloudflare'e bağlanır; gereken çıkış portlarını Cloudflare'in [tünel belgesinden](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) doğrulayın).
4. **Otomatik güvenlik güncellemeleri.** `sudo apt install unattended-upgrades` ve `sudo dpkg-reconfigure -plow unattended-upgrades`. Çekirdek güncellemesi sonrası yeniden başlatma sizin planınızdadır.
5. **fail2ban.** `sudo apt install fail2ban`; varsayılan `sshd` hapsi yeterlidir.
6. **Saat.** `timedatectl set-timezone UTC` ve `timedatectl` ile NTP senkronunu doğrulayın. Uygulama zamanları UTC saklar; sınav süresi sunucu saatine bağlıdır.
7. **Diğer.** Kullanılmayan servisleri kapatın; `sudo ss -tulpn` ile dışarıya dinleyen yalnızca `sshd` (A) olduğunu doğrulayın; veritabanı ve Redis `127.0.0.1`'de kalmalıdır.

## 5. Yığın kurulumu

> Aşağıdakiler genel kılavuzdur; paket kaynakları ve sürüm adları zamanla değişir. Her satırı çalıştırmadan önce ilgili **resmî belgeden** doğrulayın. Bu belge yazılırken gerçek bir Ubuntu 24.04 üzerinde denenmedi.

- **PHP 8.4:** Ubuntu 24.04'ün varsayılan PHP'si 8.3'tür; 8.4 için ek bir paket kaynağı gerekir (yaygın olarak `ppa:ondrej/php`). Gerekli eklentiler: `php8.4-fpm php8.4-cli php8.4-pgsql php8.4-mbstring php8.4-xml php8.4-curl php8.4-zip php8.4-bcmath php8.4-intl php8.4-opcache`. Not: bu depo Redis'e `predis` (saf PHP) ile bağlanır, `php-redis` eklentisi gerekmez; parola özetleme `argon2id` PHP'nin kendi desteğini kullanır.
- **nginx:** `sudo apt install nginx`. **Sürüm notu:** Ubuntu 24.04'te nginx 1.24'tür; bu yüzden şablonlarda `http2 on;` kullanılmadı (Cloudflare'den origin'e bağlantı zaten HTTP/1.1).
- **PostgreSQL 18:** [postgresql.org Ubuntu sayfasındaki](https://www.postgresql.org/download/linux/ubuntu/) PGDG deposunu kurun, ardından `sudo apt install postgresql-18`.
- **Redis:** `sudo apt install redis-server`.
- **Composer:** [getcomposer.org](https://getcomposer.org/download/) resmî kurulum betiği, `/usr/local/bin/composer`.
- **Node 24 (yalnızca derleme için):** [nodejs.org](https://nodejs.org/en/download) resmî kurulum yolu. `deploy.sh` Node 24 olmadan çalışmaz. İsterseniz derlemeyi sunucu yerine başka bir makinede yapıp `dist` klasörlerini yükleyecek şekilde `deploy.sh`'i uyarlayabilirsiniz; bu yol hazırlanmadı.
- **git, curl, openssl:** `sudo apt install git curl openssl`.

**Debian'da farklar:** paket kaynakları (PHP için `packages.sury.org`, `apt.postgresql.org`), `unattended-upgrades` yapılandırma adı ve ufw yerine `nftables` kullanılabilir; systemd birimleri ve nginx şablonları değişmez. Doğrulanmadı.

## 6. PostgreSQL ve Redis

PostgreSQL yalnızca yerel bağlansın (`listen_addresses = 'localhost'`, varsayılan). Roller:

```sh
sudo -u postgres psql <<'SQL'
create role oggaq login password 'BURAYA-GÜÇLÜ-PAROLA' nosuperuser nocreatedb nocreaterole;
create database oggaq owner oggaq;
create role oggaq_backup login password 'BURAYA-BAŞKA-PAROLA' nosuperuser nocreatedb nocreaterole;
grant pg_read_all_data to oggaq_backup;
SQL
```

Parolaları `openssl rand -base64 24` ile üretin; yukarıdaki komutta metni parolayla değiştirip komutu **kabuk geçmişine yazmayan** bir yolla çalıştırın (örn. dosyadan okuyarak ve sonra silerek). Uygulama rolü süper kullanıcı değildir ve yalnızca kendi veritabanının sahibidir (migration'lar bunu gerektirir). `pg_hba.conf` içinde yalnızca `127.0.0.1`/Unix soket bağlantılarına izin verilmesi varsayılandır; değiştirmeyin.

Redis: `/etc/redis/redis.conf` içinde `bind 127.0.0.1 ::1`, `requirepass <parola>`, `appendonly yes`. Redis kuyruk ve önbelleği tutar; oturumlar veritabanındadır (`SESSION_DRIVER=database`). Kuyruktaki işler yalnızca e-posta bildirimleridir.

## 7. Dizin yapısı ve izinler

```
/srv/oggaq/                    (sahibi oggaq:oggaq, 0750)
├── repo.git/                  git --mirror (deploy.sh yönetir)
├── releases/<zaman>-<commit>/ her sürümün tam kopyası (backend/, apps/*/dist …)
├── current -> releases/…      yayındaki sürüm (atomik sembolik bağ)
├── shared/
│   ├── .env                   üretim ayarları (0600) — gizli değerler SADECE burada
│   ├── deploy.env             deploy.sh ayarları (REPO_URL, API_URL …)
│   └── storage/               Laravel storage (günlükler, önbellek) — sürümler arası paylaşılır
└── last-deploy
/etc/oggaq/                    yedek yapılandırması (root:oggaq-backup)
/var/backups/oggaq/{db,erasures}   yedekler (oggaq-backup; erasures: oggaq:oggaq-backup 2770)
```

```sh
sudo install -d -o oggaq -g oggaq -m 0750 /srv/oggaq /srv/oggaq/shared
sudo install -d -o oggaq-backup -g oggaq-backup -m 0700 /var/backups/oggaq /var/backups/oggaq/db
sudo install -d -o oggaq -g oggaq-backup -m 2770 /var/backups/oggaq/erasures
sudo install -d -o root -g oggaq-backup -m 0750 /etc/oggaq
sudo install -d -o oggaq -g oggaq -m 0750 /var/log/oggaq
```

## 8. İlk kurulum adımları

1. Kullanıcıları, güvenlik duvarını ve dizinleri hazırlayın (§4, §7).
2. **PHP-FPM havuzu:** varsayılan `www` havuzunu devre dışı bırakıp `deploy/php-fpm/oggaq.conf` dosyasını `/etc/php/8.4/fpm/pool.d/` altına kopyalayın; `sudo systemctl restart php8.4-fpm`.
3. **`.env` oluşturun:** `deploy/.env.production.example` dosyasını `/srv/oggaq/shared/.env` olarak kopyalayıp (izin `0600`, sahibi `oggaq`) doldurun: adresler, `DB_PASSWORD`, `REDIS_PASSWORD`, `MAIL_*`. İki anahtar üretin:
   ```sh
   php -r 'echo "base64:".base64_encode(random_bytes(32)), PHP_EOL;'   # APP_KEY
   openssl rand -hex 32                                                # ERASURE_LEDGER_KEY
   ```
   **⚠ SİZ YAPACAKSINIZ:** iki değeri parola yöneticinize de kaydedin. `APP_KEY` kaybolursa şifreli oturumlar ve kuyruk yükleri okunamaz; `ERASURE_LEDGER_KEY` kaybolursa geri yüklemeden sonra silinmiş hesaplar tanınamaz (bkz. §17.4). **İkisini de veritabanı yedeğiyle aynı yerde saklamayın.**
4. **`deploy.env`:** `/srv/oggaq/shared/deploy.env` (0600): `REPO_URL=git@github.com:SAHİP/oggaq.git`, `API_URL=https://api.example.com`, isteğe bağlı `KEEP_RELEASES=5`, `HEALTH_TIMEOUT=120`. `oggaq` kullanıcısı için bir SSH deploy anahtarı üretin (`ssh-keygen -t ed25519`) ve **⚠ SİZ YAPACAKSINIZ:** genel anahtarı GitHub deposuna salt-okunur "deploy key" olarak ekleyin.
5. **nginx:** `deploy/nginx/*.conf` dosyalarını `/etc/nginx/sites-available/` altına, `snippets/*.conf` dosyalarını `/etc/nginx/snippets/` altına kopyalayın; üç `oggaq-*.conf` içindeki `example.com`, `/srv/oggaq` ve CSP'deki API adresini kendi değerlerinizle değiştirin; `sites-enabled` altına bağlayın; varsayılan siteyi kaldırın. **Giriş yolunu seçin (§3):**
   - A: `sudo ln -s /etc/nginx/snippets/ingress-tunnel.conf /etc/nginx/snippets/ingress.conf`
   - B: `sudo ln -s /etc/nginx/snippets/ingress-public.conf /etc/nginx/snippets/ingress.conf`, `oggaq-redirect-http.conf` dosyasını da etkinleştirin ve `sudo deploy/nginx/update-cloudflare-ips.sh` çalıştırın.
   Ardından `sudo nginx -t && sudo systemctl reload nginx`. (Şablonlar bu belge yazılırken `nginx -t` ile **denenmedi**: hazırlayan makinede nginx yoktu.)
6. **systemd:** `deploy/systemd/*` dosyalarını `/etc/systemd/system/` altına kopyalayın, `sudo systemctl daemon-reload`. Horizon ve zamanlayıcı ilk dağıtımdan sonra etkinleştirilir (§8.9). **sudoers:** `deploy/sudoers/oggaq-deploy` dosyasını `/etc/sudoers.d/oggaq-deploy` olarak kurun, `sudo visudo -c -f /etc/sudoers.d/oggaq-deploy` ile denetleyin, izin `0440`. `oggaq` yalnızca dört `systemctl` komutunu parolasız çalıştırır (php-fpm yeniden yükleme, Horizon ve zamanlayıcıyı yeniden başlatma, yedek servisini başlatma).
7. **Yedek yapılandırması** (§17): `backup.env`, `backup.pgpass`, age genel anahtarı; yedek betiklerinin root sahipli kopyası.
8. **İlk dağıtım:** ilk seferde `current` henüz yoktur. `deploy/deploy.sh` dosyasını kendi makinenizden `scp` ile `/srv/oggaq/deploy.sh` olarak kopyalayın (sahibi `oggaq`, çalıştırılabilir), sonra `sudo -iu oggaq` ile girip `/srv/oggaq/deploy.sh deploy <etiket>` çalıştırın. Sonraki dağıtımlar `/srv/oggaq/current/deploy/deploy.sh` ile yapılır.
9. **Servisleri başlatın:** `sudo systemctl enable --now oggaq-horizon oggaq-scheduler oggaq-erasures.timer oggaq-backup.timer`. Seçenek A ise tüneli de başlatın (§10.A).
10. **İlk yönetici:** `cd /srv/oggaq/current/backend && php artisan app:create-admin yonetici@alanadiniz.com --name="Platform yöneticisi"` (parolayı gizli istemle iki kez sorar). Örnek hesaplar (`@example.test`) üretimde **oluşturulmaz**.
11. **İçerik:** §19.
12. **Doğrulama listesi:** `curl -s https://api.example.com/api/v1/health/ready` → `"status":"ok"`; web'den giriş; yönetim panelinden giriş; parola sıfırlama e-postasının ulaşması; `sudo systemctl --failed` boş; bir deneme çözüp bitirmek ve süresi dolan denemenin kapandığını görmek.

## 9. Mobil uygulama

- API adresi derleme sırasında `EXPO_PUBLIC_API_URL` ile verilir ve **HTTPS** olmalıdır (release paketi HTTP'yi reddeder, ayrıntı [MOBILE](MOBILE.md)). Bu değer pakette herkesin okuyabileceği bir ayardır; sır içermez.
- Mobil istemci çerez değil Bearer token kullanır; CORS ve `SESSION_DOMAIN` mobil için gerekmez.
- Mağaza dağıtımı (Apple App Store / Google Play) bu belgenin kapsamı **dışındadır** ve burada doğrulanmamıştır: Apple Developer hesabı, DSA ticari durum doğrulaması, imzalama, gizlilik politikası adresi ve veri sorumlusu kararları ayrı yürütülür. Resmî kaynaklar: [App Store Connect yardımı](https://developer.apple.com/help/app-store-connect/), [Expo EAS Build](https://docs.expo.dev/build/introduction/), [Google Play Console yardımı](https://support.google.com/googleplay/android-developer). Uygulama içi hesap silme uygulanmıştır ([PRIVACY](PRIVACY.md)); mağaza politikası metinlerini yayından önce güncel resmî kaynaktan doğrulayın.

## 10. Cloudflare adımları

**⚠ SİZ YAPACAKSINIZ (her ikisi de):** Cloudflare hesabınızda alan adınızı bir bölge (zone) olarak ekleyin; kayıt kuruluşunda ad sunucularını Cloudflare'inkilerle değiştirin. Bu belgeyi hazırlayan taraf Cloudflare API'sini çağırmaz ve hesabınıza erişmez.

### 10.A — Cloudflare Tunnel (önerilen)

Tünel oluşturmak Cloudflare hesabınızı ve alan adınızın hesabınızdaki bölgede olmasını gerektirir. Sunucuda, `cloudflared`'i Cloudflare'in [resmî kurulum belgesine](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/) göre kurduktan sonra:

```sh
cloudflared tunnel login                         # tarayıcıda hesabınızla yetkilendirir
cloudflared tunnel create oggaq                  # tünel kimliği ve kimlik bilgisi dosyası üretir
cloudflared tunnel route dns oggaq app.example.com
cloudflared tunnel route dns oggaq admin.example.com
cloudflared tunnel route dns oggaq api.example.com
```

1. Kimlik bilgisi dosyasını (`<TÜNEL-KİMLİĞİ>.json`) `/etc/cloudflared/` altına taşıyın (0600, sahibi `cloudflared`). **Bu dosya ve token depoya girmez.**
2. `deploy/cloudflared/config.yml.example` dosyasını `/etc/cloudflared/config.yml` olarak kopyalayıp `<TÜNEL-KİMLİĞİ>` ve alan adlarını doldurun: üç ana makine adı da `http://127.0.0.1:8080` adresine gider (nginx Host başlığına göre ayırır).
3. `deploy/cloudflared/oggaq-cloudflared.service` dosyasını `/etc/systemd/system/` altına koyun, `cloudflared` kullanıcısını oluşturun (`sudo adduser --system --group --no-create-home cloudflared`), `sudo systemctl enable --now oggaq-cloudflared`. (Cloudflare'in `cloudflared service install` komutu da bir seçenektir.)
4. nginx giriş dosyası `ingress-tunnel.conf` (bkz. §8.5). Güvenlik duvarında 80/443 kapalıdır.

### 10.B — Proxy'li DNS ve Origin CA

1. **DNS:** üç ana makine adı için sunucunun IP'sine A (ve varsa AAAA) kaydı, durum "Proxied".
2. **SSL/TLS modu:** **Full (strict)**. Sertifikalar: Cloudflare panelinde SSL/TLS > Origin Server > "Create Certificate" ile `*.example.com` (ve `example.com`) için bir Origin CA sertifikası oluşturun; sertifikayı `/etc/ssl/oggaq/origin.pem`, özel anahtarı `/etc/ssl/oggaq/origin.key` olarak kurun (anahtar `root:root 0600`). **Bu anahtar depoya girmez.**
3. **Cloudflare kullanmayan** kurulumda (doğrudan erişim) Let's Encrypt kullanın: `certbot` ile üç ad için sertifika alın, `ingress-public.conf` içindeki sertifika yollarını ve her sunucu bloğunun sertifikasını düzenleyin; **`cloudflare-realip.conf` dosyasını dahil etmeyin**.
4. Güvenlik duvarı: 80/443 yalnızca Cloudflare aralıklarına (bkz. §4.3). İsteğe bağlı ek önlem: [Authenticated Origin Pulls](https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/).

### 10.C — Her iki seçenekte

- "Always Use HTTPS" açık. HSTS'yi (nginx `security-headers.conf` içinde yorum satırı) yalnızca HTTPS'in çalıştığını doğruladıktan sonra açın.
- `api.example.com` için önbellek **atlanmalı** (Cache Rule: Bypass cache). Bu API kişisel veri içeren JSON döner; ayrıca uygulama `Cache-Control: no-store` yollayan uçlarla zaten korunur, ama kural açık olsun.
- Rocket Loader ve otomatik küçültme (Auto Minify) kapalı kalsın: içerik güvenlik politikası (CSP) betikleri değiştirilmemiş olarak bekler.
- Öneri (zorunlu değil): giriş ve parola sıfırlama uçları için Cloudflare Rate Limiting/WAF kuralı; uygulamanın kendi hız sınırlarına ek katmandır.

## 11. Çerezler, CORS ve Sanctum

Web (öğrenci) ve yönetim paneli **çerez oturumu** (Sanctum SPA kimlik doğrulaması) kullanır; mobil Bearer token. Üç tarayıcı adresi ayrı ana makine adı olduğu için şu ayarlar birlikte doğru olmalıdır:

| Değişken | Değer (örnek) | Ne işe yarar |
|---|---|---|
| `SESSION_DOMAIN` | `.example.com` | Oturum çerezi üç alt alan adında da geçerli olur (başında nokta). |
| `SESSION_SECURE_COOKIE` | `true` | Çerez yalnızca HTTPS ile gider (üretimde `APP_ENV=production` bunu zaten zorlar). |
| `SESSION_SAME_SITE` | `lax` | Alt alan adları **aynı site** sayıldığı için `lax` çalışır. Ana makine adları **farklı kayıtlı alan adlarında** olursa çalışmaz. |
| `SESSION_ENCRYPT` | `true` | Oturum içeriği şifreli. |
| `SANCTUM_STATEFUL_DOMAINS` | `app.example.com,admin.example.com` | Hangi tarayıcı kaynaklarına çerezli oturum verileceği (protokolsüz, virgülle). |
| `FRONTEND_URL`, `ADMIN_URL` | `https://app.example.com`, `https://admin.example.com` | CORS izinleri ve yönlendirmeler; **sonda `/` olmadan**. |
| `APP_URL` | `https://api.example.com` | İmzalı bağlantılar (e-posta doğrulama) bu adrese üretilir. |

CORS izin verilen kaynaklar yalnızca `FRONTEND_URL` ve `ADMIN_URL`'dir (`config/cors.php`); mobil web önizleme adresi yalnızca `local`/`testing` ortamında etkindir. CSP'deki `connect-src` (nginx `oggaq-app.conf`, `oggaq-admin.conf`) API adresini içermelidir.

## 12. E-posta

`MAIL_MAILER=smtp` ve sağlayıcının `MAIL_HOST/PORT/USERNAME/PASSWORD/SCHEME` değerleri `.env` içindedir. **⚠ SİZ YAPACAKSINIZ:** sağlayıcı panelinde gönderen alan adı için SPF, DKIM ve DMARC DNS kayıtlarını sağlayıcının verdiği değerlerle ekleyin (değerler sağlayıcıya özgüdür, burada yazılmadı); `MAIL_FROM_ADDRESS` bu alan adından olmalı. Bildirimler kuyruktan (Horizon) gönderilir ve yükleri şifrelidir. Test: web'de "Parolamı unuttum" akışı. Başarısız gönderimler `php artisan queue:failed` ve Horizon panelinde görünür; 7 gün sonra otomatik temizlenir.

## 13. Servisler: Horizon ve zamanlayıcı

- **`oggaq-horizon.service`:** kuyruk işleyicisi. `deploy.sh` her dağıtımda `php artisan horizon:terminate` çağırır; Horizon düzgünce kapanır ve systemd yeni sürümle başlatır.
- **`oggaq-scheduler.service`:** `php artisan schedule:work`; her dakika zamanlanmış görevleri çalıştırır: **süresi dolan denemeleri kapatır (`exams:expire`)**, kalp atışı yazar (`scheduler-heartbeat`), eski token/parola sıfırlama/başarısız iş kayıtlarını temizler, Horizon ölçümlerini alır. Zamanlayıcı durursa süresi dolan denemeler açılana kadar "devam ediyor" görünür; hazırlık ucu bunu `degraded` olarak bildirir (§15).
- **Horizon paneli** (`https://api.example.com/horizon`): yalnızca doğrulanmış platform yöneticisi. Ek önlem olarak nginx'te yorum satırındaki `allow/deny` bloğunu kendi IP'nize göre açın.

## 14. Günlükler

- Uygulama: `LOG_STACK=daily`, 14 gün (`LOG_DAILY_DAYS`), `/srv/oggaq/shared/storage/logs`. Uygulama parola, token, e-posta içeriği veya cevap metni yazmaz; yine de günlüklere herkesin erişemediğini doğrulayın (izin `oggaq`).
- nginx erişim günlükleri istemci IP'sini içerir; **IP adresi kişisel veridir.** Saklama süresini siz belirleyin (öneri: en çok 14 gün) ve `/etc/logrotate.d/nginx` içinde `daily` / `rotate 14` yapın. `deploy/logrotate/oggaq` diğer günlükleri sınırlar.
- systemd günlükleri (`journalctl`): `/etc/systemd/journald.conf` içinde `SystemMaxUse=500M`.
- Günlük saklama süresi ve konumu hukuki değerlendirmeyle netleşir ([PRIVACY](PRIVACY.md)); burada yazılanlar başlangıç önerisidir.

## 15. İzleme önerileri

| Ne | Nasıl |
|---|---|
| Örnek canlı mı? | Harici bir ücretsiz uptime servisi `GET https://api.example.com/api/v1/health/ready` adresini dakikada bir sorgular; **200 değilse** uyarı. |
| Zamanlayıcı durdu mu? | Aynı yanıtta `"status":"degraded"` ya da `"scheduler":false` → uyarı (anahtar sözcük denetimi). Örnek yine de 200 verir; sınavların kapanması etkilenir. |
| Yedek taze mi? | Cron/izleme: `sudo -u oggaq-backup BACKUP_ENV=/etc/oggaq/backup.env /usr/local/lib/oggaq-backup/backup.sh --check` (26 saatten eskiyse hata kodu). |
| Disk | `df -h /srv /var/backups` için eşik uyarısı (%80). |
| Başarısız işler | Horizon panelinde "Failed Jobs" ya da `php artisan queue:failed`. |
| Sertifika (yalnız B) | Origin CA sertifikasının bitiş tarihi (takvim hatırlatıcısı); Let's Encrypt ise `certbot renew --dry-run`. |
| Tünel (yalnız A) | `systemctl is-active oggaq-cloudflared`. Tünel düşerse üç adres de erişilemez olur. |

`/api/v1/health/ready` yanıtı yalnızca mantıksal değerler içerir (veritabanı, Redis, bekleyen migration yokluğu, kuyruk bağlantısı, zamanlayıcı kalp atışı); sürüm, yol veya hata metni sızdırmaz ve IP başına dakikada 30 istekle sınırlıdır. Veritabanı/Redis/migration/kuyruk başarısızsa **503**, yalnızca zamanlayıcı durmuşsa 200 + `degraded`. `/up` ise yalnızca uygulamanın ayağa kalktığını söyler.

## 16. Güncelleme ve geri dönüş

```sh
sudo -iu oggaq
/srv/oggaq/current/deploy/deploy.sh deploy v1.2.0      # etiket, dal ya da commit
/srv/oggaq/current/deploy/deploy.sh status
/srv/oggaq/current/deploy/deploy.sh rollback            # bir önceki SAĞLIKLI sürüme döner
```

`deploy.sh deploy` sırasıyla: ön kontroller (`.env` izin ve zorunlu değerler, Node/PHP sürümü, boş disk) → sürümü ayrı dizine çıkarır → `composer install --no-dev` → web ve yönetim derlemesi (`VITE_API_URL`) → **dağıtım öncesi yedek** (`oggaq-backup.service`) → `php artisan migrate --force` → önbellekler → `current` sembolik bağını **atomik** değiştirir → php-fpm'i yeniden yükler, Horizon ve zamanlayıcıyı yeniden başlatır → `/api/v1/health/ready` yanıtı `ok` olana kadar bekler. **Sağlık denetimi geçmezse** otomatik olarak bir önceki sağlıklı sürüme döner (çıkış kodu 1) ve başarısız sürüm `.failed` olarak işaretlenir. İlk kurulumda dönülecek sürüm yoktur. Aynı commit tekrar dağıtılmaz (`FORCE=1` ile zorlanır). Saklama: son 5 sağlıklı sürüm + inceleme için en yeni başarısız sürüm.

**Neden sürüm dizinleri + sembolik bağ (yerinde `git pull` değil):** kurulum bitip sağlık denetimi geçmeden yayındaki sürüme dokunulmaz, yarım güncellenmiş kod hiç sunulmaz; geri dönüş aynı tek bağ değişikliğidir. Disk maliyeti bu proje için önemsizdir. Bakım modu kullanılmaz; gerekirse riskli bir migration için elle `php artisan down` ile `up` kullanın.

**Migration kuralı (önemli):** migration'lar geri alınmaz. Geri dönüş yalnızca **kodu** eski sürüme çevirir; bu yüzden her migration bir önceki kodla da çalışacak şekilde yazılmalıdır: önce ekle, kod yayınlandıktan sonra bir sonraki sürümde kaldır. Bir migration veri bozduysa tek çözüm yedekten geri yüklemektir (§17.3).

Prova: `deploy.sh` yerelde geçici depo ve dizinle denendi (§22); `systemctl`/`sudo` çağrıları yerelde `OGGAQ_SKIP_SERVICES=1` ile atlandı, gerçek `php-fpm`, systemd ve nginx ile **denenmedi**.

## 17. Yedekleme ve geri yükleme

### 17.1 Ne yedeklenir

- **PostgreSQL veritabanı** (`pg_dump` özel biçim): kullanıcılar, denemeler, sorular, her şey. Yedek içeriği kişisel veri taşır, bu yüzden **şifreli** yazılır; şifresiz kopya diske hiç yazılmaz.
- **Silinmiş hesap listesinin ayrı dışa aktarımı** (`accounts:export-erasures`; saatlik zamanlayıcı): kişi bilgisi içermez (yalnızca anahtarlı özet); yedekten bağımsız saklanır (§17.4).
- Yedeklenmeyenler: kod (depoda), `.env` (gizli değerler; **⚠ SİZ YAPACAKSINIZ:** `APP_KEY`, `ERASURE_LEDGER_KEY`, parolalar parola yöneticinizde), Redis (kuyruk/önbellek; kaybolması veri kaybı değildir), nginx/systemd yapılandırması (bu depodaki şablonlardan yeniden kurulur).

### 17.2 Kurulum

1. **age kurun** (`sudo apt install age`); anahtar çiftini **sunucu dışında, kendi makinenizde** üretin: `age-keygen -o oggaq-yedek.key` (çıktıda `public key: age1…` satırı görünür). Genel anahtarı sunucuda `/etc/oggaq/backup.age.pub` dosyasına yazın. gpg alternatiftir (`ENCRYPT_TOOL=gpg`, genel anahtarı sunucudaki `oggaq-backup` anahtarlığına içe aktarın); age önerilir.
2. **⚠ SİZ YAPACAKSINIZ — anahtar saklama:** **özel anahtar sunucuda bulunmaz.** En az **iki ayrı yerde** saklayın (parola yöneticisi + çevrimdışı bir kopya, örn. şifreli USB ya da kâğıt). Özel anahtarı kaybederseniz **hiçbir yedek açılamaz**; ele geçirilirse yedeklerdeki tüm kişisel veri açılır.
3. **Yedek betiklerini root sahipli bir dizine kurun** (uygulama kullanıcısı `oggaq` değiştiremesin; systemd birimi buradan çalışır): `sudo install -d -m 0755 /usr/local/lib/oggaq-backup && sudo install -m 0755 deploy/backup/{backup,restore,verify,prune}.sh deploy/backup/common.sh /usr/local/lib/oggaq-backup/`. Betikler değişince (yeni sürümde) bu komutu yeniden çalıştırın. Sonra `deploy/backup/backup.env.example` dosyasını `/etc/oggaq/backup.env` olarak kopyalayıp doldurun (root, grup `oggaq-backup`, 0640). `backup.pgpass` tek satırdır (`127.0.0.1:5432:oggaq:oggaq_backup:PAROLA`, 0600, sahibi `oggaq-backup`).
4. **Sunucu dışı kopya (hedefi siz seçersiniz):** `OFFSITE_MODE=rclone` (önceden `rclone config` ile tanımlı bir uzak depo; S3 uyumlu, Backblaze, başka bir sunucu vb.) ya da `rsync` (ssh anahtarlı başka bir makine). `none` bırakılırsa yedek yalnızca bu makinede kalır ve betik bunu her çalışmada uyarır. rclone `copy` kullanır (yerelde silinen eski yedek uzaktan silinmez): uzak hedefteki saklama süresini hedefin kendi ayarıyla belirleyin.
5. `sudo systemctl enable --now oggaq-backup.timer` (her gün 00:30 UTC ≈ 03:30 Türkiye saati). Başarısızlıkta birim "failed" olur; `ALERT_WEBHOOK_URL` tanımlıysa bildirim de gider.

Saklama: gün başına en yeni yedek (7 gün), hafta başına (4 hafta), ay başına (6 ay) — `KEEP_*` ile ayarlanır. Bu kural `deploy/backup/test-prune.sh` ile sınanır.

**RPO/RTO:** günlük yedek olduğundan en kötü durumda son 24 saatin verisi (denemeler, sonuçlar) kaybolabilir; WAL arşivleme/noktaya dönüş (PITR) kurulmadı. Hedefler operasyonel karardır; bu yapı bir başlangıçtır.

### 17.3 Geri yükleme

`restore.sh` yedeği **adlandırılmış bir hedef veritabanına** yükler ve üretim adını (`oggaq`) `--allow-production` ve (doluysa) `--overwrite` olmadan **reddeder**. Doğrulama ve silinen hesapların yeniden uygulanması sonrasında yapılır.

Geri yükleme veritabanı oluşturabilen bir rolle (`postgres`) çalışır ve yedek dosyasını okuyabilmelidir; `/var/backups/oggaq/db` yalnızca `oggaq-backup` okuyabildiği için dosyayı geçici olarak `postgres`'in erişebileceği bir yere kopyalayın. **Özel anahtar bu sırada geçici olarak sunucuya girer; iş bitince silin** (`shred -u`).

```sh
sudo install -d -o postgres -g postgres -m 0700 /var/lib/postgresql/restore
sudo cp /var/backups/oggaq/db/oggaq-oggaq-<zaman>.dump.age{,.sha256} /var/lib/postgresql/restore/ && sudo chown postgres: /var/lib/postgresql/restore/*
# özel anahtarı kendi makinenizden aynı dizine koyun (⚠ SİZ YAPACAKSINIZ), sonra:
sudo -u postgres /usr/local/lib/oggaq-backup/restore.sh \
  --file /var/lib/postgresql/restore/oggaq-oggaq-<zaman>.dump.age --identity /var/lib/postgresql/restore/oggaq-yedek.key --target-db oggaq_drill
sudo -u postgres /usr/local/lib/oggaq-backup/verify.sh oggaq_drill      # satır sayıları, tetikleyiciler, içerik özeti
sudo -u postgres shred -u /var/lib/postgresql/restore/oggaq-yedek.key   # iş bitince
```

`verify.sh` migration kayıtlarını, değişmezlik tetikleyicilerinin varlığını, tablo satır sayılarını, yayın işaretçileri ve ardışık sınav sıralarını denetler ve **yayımlanmış soru sürümleri ile sınav sabitlemelerinin içerik özetini** (`content_checksum`) yazar; bunu kaynak veritabanındaki değerle (`--expect-checksum` / `--expect-counts-from`) karşılaştırabilirsiniz.

**Üretimi geri yüklemek (felaket durumu)** — bilinçli ve elle: uygulamayı durdurun (`systemctl stop oggaq-horizon oggaq-scheduler`, nginx/tünel kapat), aynı komutu `--target-db oggaq --allow-production --overwrite` ile çalıştırın (onay için veritabanı adını yazmanız istenir), `verify.sh oggaq` çalıştırın, **§17.4 adımlarını uygulayın**, sonra servisleri açın ve `/api/v1/health/ready` ile doğrulayın.

**Üç ayda bir geri yükleme tatbikatı (zorunlu):** yedeğin açılabildiği ancak böyle kanıtlanır. Her çeyrekte: (1) son yedeğin sağlama toplamı ve manifesti kontrol edilir, (2) `restore.sh` ile `oggaq_drill` veritabanına yüklenir, (3) `verify.sh --expect-counts-from` üretimle karşılaştırılır (satır sayıları yedek zamanına göre yakın olmalı; içerik özeti aynı olmalı), (4) §17.4 yeniden uygulama adımı kuru çalıştırılır, (5) `oggaq_drill` silinir, (6) tarih, yedek adı ve sonuç bir kayda yazılır. Özel anahtarın gerçekten erişilebilir olduğu da bu adımda doğrulanır.

### 17.4 Silinen hesaplar ve geri yükleme

Hesap silme geri alınamaz; ama **eski bir yedek geri yüklenirse silinmiş hesaplar yeniden ortaya çıkar.** Bunu önlemek için silme anında aynı işlemde `account_erasures` tablosuna yalnızca kullanıcı kimliğinin **anahtarlı özeti** (HMAC-SHA256, anahtar `ERASURE_LEDGER_KEY`) ve tarih yazılır; kimlik, e-posta veya başka bir şey yazılmaz, özetten kişi geri okunamaz. Tablo yalnızca ekleme kabul eder (güncelleme/silme veritabanı tarafından reddedilir).

Tablo aynı veritabanında olduğu için yedekle birlikte geri gelir; ama **yedekten yeni bir silme** onda bulunmaz. Bu yüzden iki önlem birlikte uygulanır:

1. `oggaq-erasures.timer` her saat listeyi `/var/backups/oggaq/erasures/erasures-latest.ndjson` dosyasına yazar; `backup.sh` bunu şifreleyip her yedekle birlikte (ve sunucu dışı kopyayla) saklar. Böylece listenin yedekten **daha yeni** bir kopyası vardır.
2. Geri yüklemeden sonra, uygulama bu veritabanına yönlendirilmeden **önce**:
   ```sh
   cd /srv/oggaq/current/backend
   # önce kuru çalıştırma: yalnızca sayar, listeye ya da veritabanına yazmaz
   php artisan accounts:reapply-erasures --from=/yol/erasures-<zaman>.ndjson
   # onaylarsanız: listeye ekler ve geri gelmiş hesapları mevcut silme yoluyla (tüm bağlı veriyle) siler
   php artisan accounts:reapply-erasures --from=/yol/erasures-<zaman>.ndjson --force
   ```
   Dışa aktarım dosyasını yedekten açmak için önce özel anahtarla çözün (`age -d -i oggaq-yedek.key erasures-….ndjson.age > /tmp/erasures.ndjson`; işiniz bitince silin). Platform yöneticisi hesapları otomatik silinmez (komut hata kodu verir, elle incelenir).

**Sınırlar (açıkça):** `ERASURE_LEDGER_KEY` değişir ya da kaybolursa eski kayıtlar eşleşmez; bu yüzden yedeğin dışında saklanır. Silme listesi saatlik dışa aktarıldığı için, bir silme ile sonraki dışa aktarım arasında (en çok ~1 saat) sunucu tamamen kaybolursa o silme listede olmayabilir. Yedek dönemi dolana kadar silinmiş hesabın verisi yedek dosyalarında bulunur ([PRIVACY](PRIVACY.md)).

## 18. Güvenlik özeti (kontrol listesi)

- Gizli değerler yalnızca `/srv/oggaq/shared/.env` (0600) ve parola yöneticinizde; depoda ve günlüklerde yok. `deploy.sh` `APP_DEBUG=false`, `APP_ENV=production`, `SESSION_SECURE_COOKIE=true`, `APP_KEY` ve `ERASURE_LEDGER_KEY` olmadan dağıtımı reddeder.
- Veritabanı ve Redis yalnızca yerel; uygulama rolü süper kullanıcı değil.
- nginx: sunucu sürümü gizli, gizli dosyalar (`.env`, `.git`) 404, yalnızca `index.php` çalışır, güvenlik başlıkları ve CSP (yalnızca kendi kaynak + API adresi). CSP, derlenmiş web ve yönetim uygulamalarıyla yerel bir statik sunucuda **zorlayıcı modda** denendi: betikler çalıştı, tema betiği uygulandı, ihlal yok. (Tema betiği CSP'ye uyum için `apps/*/public/theme-init.js` ayrı dosyasına taşındı.)
- Yedekler şifreli, özel anahtar sunucu dışında, yalnızca `oggaq-backup` okur (0600).
- `sudoers` yalnızca dört `systemctl` komutunu açar.

## 19. İçerik aktarımı (soru bankası)

Gerçek içerik (≈2.765 soru, 273 yayımlanmış çıkmış sınav, katalog) şu an yalnızca yerel geliştirme veritabanındadır. Üretime iki yoldan aktarılabilir. **Gerçek içeriğin gerçek sunucuya aktarımı kullanıcının açık onayını gerektirir** (içerik kaynak dosyalardan doğrulanmış verilerdir; yanlış aktarım geri alınamaz çünkü yayımlanmış sürümler değişmezdir). Bu belgeyi hazırlayan taraf içeriği hiçbir sunucuya göndermemiştir.

**Yol 1 — içerik dışa/içe aktarımı (önerilen):** geliştirme veritabanından yalnızca içerik tabloları (katalog, kaynak, soru, sürüm, şık, çıkmış sınav ve sabitlemeleri, içe aktarım kayıtları) çıkarılır; **kullanıcı, çalışma alanı, deneme, cevap, favori, bildirim, token, oturum ve denetim kayıtları hiç girmez**; soru/sınav satırlarındaki kullanıcı bağları (`created_by`, `actor_id`) boşaltılır.

```sh
# Kaynak makinede (salt okunur):
deploy/export-content.sh oggaq icerik.tar.gz
age -R /yol/oggaq-yedek.pub -o icerik.tar.gz.age icerik.tar.gz     # ağdan geçmeden ÖNCE şifrele
# Üretim sunucusunda, veritabanı boş ve migrate edilmiş, ilk yönetici oluşturulmuş:
age -d -i oggaq-yedek.key icerik.tar.gz.age > /tmp/icerik.tar.gz
deploy/import-content.sh /tmp/icerik.tar.gz --target-db oggaq --created-by-email yonetici@alanadiniz.com
shred -u /tmp/icerik.tar.gz 2>/dev/null || rm -f /tmp/icerik.tar.gz
```

İçe aktarım **değişmezlik tetikleyicilerini atlamaz ve kapatmaz**: veri uygulamanın kendi yaşam döngüsüyle yüklenir (sorular → taslak sürümler → şıklar → doğru şık ve yayın zamanı → yayın işaretçileri; sınavlar taslak → sorular → yayın zamanı), hepsi tek işlemde; biri başarısız olursa hiçbir şey kalmaz. Hedef boş olmalı, şema sütunları ve son migration aynı olmalıdır (aksi hâlde reddeder). Sonunda satır sayıları ve **içerik özeti** (yayımlanmış sürümler ve sabitlemeler) arşivdekiyle aynı olmalı; fark varsa betik hata verir.

**Yol 2 — özgün SQL dökümünden yeniden içe aktarma:** [IMPORTING](IMPORTING.md) içindeki önizleme ve onay akışıyla (`LegacyImport`). Kaynak dosya sunucuya gitmeden önce aynı onay kuralı geçerlidir.

## 20. Doğrulanan ve doğrulanmayan

**Yerelde denendi ve geçti (geçici veritabanı/dizinlerle; geliştirme verisi yalnızca salt okunur kullanıldı):**
- Hazırlık ucu ve silme listesi/komutlar: 17 PostgreSQL feature testi.
- `export-content.sh` → boş yeni migrate edilmiş veritabanına `import-content.sh` (uygulama rolüyle, süper kullanıcı olmadan): 2.765 soru, 13.800 şık, 286 sınav (273 yayımlı), 7.700 sabitleme; içerik özeti geliştirme veritabanıyla aynı; olumsuz yollar (ikinci yükleme, şema farkı, olmayan yönetici, bozuk arşiv) reddedildi ve bozuk arşivde hiçbir satır kalmadı; değişmezlik tetikleyicileri hedefte de etkin.
- `backup.sh` (gpg ile; `age` bu makinede yok) → sağlama toplamı → rsync ile yerel "uzak" dizin → `restore.sh` → `verify.sh`: içerik özeti ve satır sayıları kaynakla aynı; üretim adı, dolu hedef, bozulmuş dosya ve yanlış onay reddedildi. Hata yolu: şifreleme başarısız olunca yarım dosya kalmadı ve çıkış kodu hata.
- `test-prune.sh`: 299 dosyadan 7/4/6 kuralıyla 14 yedek kaldı; yeniden çalıştırma bir şey silmedi.
- Silinen hesap yeniden uygulama: geri yüklenmiş veritabanı kopyasında bir kullanıcı ve bağlı denemeleri silindi, kuru çalıştırma hiçbir şey yazmadı, geliştirme veritabanı etkilenmedi.
- `deploy.sh`: ilk kurulum, güncelleme (gerçek sağlık denetimi), idempotent tekrar, çalışma anında bozuk sürümde **otomatik geri alma**, başarısız migration'da yarım sürümün silinmesi, saklama/temizlik, `rollback` komutunun başarısız sürümü atlaması. Üretim benzeri sürümde `composer install --no-dev`, `npm ci` + derleme, `config/route/event` önbellekleri çalıştı; hazırlık ucu `ok` döndü.
- Web ve yönetim derlemesi üretim `VITE_API_URL` değeriyle; CSP zorlayıcı modda.

**Denenmedi / doğrulanmadı (gerçek ortam gerektirir):**
- Gerçek bir Ubuntu 24.04 sunucusu, `php-fpm`, systemd birimleri, `sudoers`, `ufw`, `fail2ban`, `unattended-upgrades` (yerelde macOS vardı).
- nginx sunucu blokları (`nginx -t` dahi çalıştırılmadı: nginx kurulu değildi).
- Cloudflare: DNS, tünel (`cloudflared`), Origin CA, SSL modu; hiçbir Cloudflare API çağrısı yapılmadı. `cloudflared` komutları ve çıkış portları Cloudflare belgelerinden doğrulanmalıdır.
- `age` ile şifreleme (makinede `age` yoktu; betik ve gpg yolu denendi, `age` yolu aynı akışı kullanır ama çalıştırılmadı), `rclone`, `shellcheck` (kurulu değildi; yalnızca `bash -n`).
- Gerçek SMTP sağlayıcısı, SPF/DKIM/DMARC.
- Ubuntu paket kaynakları (PHP 8.4, PostgreSQL 18, Node 24) ve sürüm adları.
- Mağaza dağıtımı (Apple/Google).
- Yük ve performans; sunucu boyutu bir tahmindir.
- GNU `mv -T` ile gerçekten atomik sembolik bağ geçişi (yerelde macOS'un atomik olmayan yolu kullanıldı; Linux yolu kodda var ama çalıştırılmadı).

## 21. Hâlâ gereken bilgiler

1. İşletim sistemi ve sürümü, sunucu konumu (Türkiye/yurt dışı), kaynak boyutu.
2. Alan adı ve Cloudflare bölgesi; giriş yolu seçimi (A önerilir).
3. E-posta sağlayıcısı ve gönderen alan adı.
4. Yedek hedefi (rclone uzak türü ya da rsync makinesi) ve özel anahtarın kimde, nerede saklanacağı.
5. Veri sorumlusu ve hukuki metinler (aydınlatma, kullanım koşulları); günlük ve yedek saklama sürelerinin hukuki teyidi.
6. Gerçek içeriğin sunucuya aktarımı için açık onay.
