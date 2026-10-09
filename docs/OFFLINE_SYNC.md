# Çevrimdışı paket ve senkronizasyon protokolü

Durum: **kapsam onayı bekleyen tasarım önerisi**. Güncel `prompt.md` offline çalışmayı otomatik zorunlu kabul etmez. SQLite, IndexedDB, paket ve sync endpoint'leri yoktur; bu belgeye dayanarak geliştirme kapsamı kendiliğinden genişletilmez. Protokol `protocol_version: 1` ile başlar; sunucu desteklemediği sürümü açık hata ile reddeder.

## Paket yaşam döngüsü

Paket manifest'i `package_id`, `package_version`, `schema_version`, değişmez soru sürümleri, şablon sürümleri, dosya/parça boyutları ve SHA-256 değerlerini içerir. Manifest yetkili HTTPS bağlantısından alınır; kendi başına bir hash kimlik doğrulama yerine geçmez. Özel dosyalar yetki kontrolünden sonra indirilebilir.

İndirme geçici alana yapılır; parça boyutu/hash doğrulanır; bütünlük doğrulaması bitince yerel transaction ile paket aktiflenir. Kesilen indirme kalan parçaları tekrar alabilir. Eski aktif paket yeni paket doğrulanmadan kaldırılmaz. `from_version` tabanlı delta sadece değişen sürüm ve varlıkları taşır; gerekli taban bulunamazsa tam paket gerekir.

Paketler değişmezdir. Yeni soru sürümü yeni manifest'e girer. Eski sürüm, tamamlanmamış denemeler ve sunucuya kabul edilebilecek geçmiş denemeler için korunur. Yayından kaldırma olayları tombstone taşır; hukuki/güvenlik geri çekmeleri yeniden bağlantıda paket erişimini kaldırabilir, geçmiş sonuç snapshot'larını keyfî değiştirmez.

Çalışma paketi çevrimdışı değerlendirme için cevap anahtarı taşıyabilir. Deneme arayüzü bitişe kadar cevabı gizler fakat cihaz sahibinin yerel dosyadan anahtarı çıkarabilmesi teknik olarak engellenmiş sayılmaz. Offline sonuçlar hazırlık amaçlıdır; gözetimli/resmî sınav güvenliği iddiası yoktur. Sunucu istemci puanını kabul etmez.

## Yerel kalıcılık

Mobil SQLite ve web IndexedDB depoları `user_id` ile ayrılır; kayıt ve outbox işlemleri `context_id` taşır. Açılmış paketin, denemenin ve cevabın bağlamı sonradan değiştirilmez. Token SQLite/IndexedDB içinde saklanmaz; mobilde SecureStore, webde cookie kullanılır.

Yerel tablolar/storlar: paket manifestleri, soru sürümleri/seçenekler, denemeler/cevaplar, favoriler, `outbox`, sync cursor'ları ve çakışma kayıtları. Yerel migration ve şema sürümü bulunur. Cevap/favori değişikliği ve outbox eklemesi aynı yerel transaction'da gerçekleşir; UI ancak bu yazma sonucuna göre kaydedildi bilgisini verir.

Outbox alanları: `operation_id` UUID, `user_id`, `device_id`, `context_id`, `type`, `entity_id`, `base_version`, `payload`, `status`, `retry_count`, `next_retry_at`. Durumlar `pending → sending → acknowledged`; retry, conflict ve blocked ayrı görünür. Uygulama kapanınca `sending` kayıtları yeniden gönderilebilir hale döner. Kalıcı sunucu yanıtı gelmeden kayıt silinmez.

## İşlem zarfı

```json
{
  "protocol_version": 1,
  "device_id": "<uuid>",
  "operations": [
    {
      "operation_id": "<uuid>",
      "context_id": "<uuid>",
      "type": "favorite.set",
      "entity_id": "<question-uuid>",
      "base_version": 0,
      "payload": { "is_favorite": true }
    }
  ]
}
```

Zarftaki UUID yer tutucuları örnektir; çalışan endpoint veya gerçek veri değildir. `user_id` sunucuda authenticated hesaptan çıkarılır; istemcinin sahiplik/tenant/score alanları kabul edilmez. Mutation türleri allowlist'te ve payload'ları ayrı şemalarla doğrulanır.

## Sunucuda tekrar güvenliği

