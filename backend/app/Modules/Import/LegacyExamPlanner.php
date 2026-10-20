<?php

namespace App\Modules\Import;

// Pure mapping from the legacy training-institution tables to the central question bank. No I/O, no database.
// Adapter 1 was written against the real dump: sinavlar.kategori_id 2 = a whole written exam (ordered, with a
// subject on every question), 3 = the same exam split per subject. Personal-data tables are never an input.
class LegacyExamPlanner
{
    public const VERSION = 'asvip-1';

    public const TABLES = ['dersler', 'sinavlar', 'sorular', 'yanitlar', 'ogg_sinavlari'];

    private const WEAPON_SUBJECT = 'silah-bilgisi-ve-atis';

    // Armed exams have 125 questions (100 general + 25 weapon, weapon last); unarmed exams have the 100 general ones.
    public const GENERAL_QUESTIONS = 100;

    public const WEAPON_QUESTIONS = 25;

    // Exam dates absent from ogg_sinavlari; each was looked up in public EGM-based reporting (see docs/IMPORTING.md).
    public const SUPPLEMENTAL_DATES = [
        100 => '2022-10-30', 101 => '2022-12-25', 102 => '2023-04-30', 103 => '2023-06-24', 104 => '2023-08-26',
        105 => '2023-10-21', 106 => '2023-12-17', 119 => '2026-02-22', 120 => '2026-05-03', 121 => '2026-07-05',
    ];

    private const MONTHS = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

