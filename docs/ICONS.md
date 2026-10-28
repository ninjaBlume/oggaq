# Sistem ikonları

28 Ekim 2026 kullanıcı kararı: farklı işlevlerin ikonları küçük boyutta da ayırt edilebilir olmalı. Aynı işlev farklı ekranda aynı ikonla gösterilir. Kapatma/açma veya gösterme/gizleme gibi aynı kontrolün durumları doğal eşleşmesini korur. Marka ve uygulama başlatıcı ikonları aynı ÖGG SOR kimliğidir; bu işte marka değiştirilmez.

## Kaynaklar ve kapsam

- Mobil: `src/icons.ts` tek tek Lucide modüllerini yükler; `src/featureIcons.ts` menü/alt sekme/kısayol/boş durum eşleştirmesidir.
- Web ve yönetim: `@oggaq/design-tokens` içindeki 43 statik ikon çizimi, uygulamaların küçük SVG bileşenleriyle gösterilir. Yeni tarayıcı ikon paketi/fontu/harici CDN isteği yoktur. Veri yalnız izinli SVG ilkel şekillerinden oluşur.
- Geometri mevcut `lucide-react-native` 1.55.0 kaynağından statik AST okuyucuyla çıkarılır. Kod çalıştırılmaz; sürüm değişirse otomatik kabul edilmez. `node scripts/sync-ui-icons.mjs` üretir, `--check` güncelliği denetler. ISC/Feather MIT bildirimleri `packages/design-tokens/LICENSE.icons` içinde korunur.
- Site: App Store / Google Play kartlarındaki birbirinin aynısı telefon dekorları kaldırıldı; mağaza adları, platform açıklaması ve Yakında durumu korunur. İndirme veya ön sipariş varmış gibi rozet oluşturulmaz. Gerçek mağaza sayfaları açıldığında resmi pazarlama varlıkları ayrıca uygulanır; [Apple kaynağı](https://developer.apple.com/app-store/marketing/guidelines/).

## Ayırt etme kararları

| İşlev | Görsel |
|---|---|
| Deneme | Soru listeli sınav panosu |
| Rastgele sınav | Çapraz karıştırma okları (Shuffle); tekrar ikonundan farklı |
| Ders | Açık kitap |
| Sonuç | Bölümlere ayrılmış pasta grafiği |
| Tekrar | İki yönlü dönüş oku |
| Başarı durumu | Sütun grafiği |
| Puan hesaplama | Hesap makinesi |
| Takvim | Takvim |
| Dilekçe | Kalemli, kıvrık köşeli belge |
| Tutanak | Ciltli, sekmeli kayıt defteri |
| SSS | Daire içinde soru işareti |
| İş ilanı / başvuru | İş çantası / gönderim oku |
| Kataloglar | Üç farklı geometrik şekil |
| Konu / sınav türü / kaynak | Dallanmış ağ / etiketler / kitap sırası |
| Kurallar / atış | Terazi / nişangâh |
| Kapat / sil / sınavdan çıkar | X / çöp kutusu / eksi işaretli liste |
| Yeni soru / mevcut soru ekle | Kalem / artılı liste |
| Hata / geçici bağlantı bilgisi | Üçgen ünlem / bağlantısız bulut |

Yönetimde deneme için geçmiş saati, ilgi bekleyen kayıt için göz ve katalog/puanlama için ortak ızgara kullanılmaz. Önizleme göz ikonunu, gerçek sürüm geçmişi saatli dönüş ikonunu korur. Menü, alt sekme, kart ve boş durumlarda renk/çizgi ailesi tutarlıdır; renk tek anlam taşıyıcısı değildir. Kullanıcı etiketleri ve en az 44 px etkileşim hedefleri korunur.

## Doğrulama

15 farklı bölüm çiziminin birebir tekrarlanmamasını ve SVG verilerinin izinli statik şekiller olmasını iki test denetler. Bu testler görsel benzerliği otomatik ölçmez. Bölüm ve işlem ikonları 16/20/24 px açık/koyu tema inceleme levhasında ayrıca gözle değerlendirilir. Kanıt `artifacts/system-icons/review-*.png` içindedir. Mevcut eylem/erişilebilirlik/yerleşim testleri işlevlerin korunmasını doğrular. Son test ve yayın durumu [TESTING](TESTING.md) içinde kaydedilir.
