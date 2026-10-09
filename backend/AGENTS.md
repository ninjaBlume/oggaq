# Backend geliştirme kuralları

Depo kökündeki [AGENTS.md](../AGENTS.md) kuralları burada da geçerlidir. PHP 8.4, Laravel 13 ve PostgreSQL kullanılır; kurulum ve doğrulama komutları [DEVELOPMENT](../docs/DEVELOPMENT.md) belgesindedir.

- İş kurallarını `app/Modules/<Module>/Actions` içinde, erişim kurallarını Policy ve middleware içinde tut.
- HTTP katmanında FormRequest doğrulaması ve açık alan listeli Resource kullan. Korunan kimlik/rol/kurum alanlarını mass assignment'a açma.
- Kullanıcı kimliği `app/Models/User.php` içinde merkezidir; kurum üyeliği ve çalışma bağlamı Tenancy modülündedir.
- Kritik yazmalarda transaction, gerekli satır kilitleri ve güncel yetki denetimi uygula.
- API değiştiğinde `docs/openapi.json` sözleşmesini ve ilgili testleri güncelle.
- Testleri yalnız `oggaq_test` PostgreSQL veritabanında çalıştır. Geliştirme veya üretim veritabanını test için kullanma.
- Framework iskeletinin örnek paketlerini veya yardımcılarını otomatik ekleme; yeni bağımlılık somut bir ihtiyacı karşılamalıdır.