    /** @param array<string, list<array<string, mixed>>> $tables */
    public function plan(array $tables): array
    {
        $warnings = [];
        $errors = [];
        $subjects = [];
        foreach ($tables['dersler'] as $row) {
            $subjects[$row['ders_id']] = ['code' => (string) $row['ders_seflink'], 'name' => $this->clean((string) $row['ders_adi']), 'order' => (int) $row['ders_sira']];
        }
        $dates = $this->dates($tables['ogg_sinavlari'], $warnings);
        $options = [];
        foreach ($tables['yanitlar'] as $row) {
            $options[$row['soru_id']][] = $row;
        }
        $sets = [];
        foreach ($tables['sinavlar'] as $row) {
            if (! preg_match('/^\s*(\d+)\./u', (string) $row['sinav_adi'], $match) || ! in_array($row['kategori_id'], [2, 3], true)) {
                $errors[] = ['sinav_id' => $row['sinav_id'], 'reason' => 'Sınav adı veya kategorisi tanınmadı.'];

                continue;
            }
            $sets[$row['sinav_id']] = ['number' => (int) $match[1], 'full' => $row['kategori_id'] === 2, 'subject' => $row['ders_id']];
        }
        $questions = [];
        $stats = ['source_questions' => count($tables['sorular']), 'cleaned' => ['entities' => 0, 'stem_number' => 0, 'option_letter' => 0], 'rejected' => 0, 'incomplete' => 0, 'repaired' => 0, 'corrections' => [], 'duplicates' => 0, 'superseded' => 0];
        $occurrences = [];
        $cleanLog = [];
        foreach ($tables['sorular'] as $row) {
            $set = $sets[$row['sinav_id']] ?? null;
            if ($set === null) {
                continue;
            }
            $subjectId = $set['full'] ? $row['ders_id'] : $set['subject'];
            $built = $this->question($row, $options[$row['soru_id']] ?? [], $subjectId, $subjects, $stats, $cleanLog);
            if (is_string($built)) {
                $errors[] = ['soru_id' => $row['soru_id'], 'sinav_id' => $row['sinav_id'], 'sinav_no' => $set['number'], 'reason' => $built];
                $stats['rejected']++;

                continue;
            }
            $occurrences[] = ['soru_id' => $row['soru_id'], 'number' => $set['number'], 'full' => $set['full'], 'hash' => $built['hash'], 'stem_key' => $built['stem_key'], 'subject' => $built['subject_override'] ?? $subjectId, 'question' => $built];
        }
        // A whole-exam question without options is completed from the same exam's per-subject copy of the same stem.
        $unfinished = [];
        foreach ($occurrences as $index => $o) {
            if ($o['full'] && ! $o['question']['complete']) {
                $unfinished[$o['number']][$o['stem_key']][] = $index;
            }
        }
        foreach ($occurrences as $o) {
            if (! $o['full'] && $o['question']['complete'] && isset($unfinished[$o['number']][$o['stem_key']])) {
                foreach ($unfinished[$o['number']][$o['stem_key']] as $index) {
                    $warnings[] = ['type' => 'repaired_from_subject_set', 'soru_id' => $occurrences[$index]['soru_id'], 'from_soru_id' => $o['soru_id'], 'sinav_no' => $o['number']];
                    $occurrences[$index]['hash'] = $o['hash'];
                    $occurrences[$index]['question'] = $o['question'];
                    $stats['repaired']++;
                }
                unset($unfinished[$o['number']][$o['stem_key']]);
            }
        }
        // A per-subject copy that disagrees with the same stem inside the whole exam of that number is superseded.
        $fullStems = [];
        foreach ($occurrences as $o) {
            if ($o['full']) {
                $fullStems[$o['number']][$o['stem_key']][$o['hash']] = true;
            }
        }
        $kept = [];
        foreach ($occurrences as $o) {
            if (! $o['full'] && isset($fullStems[$o['number']][$o['stem_key']]) && ! isset($fullStems[$o['number']][$o['stem_key']][$o['hash']])) {
                $stats['superseded']++;
                $warnings[] = ['type' => 'superseded_by_full_exam', 'soru_id' => $o['soru_id'], 'sinav_no' => $o['number']];

                continue;
            }
            $kept[] = $o;
        }
        usort($kept, fn ($a, $b) => [$b['full'], $a['number'], $a['soru_id']] <=> [$a['full'], $b['number'], $b['soru_id']]);
        foreach ($kept as $o) {
            if (isset($questions[$o['hash']])) {
                $stats['duplicates']++;
                if ($questions[$o['hash']]['subject'] !== $o['subject']) {
                    $warnings[] = ['type' => 'subject_conflict', 'soru_id' => $o['soru_id'], 'sinav_no' => $o['number']];
                }

                continue;
            }
            $questions[$o['hash']] = $o['question'] + ['subject' => $o['subject'], 'source_number' => $o['number'], 'first_soru_id' => $o['soru_id']];
        }
        foreach ($questions as $question) {
            if (! $question['complete']) {
                $stats['incomplete']++;
                $warnings[] = ['type' => 'incomplete_question', 'soru_id' => $question['first_soru_id'], 'sinav_no' => $question['source_number'], 'issues' => $question['issues']];
            }
            if ($question['duplicate_option_text']) {
                $warnings[] = ['type' => 'duplicate_option_text', 'soru_id' => $question['first_soru_id']];
            }
        }
        $stemGroups = [];
        foreach ($questions as $hash => $question) {
            $stemGroups[$question['stem_key']][] = $question['first_soru_id'];
        }
        foreach ($stemGroups as $ids) {
            if (count($ids) > 1) {
                $warnings[] = ['type' => 'same_stem_different_options', 'soru_ids' => $ids];
            }
        }
        $supplements = $this->supplements($subjects);
        $exams = $this->exams($kept, $sets, $subjects, $dates, $supplements, $warnings, $errors);
        // Only supplements an exam actually took become questions; the rest are not imported.
        foreach ($supplements as $items) {
            foreach ($items as $item) {
                foreach ($exams as $exam) {
                    if (in_array($item['hash'], $exam['hashes'], true)) {
                        $questions[$item['hash']] ??= $item['question'];
                    }
                }
            }
        }
        $sources = [];
        foreach ($questions as $question) {
            $sources[$question['source_number']] = true;
        }
        foreach ($exams as $exam) {
            $sources[$exam['number']] = true;
        }
        ksort($sources);
        $stats['unique_questions'] = count($questions);
        $stats['exams'] = count($exams);
        $stats['supplemented'] = count(array_filter($warnings, fn ($w) => $w['type'] === 'supplemented_from_official_booklet'));

        return [
            'adapter' => self::VERSION, 'subjects' => $subjects,
            'sources' => array_map(fn ($number) => ['title' => "Özel Güvenlik {$number}. Temel Eğitim Sınavı soruları", 'date' => $dates[$number] ?? null], array_combine(array_keys($sources), array_keys($sources))),
            'questions' => $questions, 'exams' => $exams, 'warnings' => $warnings, 'errors' => $errors, 'stats' => $stats, 'clean_log' => $cleanLog,
        ];
    }

