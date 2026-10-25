# Sınav yükleme ve cevap kaydı performansı

## 25 Ekim 2026: mobil açılış ve hazır sekmelere dönüş

Açılışta tema tercihi okunana kadar bütün uygulama boş bekliyordu. Artık sistem temasıyla ekran ve oturum işlemleri hemen başlar; kaydedilmiş tercih geldiğinde mevcut ekran yerinde güncellenir. Oturum okuması ile QA depolama kontrolü paraleldir. Geçerli token bulunduğunda `/me` ve `/me/contexts` aynı anda başlatılır; çalışma alanı aynı hazırlık yanıtını kullanır ve ikinci bağlam isteği oluşturmaz. Kimlik doğrulanmadan içerik açılmaz. Bağlam hatası ayrı saklanır ve çalışma alanında yeniden denenir; çıkış/hesap değişiminde hazırlık eski tokenla yeni kullanıcıya uygulanmaz.

Ana sayfa, Deneme, Ders, Sonuçlar ve Profil ilk ziyaretlerinde oluşturulur; aynı kullanıcı ve bağlamda en fazla bu beş ekran hazır tutulur. Filtre, açık süre formu ve kaydırma konumu korunur. Diğer sayfalar ihtiyaç anında oluşturulur; başlangıçta bütün ekranlar veya kataloglar önceden indirilmez. Ana sayfadaki ayrı ders keşif bölümü kaldırıldığı için açılışta ve dönüşte ders kısayolu isteği yapılmaz; ana sayfa yalnız özet ve son sınavları ister. Katalog ve geçmiş arka planda yenilenirken mevcut liste iskelete çevrilmez. Dönen sekme güncellenir; görünmeyen sekmeler odak/uygulamaya dönüş olayıyla yenileme başlatmaz. Hesap veya bağlam değişimi önceki ekran ağacını kaldırır; kişisel veriler diske yazılmaz. Backend yetkileri ve normal sınav Devam açılışındaki güncel konum isteği korunur.

Bu değişiklik ağın ilk yanıt süresini sıfırlamaz. Kazanç; açılıştaki bağımsız işleri sırayla beklememek, sekmeleri yeniden kurmamak ve hazır içeriği yenileme bitene kadar saklamamaktan gelir. Fiziksel cihaz soğuk açılışı/native kare süresi bu oturumda ölçülmedi; tarayıcı ve birim doğrulamaları [TESTING](TESTING.md) içinde.

## 25 Ekim 2026: soru açılışı, gezinme ve geçiş beklemesi

- Zorunlu 400 ms mobil sayfa geçişi kaldırıldı. Kullanıcının sonraki talebiyle yükleme sırasındaki logo katmanı da tamamen kaldırıldı; ekranların kendi iskelet/yükleme durumları kullanılır. Geçiş için zamanlayıcı veya örtü kalmadı.
- Yeni sınavın POST yanıtı zaten bütün sabit soru sürümlerini içeriyordu. Mobil yalnız kimliği sonraki ekrana iletiyor, web ise doldurulmuş cache'e rağmen her açılışta tam GET şartı uyguluyordu. Yeni başlatma yanıtı ilk açılışta bir kez kullanılır. Webde tek kullanımlık kayıt QueryClient ve bağlamla sınırlıdır; çıkışta cache temizlendiyse kullanılamaz. Normal Devam/geçmiş açılışı sunucudaki güncel konumu ve cevapları almaya devam eder.
- Cevap kaydı sürerken bütün Önceki/Sonraki/soru haritası kontrolleri kilitleniyordu. Artık eldeki sorular arasında gezinmek ağ yanıtını beklemez. Yazma doğrulanana kadar diğer cevap yazmaları ve bitirme korunur; kayıp yanıt, çakışma ve tekrar davranışları değiştirilmedi. Sonuçları istemci hesaplamaz ve kayıt başarısızlığı gizlenmez.
- Ortak sayaç `HH:MM:SS` gösterir: 120 dk `02:00:00`, 150 dk `02:30:00`; bir saatin altına inince de alan sayısı değişmez. Süreye, deadline'a ve sunucu değerlendirmesine müdahale edilmez.

Bu turda genel HTTPS `/up` isteği 200 ile yaklaşık 446 ms sürdü. Bu, sınavın kimlikli API süresi veya tüm cihazlarda gecikmesiz çalışma kanıtı değildir. Ağın ilk yanıtı hâlâ gerekir; kaldırılanlar gereksiz tam indirme ve istemci beklemeleridir. Otomatik kontroller [TESTING](TESTING.md) içinde; mobil değişiklik Metro tarafından izlenir, web production yayını için sunucu operasyonu iş bölümü geçerlidir.

