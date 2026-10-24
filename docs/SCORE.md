# OGG SOR — ÖGG Sınav Puan Hesaplama Sistemi

## 1. GÖREV

Ogg Sor uygulamasına, Özel Güvenlik Görevlisi (ÖGG) sınavları için kapsamlı, doğru, esnek ve dönem bazlı çalışan bir **Sınav Puan Hesaplama Sistemi** geliştir.

Bu özellik hem web uygulamasında hem de iOS/Android mobil uygulamalarında kullanılabilmelidir.

Yalnızca görsel bir hesaplayıcı geliştirme. Backend, veritabanı, hesaplama motoru, API, kullanıcı arayüzü, testler ve yönetim paneli dahil olmak üzere çalışan bir sistem oluştur.

Öncelikle mevcut projeyi incele. Kullanılan teknolojileri, mimariyi, veritabanı tablolarını, sınav sistemini, mevcut API yapılarını ve arayüz bileşenlerini tespit et.

Mevcut mimariyi koru. Gereksiz teknoloji değişikliği, yeni framework veya bağımsız bir proje oluşturma.

## 2. MEVZUAT VE DOĞRULUK

ÖGG sınav puanlama kuralları zaman içerisinde değişebilmektedir.

Özellikle 4 Temmuz 2025 tarihli yönetmelik değişikliğini, yürürlük ve geçiş hükümlerini ve 2026 yılında uygulanan sınav sistemini dikkate al.

**ÖNEMLİ:**

Aşağıda belirtilen hesaplama yöntemleri başlangıç referansıdır. Bunları mevzuat doğrulaması yapılmadan kesin ve güncel kurallar olarak kabul etme.

Uygulamaya geçmeden önce:

1. Emniyet Genel Müdürlüğü (EGM) resmî kaynaklarını araştır.
2. Özel Güvenlik Hizmetlerine Dair Kanunun Uygulanmasına İlişkin Yönetmelik'in güncel hükümlerini kontrol et.
3. Resmî Gazete'de yayımlanan değişiklikleri incele.
4. Temel eğitim ve yenileme eğitimi arasındaki puanlama farklılıklarını doğrula.
5. Silahlı, silahsız ve silah farkı sınavlarını ayrı değerlendir.
6. Değişen kuralların hangi sınav döneminden itibaren uygulandığını belirle.
7. Kesinleştirilemeyen kuralları varsayımla üretime alma.

Her puanlama kuralı için mümkünse resmî kaynak bağlantısı, yürürlük tarihi ve uygulanabilir dönem bilgisi saklanmalıdır.

## 3. SINAV TÜRLERİ

Sistem aşağıdaki sınav türlerini desteklemelidir:

- Silahsız Temel Eğitim
- Silahlı Temel Eğitim
- Silahsız Yenileme Eğitimi
- Silahlı Yenileme Eğitimi
- Silah Farkı Eğitimi / Sınavı

Sınav türlerinin hesaplama kuralları birbirinden bağımsız yönetilmelidir.

Temel eğitim ile yenileme eğitiminin dönem numaraları farklı olduğundan dönemler yalnızca numaralarına göre eşleştirilmemelidir.

## 4. REFERANS PUANLAMA YÖNTEMLERİ

### 4.1. Silahsız temel eğitim

Geleneksel hesaplama modelinde:

- Genel bilgi: 100 soru
- Her doğru cevap: 1 puan
- Yanlış cevaplar doğruları götürmez.
- Toplam: 100 puan
- Başarı sınırı: 60 puan

Formül:

`general_score = correct_answers`

`final_score = general_score`

`passed = final_score >= 60`

Bu kuralın ilgili sınav döneminde geçerli olduğu resmî kaynaklardan doğrulanmalıdır.

### 4.2. Silahlı temel eğitim

Geleneksel hesaplama modeli:

**Genel bilgi**

- 100 soru
- Her doğru cevap 1 puan
- Maksimum 100 puan

**Silah bilgisi**

- 25 soru
- Her doğru cevap 2 puan
- Maksimum 50 puan

**Uygulamalı atış**

- 5 atış
- Her başarılı isabet 10 puan
- Maksimum 50 puan

Hesaplama:

`general_score = general_correct`