    // Official-booklet questions missing from the dump, keyed by exam number then supplement id, each as hash => question.
    private function supplements(array $subjects): array
    {
        $byNumber = [];
        foreach (LegacySupplements::QUESTIONS as $id => $item) {
            $subjectId = null;
            foreach ($subjects as $legacyId => $subject) {
                if ($subject['code'] === $item['subject']) {
                    $subjectId = $legacyId;
                }
            }
            if ($subjectId === null) {
                continue;
            }
            $options = array_map(fn ($text) => $this->clean($text), $item['options']);
            $stem = $this->clean($item['stem']);
            $stemKey = $this->norm($stem);
            $normalized = array_map(fn ($text) => $this->norm($text), $options);
            $hash = hash('sha256', json_encode([$stemKey, $normalized, $item['correct'] - 1], JSON_UNESCAPED_UNICODE));
            $byNumber[$item['exam']][$id] = ['hash' => $hash, 'question' => [
                'stem' => $stem, 'options' => $options, 'correct' => $item['correct'] - 1, 'stem_key' => $stemKey, 'duplicate_option_text' => false,
                'issues' => [], 'complete' => true, 'subject_override' => null, 'hash' => $hash,
                'subject' => $subjectId, 'source_number' => $item['exam'], 'first_soru_id' => $id,
            ]];
        }

        return $byNumber;
    }

