# security-exam-platform

Türkiye'deki özel güvenlik görevlisi adayları için ücretsiz sınav hazırlık platformu. GitHub depo adı `oggaq`; teknik proje adı geçici olarak `security-exam-platform` kullanılır. Kalıcı marka henüz belirlenmedi.

## Mevcut durum

9 Ekim 2026: **Identity/Tenancy ve merkezi QuestionBank API teslimleri** çalışıyor. Laravel 13, PostgreSQL 18, Redis ve Horizon kuruldu; migration, kimlik doğrulama, kurum/üyelik/çalışma bağlamı yetkilendirmesi ve API sözleşmesi oluşturuldu. E-posta doğrulama ve parola sıfırlama bildirimleri şifreli queue payload'larıyla yerel Mailpit'e ulaşıyor.

Kayıt, cookie giriş/çıkış, cihaz bazlı süreli mobil token, e-posta doğrulama, parola sıfırlama, ad güncelleme, platform yöneticisi kurum/üyelik oluşturma ve iptali çalışır. Kullanıcı kişisel/aktif kurum bağlamlarını görebilir; kurum yöneticisi sadece kendi kurumunun üye dizinine erişebilir.

Merkezi ders, konu/alt konu, sınav türü ve kaynak katalogları; tek doğru seçenekli metin sorusu oluşturma, yeni sürümle düzenleme, ayrı yayımlama ve yönetici sürüm geçmişi uygulanmıştır. Öğrenci yalnız yayımlanmış sürümü filtreleyip okuyabilir; cevap anahtarı ve açıklama dönmez. PostgreSQL trigger'ları yayımlanmış soru/seçenek değişikliklerini engeller. 75 backend testi ve 329 assertion geçti.

React 19/TypeScript yönetim paneli gerçek API'ye bağlıdır: cookie giriş/çıkış, katalog oluşturma, soru listesi/filtre, taslak düzenleme, önizleme, yayımlama ve sürüm geçmişi. 11 istemci testi, 8 Chromium E2E ve strict tip kontrolü/production build geçti. [Panel kurulumu](apps/admin/README.md) ayrı belgelenmiştir.

Öğrenci web/mobil arayüzleri, soru çözme/değerlendirme ve sınav motoru, import, raporlar ve hesap silme/veri export akışları henüz geliştirilmedi. Çevrimdışı çalışma güncel [prompt.md](prompt.md) kapsamında ayrıca kararlaştırılacak; mevcut sync belgeleri tasarım önerisidir. Kuruma özel soru gelecekte merkezi içerikten ayrı yetkilendirilecek. Boş uygulama klasörlerindeki `.gitkeep` dosyaları ekran veya özellik değildir.

PostgreSQL/Redis otomatik testleri ve gerçek HTTP kimlik akışı doğrulandı. GitHub Actions yapılandırması hazır; uzak CI sonucu GitHub Actions üzerinden izlenir.

## Hedef yapı

```text
apps/
  mobile/                 React Native + Expo
  web/                    React + Vite kullanıcı uygulaması
  admin/                  Çalışan React + Vite içerik yönetimi
backend/                  Laravel 13 modüler monolit
packages/
  api-client/             OpenAPI tipleriyle cookie/CSRF HTTP istemcisi
  shared-types/           OpenAPI'den üretilen veri ve operasyon tipleri
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
| [Soru bankası](docs/QUESTION_BANK.md) | Taslak, sürüm, yayımlama, filtreler ve API kullanım örneği |
| [İçe aktarma](docs/IMPORTING.md) | SQL/PDF inceleme, doğrulama ve yayınlama süreci |
| [Testler](docs/TESTING.md) | Kritik senaryolar ve doğrulama yöntemi |
| [Yol haritası](docs/ROADMAP.md) | Aşamalar, bağımlılıklar ve tamamlanma kapıları |
| [Geliştirme ortamı](docs/DEVELOPMENT.md) | Kurulum, servisler, API, test ve yönetici hesabı |
| [OpenAPI 3.1.2](docs/openapi.json) | Uygulanmış 39 HTTP operasyonunun makineyle doğrulanabilir sözleşmesi |

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

Paneli kökte `npm run dev:admin` ile `http://127.0.0.1:5174` adresinde çalıştırın. Yönetici hesabı için panel kurulum belgesindeki `app:create-admin` komutunu kullanın; hazır/parolası sabit bir hesap oluşturulmaz.

Gerçek MySQL/MariaDB SQL ve PDF kaynakları henüz sağlanmadı; aktarım başlamadı. Sürümlü sınav/cevap değerlendirme ve öğrenci uygulamalarını bağlamak sonraki işlerdir.