## 25 Ekim 2026: durum kontrolü, sonuç ekranı ve takılan istekler

Hem web hem mobilde genel yavaşlık bildirimi üzerine üç somut nokta düzeltildi:

- Aktif denemenin 15 saniyelik kontrolü, soru metinleri ve şıklarıyla tam ayrıntıyı yeniden indiriyordu. Yeni `GET /contexts/{context}/exam-attempts/{exam}/state` var olan kanonik küçük cevap yanıtını kullanır; ilk açılış tam ayrıntıyı getirir, tamamlanınca değerlendirme için tekrar tam ayrıntı alınır. Sunucu soru sürümü/şıklarını sorgulamaz. 25 soruluk sentetik PostgreSQL testinde durum JSON'u tam kaydın üçte birinden küçüktür; bu canlı 125 soruluk ölçüm veya uçtan uca hız yüzdesi değildir.
- Sınav bitince yalnız durum kontrolü duruyor, saniyelik sayaç devam ediyordu. Sayaç state'i, webde bütün sonuç kartlarını ve mobilde sonuç listesini her saniye yeniden render ediyordu. Tamamlanmış sınav için saat kurulmaz; aktif sınavdan sonuca geçerken önceki timer temizlenir. Eklenen tarayıcı kontrolü eski kodda her iki istemcide de bir aktif saniyelik timer bulup başarısız oldu; düzeltme bu kontrolle doğrulanır.
- Ortak HTTP istemcisinde bekleme sınırı yoktu. Başlık ve JSON gövdesini kapsayan 20 saniyelik timeout, kullanıcıya açık hata ve mevcut tekrar eylemi eklendi. Yazmalar kendiliğinden tekrarlanmaz; sunucuya ulaşmış cevabın aynı seçim/revision ile yeniden gönderilmesi güvenlidir. İstemci iptali ayrı korunur. Mobil yenileme sürerken gelen 15 saniyelik kontrol, isteği kesip sürekli baştan başlatmaz.

İstemci, yeni durum yolu henüz dağıtılmamış API'den 404 alırsa o ekranın ömrü boyunca eski tam ayrıntı biçimiyle çalışır. Diğer API hataları gizlenmez. Yeni uç, değişmeyen sahiplik ve aktif üyelik kontrollerini kullanır; sınav süresini veya değerlendirme kuralını değiştirmez. Migration ve yeni bağımlılık yoktur.

Bu çalışmada genel HTTPS sağlık ucu üç kez salt okunur ölçüldü: HTTP 200, ilk bayt yaklaşık 484/353/329 ms. Bunlar kimlikli ekran açılışı, düşük donanımlı cihaz veya tüm sunucu yükü ölçümü değildir. Genel yavaşlığın bütün nedenlerinin çözüldüğü iddia edilmez.

Dağıtım: değişiklikler yerel `main` kodundadır. Sunucu operasyonu iş bölümüne uygun olarak dağıtım yapılmadı; API ve web derlemesinin Claude tarafından güncellenmesi gerekir. Fiziksel Android/iOS frame ve kaydırma ölçümü bu turda yapılmadı. Otomatik doğrulama sonuçları [TESTING](TESTING.md) içinde tutulur.

## Önceki inceleme ve canlı ölçüm (24 Ekim 2026)

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

Canlı HTTPS smoke, öğrenci/admin asset hashleri, hesap bazlı örnek sonuç ve içerik bütünlüğü kontrolleri geçti. Tarayıcı/Expo web export doğrulaması fiziksel Android/iPad veya native frame süresi ölçümü değildir; bu platformlar ayrıca denenmelidir. Dış internet/tünel gecikmesi sıfırlanmadı. Yeni dış bağımlılık eklenmedi; yalnız ortak çalışma paketinin iç tip bağımlılığı açıkça tanımlandı. Bu performans tesliminde açık kalan Expo araç zinciri Zod bulgusu, sonraki 25 Ekim güvenlik çalışmasında düzeltildi; güncel araç zinciri/yerel forge yaması [SECURITY](SECURITY.md#javascript-bağımlılık-güvenliği--25-ekim-2026) ve [TESTING](TESTING.md) içinde açıklanır.
