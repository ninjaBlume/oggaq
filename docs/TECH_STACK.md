# Teknoloji ve uyumluluk

Kontrol tarihi: 9 Ekim 2026. Backend hedefleri artık PHP 8.4 üzerinde çözümlenmiş ve composer.lock ile kilitlenmiştir; platform gereksinimleri, audit ve testler doğrulandı. Web/mobil tablosundaki değerler hâlâ registry/şablon adaylarıdır; bu istemciler kurulmadı, tip kontrolü veya native build yapılmadı.

## Backend

| Bileşen | Hedef / kontrol sonucu |
| --- | --- |
| PHP | Kullanıcı gereksinimi 8.4; çalışma ve CI ortamında 8.4 kullanılacak |
| Laravel | 13.x; registry `13.35.0`, PHP `^8.3` |
| Sanctum | `4.3.3`; Illuminate 13 destekleniyor |
| Horizon | `5.50.0`; Illuminate 13 destekleniyor, `pcntl`/`posix` gerekiyor |
| PostgreSQL | 18.x hedef; gerçek sürüm container kurulurken sabitlenecek |
| Redis | Horizon kuyruğu ve uygun cache; kararlı sürüm kurulumda doğrulanacak |
| API | REST, OpenAPI 3.1; 3.2'ye kendiliğinden geçilmez |

