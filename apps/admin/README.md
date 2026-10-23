# Yönetim paneli

React 19, TypeScript strict, Vite, Tailwind CSS ve TanStack Query ile merkezi QuestionBank API'sine bağlı yerel uygulama. Başlık/marka değerleri `src/config.ts` içindedir. Kalıcı marka veya üretim hosting'i bu teslimde tanımlanmadı.

## Çalıştırma

Depo kökünde Node 24 seçili olsun; PostgreSQL/Redis ve backend API açık olmalıdır:

```sh
npm ci --ignore-scripts
npm run dev:admin
```

Panel `http://127.0.0.1:5174`, varsayılan API `http://127.0.0.1:8000` adresindedir. Farklı API için `.env.example` dosyasını `.env.local` olarak kopyalayıp `VITE_API_URL` ayarlayın. `VITE_` değerleri herkese açık frontend yapılandırmasıdır; parola/secret eklemeyin. Backend `ADMIN_URL`, CORS ve `SANCTUM_STATEFUL_DOMAINS` aynı origin ile eşleşmelidir. Yerelde `localhost` ve `127.0.0.1` isimlerini karıştırmayın.

Yönetici hesabı otomatik oluşturulmaz. `backend/` içinde PHP 8.4 ile:

```sh
php artisan app:create-admin admin@example.test --name="Platform yöneticisi"
```

Parola gizli istemde belirlenir. Komut güvenilir operasyon yöneticisinin hesabını doğrulanmış oluşturur. Öğrenci veya doğrulanmamış yönetici içerik paneline giremez; backend policy denetimleri her istekte uygulanır. Ayrıntılı ortam kurulumu [DEVELOPMENT](../../docs/DEVELOPMENT.md) içindedir.

## Uygulanan akışlar

- Cookie/CSRF giriş, mevcut session'ı geri yükleme, çıkış ve 401 sonrası girişe dönüş. Parola/token/localStorage tabanlı kimlik kalıcılığı yoktur; HttpOnly Laravel oturumu kullanılır. İçerik query cache'i hesap değişiminde temizlenir.
- Gerçek ders, konu/alt konu, sınav türü ve kaynak oluşturma/listeleme. Kataloglar cursor ile tüm sayfaları okunarak seçimlere yüklenir; ilk 100 kayıtla sınırlandırılmaz.
- Soru listesi, ders/yayın filtresi ve cursor sayfalama; total count bulunmadığı için yalnız o sayfanın kayıt sayısı gösterilir.
- Tam snapshot soru taslağı, değişken seçenekler ve doğru cevap. Seçenek silinince doğru cevap aynı seçenekte kalır veya silinen doğru cevap temizlenir.
- Yeni sürümle düzenleme, önizleme, ayrı yayımlama onayı, salt okunur eski sürüm görüntüleme.
- Soru editöründe gezinme/sekme kapatma uyarısı; 409 hatasında yerel değişikliklerin korunması ve kullanıcı onayıyla sunucudaki son sürümü yükleme.
- Türkçe alan hatası, loading/empty/error/retry, bildirimler, klavye etiketleri, dialog focus dönüşü, telefon/tablet/masaüstü düzeni.

Katalog düzenleme/silme backend'de bulunmadığından panelde yoktur. Dosya/görsel/import, kurum yönetimi, öğrenci soru çözme akışı ayrı [web uygulamasında](../web/README.md) sunulur; sınav akışları bu panelin kapsamına eklenmedi. Kaynak kaydı kullanım hakkı/resmîlik incelemesinin yerine geçmez. POST yanıtının kaybolması kalıcı idempotency ile çözülmedi; otomatik mutation retry yapılmaz.

## Kontroller

Depo kökünde:

```sh
npm run generate:api
npm run lint:api
npm run typecheck
npm run test:admin
npm run build:admin
npx playwright install chromium
npm run test:e2e
```

11 Vitest testi ve 8 Chromium E2E testi geçti. E2E ana akışları gerçek Laravel, PostgreSQL ve cookie/CSRF ile çalışır; 409 testi iki gerçek tarayıcı sekmesinden düzenleme yapar. Ağ kesintisi ve oturum hatası görünümü kontrollü yanıtlarla test edilir. Uygulama içi Browser kontrol aracı bu oturumda yoktu; proje Playwright kontrolleri ve ekran görüntüleri kullanıldı.