1. Kimlik, hesap, bağlam ve güncel üyelik yetkisi doğrulanır.
2. Her operasyon ayrı transaction'da işlenir. `(user_id,operation_id)` unique kayıt, payload+bağlam+tür hash'i, domain mutation ve response birlikte kalıcılaştırılır.
3. Aynı kimlik ve içerik yeniden gelirse ilk başarılı işlem sonucu döner. Aynı kimlik farklı içerikle gelirse `idempotency_mismatch` hatası oluşur.
4. Aynı operasyon paralel gelirse PostgreSQL unique kısıtı/kilit tekrar yazmayı önler; ilk transaction sonucundan sonra kayıt okunur. Transaction rollback olmuşsa idempotency kaydı başarı gibi tutulmaz.
5. Batch yanıtı her operasyonun `accepted`, `duplicate`, `conflict` veya `rejected` sonucunu taşır. Bir operasyonun hatası diğer başarılı operasyonları geri almaz.

Üyelik iptal edilmişse eski başarı yanıtı bile yetkisiz istemciye tekrar verilmez; güncel yetki kontrolü replay öncesinde yapılır. İstemci tamamlanma cevabını kaybetse de aynı işlem kimliğiyle güvenle tekrar eder.

Idempotency kayıtları rastgele kısa TTL ile silinmez. Kabul edilen offline dönem boyunca tutulur; deneme UUID ve favori sürüm kuralları ikinci savunmadır. İleride retention daraltılacaksa eski operasyonları reddeden açık protokol dönemi ve desteklenen replay penceresi birlikte tanımlanır.

## Çakışmalar ve deneme doğrulaması

| Veri | Kural |
| --- | --- |
| Deneme UUID | Tek bağlama/sahibe aittir; başka içerik/bağlamla tekrar kullanım reddedilir |
| Cevaplar | `base_version` compare-and-swap; tamamlanmış deneme değiştirilemez |
| Bitiş | Pinned soru/şablon sürümleriyle sunucu hesaplar; eksik/gereksiz/yanlış seçenek reddedilir; bir sonuç oluşur |
| Favoriler | Toggle yerine istenen durum gönderilir; sürüm çatışmasında güncel değer gösterilir, kullanıcı seçimiyle yeni operasyon oluşturulur |
| İlerleme | Sunucu kabul ettiği cevaplardan türetir; istemci sayaçları otorite değildir |
| Silme | Versioned tombstone, eski istemcinin kaydı yeniden yaratmasını engeller |

Online deneme başladıktan sonra offline'a geçiş desteklenir. Online başladıysa sunucu deadline'ı korunur; tamamen offline başladığında süre cihazda ölçülür ve `verification_status` bunu belirtir. Kullanıcının cihaz saatiyle oynadığını kesin biçimde kanıtlama iddiası yoktur. Şablon/soru paketi sunucuda yayınlanmış ve offline kullanımına izin verilmiş bir sürüm olmalıdır; soru listesi ve mod sunucuda doğrulanır. Bekleyen sürümler zamanından önce imha edilmez.

Offline denemenin create/answer/finish işlemleri sıralı gönderilir. Önceki işlem başarısızsa ona bağlı finish işlemi bekletilir. Finish payload'ı tüm cevapların ve pinned soru listesinin doğrulanabilir son durumunu taşır; aynı UUID için farklı final içerik sessizce overwrite edilmez. Sunucu sürümlü evaluator ile doğru/yanlış/boş ve puanı yeniden üretir; istemci sonucu yalnız provisional'dır.

## İndirme cursor'u ve yeniden deneme

`GET /api/v1/sync/changes?context_id=...&cursor=...` sadece o kullanıcının yetkili bağlamındaki olayları döndürür. Cursor kullanıcı ve bağlama bağlı opaque değerdir; sıra, commit sırasını koruyan değişiklik günlüğünden gelir. Sayfa yerel transaction'da uygulanınca cursor ilerletilir. Tombstone'lar uygulanır; tekrar sayfa idempotent'tir.

Cursor desteklenen retention'ın dışına çıktıysa `resync_required` döner. Tam yenilemede bekleyen outbox silinmez; server snapshot ile yerel değişiklikler ayrıştırılır. Soru içeriği, kullanıcı mutasyonlarıyla aynı cursor'a zorla birleştirilmez; paket manifest güncellemeleri ayrı izlenir.

Ağ/5xx/429 için exponential backoff + jitter ve `Retry-After`; 401 için kullanıcıdan yeniden giriş; 403/üyelik iptali için blocked; doğrulama için kalıcı rejected; sürüm uyuşmazlığı için conflict kullanılır. Web Background Sync mevcut olmasa da ön planda açılış, bağlantı değişimi ve kullanıcı tekrar denemesi çalışır. Background Sync tek teslim garantisi değildir.

Hesap değişiminde eski hesabın outbox'ı yeni hesaptan gönderilmez. Çıkışta kullanıcıya bekleyen kayıt sayısı ve yerel silmenin etkisi gösterilir. Hesap silme sunucuda yeni yazmaları engeller, oturumları iptal eder; bağlantı kuran cihaz yerel depoyu/cache'i temizler. Offline kalan cihaza uzaktan anlık silme garantisi verilemez.
