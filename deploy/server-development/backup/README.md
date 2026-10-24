# Sunucu geliştirme ortamı: yedekleme, geri yükleme ve izleme

Bu klasör `deploy/server-development/` Docker Compose ortamının (Ubuntu 22.04 sunucu, `oggaq-development` projesi) **veritabanını** yedekler. Sunucuda hâlâ **hiç yedek yok**; gerçek soru içeriği (2.765 soru, 286 sınav) yalnızca o sunucunun `database` volume'ündedir. Bu belge ve betikler hazırlanmıştır, **gerçek sunucuda hiçbir şey çalıştırılmamıştır** (bkz. [Doğrulanmayanlar](#doğrulanmayanlar)).

## Nasıl çalışır

```
Sunucu (harun)                                       Sizin Mac'iniz
──────────────────────────────                      ──────────────────────────────
cron 00:30 UTC  backup.sh                           launchd (saatlik)  pull-backups.sh
  pg_dump (container içinde, socket, parola yok)      rsync ile YENİ dosyaları çeker
  → GENEL anahtarla şifreler                          → sağlama toplamı doğrular
  → ~/oggaq-development/backups/  (0700)              → LATEST bayat / bozuk ise bildirim
cron saatlik    erasures.sh                         Özel anahtar YALNIZ burada
  silinmiş hesap listesi (kişi bilgisi yok)         Aylık: restore-drill.sh (geri yükleme provası)
  → şifreli, ayrı dosya
LATEST / LATEST-ERASURES (kalp atışı) ───────────►  yaşını denetler
```