    private function exams(array $kept, array $sets, array $subjects, array $dates, array $supplements, array &$warnings, array &$errors): array
    {
        $weaponId = null;
        foreach ($subjects as $id => $subject) {
            if ($subject['code'] === self::WEAPON_SUBJECT) {
                $weaponId = $id;
            }
        }
        $byNumber = [];
        $hasFull = [];
        foreach ($kept as $o) {
            $byNumber[$o['number']][] = $o;
            $hasFull[$o['number']] = ($hasFull[$o['number']] ?? false) || $o['full'];
        }
        ksort($byNumber);
        $exams = [];
        foreach ($byNumber as $number => $items) {
            $reconstructed = ! $hasFull[$number];
            if ($reconstructed) {
                // Only per-subject sets exist: order by subject sequence, original order inside a subject.
                usort($items, fn ($a, $b) => [$subjects[$a['subject']]['order'] ?? 0, $a['soru_id']] <=> [$subjects[$b['subject']]['order'] ?? 0, $b['soru_id']]);
            } else {
                $items = array_values(array_filter($items, fn ($o) => $o['full']));
                usort($items, fn ($a, $b) => $a['soru_id'] <=> $b['soru_id']);
            }
            if (! isset($dates[$number])) {
                $errors[] = ['sinav_no' => $number, 'reason' => 'Sınav tarihi bulunamadı; çıkmış sınav oluşturulmadı.'];

                continue;
            }
            $hashes = [];
            $complete = [];
            foreach ($items as $o) {
                if (isset($hashes[$o['hash']])) {
                    $warnings[] = ['type' => 'repeated_in_exam', 'soru_id' => $o['soru_id'], 'sinav_no' => $number];

                    continue;
                }
                $hashes[$o['hash']] = $o['subject'];
                $complete[$o['hash']] = $o['question']['complete'];
            }
            [$year, $month, $day] = array_map('intval', explode('-', $dates[$number]));
            // Unarmed candidates sit the general questions only; armed candidates get the same questions followed by the
            // weapon-subject questions (the last 25 of the 125), whatever order the source rows were entered in.
            $general = array_keys(array_filter($hashes, fn ($subject) => $subject !== $weaponId));
            $weapon = $weaponId === null ? [] : array_keys(array_filter($hashes, fn ($subject) => $subject === $weaponId));
            foreach ($supplements[$number] ?? [] as $id => $item) {
                if (count($weapon) < self::WEAPON_QUESTIONS && ! isset($hashes[$item['hash']])) {
                    $weapon[] = $item['hash'];
                    $hashes[$item['hash']] = $weaponId;
                    $complete[$item['hash']] = true;
                    $warnings[] = ['type' => 'supplemented_from_official_booklet', 'sinav_no' => $number, 'supplement' => $id];
                }
            }
            if (count($general) !== self::GENERAL_QUESTIONS || count($weapon) !== self::WEAPON_QUESTIONS) {
                $warnings[] = ['type' => 'exam_structure', 'sinav_no' => $number, 'general' => count($general), 'weapon' => count($weapon)];
            }
            // Deneme exams are the whole exam (armed or unarmed); Ders exams hold one subject's questions of that number.
            $armed = array_merge($general, $weapon);
            foreach (['silahli' => $armed, 'silahsiz' => $general] as $variant => $list) {
                $label = $variant === 'silahli' ? 'Silahlı' : 'Silahsız';
                $exams[] = [
                    'key' => "{$number}:{$variant}", 'kind' => 'deneme', 'number' => $number, 'variant' => $variant, 'subject' => null, 'date' => $dates[$number], 'year' => $year,
                    'term' => self::MONTHS[$month], 'title' => sprintf('ÖGG %d. Deneme Sınavı (%02d.%02d.%d) — %s', $number, $day, $month, $year, $label),
                    'hashes' => $list, 'reconstructed_order' => $reconstructed,
                    'publishable' => ! in_array(false, array_map(fn ($hash) => $complete[$hash], $list), true),
                ];
            }
            $bySubject = [];
            foreach ($armed as $hash) {
                $bySubject[$hashes[$hash]][] = $hash;
            }
            uksort($bySubject, fn ($a, $b) => ($subjects[$a]['order'] ?? 0) <=> ($subjects[$b]['order'] ?? 0));
            foreach ($bySubject as $subjectId => $list) {
                $exams[] = [
                    'key' => "{$number}:ders:{$subjectId}", 'kind' => 'ders', 'number' => $number, 'variant' => null, 'subject' => $subjectId, 'date' => $dates[$number], 'year' => $year,
                    'term' => self::MONTHS[$month], 'title' => sprintf('ÖGG %d. Ders Sınavı — %s (%02d.%02d.%d)', $number, $subjects[$subjectId]['name'], $day, $month, $year),
                    'hashes' => $list, 'reconstructed_order' => $reconstructed,
                    'publishable' => ! in_array(false, array_map(fn ($hash) => $complete[$hash], $list), true),
                ];
            }
        }

        return $exams;
    }