`weapon_score = weapon_correct * 2`

`shooting_score = successful_hits * 10`

`weapon_total = weapon_score + shooting_score`

`final_score = (general_score + weapon_total) / 2`

Geleneksel başarı koşulları:

- Genel bilgi puanı en az 50
- Silah bilgisi ve atış toplamı en az 50
- Nihai puan en az 60

Bu koşullar yalnızca resmî olarak doğrulandıkları dönemlere uygulanmalıdır.

### 4.3. Yeni mevzuat hesaplama modeli

4 Temmuz 2025 tarihli yönetmelik değişikliğiyle ilişkilendirilen model ayrıca incelenmelidir.

Referans ağırlıklar:

- Genel bilgi: %50
- Silah bilgisi: %25
- Uygulamalı atış: %25

Referans formül:

`final_score = general_score * 0.50 + weapon_score * 0.25 + shooting_score * 0.25`

Bu modelde bölümler 100 puan üzerinden normalize edilmelidir.

Ancak ağırlıklar, asgari bölüm puanları, başarı koşulları, geçiş hükümleri ve uygulanmaya başladığı sınav dönemi mutlaka resmî kaynaklarla doğrulanmalıdır.

Eski ve yeni hesaplama yöntemlerini birbirine karıştırma.

### 4.4. Yenileme eğitimi

Yenileme sınavları için:

- Genel bilgi puanı hesaplanabilmeli.
- Silahlı yenilemede silah bilgisi ve atış puanları değerlendirilebilmeli.
- Resmî mevzuata göre seviye tespit ve başarı değerlendirmesi ayrıştırılmalı.
- Geçme-kalma koşulu bulunmayan sınavlarda kullanıcıya yanlışlıkla başarısız sonucu gösterilmemeli.

Yenileme sınavlarında geçerli puanlama yöntemi ve varsa özel koşullar resmî kaynaklarla doğrulanmalıdır.

### 4.5. Silah farkı sınavı

Silah farkı sınavının soru sayısı, atış puanlaması, başarı koşulları ve diğer sınavlardan farklılıkları ayrıca araştırılmalıdır.

Silah farkı sınavı için temel eğitim hesaplama kurallarını otomatik olarak kullanma.

## 5. DİNAMİK PUANLAMA MOTORU

Puanlama kurallarını frontend içerisine sabit yazma.

Merkezi bir puanlama motoru geliştir.

Motor şu bilgileri dikkate almalıdır:

- Sınav türü
- Eğitim türü
- Sınav dönemi
- Sınav tarihi
- Geçerli mevzuat sürümü
- Soru sayıları
- Doğru cevap sayıları
- Atış sonuçları
- Bölüm ağırlıkları
- Minimum başarı koşulları
- Yuvarlama kuralları

Önerilen servis:

`ExamScoringService`

Örnek metotlar:

- `calculateScore()`
- `calculateGeneralScore()`
- `calculateWeaponScore()`
- `calculateShootingScore()`
- `evaluateResult()`
- `resolveScoringRule()`
- `validateScoreInputs()`

Metot isimlerini mevcut projenin dil ve mimari standartlarına göre uyarlayabilirsin.

Hesaplama motoru web ve mobil istemcilerden bağımsız çalışmalıdır.

## 6. VERİTABANI TASARIMI

Mevcut veritabanı yapısını incele.

Gerekiyorsa aşağıdaki kavramsal yapıları mevcut şemaya uygun biçimde oluştur:

### scoring_rules

- id
- exam_type
- education_type
- version
- effective_from
- effective_until
- general_question_count
- weapon_question_count
- shooting_count
- general_weight
- weapon_weight
- shooting_weight
- minimum_general_score
- minimum_weapon_score
- minimum_shooting_score
- minimum_total_score
- requires_passing
- scoring_configuration
- source_url
- is_active
- created_at
- updated_at

### exam_score_results

- id
- user_id
- exam_id
- scoring_rule_id
- general_correct
- general_wrong
- general_blank
- weapon_correct
- weapon_wrong
- weapon_blank
- shooting_hits
- general_score
- weapon_score
- shooting_score
- final_score
- result_status
- calculation_details
- created_at
- updated_at

Bu tablolar zorunlu şema değildir. Mevcut sistemde benzer yapılar varsa tekrar oluşturma.

