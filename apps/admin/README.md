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

Çıkmış sınavlar (`/official-exams`): yayımlanmış soru sürümlerinden sıralı sınav taslağı oluşturma, soru ekleme/çıkarma/sıralama, ayrı yayım onayı ve yayımlanmış şablonun salt okunur görünümü. Sözleşme [QUESTION_BANK](../../docs/QUESTION_BANK.md#çıkmış-sınavlar); E2E: `tests/e2e/official.spec.ts`.

**Gezinme.** Menüde iki eksen vardır: **Sınavlar** (varsayılan açılış) ve **Dersler**; düz bir soru listesi yoktur. Sınavlar ekranı her sınav numarasını tek satırda, silahlı ve silahsız sürümleri yan yana gösterir; hücrelerde yayın durumu, soru sayısı ve “N taslak soru / N güncellenmemiş” etiketleri bulunur, tür/yıl filtresi ve “yalnız ilgilenilecekler” seçeneği vardır. Dersler ekranı ders başına toplam/yayımlanmış/taslak/bekleyen soru sayısını verir; bir ders açılınca konu çipleri (Tümü, her konu, Konusuz) ve durum filtresiyle sorular tam metin kartlar halinde yüklenir (20’şer, “Daha fazla soru yükle”). Bir ders iki biçimde gezilir: **Konuya göre** ve **Sınava göre**. Sınava göre görünümde her sınav türü (Temel, Yenileme) kendi başlığı altındadır; altında sınav numaraları (silahlı/silahsız soru sayılarıyla, taslak sayısıyla) katlanır bölümler olarak durur ve açınca dersin o sınavdaki soruları yüklenir; en altta hiçbir sınavda olmayan sorular bulunur. Sınavlar ekranında her sınav türü bir sekmedir; henüz sınavı olmayan tür (şu an Yenileme) boş durumla gösterilir. Kart yerinde düzenlenir; *Kaydet ve yayımla* yeni sürümü yayımlar ve (işaretliyse) soruyu kullanan tüm sınavlarda günceller. Yeni soru ve sürüm geçmişi `/questions/new` ve `/questions/:id` sayfalarındadır; `/questions` Derslere yönlenir.

Sınav sayfası **sınav bazlıdır**: sınavın bütün soruları (125 soruya kadar) tam metin, seçenekler ve doğru cevapla alt alta kartlar olarak listelenir; üstteki numara şeridi sorulara atlar. Her kart yerinde düzenlenir: *Kaydet, yayımla ve sınavda güncelle* soruya yeni sürüm yazar, yayımlar ve sınavdaki sırasını bozmadan sınavı o sürüme geçirir (yayımlanmış sınavda da çalışır); *Yalnız taslak kaydet* sürümü yayımlamaz. Sırala/çıkar/ekle yalnız taslak sınavdadır. Bu işlem `PUT /admin/official-exams/{officialExam}/questions/{question}` ile yapılır.
