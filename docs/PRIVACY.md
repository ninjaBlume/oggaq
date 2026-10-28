# Kişisel veri, saklama ve imha

Durum: bu belge **teknik envanteri ve uygulanan davranışı** anlatır; hukuki metin değildir. Aydınlatma metni, kullanım koşulları, veri sorumlusu/işleyen rolleri ve yurt dışı aktarım kararları hukukçu gerektirir ve henüz yoktur (bkz. [Açık kalanlar](#açık-kalanlar)). Hesap ekranının teknik sözleşmesi [openapi.json](openapi.json), güvenlik kontrolleri [SECURITY](SECURITY.md) içindedir.

## Hangi kişisel veri nerede

| Veri | Tablo / yer | Saklama |
| --- | --- | --- |
| Ad, e-posta, parola özeti (Argon2id), rol, durum, bekleyen e-posta | `users` | Hesap silinene kadar |
| Çalışma alanı, kurum üyelikleri | `study_contexts`, `memberships` | Hesap silinene kadar (üyelik iptali kaydı silmez) |
| Sınav denemeleri, cevaplar, sonuçlar, eski alıştırmalar, favoriler | `exam_attempts`, `exam_answers`, `practice_attempts`, `favorite_questions` | Hesap silinene kadar; sonuçlar kullanıcı dışında değiştirilemez |
| Soru bildirimleri (neden, en çok 500 karakterlik not) | `question_reports` | Soru kalitesi için tutulur; hesap silinince bildirenle bağı ve notu silinir |
| İş başvuruları (ad, e-posta, telefon, isteğe bağlı ön yazı; şifreli), ilan kopyası ve değerlendirme durumu | `job_applications` | Hesap silinene kadar; ilan kapatılması silmez; otomatik süreli imha yok |
| Tarayıcı oturumları (kullanıcı, IP, tarayıcı bilgisi, son etkinlik) | `sessions` (veritabanı sürücüsü) | Boşta 120 dk (`SESSION_LIFETIME`); çıkışta, parola değişiminde ve hesap silinince silinir |
| Mobil tokenlar (özet, cihaz türü etiketi, son kullanım) | `personal_access_tokens` | En çok 7 gün; günlük `sanctum:prune-expired`; çıkış, parola değişimi ve silmede silinir |
| Parola sıfırlama jetonu (e-posta, jeton özeti) | `password_reset_tokens` | 60 dk geçerli; günlük `auth:clear-resets`; sıfırlama ve silmede silinir |
| Denetim kayıtları (aktör, kurum, işlem adı; içerik yok) | `audit_events` | Süresiz; hesap silinince aktör ve hesaba bağlı hedef kimlik koparılır |
| Kuyruktaki e-posta işleri (alıcı adresi, **şifreli** yük) | `jobs`, `failed_jobs` | İş bitince silinir; başarısız işler günlük `queue:prune-failed --hours=168` ile 7 gün sonra |
| Hız sınırı sayaçları (e-posta+IP özeti) | önbellek | Dakikalar–gün |

Parola, token ve oturum kimliği hiçbir yanıta, dışa aktarma dosyasına veya denetim kaydına yazılmaz. Hata ve uygulama günlüklerinin saklama süresi ve yeri barındırma planıyla belirlenecektir.

## Hesap ekranı (Hesabım)

Web `/account`, mobil Profil → Hesabım. Her değişiklik **mevcut parolayı** yeniden ister; yanlış parola 422 döner ve parola tahmini dakikada 10 denemeyle sınırlıdır.

- **Cihazlar ve oturumlar:** mobil tokenlar ve tarayıcı oturumları listelenir (etiketler; gerçek oturum kimliği ve token gösterilmez). Tek tek kapatılır ya da kullanılan dışındaki hepsi kapatılır.
- **Parola değiştirme:** diğer bütün cihazların oturumunu kapatır; kullanılan oturum açık kalır; “parolan değişti” e-postası gider.
- **E-posta değiştirme:** yeni adrese imzalı, 60 dakikalık bağlantı gider; bağlantı hesapla giriş yapmış tarayıcıda açılana kadar adres değişmez. Eski adrese talepte ve tamamlanınca bildirim gider. Adresin başka hesapta olup olmadığı yanıttan anlaşılmaz.
- **Verilerimi indir:** `POST /api/v1/me/export`, günde en fazla 3 başarılı indirme. Dosya yalnızca kullanıcının kendi verisini içerir: profil, üyelikler (kurum adı ve rol), çalışma alanları, sınav denemeleri (sınav adı, süre, sonuç, her sorunun metni, seçenekleri, kullanıcının seçimi; doğru şık yalnızca bitmiş denemede), eski alıştırmalar, favoriler, soru bildirimleri, kişisel iş başvuruları (iletişim bilgileri, ön yazı, ilan kopyası ve durum) ve oturum özeti. Başkalarının verisi, kurumlara ait diğer üyelerin kayıtları, parola ve tokenlar dosyaya girmez. Çıktı parça parça üretilir; uzun geçmiş belleği şişirmez.
- **Hesabı sil:** `DELETE /api/v1/me`, parola ve “HESABIMI SİL” yazısı gerekir.

## Silme semantiği

Tek veritabanı işleminde: kullanıcının bütün çalışma alanları (kişisel ve kurum üyeliğine bağlı) ve bunlara bağlı denemeler, cevaplar, alıştırmalar, favoriler; üyelikler; kişisel iş başvuruları; oturumlar ve tokenlar; parola sıfırlama jetonları; kullanıcı satırı silinir. Önce eski adrese “hesabın silindi” e-postası kuyruğa alınır (şifreli yük, işlem tamamlanınca gönderilir).

Kalanlar ve nedeni:

- **Soru bildirimleri:** bildirimin nedeni, sorusu ve sürümü kalır (içerik kalitesi için); bildirenle bağı ve yazılan not silinir. *Bu karar hukuki değerlendirmeyle teyit edilmelidir.*
- **Denetim kayıtları:** kayıtlar kalır, aktör alanı boşaltılır, hesabı hedef alan kayıtların hedef kimliği rastgele bir kimlikle değiştirilir; “hesap silindi” sayaç kaydı kişiye bağlı değildir.
- **Yedekler:** silinen hesabın verisi, yedek dönemi dolana kadar yedek dosyalarında bulunabilir. Böyle bir yedek geri yüklenirse hesabın yeniden ortaya çıkmaması için silme listesi uygulanır (aşağıda).

Engeller (409): platform yöneticisi hesabı kendi kendine silinemez (`admin_account`; başka bir yönetici yetkiyi önce kaldırmalı); bir kurumun tek aktif yöneticisi silemez (`last_company_admin`). Yönetici panelinde hesap silme ekranı yoktur.

Sınav sonuçları PostgreSQL tetikleyicileriyle değiştirilemez. Silme işlemi bu korumayı yalnızca kendi veritabanı işlemi süresince `oggaq.account_erasure` ayarıyla kaldırır ve her koşulda geri kapatır; başka hiçbir kod yolu bitmiş cevapları silemez. Yeni bir tablo kişiye bağlandığında silme işlemine eklenmeden test geçmez (`AccountLifecycleTest`).

## Silme listesi ve yedekten dönüş

Silme işlemi aynı veritabanı işleminde `account_erasures` tablosuna yalnızca kullanıcı kimliğinin **anahtarlı özetini** (HMAC-SHA256, anahtar `ERASURE_LEDGER_KEY`) ve tarihi yazar. Kimlik, e-posta veya başka bir bilgi yazılmaz; özetten kişi geri okunamaz. Tablo yalnızca ekleme kabul eder (güncelleme ve silme veritabanı tarafından reddedilir). Aynı e-posta ile yeniden kayıt olan kişi yeni bir kimlik alır ve bu listeden etkilenmez.

Eski bir yedek geri yüklenirse silinmiş hesaplar yeniden ortaya çıkar. `php artisan accounts:reapply-erasures` listedeki özetlerle eşleşen kullanıcıları mevcut silme yoluyla (tüm bağlı veriyle) siler; varsayılan olarak yalnızca sayar, `--force` ile siler, platform yöneticisi hesaplarını otomatik silmez. Yedekten **daha yeni** silmeler için liste yedekten ayrı saklanır (`accounts:export-erasures`, saatlik) ve `--from` ile verilir. Prosedür ve sınırlar [DEPLOYMENT](DEPLOYMENT.md) §17.4 içindedir. `ERASURE_LEDGER_KEY` veritabanı yedeğiyle aynı yerde saklanmamalı, kaybolursa eski kayıtlar eşleşmez. Bu mekanizma yerelde geri yüklenmiş bir veritabanı kopyasında denendi; gerçek bir geri yükleme felaketi yaşanmadı.

## Kapalı beta güncelleme hizmeti — 27 Ekim 2026

`expo-updates@58.0.18` ile güncelleme kontrolü/indirmesi Expo/EAS (`u.expo.dev` ve varlık CDN'i) üzerinden yapılır. SDK kaynak kontrolünde isteklerin iOS platformu, runtime/kanal, kurulum için rastgele `EAS-Client-ID` ve varsa son ölümcül hata metninin sınırlanmış bölümünü taşıdığı görüldü (`FileDownloader.swift`); hizmet ağ isteğinde IP adresini de görebilir. Uygulama bu isteklere hesap adı, e-posta, oturum tokenı veya soru yanıtını bilerek eklemez. 28 Ekim’de bu olgusal akış canlı gizlilik metnine ve `legal-values.json` içine eklendi. Expo sağlayıcı politikalarına bağlantı verildi; bağımsız hukuki aktarım değerlendirmesi ve mağaza formlarının son onayı tamamlanmış sayılmaz.

## Açık kalanlar

29 Ekim mağaza beyanı notu: Apple'da isteğe bağlı belge adresi dahil **11 veri türü** beyan edildi. Google'ın “Analytics” amacı teknik tanılama/çökme hatalarının giderilmesini de kapsar; bu, reklam veya kullanıcı davranışı analizi SDK'sı eklendiği anlamına gelmez. Kamu metnindeki analitik yok ifadesi, teknik tanılama işlenmediği izlenimi vermemesi için reklam/uygulamalar arası takip ve kullanıcı davranışı analizi ayrımıyla netleştirildi. Veri toplama davranışı değişmedi. Google formunun son kaydı ayrıca doğrulanır.

- **Hukuki metinler:** dört metin gerçek marka/sağlayıcı bilgilerini içerir. İç inceleme `docs/legal-values.json` içinde hâlâ taslaktır; yürürlük tarihi, VERBİS ve uygulanacak hukuk kararları eksiktir. Kamu sayfalarında iç taslak bandı/boş karar etiketleri gösterilmez. Veri sorumlusu için Codentum L.L.C. kayıtlıdır; yayıncı hesabı ve hukuki onay ayrıca doğrulanır. [STORE_RELEASE](STORE_RELEASE.md).
- **Yedek dönemi:** 28 Ekim’de sunucuda 7 günlük/4 haftalık/6 aylık, Mac’te 14/8/12 şifreli saklama kuruldu. Silme defteri ayrıca saatlik dışa aktarılır. Canlı yedek, Mac aktarımı ve geçici DB’de geri yükleme geçti; çevrimdışı anahtar kopyası kullanıcı sorumluluğundadır. Bu fiilî saklama en çok 12 ay olarak kamu metnindedir; hukuki dayanağı ayrıca incelenir. [backup/README](../deploy/server-development/backup/README.md).
- **Gerçek e-posta sağlayıcısı:** canlı hesap/güvenlik postaları Resend üzerinden `destek@oggsor.com` ile gönderilir; gönderim bölgesi İrlanda, sağlayıcı kayıtları ABD’dedir. Destek adresi Cloudflare Email Routing üzerinden Gmail’e gider. Outlook spam yerleşimi açık izleme konusudur; yerel geliştirme Mailpit kullanır.
- **Günlük saklama:** uygulama ve erişim günlüklerinin süresi, konumu ve maskeleme denetimi barındırma planında belirlenecek.
- **Soru bildirim notları** kişisel veri içerebilir; yalnızca platform yöneticisi görür.

İş başvurusunda iletişim bilgileri ve ön yazı yalnız başvuru sahibiyle platform yöneticilerine açılır; kurum yöneticilerine verilmez. Formda bu erişim açıklanır. Ayrı işveren paylaşımı veya otomatik dış aktarım yoktur. Saklama süresinin hukuki kararı ve buna bağlı otomatik imha ayrıca belirlenmelidir; teknik davranış [JOBS](JOBS.md) içindedir.