E2E yalnız `oggaq_test` veritabanını yeniden oluşturur ve sonunda temizler; mevcut test verileri korunmaz. PHP fixture guard'ı diğer veritabanlarını reddeder. Backend PHPUnit ve E2E'yi aynı anda çalıştırmayın. E2E, `8001` API, `5183` öğrenci ve `5184` panel portlarını kendi açıp kapatır; bu portlarda başka süreç varken mevcut sunucuyu yeniden kullanmaz. Normal `5174` panel sunucusu testlerce kullanılmaz. Test cache/session'ı izole PostgreSQL'dedir; geliştirme Redis cache'i temizlenmez.

E2E ekran görüntüleri ve raporları Git dışında `artifacts/` altında tutulur. Sentetik hesap/soru verileri resmî içerik değildir. Firefox/WebKit/native iOS/Android build/test ve üretim dağıtımı yapılmadı.


**Gezinme (öğrenci uygulamasıyla aynı yapı).** Menüde **Deneme sınavları**, **Ders sınavları** ve **Kataloglar** vardır; soru bankası/soru listesi yoktur. Soru, ait olduğu sınavın içinde görülür, yazılır ve düzenlenir.

- *Deneme sınavları* (`/deneme-sinavlari`, varsayılan açılış): her sınav numarası tek satırda, silahlı ve silahsız sürümler yan yana; hücrede yayın durumu, soru sayısı ve “N taslak soru / N güncellenmemiş” etiketleri. Yıl filtresi ve “yalnız ilgilenilecekler” seçeneği vardır.
- *Ders sınavları* (`/ders-sinavlari`): bir ders seçilir (çipler her dersin sınav sayısını gösterir), o dersin her sınav numarasındaki sınavı listelenir.
- *Yeni deneme/ders sınavı*: ilgili listeden açılır; sınav türü (ve ders sınavında ders) önceden seçilir. Eski adresler (`/official-exams`, `/questions`, `/subjects`) yeni sayfalara yönlenir.

**Sınav sayfası sınav bazlıdır** (`/official-exams/:id`): sınavın bütün soruları (125 soruya kadar) tam metin, seçenekler ve doğru cevapla alt alta kartlar olarak listelenir; üstteki numara şeridi (düğmelerle, anında kaydırma ve vurgu) sorulara atlar. Her kart yerinde düzenlenir: *Kaydet, yayımla ve sınavda güncelle* soruya yeni sürüm yazar, yayımlar ve sınavdaki sırasını bozmadan sınavı o sürüme geçirir (yayımlanmış sınavda da çalışır; “bu soruyu kullanan tüm sınavlarda güncelle” kutusu aynı soruyu içeren diğer sınavları da günceller); *Yalnız taslak kaydet* sürümü yayımlamaz; *Sürüm geçmişi* sorunun sürümlerini açar (`/questions/:id`; kaydedilmemiş değişiklik koruması ve 409 çakışma akışı burada). **Taslak sınavda** *Yeni soru yaz* yeni soruyu sınavın içinde yazar (ders, konu, kaynak, metin, seçenekler, açıklama): soru kaydedilip yayımlanır ve sınava eklenir; *Mevcut soruyu ekle* yayımlanmış bir soruyu başka sınavdan alır (aynı soru hem Deneme hem Ders sınavında yer alabilir). Sırala/çıkar yalnız taslak sınavdadır. Sözleşme [QUESTION_BANK](../../docs/QUESTION_BANK.md#çıkmış-sınavlar); E2E: `tests/e2e/admin.spec.ts`, `tests/e2e/official.spec.ts`.

**Görsel dil ([DESIGN](../../docs/DESIGN.md)).** Renkler öğrenci web ve mobil ile aynı `packages/design-tokens` paletindendir: `styles.css` `tokens.css`'i içe aktarır, her renk `var(--c-*)` rolüdür. Açık/koyu tema cihazı izler; yan menüdeki üçlü anahtar (**Cihaz ayarı / Açık / Koyu**) seçimi `localStorage` (`oggaq-theme`) içinde yalnız kullanıcı değiştirince saklar, `index.html` betiği temayı ilk boyamadan önce uygular. Yerleşim: 840 piksel ve üstünde sabit yan menü (210/238 px), altında marka, tema ve kullanıcı üst satırda, bölümler kaydırılabilir satırda olan üst çubuk; yan boşluk 14/24/32. Sınav düzenleyicisinin okuma sütunu 820 pikselle sınırlıdır, yayın paneli yanında durur ve 1000 pikselin altında altına iner. Menü adları `@oggaq/study-core` `vocabulary` sözlüğündendir.