    // A question that cannot be answered reliably is kept as an incomplete draft (never published) so editors can finish it.
    private function question(array $row, array $answers, ?int $subjectId, array $subjects, array &$stats, array &$cleanLog): array|string
    {
        if ($subjectId === null || ! isset($subjects[$subjectId])) {
            return 'Ders belirlenemedi.';
        }
        $issues = [];
        $original = (string) $row['soru_metni'];
        $stem = $this->clean($original);
        $numbered = preg_replace('/^\d{1,3}\s*[.)\-–]\s+/u', '', $stem);
        if ($numbered !== $stem) {
            $stats['cleaned']['stem_number']++;
            $cleanLog[] = ['soru_id' => $row['soru_id'], 'removed' => mb_substr($stem, 0, 12)];
            $stem = $numbered;
        }
        if ($this->decode($original) !== $original) {
            $stats['cleaned']['entities']++;
        }
        if ($stem === '') {
            $stem = "(Soru metni kaynakta boş — kaynak kayıt #{$row['soru_id']})";
            $issues[] = 'Soru metni boş.';
        }
        usort($answers, fn ($a, $b) => $a['yanit_id'] <=> $b['yanit_id']);
        $texts = [];
        $correct = [];
        foreach ($answers as $answer) {
            $text = $this->clean((string) $answer['yanit_metni']);
            $stripped = preg_replace('/^[A-Ea-e]\s*[).]\s+/u', '', $text);
            if ($stripped !== $text) {
                $stats['cleaned']['option_letter']++;
                $text = $stripped;
            }
            if ($text === '') {
                $issues[] = 'Boş seçenek metni atlandı.';

                continue;
            }
            if ((int) $answer['dogru_mu'] === 1) {
                $correct[] = count($texts);
            }
            $texts[] = $text;
        }
        if (count($texts) < 2) {
            $issues[] = 'Seçenek verisi yok veya eksik.';
        }
        if (count($correct) !== 1) {
            $issues[] = 'Tek doğru cevap belirlenemedi.';
        }
        $key = count($correct) === 1 ? $correct[0] : null;
        [$stem, $key, $rules, $subjectCode] = LegacyCorrections::apply($stem, $texts, $key, fn ($t) => $this->norm($t));
        $subjectOverride = null;
        foreach ($subjects as $id => $subject) {
            if ($subjectCode !== null && $subject['code'] === $subjectCode) {
                $subjectOverride = $id;
            }
        }
        foreach ($rules as $rule) {
            $stats['corrections'][$rule] = ($stats['corrections'][$rule] ?? 0) + 1;
        }
        $normalized = array_map(fn ($t) => $this->norm($t), $texts);
        $counts = array_count_values($normalized);
        // A repeated wrong option is a source typo; a repeated correct option makes the key ambiguous.
        if ($key !== null && $counts[$normalized[$key]] > 1) {
            $issues[] = 'Doğru cevabın metni başka bir seçenekte tekrar ediyor.';
        }
        $stemKey = $this->norm($stem);

        return [
            'stem' => $stem, 'options' => $texts, 'correct' => $key, 'stem_key' => $stemKey, 'duplicate_option_text' => count($counts) !== count($texts),
            'issues' => $issues, 'complete' => $issues === [], 'subject_override' => $subjectOverride,
            'hash' => hash('sha256', json_encode([$stemKey, $normalized, $key], JSON_UNESCAPED_UNICODE)),
        ];
    }

    private function dates(array $rows, array &$warnings): array
    {
        $dates = self::SUPPLEMENTAL_DATES;
        foreach ($rows as $row) {
            if (preg_match('/(\d+)\.\s*TEMEL\s+EĞİTİM/iu', (string) $row['ogg_sinav_adi'], $match)) {
                $number = (int) $match[1];
                if (isset($dates[$number]) && $dates[$number] !== $row['ogg_sinav_tarihi']) {
                    $warnings[] = ['type' => 'date_conflict', 'sinav_no' => $number, 'dump' => $row['ogg_sinav_tarihi'], 'researched' => $dates[$number]];
                }
                $dates[$number] = (string) $row['ogg_sinav_tarihi'];
            }
        }

        return $dates;
    }

    // The source holds text that was HTML-escaped several times over (&amp;amp;quot;); decode until it is stable.
    private function decode(string $text): string
    {
        for ($pass = 0; $pass < 40; $pass++) {
            $decoded = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
            if ($decoded === $text) {
                break;
            }
            $text = $decoded;
        }

        return $text;
    }

    private function clean(string $text): string
    {
        $text = $this->decode($text);
        $text = str_replace(["\r\n", "\r"], "\n", $text);

        return trim((string) preg_replace('/[ \t]+/u', ' ', $text));
    }

    private function norm(string $text): string
    {
        return mb_strtolower(trim((string) preg_replace('/\s+/u', ' ', $text)));
    }
}