[Laravel 13 sürüm notları](https://laravel.com/docs/13.x/releases) PHP 8.3–8.5 desteğini belirtir; PHP 8.4 hedefiyle uyumludur. [Sanctum](https://laravel.com/docs/13.x/sanctum) web cookie oturumunu ve mobil token kullanımını destekler. [Horizon](https://laravel.com/docs/13.x/horizon) Redis tabanlı kuyruk için kullanılacaktır.

Paket bildirimleri doğrudan [Laravel](https://repo.packagist.org/p2/laravel/framework.json), [Sanctum](https://repo.packagist.org/p2/laravel/sanctum.json) ve [Horizon](https://repo.packagist.org/p2/laravel/horizon.json) kayıtlarından incelendi. Laravel 13.35.0, Sanctum 4.3.3, Horizon 5.50.0 ve Predis 3.7.0 tam bağımlılık ağacıyla PHP 8.4 üzerinde çözüldü; Composer platform kontrolü başarılı. PHPUnit 12.5.38 ve Pint 1.32.1 geliştirme bağımlılıklarıdır.

[PostgreSQL destek tablosuna](https://www.postgresql.org/support/versioning/) göre 18 desteklenen bir seridir. Global `psql 14.18` korunmuştur; projeye ait PostgreSQL 18.6 sunucusu ayrı cluster ve port ile kuruldu ve migration/test bağlantıları doğrulandı.

## JavaScript ve mobil

Node 24 LTS ortak çalışma ortamı olarak seçildi; `.nvmrc` bu ana sürümü gösterir. [Node sürüm tablosu](https://nodejs.org/en/about/previous-releases) LTS durumunu, [Vite gereksinimleri](https://vite.dev/guide/) desteklenen Node aralığını belirtir. Tam patch sürümü kurulum/CI sırasında sabitlenecek.

| Bileşen | İncelenen sürüm | Karar |
| --- | --- | --- |
| Expo | `57.0.27` | SDK 57'nin eşlediği paketleri kullan |
| Mobil React Native | Şablonda `0.86.3` | Registry'deki bağımsız `0.87.1` sürümüne zorla yükseltme |
| Mobil React | Şablonda `19.2.3` | Expo'nun sürümünü koru |
| Expo Router | Şablonda `~57.0.25` | Expo ile birlikte çözümle |
| Web/admin React | Registry `19.3.0` | React 19; mobil sürümünden ayrı çözümle |
| React Router | `8.4.0` | React/React DOM `>=19.2.7`, Node `>=22.22.0` gerekiyor |
| Vite | `8.3.4` | Web/admin için; Metro'nun yerine geçmez |
| Vite React plugin | `6.1.2` | Vite 8 peer aralığı destekleniyor |
| TypeScript | Registry `7.0.2`; Expo şablonu `~6.0.3` | İlk ortak derleyici adayı 6.0.3; TS 7 yükseltmesi ayrıca doğrulanacak |
| Tailwind CSS | `4.3.3` | Web/admin; mobil stilleri ayrı platform bileşenleriyle |
| TanStack Query | `5.104.1` | React 18/19 peer aralığı; sunucu durumu |
| Zustand | `5.0.15` | Yalnızca ihtiyaç doğarsa; kalıcı outbox yerine kullanılmaz |

Expo'nun [SDK matrisi](https://docs.expo.dev/versions/latest/) React Native/React eşlemesini ve SDK 57 için minimum Node 22.13.x değerini belirtir. Resmî [default şablonun registry kaydı](https://registry.npmjs.org/expo-template-default/latest) yukarıdaki mobil ve TypeScript sürümlerini içerir. SDK 57 belgelerinde iOS 16.4+ ve Android 7+ alt sınırları yer alır; hedef kullanıcı cihazları ve mağaza şartları mobil kurulumdan önce tekrar değerlendirilecek.

Diğer değerler doğrudan paketlerin npm registry `latest` bildirimlerinden okundu: [React](https://registry.npmjs.org/react/latest), [React Native](https://registry.npmjs.org/react-native/latest), [React Router](https://registry.npmjs.org/react-router/latest), [Vite](https://registry.npmjs.org/vite/latest), [React plugin](https://registry.npmjs.org/@vitejs%2fplugin-react/latest), [TypeScript](https://registry.npmjs.org/typescript/latest), [Tailwind](https://registry.npmjs.org/tailwindcss/latest), [TanStack Query](https://registry.npmjs.org/@tanstack%2freact-query/latest), [Zustand](https://registry.npmjs.org/zustand/latest).

Ortak paketler React bileşeni barındırmayacak; veri sözleşmeleri, saf kurallar ve platform bağımsız istemci paylaşılır. npm workspace çözümlemesinde her uygulamanın React bağımlılığı ayrı tutulur. Mobilde `expo install` ve `expo-doctor`, webde peer kontrolleri ve build sonuçları doğrulanmadan sürüm uyumluluğu tamamlandı sayılmaz.

## Yerel ortam

| Araç | Gözlenen değer | İleride yapılacak |
| --- | --- | --- |
| PHP | Projeye seçilen 8.4.26; global 8.5.8 korunuyor | Composer çözümü, platform ve test kontrolü başarılı |
| Composer | 2.10.2 | PHP 8.4 ile kullanılan composer.lock |
| Node | Projeye seçilen 24.21.0; global 23.11.0 korunuyor | API lint aracı Node 24 ile çalışıyor |
| npm | Kilit dosyası mevcut | Kilitli kurulum ve audit başarılı |
| PostgreSQL | Proje sunucusu 18.6 | Ayrı oggaq/oggaq_test; migration ve integration testleri |
| Redis | 8.10.2 | Parolalı loopback servis; Horizon ve encryption testi |
| Mailpit | 1.31.4 | Gerçek SMTP bildirimleri yerel kutuda doğrulandı |
| Docker | Kurulmadı | Yerel Homebrew servisleri kullanılıyor; Docker doğrulanmadı |

Gerekli Homebrew sürümleri yan yana kuruldu; global PHP/Node/PostgreSQL linkleri değiştirilmedi. Root npm manifesti/workspace düzeni ve Redocly CLI 2.60.0 kilit dosyası vardır; web/mobil paketleri henüz kurulmadı. GitHub Actions dosyası hazır fakat uzak CI çalıştırılmadı. Kurulum [DEVELOPMENT](DEVELOPMENT.md) içindedir. Yeni sürümlere geçiş changelog/peer incelemesi ve ilgili testlerle yapılır.
