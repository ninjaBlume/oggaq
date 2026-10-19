<?php

namespace App\Modules\Import;

// Reviewed corrections to known data-entry errors in the legacy dump. Each rule is content-based (it matches the
// question wording, its options and the wrong answer), so every copy of the same question is fixed and merges into one.
// The evidence is what the decision rests on; rules without official or logical evidence do not belong here.
class LegacyCorrections
{
    public const RULES = [
        'mehmet-gorev-yeri' => [
            'stem' => 'mehmet in görev yeri', 'correct_is' => 'Eğitim kurumu', 'set_correct' => 'Kişi koruma',
            'evidence' => 'EGM 109. Temel Eğitim (A/B grubu) cevaplı kitapçığı: doğru şık "Kişi koruma"; silahlı çalışma yeri 5188 s. Kanun md. 8.',
        ],
        'yanik-faktor' => [
            'stem' => 'yanığın ciddiyetini belirleyen faktörlerden değildir', 'correct_is' => 'Derideki derinliği', 'set_correct' => 'Cinsiyet',
            'evidence' => 'EGM 115. Temel Eğitim (B grubu) cevaplı kitapçığı soru 51: doğru şık "Cinsiyet".',
        ],
        'avm-mudahale' => [
            'stem' => 'avm içerisinde devriye', 'correct_is' => 'Olayın kendiliğinden sona ermesini bekler',
            'set_correct_prefix' => 'Suçüstü hali olduğundan doğrudan müdahale eder ve mağdurun şikayetine bakmaksızın',
            'evidence' => 'EGM 115. Temel Eğitim (B grubu) cevaplı kitapçığı soru 80: doğru şık D (şikayete bakmaksızın yakalama).',
        ],
        'silah-temizlik-malzeme' => [
            'stem' => 'silah temizliğinde gerekli malzemelerden değildir', 'options_include' => 'Süngü', 'correct_is' => 'Harbi', 'set_correct' => 'Süngü',
            'evidence' => 'Aynı sınavda aynı soru iki kez farklı anahtarla girilmiş; EGM 120. sınav cevaplı kitapçığında harbi temizlik malzemesi seçeneği olarak yer alır (doğru şık Tornavida); süngü temizlik malzemesi değildir.',
        ],
        'ogdb-sinavlari' => [
            'stem' => 'denetleme başkanlığı tarafından yapılan sınavlardan değildir', 'options_include' => 'Bomba İmha Uzmanı Sınavı', 'correct_is' => 'Özel Güvenlik Temel ve Yenileme Eğitim Sınavı', 'set_correct' => 'Bomba İmha Uzmanı Sınavı',
            'evidence' => 'Temel ve Yenileme Eğitim Sınavı Özel Güvenlik Denetleme Başkanlığı\'nın kendi sınavıdır (EGM kitapçıklarının başlığı); sonraki sınavlarda aynı soruda Bomba İmha seçeneği "Ehliyet Sınavı" ile değiştirilmiştir (EGM 113. sınav cevaplı kitapçığı).',
        ],
        'gez-arpacik-kopya' => [
            'stem' => 'gez ve arpacık yarı otomatik tabancaların hangi ana parçası üzerinde bulunur', 'options_include' => 'Harbi',
            'set_stem' => 'Aşağıdakilerden hangisi silahların parçalarından biri değildir?',
            'evidence' => 'EGM 107. Temel Eğitim A grubu soru 4 / B grubu soru 22: seçenekleri Kabza, Namlu, Sürgü, Harbi, Horoz olan soru "silahların parçalarından biri değildir?" biçimindedir; kaynakta başka sorunun metni yapıştırılmış.',
        ],
        'dogru-nisan-alma' => [
            'stem' => 'doğru nişan alma aşağıdakilerden hangisidir', 'set_subject' => 'silah-bilgisi-ve-atis',
            'evidence' => '101. sınavın tam kaydında silah bölümünde (104. sıra) yer alır ve ders setinde Silah Bilgisi sorusudur; tam sınav kaydında dersi yanlış (Hukuk) girilmiş.',
        ],
        'tabanca-ana-parca' => [
            'stem' => 'tabancanın başlıca parçalarından değildir', 'options_include' => 'Kabza', 'correct_is' => 'Namlu', 'set_correct' => 'Kabza',
            'evidence' => 'Namlu tabancanın başlıca parçasıdır; EGM 114. sınav kitapçıklarında aynı kalıpta doğru şık Horoz (başlıca parça olmayan) işaretlidir. Aynı sınavdaki diğer kopya doğru şıkkı Kabza olarak verir.',
        ],
        'kontrol-noktasi-giris-cikis' => [
            'stem' => 'giriş ve çıkış kontrolü sırasında dikkat etmesi gereken hususlar arasında yer almaz', 'correct_is' => 'Personel kontrolü', 'set_correct' => 'Bina kontrolü',
            'evidence' => 'EGM 102. Temel Eğitim A grubu cevaplı kitapçığı soru 37: aynı soru ve aynı seçeneklerle doğru şık E "Bina kontrolü".',
        ],
        'metal-yangini-su' => [
            'stem' => 'hafif metallerin yangınlarında aşağıdaki söndürme maddelerinden hangisi kesinlikle kullanılmaz', 'correct_is' => 'Kum', 'set_correct' => 'Su',
            'evidence' => 'EGM 104. Temel Eğitim B grubu cevaplı kitapçığı soru 41: doğru şık D "Su"; hafif metal yangınlarında su kullanılmaz, kum kullanılır.',
        ],
        'koruma-prensipleri' => [
            'stem' => 'temel koruma prensiplerinden değildir', 'correct_is' => 'Koruma görevlisi koruma ile ilgili her türlü konuyu, korunan kişi ile rahatça paylaşabilmelidir', 'set_correct_prefix' => 'Korunan kişiden daha üst makamdaki',
            'evidence' => 'EGM 104. Temel Eğitim A grubu soru 91 ve B grubu soru 9 cevaplı kitapçıkları: doğru şık B ("Korunan kişiden daha üst makamdaki… korunmasına geçilmelidir").',
        ],
        'koruma-gorevlisi-hususlar' => [
            'stem' => 'koruma görevlisinin dikkat edeceği hususlardan değildir', 'correct_is' => 'Ekip uyumu en üst seviyede olmalıdır', 'set_correct_prefix' => 'Koşullara göre değişebilen koruma düzenine hazırlıklı olmamalıdır',
            'evidence' => 'EGM 104. Temel Eğitim A grubu soru 92 ve B grubu soru 8 cevaplı kitapçıkları: doğru şık E ("…düzenine hazırlıklı olmamalıdır").',
        ],
        'gecici-haller-komisyon' => [
            'stem' => 'para veya değerli eşya nakli gibi geçici veya acil hallerde', 'correct_is' => 'Özel güvenlik şirketinin özel güvenlik izin talebi', 'set_correct' => 'Komisyon kararı',
            'evidence' => 'EGM 105. Temel Eğitim A grubu cevaplı kitapçığı soru 7: doğru şık C "Komisyon kararı"; 5188 s. Kanun md. 3 geçici ve acil hallerde komisyon kararı aranmaksızın valilik izni verilir.',
        ],
        'yanik-yanlis-uygulama' => [
            'stem' => 'ısı ile oluşan yanıklarda yapılan yanlış bir uygulamadır', 'correct_is' => 'Kişi hala yanıyorsa koşması engellenir', 'set_correct' => 'Su toplamış yerler patlatılır',
            'evidence' => 'EGM 107. Temel Eğitim A grubu soru 53 / B grubu soru 50 cevaplı kitapçıkları: doğru şık E "Su toplamış yerler patlatılır"; yanıkta su toplamış yerler patlatılmaz.',
        ],
        'kimlik-sorma-yetkisi' => [
            'stem' => 'kimlik sorma yetkisi bulunmaktadır', 'correct_is' => 'I, II, III, IV, V, VI', 'set_correct' => 'I, III ve IV',
            'evidence' => 'EGM 113. Temel Eğitim A grubu cevaplı kitapçığı soru 14: aynı seçeneklerle doğru şık A "I, III ve IV".',
        ],
        'yaya-kontrol-noktasi' => [
            'stem' => 'yaya kontrol noktasında dikkat edilmesi gereken hususlar arasında yer almaz', 'correct_is' => 'Kişilerin üzerinde birden fazla suç unsuru madde olabileceği göz önünde bulundurulmalıdır', 'set_correct_prefix' => 'El tipi metal detektör şahsın vücuduna dik',
            'evidence' => 'EGM 114. Temel Eğitim A grubu soru 30 / B grubu soru 65 cevaplı kitapçıkları: doğru şık E ("El tipi metal detektör şahsın vücuduna dik tutularak…").',
        ],
        'vip-makam-araci' => [
            'stem' => 'makam aracında bulunması gereken özelliklerden değildir', 'correct_is' => 'Motoru güçlü, hızlı ve 4x4 özellikli olmalıdır', 'set_correct' => 'Araçta açılır tavan bulunmalıdır',
            'evidence' => 'EGM 116. Temel Eğitim A grubu soru 86 / B grubu soru 12 cevaplı kitapçıkları: doğru şık E "Araçta açılır tavan bulunmalıdır".',
        ],
        'namlu-parcasi' => [
            'stem' => 'tabanca namlusunun bir parçasıdır', 'correct_is' => 'Horoz', 'set_correct' => 'Dirsekli kurs',
            'evidence' => 'EGM 117. Temel Eğitim A grubu soru 18 / B grubu soru 2 cevaplı kitapçıkları: doğru şık C "Dirsekli kurs"; horoz namlu parçası değildir.',
        ],
        'ateslemeyi-gerceklestiren-parca' => [
            'stem' => 'kurulu vaziyetten kurtulup iğneye veya direk kapsüle çarpmasıyla ateşlemeyi gerçekleştiren parçadır', 'correct_is' => 'Tetik', 'set_correct' => 'Horoz',
            'evidence' => 'EGM 117. Temel Eğitim A grubu soru 25 / B grubu soru 9 cevaplı kitapçıkları: doğru şık B "Horoz".',
        ],
    ];

