# Yayın öncesi somut hukuk işlemleri

29 Ekim devamı: teknik KVKK **migration/API/gizlilik/hesap silme yayını canlıda**. Temsilci ataması/VERBİS, sağlayıcı sözleşme/imza/bildirim işleri ve kullanım koşullarının önerilen hukuk maddesi tamamlanmadı. Önceki “yayımlanmadı” notları hazırlık tarihçesidir; [güncel işlem dosyası](kvkk-uygulama-plani.md), [yayın kanıtı](../../../deploy/server-development/README.md).

29 Ekim 2026. Bu klasör hazırlık ve inceleme kaydıdır; imza, tasdik, başvuru veya izin alındısı değildir. Sonraki teknik düzeltme işinde gizlilik ve hesap silmenin olgusal açıklamaları canlıya alındı; koşullardaki önerilen yeni hukuk maddesi ve bu klasördeki resmî işlem taslakları yayımlanmadı. Mağaza incelemesi/genel yayın başlatılmadı.

**Mağaza talebi ile mevzuat değerlendirmesi ayrıdır:** Apple veya Google'ın bu hesap için VERBİS belgesi/temsilci kararı yüklememizi istediği bir talep görülmedi. Aşağıdaki sicil/temsilci/aktarım işleri, veri sorumlusunun ABD'deki Codentum olarak tanımlanmasına dayanan Türkiye mevzuatı değerlendirmesidir; Codentum'a özel verilmiş bir KVKK kararı/bildirimi görülmedi. `check:store` içindeki taslak engeli deponun iç kontrolüdür, mağaza reddi değildir. Genel yayın öncesi şirket yükümlülüklerini değerlendirmek, bütün belgelerin mağazaya yüklenmesi gerektiği anlamına gelmez. [Google denetimi](../../STORE_RELEASE.md#29-ekim--google-için-yeniden-denetim-gönderim-yapılmadı).

| Konu | Hazırlanan sonuç | Gerçekten tamamlanması gereken |
| --- | --- | --- |
| Kullanım koşulları / aydınlatma | Toplama yöntemi, üçüncü taraf içerik hakları, başvuru yolu, belge/ilk yardım sınırı ve Türk hukuku/tüketici koruması önerisi eklendi | Şirketin son metin onayı; yayın tarihinde önerilen 29 Ekim tarihini kontrol etmek |
| VERBİS | Kayıt bulunmadığına ilişkin kullanıcı bilgisi saklandı; Harun Altay adaylı temsilci kararı hazır | Adayın şartları, şirketin yetkili kararı, tasdikli nüsha ve resmî başvuru/kayıt |
| Soru ve logo hakları | Resmî EGM iletişimi doğrulandı; somut talep hazır | Kullanıcı gönderimi şimdilik istemedi; talep/ek paylaşılmadı. Kullanım dayanağı teyit edilmeli; EGM'ye e-posta göndermek tek zorunlu yöntem veya her mağaza başvurusunun standart evrakı değildir |
| Yurt dışı veri akışı | Sağlayıcı/rol bazlı aktarım inceleme tablosu hazır | Uygun KVKK m.9 güvencesinin belirlenmesi, gerekli sözleşme/imza/bildirim kanıtı |

`docs/legal-values.json` içindeki boş alanlar öneri veya bildirilen gerçek durumla dolduruldu. Bu, VERBİS muafiyeti ya da hukuki uygunluk onayı değildir; `taslak: true` korunur. EGM soruları ve mevcut logo değiştirilmedi. İzin çıkmazsa içerik/marka değişikliği için ayrıca somut seçenek hazırlanır.

## 29 Ekim KVKK revizyonu

[Uygulama/prosedür ve saklama planı](kvkk-uygulama-plani.md), [gönderilmemiş sağlayıcı sözleşme talepleri](saglayici-aktarim-talebi.txt). Harun Altay vatandaşlık ve Türkiye yerleşikliği koşullarını beyan etti; temsilci taslağı güncellendi. İmza/tasdik/başvuru hâlâ tamamlanmadı. Yeni teknik paket yalnız test ortamında; canlıya/OTA’ya dağıtılmadı.

## Kaynaklar ve sınırlar

- [KVKK aydınlatma tebliği](https://www.kvkk.gov.tr/Icerik/4132/aydinlatma-yukumlulugunun-yerine-getirilmesinde-uyulacak-usul-ve-esaslar-hakkinda-teblig): veri toplama yöntemi ve işleme şartının açıklanması; aydınlatma ile açık rıza ayrıdır.
- [Sicil Yönetmeliği m.11](https://www.kvkk.gov.tr/Icerik/5442/VERI-SORUMLULARI-SICILI-HAKKINDA-YONETMELIK): yabancı veri sorumlusunun temsilci ataması ve tasdikli kararı. [Sorularla VERBİS, soru 6 ve 51](https://www.kvkk.gov.tr/Icerik/5384/SORULARLA-VERBIS): başvuru yolu ve küçük işletme eşiklerinin yabancı veri sorumlusu için otomatik uygulanmaması.
- [KVKK yurt dışına aktarım açıklaması](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim): m.9 güvenceleri. Yalnız aydınlatma yazmak veya AB SCC/DPA bağlantısı eklemek imzalı Türk standart sözleşmesinin yerine geçmez.
- [EGM resmî iletişim sayfası](https://www.egm.gov.tr/ozelguvenlik/iletisim): `ozelguvenlik@egm.gov.tr` 29 Ekim’de resmî HTML üzerinden doğrulandı. Web arama aracının 500 hatası sonrasında genel HTTPS isteği 200 verdi; yerel kanıt `artifacts/legal-review-20261029/egm-contact.html`. İncelenen 122. temel A kitapçığında açık yeniden kullanım lisansı tespit edilmedi; bu inceleme tüm kitapçıkları kapsamaz ve tek başına ihlal kararı değildir.
- [Google fikrî mülkiyet](https://support.google.com/googleplay/android-developer/answer/9888072?hl=tr) ve [kimliğe bürünme](https://support.google.com/googleplay/android-developer/answer/9888374?hl=tr): kullanım hakkı ile resmî ilişki izlenimi ayrı değerlendirilir. Her başvuruda zorunlu bir izin dosyası olduğu iddia edilmez.
- [OpenAI Kullanım Şartları, Content](https://openai.com/policies/terms-of-use/): kullanıcı 29 Ekim’de logonun ChatGPT ile üretildiğini belirtti. OpenAI, kendisiyle kullanıcı arasındaki ilişkide ve hukukun izin verdiği ölçüde çıktı haklarını kullanıcıya bırakır; üçüncü taraf haklarını veya benzersizliği garanti etmez. Bu, amblemin başka haklardan arındığına dair belge değildir. Özgün sohbet, kaynak dosya ve üretim tarihinin kullanıcıda korunması önerilir.

Türk hukuku önerisi, ABD şirketini Türk mevzuatından muaf tutan bir hüküm değildir. Güncel MÖHUK/6502 metinlerine doğrudan erişim bu oturumda zaman aşımına uğradı; öneri bu nedenle imzalanmış/nihai hukuk görüşü olarak sunulmaz.