Puanlama kuralları sürümlendirilmeli ve geçmiş sonuçların hangi kurala göre hesaplandığı saklanmalıdır.

Kural değişiklikleri geçmiş sınav sonuçlarını sessizce değiştirmemelidir.

## 7. KULLANICI ARAYÜZÜ

Modern, sade, profesyonel ve mobil uyumlu bir ÖGG Puan Hesaplama ekranı geliştir.

Kullanıcı şu işlemleri yapabilmelidir:

1. Eğitim türünü seçebilmeli.
2. Silahlı veya silahsız sınavı seçebilmeli.
3. Sınav dönemini seçebilmeli.
4. Genel bilgi doğru sayısını girebilmeli.
5. Silah bilgisi doğru sayısını girebilmeli.
6. Atış isabet sayısını girebilmeli.
7. Puanını anlık hesaplayabilmeli.
8. Bölüm puanlarını ayrı ayrı görebilmeli.
9. Başarı durumunu görüntüleyebilmeli.
10. Sonucu anlaşılır bir açıklamayla inceleyebilmeli.

Seçilen sınav türüne göre gereksiz alanlar gizlenmelidir.

Örneğin silahsız sınav seçildiğinde silah bilgisi ve atış alanları gösterilmemelidir.

Geçme-kalma koşulu olmayan sınavlarda sonuç **Seviye Tespit Puanı** olarak sunulmalıdır.

Arayüzde sınav dönemine göre hangi hesaplama yönteminin kullanıldığı açıkça gösterilmelidir.

## 8. OTOMATİK SINAV SONUCU HESAPLAMA

Sistem yalnızca manuel puan hesaplayıcı olarak çalışmamalıdır.

Kullanıcı Ogg Sor içerisinde bir sınavı tamamladığında:

1. Cevaplar değerlendirilmeli.
2. Doğru, yanlış ve boş sayıları hesaplanmalı.
3. Sınavın ilgili puanlama kuralı bulunmalı.
4. Sonuç otomatik hesaplanmalı.
5. Kullanıcıya ayrıntılı sonuç ekranı gösterilmeli.
6. Sonuç kullanıcı geçmişine kaydedilmeli.

Gerçek sınav puanı ile uygulama içerisindeki deneme sınavı puanı ayrıştırılmalıdır.

Fiziksel atış sonucu bulunmayan deneme sınavlarında atış puanını sıfır varsayma.

Bunun yerine sonucu **Atış sonucu bekleniyor** veya **Tahmini puan** şeklinde göster.

Eksik veriyle kesin başarı kararı üretme.

## 9. YÖNETİM PANELİ

Yönetim panelinde puanlama kuralları görüntülenebilmeli ve yetkili kullanıcılar tarafından yönetilebilmelidir.

Yönetici:

- Yeni puanlama kuralı oluşturabilmeli.
- Kuralın uygulanacağı sınav dönemlerini belirleyebilmeli.
- Soru sayılarını ve ağırlıkları düzenleyebilmeli.
- Başarı koşullarını tanımlayabilmeli.
- Mevzuat kaynağını ekleyebilmeli.
- Kuralları etkinleştirebilmeli.
- Eski kuralları arşivleyebilmeli.
- Kural değişiklik geçmişini inceleyebilmeli.

Yayınlanmış ve sonuç üretmiş kurallar doğrudan değiştirilmemeli; yeni sürüm oluşturulmalıdır.

Yetkilendirme ve değişiklik kayıtları mevcut proje altyapısına entegre edilmelidir.

## 10. DOĞRULAMA VE TESTLER

Aşağıdaki senaryolar için otomatik testler yaz:

- Silahsız temel eğitim puanlaması
- Silahlı temel eğitim puanlaması
- Silahsız yenileme eğitimi
- Silahlı yenileme eğitimi
- Silah farkı sınavı
- Minimum başarı sınırları
- Tam puan
- Sıfır puan
- Eksik atış sonucu
- Geçersiz doğru sayısı
- Dönem bazlı farklı puanlama
- Eski ve yeni mevzuat kuralları
- Geçersiz veya çakışan kural tarihleri
- Puan yuvarlama işlemleri
- Geçmiş sınav sonuçlarının korunması

