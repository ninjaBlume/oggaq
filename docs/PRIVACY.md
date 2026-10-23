# Kişisel veri, saklama ve imha

Durum: bu belge **teknik envanteri ve uygulanan davranışı** anlatır; hukuki metin değildir. Aydınlatma metni, kullanım koşulları, veri sorumlusu/işleyen rolleri ve yurt dışı aktarım kararları hukukçu gerektirir ve henüz yoktur (bkz. [Açık kalanlar](#açık-kalanlar)). Hesap ekranının teknik sözleşmesi [openapi.json](openapi.json), güvenlik kontrolleri [SECURITY](SECURITY.md) içindedir.

## Hangi kişisel veri nerede

| Veri | Tablo / yer | Saklama |
| --- | --- | --- |
| Ad, e-posta, parola özeti (Argon2id), rol, durum, bekleyen e-posta | `users` | Hesap silinene kadar |
| Çalışma alanı, kurum üyelikleri | `study_contexts`, `memberships` | Hesap silinene kadar (üyelik iptali kaydı silmez) |
| Sınav denemeleri, cevaplar, sonuçlar, eski alıştırmalar, favoriler | `exam_attempts`, `exam_answers`, `practice_attempts`, `favorite_questions` | Hesap silinene kadar; sonuçlar kullanıcı dışında değiştirilemez |
| Soru bildirimleri (neden, en çok 500 karakterlik not) | `question_reports` | Soru kalitesi için tutulur; hesap silinince bildirenle bağı ve notu silinir |
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
- **Verilerimi indir:** `POST /api/v1/me/export`, günde en fazla 3 başarılı indirme. Dosya yalnızca kullanıcının kendi verisini içerir: profil, üyelikler (kurum adı ve rol), çalışma alanları, sınav denemeleri (sınav adı, süre, sonuç, her sorunun metni, seçenekleri, kullanıcının seçimi; doğru şık yalnızca bitmiş denemede), eski alıştırmalar, favoriler, soru bildirimleri ve oturum özeti. Başkalarının verisi, kurumlara ait diğer üyelerin kayıtları, parola ve tokenlar dosyaya girmez. Çıktı parça parça üretilir; uzun geçmiş belleği şişirmez.
- **Hesabı sil:** `DELETE /api/v1/me`, parola ve “HESABIMI SİL” yazısı gerekir.

## Silme semantiği

Tek veritabanı işleminde: kullanıcının bütün çalışma alanları (kişisel ve kurum üyeliğine bağlı) ve bunlara bağlı denemeler, cevaplar, alıştırmalar, favoriler; üyelikler; oturumlar ve tokenlar; parola sıfırlama jetonları; kullanıcı satırı silinir. Önce eski adrese “hesabın silindi” e-postası kuyruğa alınır (şifreli yük, işlem tamamlanınca gönderilir).

Kalanlar ve nedeni:

- **Soru bildirimleri:** bildirimin nedeni, sorusu ve sürümü kalır (içerik kalitesi için); bildirenle bağı ve yazılan not silinir. *Bu karar hukuki değerlendirmeyle teyit edilmelidir.*
- **Denetim kayıtları:** kayıtlar kalır, aktör alanı boşaltılır, hesabı hedef alan kayıtların hedef kimliği rastgele bir kimlikle değiştirilir; “hesap silindi” sayaç kaydı kişiye bağlı değildir.
- **Yedekler:** silinen hesabın verisi, yedek dönemi dolana kadar yedeklerde bulunabilir.

Engeller (409): platform yöneticisi hesabı kendi kendine silinemez (`admin_account`; başka bir yönetici yetkiyi önce kaldırmalı); bir kurumun tek aktif yöneticisi silemez (`last_company_admin`). Yönetici panelinde hesap silme ekranı yoktur.

Sınav sonuçları PostgreSQL tetikleyicileriyle değiştirilemez. Silme işlemi bu korumayı yalnızca kendi veritabanı işlemi süresince `oggaq.account_erasure` ayarıyla kaldırır ve her koşulda geri kapatır; başka hiçbir kod yolu bitmiş cevapları silemez. Yeni bir tablo kişiye bağlandığında silme işlemine eklenmeden test geçmez (`AccountLifecycleTest`).

## Açık kalanlar

- **Hukuki metinler:** aydınlatma metni, kullanım koşulları, veri sorumlusu (henüz belirlenmedi) ve işleyen rolleri, VERBİS uygulanabilirliği, saklama sürelerinin hukuki dayanağı ve yurt dışı aktarım koşulları kararlaştırılmadı; hukukçu gerekir. Bu belge o kararların yerine geçmez.
- **Yedekten dönüşte imha:** silinen hesap yedekten geri yüklenirse yeniden ortaya çıkar. Bunu önlemek için kişiye bağlanabilen ama kişi bilgisi taşımayan bir imha kaydı (silinen kullanıcı kimliği + tarih) ve geri yükleme sonrası yeniden uygulama adımı gerekir. Henüz uygulanmadı; barındırma ve yedek planıyla birlikte tasarlanacak (yedek dönemi ve tatbikat dahil).
- **Gerçek e-posta sağlayıcısı:** hesap e-postaları yerelde Mailpit'e gider; üretim SMTP sağlayıcısı ve verinin konumu seçilmedi.
- **Günlük saklama:** uygulama ve erişim günlüklerinin süresi, konumu ve maskeleme denetimi barındırma planında belirlenecek.
- **Soru bildirim notları** kişisel veri içerebilir; yalnızca platform yöneticisi görür.
