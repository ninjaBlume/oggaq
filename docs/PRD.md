# Ürün gereksinimleri

Durum: Identity/Tenancy ve merkezi QuestionBank backend uygulanmıştır. Soru bankası teknik API kapsamı [QUESTION_BANK](QUESTION_BANK.md) içindedir; arayüz, soru çözme/değerlendirme ve diğer ürün akışları tasarım aşamasındadır. Güncel kaynak [proje yönergesi](../prompt.md); ilk analizden sonra bu dosya yenilenmiştir. Teknik ad `security-exam-platform`, depo adı OGGAQ olarak korunur.

## Hedef ve kullanıcılar

Türkiye'deki özel güvenlik görevlisi adayları Türkçe bir uygulamayla ders çalışır, geçmiş sınavları çözer ve gelişimini izler. Ürün son kullanıcıya ücretsizdir. iOS/Android telefonlar, tabletler ve masaüstü/mobil web desteklenir. Bağımsız sınav hazırlık platformudur; kamu kurumu tarafından onaylanmış izlenimi verilmez.

| Kullanıcı | Yetki ve amaç |
| --- | --- |
| Bireysel öğrenci | Şirket üyeliği olmadan kendi çalışma ve sınav verilerini yönetir |
| Şirket öğrencisi | Bir veya birden çok şirketin üyesidir; seçtiği bağlamda çalışır |
| Şirket yöneticisi | Yalnızca yetkili şirketinin üyelerini ve izin verilen raporlarını yönetir |
| Platform yöneticisi | Merkezi içerik, şirketler, kullanıcılar ve içe aktarmayı yönetir |

## İlk ürün kapsamı

- E-posta/parola kaydı, giriş/çıkış, e-posta doğrulama, parola sıfırlama, profil, veri erişimi ve hesap silme.
- Merkezi dersler, konular ve tek doğru cevaplı çoktan seçmeli sorular; değişken seçenek sayısı, açıklama, görsel, kaynak ve yayın durumu.
- Ders/konu çalışması, çıkmış sınav ve şablona dayanan deneme sınavı.
- Sonuçta toplam/doğru/yanlış/boş sayıları, başarı oranı, puan, süre ve ders dağılımı.
- Yanlış cevaplar, favoriler, çalışma geçmişi ve başarı istatistikleri.
- Çevrimdışı çalışma ayrıca kapsamlandırılacak öneridir; güncel MVP'nin zorunlu kabul kapısı değildir. Onaylanırsa SQLite/IndexedDB, sürümlü paket ve güvenilir senkronizasyon tasarımı kullanılabilir.
- Ayrı yönetim paneli; şirket üyeliği/davetleri, yetki denetimli raporlar ve içerik yayınlama.
- SQL/PDF içe aktarma için inceleme, eşleme, doğrulama, önizleme, onay ve hata raporu.
- Reklamveren/kampanya/alan/istatistik temel modelinin tasarımı. Reklam SDK'sı ve gösterimi ilk teslimin ön koşulu değildir.

Kurum sınavları ve kurumlara özel içerik gelecekte ayrı erişim kapsamıyla desteklenecektir; kurum soruları merkezi havuza otomatik katılmaz. İlk backend tesliminde soru/sınav modeli uygulanmadı. Boş bırakılan soruların tekrar çalışılması güncel ürün hedefleri arasındadır. Günlük hedef, tema ve soru bildirme gibi önceki plandaki ekler kesin MVP gereksinimi sayılmaz. Ödeme/abonelik veya yeni sosyal özellik eklenmez.

## Ana kullanıcı akışı

1. Kullanıcı kayıt olur, e-posta doğrulamasını tamamlar ve giriş yapar.
2. Varsayılan kişisel bağlamı veya aktif üyeliği olan şirket bağlamını seçer. Çalışma sırasında bağlam değişimi mevcut denemeyi taşımaz.
3. Ana ekrandaki altı bölümden birini açar: Derslere Göre Sorular, Çıkmış Sınav Soruları, Deneme Sınavları, Yanlış Cevapladıklarım, Favori Sorularım, Başarı Durumum.
4. Ders çalışmasında cevap sonrası açıklama görülebilir. Deneme ekranı cevap anahtarını bitişten önce göstermez.
5. Tamamlanmış deneme sürümlü kuralla değerlendirilir; sonuç ve geçmiş kaydedilir.
6. Çevrimdışı kapsamı onaylanırsa önceden giriş ve paket indirme gerekir; yerel sonuç sunucu doğrulamasına kadar geçicidir.

## Kabul koşulları

| Alan | Kabul ölçütü |
| --- | --- |
| Gerçek özellik | Arayüz + gerçek API + kalıcı veri + doğrulama/yetki + ilgili testler + güncel belge |
| Tenant | A yöneticisi B verisini ve öğrencinin kişisel geçmişini hiçbir erişim yoluyla göremez |
| Sürümleme | Soru veya kural değişikliği geçmiş sonuçların sayılarını/puanını değiştirmez |
| Senkronizasyon | Tekrar, eşzamanlı gönderim ve yanıt kaybı aynı sonucu ikinci kez üretmez |
| Çevrimdışı | Paket ve kayıtlar uygulama kapatılıp açıldığında korunur; hesaplar karışmaz |
| İçerik | Kaynak ve kullanım hakları incelenmemiş soru resmî/yayınlanmış içerik olamaz |
| Deneyim | Yükleniyor, boş, hata ve tekrar deneme durumları; erişilebilir telefon/tablet/masaüstü düzeni |
| Hesap silme | Oturumlar iptal edilir, senkronizasyonla silinen veri geri oluşmaz, yerel veri temizlenir |

Gerçek soru dosyaları, doğrulanmış sınav kuralları, kalıcı marka, barındırma/veri konumu ve hukuki metinler henüz yoktur. Bunlar ilgili yayın kapılarını etkiler; mimari ve altyapı çalışmasına engel değildir.
