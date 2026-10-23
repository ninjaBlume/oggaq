# deploy/

Üretim kurulumu için **şablonlar ve betikler** (gizli değer içermez). Adım adım anlatım: [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md). Hiçbiri bu depodan bir sunucuya kendiliğinden gitmez; sunucuda bir insan çalıştırır.

| Yol | Ne |
|---|---|
| `.env.production.example` | Üretim ortam değişkenleri yapısı (gerçek değerler sunucuda `/srv/oggaq/shared/.env`) |
| `deploy.sh` | Sürüm dizinli, atomik, sağlık denetimli dağıtım ve geri alma (`deploy`, `rollback`, `status`) |
| `nginx/` | api / app / admin sunucu blokları, giriş seçenekleri (`ingress-tunnel.conf`, `ingress-public.conf`), güvenlik başlıkları, Cloudflare IP betiği |
| `cloudflared/` | Cloudflare Tunnel yapılandırma örneği ve systemd birimi (kimlik bilgisi dosyası depoya girmez) |
| `php-fpm/`, `systemd/`, `logrotate/`, `sudoers/` | PHP-FPM havuzu, Horizon/zamanlayıcı/yedek/silme listesi birimleri, günlük döndürme, dar sudo izni |
| `backup/` | Şifreli yedek (`backup.sh`), saklama (`prune.sh`, `test-prune.sh`), geri yükleme (`restore.sh`), doğrulama (`verify.sh`) |
| `export-content.sh`, `import-content.sh` | Soru bankası içeriğinin kullanıcı verisi olmadan dışa/içe aktarımı |
