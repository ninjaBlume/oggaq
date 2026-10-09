# OGGAQ — Codex Proje Başlangıç Talimatı

## 1. Projenin amacı

Türkiye genelindeki özel güvenlik görevlisi (ÖGG) adaylarının ve mevcut görevlilerin ücretsiz kullanabileceği bir sınava hazırlık ve soru çözme platformu geliştiriyoruz. Üç istemcimiz olacak: web, iOS ve Android.

Platformun mülkiyeti ürün sahibine aittir. İlk geliştirmeyi bir özel güvenlik eğitim kurumu finanse ediyor; ancak uygulama sadece o kurumun öğrencileriyle sınırlı olmayacak.

## 2. Teknoloji ve mimari

- Backend: Laravel 13, PHP 8.4, REST API, OpenAPI.
- Ana veritabanı: PostgreSQL.
- Web: React 19, TypeScript, Tailwind CSS.
- Mobil: React Native, Expo, TypeScript.
- İhtiyaç halinde Redis, Laravel Horizon ve S3 uyumlu nesne depolama.
- Mimari: Modüler monolit backend, web ve mobil için ortak API.
- Tek ortak iOS uygulaması, tek ortak Android uygulaması ve bir web uygulaması.

Teknoloji sürümlerinin proje ortamıyla uyumunu doğrula; doğrulamadan kurulum yapma.

## 3. Kullanıcı ve kurum modeli

- Bireysel kullanıcılar herhangi bir kuruma bağlanmadan ücretsiz kayıt olup soru çözebilmeli.
- Kuruma bağlı öğrenciler hem merkezi soruları hem kurumlarına özel içerikleri görebilmeli.
- Kurum yöneticileri kendi öğrencilerini, sınavlarını ve raporlarını yönetebilmeli.
- Platform yöneticileri kurumları, kullanıcıları ve merkezi içerikleri yönetebilmeli.
- Bir kullanıcı daha sonra bir kuruma bağlanabilmeli; kurum üyeliği ile kullanıcı kimliği ayrı modellenmeli.
- Kurumlar birbirlerinin özel verilerini görememeli. Yetkilendirme ve veri izolasyonu test edilmeli.

## 4. Merkezi soru bankası ve sınav motoru

- Sorular ders, konu, alt konu, sınav türü, sınav numarası, yıl, dönem ve kaynak gibi ölçütlerle sınıflandırılabilmeli.
- Çıkmış sınavlar, ders bazlı testler, konu bazlı testler, karma denemeler, yanlışlarım, boş bıraktıklarım, favorilerim ve başarı istatistikleri desteklenmeli.
- Silahlı/silahsız ve temel/yenileme gibi ayrımlar veri modelinde esnek biçimde ele alınmalı.
- Resmî sınavların özgün soru sırası ve cevap anahtarı korunmalı.
- Sorular birden fazla sınavda kullanılabilmeli; tekrarları dikkatle yönetilmeli.
- Kurumlara özel soru ekleme gelecekte desteklenebilmeli; bu sorular otomatik olarak merkezi havuza katılmamalı.
- Alıştırma ve süreli sınav oturumlarının kuralları ayrı tasarlanmalı.
- Sınav sonuçları, sorular sonradan düzenlense bile tutarlı kalmalı.

## 5. Mevcut SQL verileri

Elimizde MySQL/MariaDB formatında mevcut soru bankaları var. Kaynak şema henüz incelenmedi.

- Tablo adlarını, kolonları veya ilişkileri varsayma.
- Kaynak SQL dosyalarını değiştirme.
- Önce mevcut veri modelini analiz et.
- PostgreSQL'e aktarım için doğrulama, eşleştirme, tekrar tespiti, hata raporu ve tekrar çalıştırılabilir import planı oluştur.
- Veri aktarımına kullanıcı onayı olmadan başlama.

## 6. Reklam ve iş modeli

- Öğrenci kullanımı ücretsiz olacak.
- Gelecekte web/mobil reklam ağları kullanılabilir.
- Firmalara doğrudan tanıtım ve reklam kampanyaları satılabilir.
- Reklam gösterimi, kampanya süresi, yerleşim ve raporlama için genişletilebilir mimari düşünülmeli.
- İlk sürümde reklam entegrasyonu zorunlu değil.
- Süreli sınav deneyimi reklamlarla kesintiye uğratılmamalı.

## 7. Güvenlik ve kalite

- Kimlik doğrulama, rol/izin kontrolü, kurum veri izolasyonu, API doğrulaması ve hız sınırlaması planlanmalı.
- KVKK kapsamındaki kişisel veriler için veri minimizasyonu, saklama ve silme süreçleri düşünülmeli.
- Soru kaynakları ve sınav sonuçları izlenebilir olmalı.
- Backend, web ve mobil için uygulanabilir test stratejisi hazırlanmalı.
- Offline sınav çözme ihtiyacı ayrıca değerlendirilip kapsamı netleştirilmeli; otomatik olarak zorunlu kabul edilmemeli.

## 8. Codex çalışma kuralları

1. Benimle Türkçe iletişim kur; kod, sınıf, fonksiyon, tablo ve alan adlarında İngilizce kullan.
2. Önce mevcut depoyu ve dosyaları incele; çalışan yapıyı bozma.
3. Belirsiz gereksinimleri kesinleşmiş gibi uygulama; önerilerini ve varsayımlarını ayır.
4. Açık geliştirme onayı olmadan kod yazma, paket kurma veya veritabanı değiştirme.
5. Geliştirme başladığında bir özelliği yalnızca ekran çizerek tamamlanmış sayma; gerekli API, veritabanı, yetkilendirme ve testleri de ele al.
6. Gereksiz mikroservis ve erken optimizasyondan kaçın.
7. Her aşamanın sonunda değişiklikleri, testleri ve açık kalan noktaları kısa raporla.

## 9. İlk görev — sadece inceleme ve planlama

Mevcut proje klasörünü incele. Henüz uygulama geliştirmeye veya kurulum yapmaya başlama.

Şunları Türkçe ve somut biçimde raporla:

1. Depodaki mevcut dosyalar ve projenin durumu.
2. Önerilen modüler monolit mimari ve uygulama sınırları.
3. İlk sürüm (MVP) için önerilen kapsam ve sonraya bırakılacaklar.
4. PostgreSQL veri modelinin ana varlıkları ve ilişkileri (henüz migration yazmadan).
5. MySQL/MariaDB soru bankalarını incelemek için ihtiyaç duyduğun örnek SQL şema/dump dosyaları.
6. Uygulamaya başlamadan önce netleştirilmesi gereken en kritik kararlar.

Raporun sonunda benden onay bekle.