Temel kararlar (hepsi değiştirilebilir, [Kullanıcı kararları](#kullanıcı-kararları)):

- **Şifreleme asimetriktir.** Sunucuda yalnızca *genel* anahtar bulunur. Sunucu yedeği şifreleyebilir ama **okuyamaz**; sunucu ele geçirilse bile yedekler açılmaz. Özel anahtar Mac'tedir (ve sizin tuttuğunuz çevrimdışı bir kopyada). **Özel anahtar kaybolursa yedekler okunamaz.**
- **Sunucu dışı kopya "çekme" ile yapılır.** Sunucuda başka bir sisteme ait hiçbir kimlik bilgisi yoktur; Mac sunucuya SSH ile bağlanıp yeni dosyaları alır.
- **Yalnızca uygulama veritabanı (`oggaq`)** yedeklenir. Sunucudaki diğer projelerin veritabanlarına, Hestia'ya ve ana makine servislerine dokunulmaz; kurulum için `sudo` gerekmez.
- Saklama: sunucuda **7 gün / 4 hafta / 6 ay**, Mac'te **14 / 8 / 12** (gün başına en yeni yedek).
- Veritabanı parolası hiçbir komut satırında, ortam değişkeninde ya da günlükte geçmez: betikler `docker compose exec -T database pg_dump -U postgres …` ile konteynerin yerel soketini kullanır (Compose sağlık kontrolü de aynı yolu kullanıyor).

## Dosyalar

| Dosya | Nerede çalışır | Ne yapar |
| --- | --- | --- |
| `backup.sh` | sunucu | Gece yedeği: `pg_dump -Fc` → şifre → `.sha256` + `.manifest` → saklama temizliği → `LATEST`. `--check` yaşını denetler. |
| `erasures.sh` | sunucu | Saatlik silinmiş-hesap listesi dışa aktarımı (yalnız değişince yeni dosya), `LATEST-ERASURES`. |
| `lib.sh`, `../../backup/*.sh` | sunucu + Mac | Ortak işlevler, saklama (`prune.sh`), geri yükleme (`restore.sh`), denetim (`verify.sh`). |
| `backup.env.example` | sunucu | Yapılandırma şablonu (gizli değer içermez). |
| `crontab.example`, `systemd/` | sunucu | Zamanlama (cron önerilir; systemd kullanıcı birimleri alternatif). |
| `mac/pull-backups.sh` | Mac | Sunucudan çeker, doğrular, bayatlığı denetler, bildirim verir. |
| `mac/pull.env.example`, `mac/com.oggaq.backup-pull.plist.example` | Mac | Yapılandırma ve launchd şablonu. |
| `mac/install-to-server.sh` | Mac | Betikleri sunucudaki **sabit** klasöre kopyalar (`current` yeni sürüme geçse de bozulmaz). |
| `restore-drill.sh` | Mac (özel anahtarın olduğu yer) | Geçici veritabanına geri yükleme provası. |

## 1. Anahtar çiftini Mac'te oluşturun (bir kez)

**Seçenek A — `age` (önerilen, daha basit):**

```sh
brew install age
mkdir -p ~/keys && chmod 700 ~/keys
age-keygen -o ~/keys/oggaq-backup.key        # ekrana "Public key: age1…" yazar; özel anahtar dosyaya gider
chmod 600 ~/keys/oggaq-backup.key
```

Ekrandaki `age1…` genel anahtarı sunucuya taşıyacaksınız. Sunucuda `age` kurulu değilse (`age --version`) ya `sudo apt install age` ya da Seçenek B.

**Seçenek B — `gpg` (sunucuda hazır gelir):**

```sh
gpg --quick-generate-key "OGGAQ yedek (sunucu gelistirme)" default default never   # bir PAROLA belirleyin
gpg --list-keys --with-colons "OGGAQ yedek" | awk -F: '/^fpr/{print $10; exit}'      # parmak izi
gpg --armor --export <PARMAK_IZI> > ~/keys/oggaq-backup.pub.asc                      # yalnız GENEL anahtar
```

**Özel anahtarın saklanması (her iki seçenek):** Anahtarı parola yöneticinize ve bir **çevrimdışı kopyaya** (şifreli USB, kâğıda yazılmış kurtarma) koyun. Mac'in kaybı ile yedeklerin kaybı aynı anda olmamalı. Anahtarı kimin saklayacağı sizin kararınızdır. Genel anahtarı sunucuya kopyalamak güvenlidir; özel anahtarı **asla** sunucuya, depoya ya da sohbete koymayın.

**Anahtar değiştirme (rotasyon):** yeni çift üretin, sunucudaki genel anahtarı değiştirin; **eski özel anahtarı atmayın** — eski yedekler onunla açılır. Yedek saklama süresi (6 ay) dolana kadar iki anahtar saklanır.

## 2. Sunucuya kurulum

Mac'te, depo kökünden (SSH anahtarı ve adres aşağıdaki §3'teki `pull.env` dosyasından okunur; **önce §3 adım 1'i yapın**):

```sh
bash deploy/server-development/backup/mac/install-to-server.sh --dry-run   # neyin kopyalanacağını gösterir
bash deploy/server-development/backup/mac/install-to-server.sh             # betikleri ~/oggaq-development/backup-tools/ altına kopyalar
```

Sunucuda (SSH ile bağlanıp, `harun` kullanıcısıyla; **root gerekmez**):

```sh
install -d -m 700 ~/oggaq-development/backups ~/oggaq-development/logs
cp ~/oggaq-development/backup-tools/deploy/server-development/backup/backup.env.example ~/oggaq-development/shared/backup.env
chmod 600 ~/oggaq-development/shared/backup.env
nano ~/oggaq-development/shared/backup.env        # ENCRYPT_TOOL ve genel anahtar ayarlarını doldurun
```

Genel anahtarı yerleştirin (Mac'ten `scp` ile gönderin):

```sh
# age ise:  ENCRYPT_TOOL=age  ve  AGE_RECIPIENT_FILE=$HOME/oggaq-development/shared/backup.age.pub
#           (dosyanın içeriği tek satır: age1…)
# gpg ise:  ENCRYPT_TOOL=gpg  ve  GPG_RECIPIENT=<PARMAK_IZI>
gpg --import ~/oggaq-development/shared/oggaq-backup.pub.asc && gpg --list-keys
```

İlk elle deneme (yedek alır; sonuç, boyut ve süreyi kontrol edin):

```sh
bash ~/oggaq-development/backup-tools/deploy/server-development/backup/backup.sh
bash ~/oggaq-development/backup-tools/deploy/server-development/backup/erasures.sh
bash ~/oggaq-development/backup-tools/deploy/server-development/backup/backup.sh --check
ls -la ~/oggaq-development/backups && cat ~/oggaq-development/backups/LATEST
df -h ~                                              # disk yeterli mi?
```

Zamanlama (cron; kullanıcı crontab'ı, başka hiçbir servise dokunmaz): `crontab -e` ile `crontab.example` içindeki satırları ekleyin. Cron'un `docker` komutunu bulabilmesi için dosyanın başındaki `PATH=` satırı gereklidir. Alternatif: systemd kullanıcı birimleri (`systemd/`; tek seferlik `sudo loginctl enable-linger harun` gerekir).

`backup.sh` kendi kendine kilitlenir (aynı anda iki örnek çalışmaz), yedek dizini `0700`'dür, şifresiz kopya diske hiç yazılmaz; başarısız bir çalışma yarım dosya bırakmaz ve sıfırdan farklı çıkış kodu verir.

## 3. Mac'te kurulum

1. Yapılandırma (gizli değer yok):

   ```sh
   mkdir -p ~/.config/oggaq-backup && chmod 700 ~/.config/oggaq-backup
   cp deploy/server-development/backup/mac/pull.env.example ~/.config/oggaq-backup/pull.env
   chmod 600 ~/.config/oggaq-backup/pull.env
   nano ~/.config/oggaq-backup/pull.env        # SERVER_SSH=harun@<sunucu adresi>  (README'deki SSH ayarınızla aynı)
   ```

   SSH anahtarı varsayılan olarak `~/.ssh/oggaq_dev_ed25519`'tir ve sunucu `known_hosts` dosyanızda kayıtlı olmalıdır (betik `StrictHostKeyChecking=yes` kullanır; bilinmeyen sunucuya bağlanmaz).
2. Elle deneme: `bash deploy/server-development/backup/mac/pull-backups.sh` (yedekleri `~/oggaq-backups/server-development/` altına çeker, klasör `0700`). Çıkış kodları: `0` tamam, `1` sağlama toplamı hatası (dosya `.corrupt-…` adıyla karantinaya alınır), `2` en yeni yedek bayat, `3` çekme başarısız.
3. Otomatik çalıştırma: `mac/com.oggaq.backup-pull.plist.example` dosyasını `~/Library/LaunchAgents/com.oggaq.backup-pull.plist` olarak kopyalayıp `KULLANICI` ve depo yolunu düzeltin, ardından `launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.oggaq.backup-pull.plist`. Mac uykudayken çalışmaz; uyanınca çalışır. Bayatlık sınırı 26 saattir, yani Mac bir gece kapalıysa bile sabaha uyarı gelmez; iki gün kapalıysa gelir.
4. **Mac'in kendisi de yedeklenmeli.** Yedeklerin Mac'teki kopyası tek kopyadır; Time Machine ya da harici disk ekleyin (şifreli yedeklerin kendisi olduğu için dış diske koymak güvenlidir). FileVault açık olmalı.

## İzleme: ne uyarı verir

| Durum | Uyarı | Nerede |
| --- | --- | --- |
| Gece yedeği çalışmadı / başarısız | Mac'te "En yeni veritabanı yedeği: N saat önce" bildirimi, çıkış `2` | `pull-backups.sh` |
| Silme listesi saatlerdir yenilenmedi | Mac bildirimi (6 saat sınırı) | `pull-backups.sh` |
| Sunucuya ulaşılamıyor / anahtar reddedildi | Mac bildirimi, çıkış `3` | `pull-backups.sh` |
| Bozuk dosya | Mac bildirimi, dosya karantinada, çıkış `1` | `pull-backups.sh` |
| LATEST'in gösterdiği yedek Mac'te yok / doğrulanmamış | Mac bildirimi, çıkış `1` | `pull-backups.sh` |
| Soru ya da sınav sayısı bir önceki yedeğe göre %20'den fazla düştü | Günlükte uyarı, isteğe bağlı webhook | `backup.sh` |
| Cron çalışmıyor / `backup.sh --check` hatası | Çıkış kodu ≠ 0, `logs/backup.log` | sunucu |

Sunucu günlükleri gizli değer içermez (ad, zaman, boyut). Günlük dosyalarını ara sıra temizleyin (`~/oggaq-development/logs/`).

## Aylık geri yükleme provası

Yedek, **geri yüklenebildiği kanıtlanana kadar** yedek sayılmaz. Prova özel anahtarın olduğu Mac'te yapılır; geçici bir veritabanına yükler, denetler ve siler (gerçek veritabanına dokunmaz):

```sh
# Mac'teki yerel PostgreSQL 18'e bağlanın (dev-services kullanıyorsanız):
export PGHOST="$PWD/infrastructure/data/sockets" PGPORT=55432 PGUSER="$(whoami)"
bash deploy/server-development/backup/restore-drill.sh \
  --dir ~/oggaq-backups/server-development \
  --identity ~/keys/oggaq-backup.key \          # gpg kullanıyorsanız bu satırı çıkarın
  --backend-dir "$PWD/backend"                  # silinen hesapların yeniden uygulanmasını (yalnız sayar) da dener
```

Beklenen son satır: `TATBİKAT TAMAM: … geri yüklenebiliyor.` Betik şunları yapar: sağlama toplamı → `pg_restore` → `verify.sh` (migration kayıtları, 15 değişmezlik tetikleyicisi, tablo sayıları, yayın işaretçileri, içerik özeti) → manifestteki sayılarla karşılaştırma → silme listesi kuru çalıştırması. Geçici veritabanı her durumda silinir (`--keep` ile bırakılabilir).

## Felaket kurtarma (gerçek geri yükleme)

Ne zaman: `database` volume'ü kayboldu ya da veri bozuldu. **Önce sakin olun:** hiçbir şeyi silmeyin, `docker compose down --volumes` çalıştırmayın. Aşağıdaki akış yedeği önce **ayrı** bir veritabanına yükler, doğrular, sonra değiştirir; şifresiz dosya sunucuya yazılmaz (Mac'ten SSH üzerinden akıtılır).

Sunucuda kısa yol için (her oturumda bir kez; kendi `manage` sarmalayıcınızı da kullanabilirsiniz):

```sh
cd ~/oggaq-development/current
export OGGAQ_ENV_FILE=$HOME/oggaq-development/shared/.env OGGAQ_POSTGRES_PASSWORD_FILE=$HOME/oggaq-development/shared/.postgres-password OGGAQ_RELEASE=initial
dc() { docker compose --env-file "$OGGAQ_ENV_FILE" -f deploy/server-development/compose.yaml "$@"; }
```

1. **Yeni veritabanını oluşturun** (sunucuda): `dc exec -T database psql -U postgres -c 'create database oggaq_restore owner oggaq'`
2. **Yedeği Mac'ten akıtın** (Mac'te; `<DOSYA>` Mac'teki en yeni *doğrulanmış* `oggaq-….dump.age|gpg`):

   ```sh
   age -d -i ~/keys/oggaq-backup.key <DOSYA> | ssh -i ~/.ssh/oggaq_dev_ed25519 harun@<sunucu> \
     'cd ~/oggaq-development/current && OGGAQ_ENV_FILE=$HOME/oggaq-development/shared/.env OGGAQ_POSTGRES_PASSWORD_FILE=$HOME/oggaq-development/shared/.postgres-password OGGAQ_RELEASE=initial \
      docker compose --env-file "$HOME/oggaq-development/shared/.env" -f deploy/server-development/compose.yaml exec -T database \
      pg_restore -U postgres --no-owner --no-acl --role=oggaq --exit-on-error -d oggaq_restore'
   # gpg için ilk parça:  gpg --decrypt <DOSYA> | ssh …
   ```
3. **Denetleyin** (sunucuda; `verify.sh` konteynerin içinde çalışır):
   `dc exec -T -e PGUSER=postgres database bash -s -- oggaq_restore < ~/oggaq-development/backup-tools/deploy/backup/verify.sh` — son satır `SONUÇ: tüm denetimler geçti` olmalı. Sayıları `.manifest` dosyasıyla karşılaştırın.
4. **Uygulamayı durdurun** (yalnızca uygulama konteynerleri; `stop`/`start` kullanın, `down`/`up` değil — özel etiketli imajlar yeniden oluşturulmasın):
   `dc stop web worker scheduler app`
5. **Veritabanlarını değiştirin:**

   ```sh
   dc exec -T database psql -U postgres -d postgres \
     -c "select pg_terminate_backend(pid) from pg_stat_activity where datname in ('oggaq','oggaq_restore')" \
     -c "alter database oggaq rename to oggaq_bozuk_$(date +%Y%m%d)" \
     -c "alter database oggaq_restore rename to oggaq"
   ```
   Eski veritabanı en az 7 gün silinmeden kalır (inceleme için).
6. **Migration durumunu denetleyin:** `dc start app && dc exec -T app php artisan migrate:status` — yedek koddan eskiyse `dc exec -T app php artisan migrate --force`.
7. **Yedekten daha yeni silmeleri yeniden uygulayın.** En yeni `erasures-….ndjson.age|gpg` dosyasını Mac'te çözüp (yalnız özetler, kişi bilgisi yok) sunucuya kopyalayın:

   ```sh
   age -d -i ~/keys/oggaq-backup.key erasures-….ndjson.age | ssh -i … harun@<sunucu> 'cat > /tmp/erasures.ndjson'
   dc cp /tmp/erasures.ndjson app:/tmp/erasures.ndjson      # sunucuda
   dc exec -T app php artisan accounts:reapply-erasures --from=/tmp/erasures.ndjson          # önce sayar
   dc exec -T app php artisan accounts:reapply-erasures --from=/tmp/erasures.ndjson --force  # gerçekten siler
   dc exec -T app rm /tmp/erasures.ndjson; rm /tmp/erasures.ndjson
   ```
8. **Servisleri başlatın ve doğrulayın:** `dc start worker scheduler web`, ardından `curl -fsS http://127.0.0.1:18080/api/v1/health/ready` (`ok` ve tüm kontroller `true`). Kısa bir giriş denemesi yapın.
9. Yedek zamanlayıcısı çalışmaya devam eder; ertesi gün `backup.sh --check` ve Mac bildirimi temiz olmalı.

**Yalnızca içerik gerekiyorsa** (kullanıcı verisi gerekmiyor ya da bozuk): yedeği geçici veritabanına yükleyin (prova gibi, `--keep` ile), ardından `deploy/export-content.sh <geçici-db> içerik.tar.gz` ile yalnız soru bankasını dışa aktarın ve yeni migrate edilmiş boş bir veritabanına `deploy/import-content.sh` ile yükleyin ([DEPLOYMENT.md §19](../../../docs/DEPLOYMENT.md)).

## Yedeğe dahil olmayanlar ve riskler

- **Redis yedeklenmez, yedeklenmesi gerekmez.** Oturumlar `SESSION_DRIVER=database` olduğu için veritabanındadır; önbellek, hız sınırı sayaçları ve Horizon istatistikleri yeniden üretilir. Redis'te **yalnızca kuyruktaki işler** (ör. gönderilmeyi bekleyen doğrulama/parola sıfırlama/“hesabın silindi” e-postaları) kaybolur: kullanıcı yeniden ister. Başarısız işler (`failed_jobs`) veritabanındadır. Kuyrukta iş kaybı kabul edilmeyecekse Redis AOF volume'ü ayrıca yedeklenmeli; şimdilik gerek görülmedi.
- **`storage` volume'ü:** uygulama kullanıcı dosyası saklamıyor (yükleme özelliği yok), günlükler `stderr`'e gider; kaybı veri kaybı değildir. Sunucuda `docker compose … exec app ls storage/app` ile kontrol edin; dolu çıkarsa söyleyin.
- **Mailpit** geliştirme posta kutusudur; yedeklenmez.
- **`docker compose down --volumes` (ve `docker volume rm`) veritabanını siler.** Bu komutu yedeği ve geri yüklemeyi doğrulamadan çalıştırmayın. Normal güncellemede `down` değil `stop`/`up -d --no-deps <servis>` kullanılır.
- **Her dağıtım ve migration'dan önce elle yedek alın:** `bash ~/oggaq-development/backup-tools/deploy/server-development/backup/backup.sh` (yaklaşık 1–2 saniye; sonra `ls -la ~/oggaq-development/backups`).
- **Silinen hesaplar:** eski bir yedek geri yüklenirse silinmiş hesaplar yeniden ortaya çıkar; yukarıdaki adım 7 ve [PRIVACY.md](../../../docs/PRIVACY.md) bunu önler. Yedek dosyalarında silinmiş hesabın verisi saklama süresi (sunucuda 6 ay, Mac'te 12 ay) dolana kadar şifreli olarak bulunur; bu süreler hukuki teyitle belirlenmelidir.

## Doğrulananlar (Mac'te, geçici veritabanlarıyla)

- Gerçek geliştirme veritabanının salt okunur kopyası: `backup.sh` (gpg, yaklaşık 1,3 MB, ~1 sn) → `.sha256`, `.manifest`, `LATEST`; `erasures.sh` değişmeyince yeni dosya yazmaz; sunucu anahtarlığı **şifreyi çözemedi** (yalnız genel anahtar).
- `pull-backups.sh` (iki yerel klasörle taklit): çekme, doğrulama, ikinci çalıştırmada yeni dosya yok, bayat `LATEST` (çıkış 2), bozuk dosya (karantina, çıkış 1), ulaşılamayan kaynak (çıkış 3), LATEST'in gösterdiği dosya yoksa uyarı; bildirimler `osascript` yerine sahte bir komuta yazıldı.
- `restore-drill.sh`: gerçek `pg_restore`, `verify.sh` (15 tetikleyici, 12 içerik tablosu satır sayıları, içerik özeti geliştirme veritabanıyla aynı), manifest sayıları, silme listesi kuru çalıştırma; bozuk dosya ve yanlış anahtarla temiz hata; geçici veritabanı her durumda silindi.
- Saklama (`prune.sh`): 200 günlük yapay yedek → 14 dosya, 72 saatlik silme dışa aktarımı → gün başına 1; `LATEST*`, `.erasures-state` ve bilinmeyen dosyalara dokunulmadı; yetim `.sha256` kalmadı.
- Hata yolları: eksik/yanlış alıcı anahtar, olmayan veritabanı, olmayan `age`, tutulan kilit, olmayan yedek (`--check`), bozuk Laravel dizini: hepsi sıfırdan farklı çıkış, **yarım ya da şifresiz dosya bırakmadı**.
- **Gerçek Docker ile (Colima VM, Docker 29, Compose 5.6.1; 24 Ekim 2026):** sunucudakiyle aynı `compose.yaml` ve `postgres:18-bookworm` imajı (18.6) bir geçici dizinde (sunucu düzenini taklit eden `shared/.env`, `.postgres-password`) ayağa kaldırıldı; geliştirme veritabanının kopyası yüklendi (2.765 soru, 273 yayımlı sınav). `backup.sh` **Compose modunda** konteynerin içindeki `pg_dump` ile **age 1.3.2** şifreli yedek aldı (1,4 MB), `--check` taze dedi; `app` imajı derlenip (PHP 8.4.27, Laravel 13.35) `erasures.sh` konteynerdeki `accounts:export-erasures` ile silme listesini yazdı. Yedek, Mac'te `restore-drill.sh` ile (özel anahtar yalnız Mac'te) geri yüklendi: sağlama toplamı, 15 tetikleyici, içerik özeti, manifest sayıları ve "tüm denetimler geçti". Konteynerdeki `pg_dump` 18 ile Mac'teki `pg_restore` 18 uyumlu çıktı. Sonunda konteynerler, birimler, imaj ve geçici dizin silindi. Betikler `shellcheck` ile (`-S warning`) tarandı; kalan uyarılar yalnızca dinamik `source` ve `ls | grep` biçim uyarıları.
- `install-to-server.sh --to-local`: yalnızca iki betik klasörü, `mac/` hariç; kurulu kopyadan `backup.sh`/`erasures.sh` çalıştı; felaket adımı 3'teki biçimiyle (`bash -s -- <db> < verify.sh`) denetim çalıştı; veritabanı yeniden adlandırma komutları iki geçici veritabanında denendi.

## Doğrulanmayanlar

- **Gerçek sunucuda hiçbir şey çalıştırılmadı** (SSH yok): kurulum, cron, izinler, sunucudaki Ubuntu 22.04 / Docker sürümü (Mac'te Colima ile denendi; sunucudaki Docker ve `cron` ortamının `PATH`'i farklı olabilir).
- `gpg` yolu bu turda yeniden denenmedi (önceki turda geçmişti); `age` yolu Docker provasında denendi. Sunucuda `age` kurulu olmayabilir (`apt install age`).
- `launchd` plist'i yalnızca `plutil -lint` ile sözdizimi açısından denendi; gerçek yükleme/çalıştırma ve Mac uykusu davranışı denenmedi.
- Gerçek SSH üzerinden `rsync`: yerel klasörlerle denendi. macOS'un `openrsync`'i (2.6.9 uyumlu) `--chmod`'u desteklemediği için betik `rsync -rt` kullanır; ssh'li kullanım denenmedi.
- systemd kullanıcı birimleri yazıldı ama hiç yüklenmedi; cron satırları sözdizimi açısından incelendi, çalıştırılmadı. `shellcheck` taraması yapıldı (yukarıda).
- Felaket kurtarma akışının uçtan uca provası yapılmadı (gerçek volume kaybı, kesinti süresi, `stop`/`start` sırası). Parçaları (geri yükleme, doğrulama, yeniden adlandırma, silme listesi) ayrı ayrı denendi.
- Büyük veritabanında süre/disk: şimdi yedek ~1,3 MB; boyut büyüdükçe süreler değişir.

## Kullanıcı kararları

1. **Sunucu dışı kopya hedefi.** Şu anki tasarımda tek kopya Mac'tir; Mac kaybolursa/bozulursa yedekler de gider. Önerim: ikinci bir kopya (harici disk ya da şifreli yedekleri alan bir bulut/nesne depolama). Şifreli olduğu için hedefin güvenilir olması gerekmez. Hangisi? (Seçerseniz `rclone`/`rsync` adımı Mac tarafına eklenir.)
2. **Özel anahtarın saklayıcısı.** Anahtarı kim, nerede tutacak (parola yöneticisi + çevrimdışı kopya)? Yedekleri yalnızca bu kişi açabilir.
3. **Saklama süreleri.** 7/4/6 (sunucu) ve 14/8/12 (Mac) önerilerdir; silinmiş hesap verisinin yedekte kalma süresi nedeniyle hukuki teyitle belirlenmelidir.
4. **age mi gpg mi.** `age` daha basit ve hatasızdır; sunucuya kurulabiliyorsa onu seçin.
5. **Yönetici uyarıları.** Şu an uyarılar yalnızca Mac'e gelir. E-posta/webhook (`ALERT_WEBHOOK_URL`) isterseniz eklenebilir.
