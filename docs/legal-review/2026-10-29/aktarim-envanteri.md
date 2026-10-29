# KVKK m.9 aktarım inceleme tablosu

29 Ekim 2026. Uygulama akışlarının ön envanteridir. Bir sağlayıcının sitesinde DPA bulunması, Codentum hesabı bakımından gerekli sözleşmenin kurulduğunu veya KVKK bildirimlerinin yapıldığını göstermez. Türkiye’de sunucu bulunması da diğer akışları ortadan kaldırmaz.

| Akış | İşlenen veri / amaç | Mevcut dayanak ve kapanış kanıtı |
| --- | --- | --- |
| Türkiye origin → Cloudflare proxy/Tunnel | HTTPS erişim trafiği; güvenlik ve dağıtım. TLS sonlandırmada kimlik doğrulama istek içerikleri de işlenebilir | Hesabın tabi olduğu sözleşme/DPA, alt işleyenler ve yerler; somut rol/aktarım yönüne uygun m.9 güvencesi henüz doğrulanmadı |
| Uygulama → Resend | Alıcı e-postası, hesap/güvenlik ileti içeriği ve gönderim kayıtları | İrlanda gönderim bölgesi kayıtların tamamının İrlanda’da kaldığını göstermez. Resend DPA’sı bulundu; Türk standart sözleşme/imza/bildirim kanıtı yok |
| Destek → Cloudflare Email Routing → Google Gmail | Kullanıcının destek e-postası, iletişim ve başvuru içeriği | Kullanılan Gmail hesap türü/sözleşmesi ve hizmet rollerine uygun aktarım güvencesi ayrıca doğrulanmalı |
| Mobil istemci → Expo/EAS Update/CDN | IP, platform/runtime/kanal, rastgele kurulum tanımlayıcısı, varsa sınırlı ciddi hata metni | Kullanıcı hesabı/cevaplar bu isteğe eklenmez. Sağlayıcı veri akışı ve sözleşmesinin bu veri/rolleri kapsaması ayrıca değerlendirilmeli |
| Türkiye origin → Codentum yetkili erişimi | ABD’de kurulu veri sorumlusunun yönetim/destek erişimi | Şirketin gerçek erişim yerleri, rolleri ve aktarım nitelendirmesi somutlaştırılmalı; otomatik istisna varsayılmaz |

## Hazır sonraki işlem

Rol, alıcı ve aktarım ülkeleri kesinleştirildikten sonra m.9’daki uygun yöntem belirlenir. Standart sözleşme yöntemi seçilirse Kurulun ilgili modülü kullanılır; tarafların imza yetkileri ve eklerdeki veri/amaç/güvenlik/saklama bilgileri tamamlanır, gereken bildirim süresinde yapılır. AB SCC’sinin Türk standart sözleşmesi yerine geçtiği veya tek bir genel açık rızanın bütün sürekli akışları çözdüğü varsayılmaz. Burada sözleşme imzalanmadı, sağlayıcıya veri/evrak gönderilmedi.

Kaynaklar: [KVKK aktarım yöntemleri](https://www.kvkk.gov.tr/Icerik/2053/Yurtdisina-Aktarim), [Resend DPA](https://resend.com/legal/dpa), [Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/), [Expo gizlilik politikası](https://expo.dev/privacy). Sağlayıcı belgeleri genel metindir; Codentum’a ait imzalı belge/hesap kaydı olarak sunulmaz.
