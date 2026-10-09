# security-exam-platform

Türkiye'deki özel güvenlik görevlisi adayları için ücretsiz sınav hazırlık platformu. GitHub depo adı `oggaq`; teknik proje adı geçici olarak `security-exam-platform` kullanılır. Kalıcı marka henüz belirlenmedi.

## Mevcut durum

9 Ekim 2026: **Backend altyapısı ve ilk Identity/Tenancy API teslimi** çalışıyor. Laravel 13, PostgreSQL 18, Redis ve Horizon kuruldu; migration, kimlik doğrulama, kurum/üyelik/çalışma bağlamı yetkilendirmesi ve API sözleşmesi oluşturuldu. E-posta doğrulama ve parola sıfırlama bildirimleri şifreli queue payload'larıyla yerel Mailpit'e ulaşıyor.

Kayıt, cookie giriş/çıkış, cihaz bazlı süreli mobil token, e-posta doğrulama, parola sıfırlama, ad güncelleme, platform yöneticisi kurum/üyelik oluşturma ve iptali çalışır. Kullanıcı kişisel/aktif kurum bağlamlarını görebilir; kurum yöneticisi sadece kendi kurumunun üye dizinine erişebilir.

Web/admin/mobil arayüzler, soru bankası, sınav motoru, import, raporlar ve hesap silme/veri export akışları henüz geliştirilmedi. Çevrimdışı çalışma güncel [prompt.md](prompt.md) kapsamında ayrıca kararlaştırılacak; mevcut sync belgeleri tasarım önerisidir. Kuruma özel soru gelecekte merkezi içerikten ayrı yetkilendirilecek. Uygulama klasörlerindeki `.gitkeep` dosyaları ekran veya özellik değildir.

PostgreSQL/Redis otomatik testleri ve gerçek HTTP kimlik akışı doğrulandı. GitHub Actions yapılandırması hazır; uzak CI sonucu GitHub Actions üzerinden izlenir.

## Hedef yapı

```text
apps/
  mobile/                 React Native + Expo
  web/                    React + Vite kullanıcı uygulaması
  admin/                  React + Vite yönetim paneli
backend/                  Laravel 13 modüler monolit
packages/
  api-client/             OpenAPI'den üretilen istemci ve platform adaptörleri
  shared-types/           Ortak veri sözleşmeleri
  validation/             İstemci doğrulaması; sunucu doğrulaması ayrıca zorunlu
  shared-utils/           Yalnızca gerçekten ortak yardımcılar
infrastructure/           Geliştirme ve dağıtım yapılandırmaları
docs/                     Türkçe teknik belgeler
```

## Belgeler

| Belge | İçerik |
| --- | --- |
| [PRD](docs/PRD.md) | Ürün kapsamı, kullanıcı akışları ve kabul koşulları |
| [Mimari](docs/ARCHITECTURE.md) | Modül sınırları ve kararların gerekçeleri |
| [Teknoloji](docs/TECH_STACK.md) | Doğrulanan sürümler, uyumluluk sınırları ve yerel ortam |
| [Veritabanı](docs/DATABASE.md) | Uygulanan tablolar, ilişkiler ve sonraki veri modeli |
| [Tenant izolasyonu](docs/TENANCY.md) | Kişisel/şirket bağlamı ve erişim matrisi |
| [Çevrimdışı senkronizasyon](docs/OFFLINE_SYNC.md) | Paketler, kalıcı kuyruk ve çakışma protokolü |
| [Güvenlik](docs/SECURITY.md) | Oturumlar, KVKK, mevzuat ve güvenlik gereksinimleri |
| [API](docs/API.md) | Çalışan REST uçları, hata standardı ve sonraki sözleşmeler |
| [İçe aktarma](docs/IMPORTING.md) | SQL/PDF inceleme, doğrulama ve yayınlama süreci |
| [Testler](docs/TESTING.md) | Kritik senaryolar ve doğrulama yöntemi |
| [Yol haritası](docs/ROADMAP.md) | Aşamalar, bağımlılıklar ve tamamlanma kapıları |
| [Geliştirme ortamı](docs/DEVELOPMENT.md) | Kurulum, servisler, API, test ve yönetici hesabı |
| [OpenAPI 3.1.2](docs/openapi.json) | Uygulanmış 20 HTTP operasyonunun makineyle doğrulanabilir sözleşmesi |

## Geliştirme ortamı

PHP 8.4, Node 24 LTS, PostgreSQL 18 ve Redis kullanılır. PHP bağımlılıkları `backend/composer.lock`, sözleşme doğrulama araçları `package-lock.json` ile kilitlendi. Kurulum ve sürüm seçimi için [DEVELOPMENT](docs/DEVELOPMENT.md) belgesini izleyin.

```sh
python3 scripts/dev-services.py start
cd backend
composer install
php artisan migrate
php artisan serve --host=127.0.0.1 --port=8000 --no-reload
```

Bu komutlar PATH'te PHP 8.4 seçili olmasını gerektirir. Horizon'u ayrı terminalde `php artisan horizon` ile çalıştırın. Yerel API `http://127.0.0.1:8000`, posta kutusu `http://127.0.0.1:58025`; bunlar geliştirme servisleridir. Üretime dağıtım yapılmadı.

Gerçek MySQL/MariaDB SQL ve PDF kaynakları henüz sağlanmadı; aktarım başlamadı. Sonraki backend adımı merkezi soru bankası ve sürümlü sınav motorudur.