Doğrulanmamış mevzuat varsayımlarına dayalı testleri resmî kural testi olarak kabul etme.

## 11. DOKÜMANTASYON

Aşağıdaki dokümantasyonu oluştur veya mevcut dosyalara entegre et:

- `docs/EXAM_SCORING.md`
- `docs/EXAM_SCORING_RULES.md`

Belgelerde:

- Desteklenen sınav türleri
- Puan hesaplama formülleri
- Mevzuat kaynakları
- Dönem bazlı kural eşleştirmeleri
- Veritabanı tasarımı
- API kullanımı
- Örnek hesaplamalar
- Test senaryoları

bulunmalıdır.

Dokümantasyon Türkçe hazırlanmalıdır.

Kod içerisindeki sınıf, metot, değişken ve veritabanı alan isimlerinde İngilizce kullanılmalıdır.

## 12. GELİŞTİRME KURALLARI

- Önce mevcut kod tabanını analiz et.
- Var olan sınav ve soru bankası mimarisini koru.
- Gereksiz tablolar ve servisler oluşturma.
- Mevcut kimlik doğrulama ve yetkilendirme altyapısını kullan.
- Hesaplama mantığını tek bir merkezi servis üzerinden yürüt.
- Backend ve frontend arasında puanlama mantığını çoğaltma.
- API girişlerini doğrula.
- Negatif ve sınır dışı değerleri reddet.
- Ondalıklı puanlarda kesin ve tutarlı hesaplama uygula.
- Geçmiş sınav kayıtlarının bütünlüğünü koru.
- Mobil ve web istemcilerinde tutarlı sonuçlar göster.
- Test edilmemiş özellikleri tamamlandı olarak işaretleme.

## 13. UYGULAMA SIRASI

Çalışmayı şu sırayla yürüt:

**Aşama 1 — Analiz**

Mevcut proje mimarisini, sınav tablolarını ve ilgili servisleri incele.

**Aşama 2 — Mevzuat doğrulama**

Resmî kaynaklardan hesaplama yöntemlerini, yürürlük tarihlerini ve dönem eşleştirmelerini araştır. Belirsizlikleri raporla.

**Aşama 3 — Veritabanı**

Mevcut şemayla uyumlu, sürümlendirilebilir puanlama kuralları altyapısını oluştur.

**Aşama 4 — Backend**

Puanlama motorunu, validasyonları, API uç noktalarını ve sonuç kayıtlarını geliştir.

**Aşama 5 — Frontend**

Manuel puan hesaplayıcıyı, otomatik sınav sonuç ekranını ve yönetim arayüzünü geliştir.

**Aşama 6 — Test**

Birim, entegrasyon ve gerekli arayüz testlerini çalıştır. Hataları düzelt.

**Aşama 7 — Dokümantasyon**

Hesaplama kurallarını, kaynakları, mimari kararları ve kullanım örneklerini belgele.

## 14. TAMAMLANMA KRİTERLERİ

Bir özellik yalnızca ekranı hazır olduğu için tamamlanmış sayılmaz.

Tamamlandı diyebilmek için:

- Arayüzü çalışmalıdır.
- Backend bağlantısı bulunmalıdır.
- Veritabanı işlemleri çalışmalıdır.
- Hesaplamalar doğrulanmalıdır.
- Hatalı girişler yönetilmelidir.
- İlgili testler başarılı olmalıdır.
- Mevcut özelliklerde regresyon oluşmamalıdır.
- Dokümantasyonu hazırlanmalıdır.

**NİHAİ HEDEF:**

Ogg Sor içerisinde kullanıcıların hem geçmiş ÖGG sınav dönemlerinin hem de güncel sınavların puanlarını doğru şekilde hesaplayabildiği, sınav sonuçlarını saklayabildiği ve gelecekteki mevzuat değişikliklerine uyarlanabilen profesyonel bir puanlama altyapısı oluştur.

Analiz ve mevzuat doğrulamasından sonra geliştirmeyi gerçekleştir. Kesinleştirilemeyen mevzuat hükümlerini tahmin ederek sisteme ekleme; bunları açıkça raporla. Gereksiz onay beklemeden doğrulanabilen geliştirme aşamalarına devam et.