    /**
     * @param  list<string>  $options  cleaned option texts in order
     * @return array{0: string, 1: ?int, 2: list<string>, 3: ?string} stem, correct index, ids of applied rules, corrected subject code
     */
    public static function apply(string $stem, array $options, ?int $correct, callable $norm): array
    {
        $applied = [];
        $subject = null;
        $normalizedStem = self::loose($stem);
        $normalizedOptions = array_map($norm, $options);
        foreach (self::RULES as $id => $rule) {
            if (! str_contains($normalizedStem, self::loose($rule['stem']))) {
                continue;
            }
            if (isset($rule['options_include']) && ! in_array($norm($rule['options_include']), $normalizedOptions, true)) {
                continue;
            }
            if (isset($rule['correct_is']) && ($correct === null || $normalizedOptions[$correct] !== $norm($rule['correct_is']))) {
                continue;
            }
            if (isset($rule['set_subject'])) {
                $subject = $rule['set_subject'];
            }
            if (isset($rule['set_stem'])) {
                $stem = $rule['set_stem'];
            }
            foreach ($options as $index => $text) {
                if (isset($rule['set_correct']) && $norm($text) === $norm($rule['set_correct'])
                    || isset($rule['set_correct_prefix']) && str_starts_with($norm($text), $norm($rule['set_correct_prefix']))) {
                    $correct = $index;
                }
            }
            $applied[] = $id;
        }

        return [$stem, $correct, $applied, $subject];
    }

    private static function loose(string $text): string
    {
        return trim((string) preg_replace('/[^0-9a-zçğıöşü]+/u', ' ', mb_strtolower(str_replace('İ', 'i', $text))));
    }
}
