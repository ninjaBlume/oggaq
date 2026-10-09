# Multi-tenant erişim modeli

Durum: Identity/Tenancy policy, middleware, scoped sorgu, transaction denetimi ve PostgreSQL testleri uygulanmıştır. Mevcut uçlar kurum oluşturma, üyelik oluşturma/iptal, üye listesi/detail ve kullanıcının kendi bağlamlarıdır. Rapor, export, cache'lenmiş tenant veri ve tenant queue işi henüz yoktur; aşağıdaki bu kapsamlara ilişkin kurallar gelecekteki gereksinimlerdir. Ortak PostgreSQL veritabanı ve ortak merkezi soru bankası kullanılır.

## Çalışma bağlamı

`users` şirketten bağımsız kimliktir. `memberships` kullanıcı–şirket ilişkisini, şirket içindeki `student`/`company_admin` rolünü ve aktifliği taşır. `platform_admin` rolü kullanıcı seviyesindedir. Aynı kullanıcı birden fazla şirkete üye olabilir.

Her öğrencinin kişisel `study_context` kaydı vardır; şirket çalışmaları ayrı bağlamlarda tutulur. Deneme, ilerleme, yanlışlar ve favoriler seçilen bağlama aittir. Kişisel geçmiş üyelik eklenince şirkete taşınmaz. A şirketi bağlamında oluşan geçmiş B'ye veya kişisel bağlama otomatik kopyalanmaz.

İstemci `context_id` seçer; sunucu kimlik doğrulanmış kullanıcının o bağlamın sahibi olduğunu ve şirket bağlamında aktif üyeliğini denetler. Context sahibi/tenant alanları istemcinin yazabileceği alanlar değildir. Şirket yönetimi `/tenants/{tenant_id}/...` üzerinde ayrı rol kontrolü ister.

## Erişim matrisi

| Kaynak / işlem | Öğrenci | Şirket yöneticisi | Platform yöneticisi |
| --- | --- | --- | --- |
| Yayınlanmış merkezi soru okuma | Evet | Evet | Evet |
| Merkezi soru değiştirme/yayınlama | Hayır | Hayır | Evet |
| Kendi kişisel deneme/favorisi | Evet | Yalnız kendi hesabı | Yönetim gereği, audit ile |
| Kendi aktif şirket bağlamı | Evet | Kendi hesabı ve ayrı yönetim yetkisi | Evet, audit ile |
| Şirket üye listesi/daveti | Hayır | Yalnız aktif admin olduğu şirket | Evet |
| Şirket öğrenci raporu | Hayır | O şirketteki bağlam + izin verilen alanlar | Evet, audit ile |
| Başka şirketin raporu | Hayır | Hayır | Yönetim yetkisi, audit ile |
| Öğrencinin kişisel/diğer şirket geçmişi | Hayır | Hayır | Sınırlı yönetim ihtiyacı, audit ile |

Şirket yöneticisinin öğrenci olması diğer öğrencilerin kişisel profillerine genel erişim hakkı oluşturmaz. Rapor endpoint'i sadece izin verilen özet alanları sunar; öğrenciye ait bütün user modelini serialize etmez. Hukuki dayanak ve bilgilendirme, şirket raporlarını üretime açmanın koşuludur.

## Zorunlu denetim zinciri

1. Sanctum kimliği ve hesap durumu doğrulanır.
2. İstenen bağlam veya tenant, kullanıcının aktif üyelikleri üzerinden çözümlenir.
3. Policy eylem ve rolü doğrular; endpoint kimliği değiştirilerek yetki kazanılamaz.
4. Sorgu yetkili bağlam/tenant üzerinden kurulur; ardından ilgili kayıt bulunur. Sadece önce global ID bulup frontend filtreleme yapılmaz.
5. Mutation transaction içinde gerekli üyelik/kayıt kilitlerini alıp yetkiyi yeniden kontrol eder; aynı denetim sync işlemi için geçerlidir.
6. Cache, export, dosya URL'si ve queue işi aynı kapsamı taşır. Queue yürütülürken mevcut izin yeniden denetlenir.

Request'e ait `TenantContext` singleton/static olarak worker'lar arasında saklanmaz. Tenant seçilmediyse sorgu bütün tenant'lara açılmaz. Global scope tek savunma değildir; explicit sorgu filtresi, policy ve veritabanı ilişkileri birlikte kullanılır. PostgreSQL RLS ilk aşamada uygulanmış sayılmaz; ek savunma olarak ileride değerlendirilir.

## Üyelik iptali ve uç durumlar

İptal edilen üyelikte şirket erişimi sonraki istekte ve senkronizasyonda reddedilir. Önceden şirket bağlamında indirilen/bekleyen kayıtlar sessizce kişisel bağlama aktarılmaz; `membership_revoked` durumuyla yerelde ayrılır. Çevrimdışı cihazda sunucudaki iptal anında öğrenilemez; offline kullanım yetkisi sınırları ve bunun ürün etkisi [güvenlik belgesinde](SECURITY.md) tanımlanır.

Bir şirket yöneticisi öğrencinin başka şirket üyeliklerini listeleyemez. Üye araması tenant içinden yapılır. Şirket logoları gibi görünür varlıklar ayrıca sınıflandırılır; öğrenci raporları özel depoda kısa süreli ve yetkili URL ile sunulur. Cache anahtarlarında kullanıcı, bağlam/tenant, rol ve şema sürümü bulunur; yetki değişiminde ilgili cache temizlenir.

Mevcut tenant testleri API liste/detail/mutation, aktiflik, çoklu üyelik, kişisel bağlam ve transaction içinde güncel rolü kapsar. Export/sync/tenant queue/cache yolları geliştirildiğinde test kapsamına eklenecek. En az iki şirket, iki yönetici, çoklu üyeli kullanıcı ve üyeliği kaldırılan kullanıcı fixture'ı kullanılacak. Beklenen senaryolar [TESTING](TESTING.md) içindedir.
