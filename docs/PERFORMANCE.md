# Sınav yükleme ve cevap kaydı performansı

24 Ekim 2026, kaynak sürümü `877560e`. Sorun CPU/RAM doygunluğu değildi: sunucuda yaklaşık 0,47 load ve 32 GB belleğin yaklaşık 4,8 GB kullanımı görüldü. Dış bağlantı süreleri dalgalanıyordu; bir soğuk sağlık isteği 4,39 saniye sürerken origin örnekleri yaklaşık 120–160 ms idi. Bu tek dış istek sürekli uygulama gecikmesi olarak kabul edilmedi.

## Bulunan darboğazlar ve değişiklik

- İstemciler yalnız denemeyi veya bir dersi göstermek için yayımlanmış kataloğun tamamını üç sayfada indiriyordu. Yeni `scope`, seçenek ve ders filtreleri yalnız gereken listeyi getirir. Ders seçimi için `subjects?with_exam_counts=true` küçük sayım metaverisi döndürür; başka derslerin bütün sınavları indirilmez.
- Her cevap kaydı bütün sabit soru metinlerini, seçenekleri ve kaynakları tekrar döndürüyordu. `compact=true` kanonik özet ve bütün cevap seçimlerini döndürür. Aynı sınav/bağlam, tam kimlik eşleşmesi ve revision kontrolüyle değişmez soru nesneleri korunur. Başka cihazdaki cevap, idempotency, çakışma, süre dolması ve sunucu yetkisi korunur. Eski istemcinin tam yanıtı değişmez. [Sözleşme](EXAMS.md#cevap-kaydında-küçük-durum-yanıtı-24-ekim-2026).
- Mobil sekme değişimi katalog bileşenini yeniden kurup aynı listeyi yeniden indiriyordu. Merkezi metaveri için bağlam+filtre anahtarlı 60 saniye / 12 giriş bellek cache'i eklendi. Kişisel sonuç/cevap/oturum bu cache'e girmez. [Mobil ayrıntılar](MOBILE.md#24-ekim-2026-katalog-ve-cevap-trafiği).
- Sunucu app konteynerinde gerçek çalışma ortamıyla `config:cache` oluşturuldu. Ortam değerleri image build sırasında sabitlenmedi. Bir sonraki dağıtım aynı işlemi yeniden çalıştırmalıdır.

## Canlı ölçüm

Aynı authenticated HTTPS tarayıcı oturumunda eski ve yeni sorgu biçimleri karşılaştırıldı. Rakamlar UTF-8 JSON gövdesinin açılmış boyutudur; Cloudflare yanıtları ayrıca `zstd` ile sıkıştırıyordu. Yüzdeler ağda sıkıştırılmış bayt azalması olarak yorumlanmamalıdır.

| İşlem | Eski biçim | Yeni biçim |
| --- | --- | --- |
| Seçili silahlı deneme kataloğu | 273 yayımlanmış kayıt, 3 istek, 292.636 bayt | 18 ilgili kayıt, 1 istek, 17.483 bayt |
| Kataloğun bu ölçümde yüklenmesi | 1.413 ms | 304 ms |
| 125 soruluk aynı denemenin cevap durumu | 237.780 bayt | 16.338 bayt |
| Cevap durumu yanıt süresi, üç örneğin ortancası | 637 ms | 358 ms |
| Mobil aynı kataloğa 60 saniye içinde dönüş | Yeni katalog indirmesi | Katalog isteği yok; kişisel geçmiş yine güncellenir |

Katalog JSON'u %94,0, cevap durumu JSON'u %93,1 küçüldü. Cevap durumu karşılaştırması tamamlanmış, kullanıcı tarafından istenen örnek denemede aynı seçimin yeniden gönderilmesiyle yapıldı; sürüm/cevap değişmedi. Bu, canlı hesaba ek deneme üretmeden yanıt biçimini ölçer. Aktif cevap kaydının güvenliği ve küçük yanıtı otomatik API/arayüz testlerinde ayrıca doğrulanır. Her biçimden üç süre alındı; ağ dalgalanması vardı (tam yanıt 636/637/2.768 ms, küçük yanıt 348/798/358 ms). Bu küçük örneklem SLA veya her cihazda aynı hız taahhüdü değildir. Origin sağlık örnekleri config cache sonrasında 101/82/115 ms idi.

## Kullanıcının istediği görünen örnek

Önceki 63/13 kontrolü yalnız `oggaq_test` içindeydi. Kullanıcının yeni açık talebiyle geliştirme öğrenci hesabında mevcut 104. dönem tam sınavlarının iki ayrı denemesi uygulamanın Start/Access/Finalize/Score servisleri üzerinden tamamlandı. Merkezi soru veya sınav şablonu eklenmedi/değiştirilmedi.

Silahlı: genel 63 doğru / 37 yanlış, silah 13 doğru / 11 yanlış / 1 boş; toplam 76 doğru / 48 yanlış / 1 boş. 5 atışta 4 isabetle ÖGG puanı 64,5, doğru oranı %60,8. Silahsız: 63 doğru / 37 yanlış / 0 boş ve 63 puan. İkisi canlı Sonuçlarım listesinde ve kendi ayrıntı ekranlarında tarayıcıyla açıldı; atışın 4 olduğu görüldü. Kişisel kimlik/parola ve hesap kimlikleri belge/fixture'a yazılmadı.

## Doğrulama ve sınırlar

233 PostgreSQL backend testi / 2.598 assertion ve 124 workspace birim testi geçti. İlk 83 E2E çalıştırmasında 82 geçti; 200 soruluk mobil sanal listenin son satırı zaten çizildiğinde ilerleme bekleyen test yardımcısındaki yarış düzeltildi. İlgili 4 sonuç E2E'si ve yeni 2 performans E2E'si tekrar geçti; 85 farklı senaryo doğrulandı. Yeni senaryolar sunucu filtrelerini, gerçek küçük cevap yanıtını, sorular arasında devamı ve sekmeye dönüşte tekrar katalog isteği çıkmamasını denetler. Pint, OpenAPI lint/tip üretimi, strict TypeScript, public API ile iki web build ve üç platform export geçti.

Canlı HTTPS smoke, öğrenci/admin asset hashleri, hesap bazlı örnek sonuç ve içerik bütünlüğü kontrolleri geçti. Tarayıcı/Expo web export doğrulaması fiziksel Android/iPad veya native frame süresi ölçümü değildir; bu platformlar ayrıca denenmelidir. Dış internet/tünel gecikmesi sıfırlanmadı. Yeni dış bağımlılık eklenmedi; yalnız ortak çalışma paketinin iç tip bağımlılığı açıkça tanımlandı. Önceden belgelenmiş Expo araç zinciri Zod audit bulgusu bu iş kapsamında çözülmedi.
