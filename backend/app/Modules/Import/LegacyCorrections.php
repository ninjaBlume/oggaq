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
        'tabanca-ana-parca' => [
            'stem' => 'tabancanın başlıca parçalarından değildir', 'options_include' => 'Kabza', 'correct_is' => 'Namlu', 'set_correct' => 'Kabza',
            'evidence' => 'Namlu tabancanın başlıca parçasıdır; EGM 114. sınav kitapçıklarında aynı kalıpta doğru şık Horoz (başlıca parça olmayan) işaretlidir. Aynı sınavdaki diğer kopya doğru şıkkı Kabza olarak verir.',
        ],
    ];

    /**
     * @param  list<string>  $options  cleaned option texts in order
     * @return array{0: string, 1: ?int, 2: list<string>} stem, correct index, ids of applied rules
     */
    public static function apply(string $stem, array $options, ?int $correct, callable $norm): array
    {
        $applied = [];
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

        return [$stem, $correct, $applied];
    }

    private static function loose(string $text): string
    {
        return trim((string) preg_replace('/[^0-9a-zçğıöşü]+/u', ' ', mb_strtolower(str_replace('İ', 'i', $text))));
    }
}
