# security-exam-platform

Türkiye'deki özel güvenlik görevlisi adayları için ücretsiz sınav hazırlık platformu. GitHub depo adı `oggaq`; teknik proje adı geçici olarak `security-exam-platform` kullanılır. Kalıcı marka henüz belirlenmedi.

## Mevcut durum

9 Ekim 2026: **Identity/Tenancy ve merkezi QuestionBank API teslimleri** çalışıyor. Laravel 13, PostgreSQL 18, Redis ve Horizon kuruldu; migration, kimlik doğrulama, kurum/üyelik/çalışma bağlamı yetkilendirmesi ve API sözleşmesi oluşturuldu. E-posta doğrulama ve parola sıfırlama bildirimleri şifreli queue payload'larıyla yerel Mailpit'e ulaşıyor.

Kayıt, cookie giriş/çıkış, cihaz bazlı süreli mobil token, e-posta doğrulama, parola sıfırlama, ad güncelleme, platform yöneticisi kurum/üyelik oluşturma ve iptali çalışır. Kullanıcı kişisel/aktif kurum bağlamlarını görebilir; kurum yöneticisi sadece kendi kurumunun üye dizinine erişebilir.

Merkezi ders, konu/alt konu, sınav türü ve kaynak katalogları; tek doğru seçenekli metin sorusu oluşturma, yeni sürümle düzenleme, ayrı yayımlama ve yönetici sürüm geçmişi uygulanmıştır. Öğrenci yalnız yayımlanmış sürümü filtreleyip okuyabilir; cevap anahtarı ve açıklama dönmez. PostgreSQL trigger'ları yayımlanmış soru/seçenek değişikliklerini engeller. Soru bankasının ikinci tesliminde 75 backend testi ve 329 assertion geçti.

React 19/TypeScript yönetim paneli gerçek API'ye bağlıdır: cookie giriş/çıkış, katalog oluşturma, soru listesi/filtre, taslak düzenleme, önizleme, yayımlama ve sürüm geçmişi. 11 istemci testi, 8 Chromium E2E ve strict tip kontrolü/production build geçti. [Panel kurulumu](apps/admin/README.md) ayrı belgelenmiştir.

Öğrenci web uygulaması eklendi: kayıt/giriş, e-posta doğrulama, parola sıfırlama, ders/konu seçimi, yayımlanmış soruyu çözme, sunucuda doğru/yanlış/boş değerlendirme ve kalıcı çalışma geçmişi. Soru sürümü sonuçla sabitlenir; kişisel/kurum geçmişi ayrıdır. `bb2a237` CI sonucu: **109 backend testi/584 assertion, 35 Vitest ve 27 Chromium E2E testi**; strict tip ve iki uygulamanın production build'i başarılı. [Öğrenci kurulumu](apps/web/README.md), [Study API/veri modeli](docs/STUDY.md).

Süreli çok sorulu deneme, otomatik süre sonu, sabit soru sürümleri, atomik doğru/yanlış/boş/puan ve web ekranı eklendi. Expo iOS/Android istemcisi gerçek Bearer API ve SecureStore ile giriş, çalışma/geçmiş ve deneme akışlarını uygular. [Deneme motoru](docs/EXAMS.md), [mobil kurulum ve native doğrulama durumu](docs/MOBILE.md). Import, raporlar ve hesap silme/veri export akışları henüz geliştirilmedi. Çevrimdışı çalışma güncel [prompt.md](prompt.md) kapsamında ayrıca kararlaştırılacak; mevcut sync belgeleri tasarım önerisidir. Kuruma özel soru gelecekte merkezi içerikten ayrı yetkilendirilecek. Boş uygulama klasörlerindeki `.gitkeep` dosyaları ekran veya özellik değildir.

10 Ekim 2026 mobil arayüzü yenilendi: alt sekmeler, ayrı ana ekran, profil, ders/konu panelleri ve sabit soru/deneme kontrolleri. Gerçek API ile 5 mobil Chromium E2E, 17 mobil birim testi, strict tip, Expo Doctor 21/21 ve üç platform export geçti. Fiziksel iPhone giriş/çıkışı ve ilk yeni tasarımın Expo Go’da görünmesi kullanıcı tarafından doğrulandı. `bb2a237` Android/iOS native paket derlemesi ve emülatör/Simulator açılış kontrolleri de başarılıdır. [Mobil tasarım ve doğrulama](docs/MOBILE.md).

Ardından mobilde lacivert/petrol/kırık beyaz palet, sınırlı altın vurgu ve soldan açılan menü eklendi. Menüde gezinme, kişisel/kurum alanı seçimi ve gerçek API çıkışı çalışır; 9 mobil Chromium E2E ile yerleşim, odak, alan izolasyonu, token iptali ve başarısız çıkışın tekrarı doğrulanır. `2a3dcc0` uygulama/API CI, Android/iOS derlemesi ve emülatör/Simulator açılış kontrolleri başarılıdır; fiziksel iPhone teyidi ayrıca izlenir.

Mobil tasarım daha sonra Material 3 Expressive yaklaşımına uyarlandı: merkezi şekil/tipografi sistemi, basışla şekil değiştiren düğmeler, bağlı seçim grupları, yay hareketleri ve sistem hareket azaltma desteği. Ana sayfa ve sonuç ekranı daha belirgin; soru/deneme okuma düzeni sakin kalır. 11 mobil Chromium E2E, 17 mobil birim testi, strict tip, Expo Doctor 21/21 ve üç platform export geçti. Bu Expressive sürümünün yeni native CI ve fiziksel iPhone teyidi ayrı izlenir. [Uygulama ayrıntıları ve doğrulama sınırları](docs/MOBILE.md#material-3-expressive-uyarlaması).

PostgreSQL/Redis otomatik testleri ve gerçek HTTP kimlik akışı doğrulandı. GitHub Actions yapılandırması hazır; uzak CI sonucu GitHub Actions üzerinden izlenir.

## Hedef yapı

```text
apps/
  mobile/                 React Native + Expo
  web/                    Çalışan React + Vite öğrenci uygulaması
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
| [OpenAPI 3.1.2](docs/openapi.json) | Uygulanmış 48 HTTP operasyonunun makineyle doğrulanabilir sözleşmesi |

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

Gerçek MySQL/MariaDB SQL ve PDF kaynakları henüz sağlanmadı; aktarım başlamadı. Deneme ve mobil için gerçek soru havuzu yönetim panelinden yayımlanmalıdır; geliştirme DB’sine sentetik içerik eklenmez.

Öğrenci uygulamasını kökte `npm run dev:web` ile `http://127.0.0.1:5173` adresinde açın. Normal veritabanı boşsa yönetim panelinde yayımlanan sorular listelenene kadar boş durum gösterilir.

Mobil için `npm run dev:mobile`. GitHub Actions üzerinde Android APK ve iOS Simulator paketi derlendi ve indirildi; önizleme paketleri yerel API ile çalışır. Kurulum, native doğrulama kanıtı ve Expo build zincirindeki iki düzeltilmemiş advisory [MOBILE](docs/MOBILE.md) içinde açıklanır.
