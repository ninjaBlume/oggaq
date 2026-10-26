<?php

namespace App\Modules\Calendar;

use Carbon\CarbonImmutable;
use DOMDocument;
use DOMXPath;
use RuntimeException;

class ParseEgmCalendar
{
    private function text(string $text): string
    {
        return trim(preg_replace('/\s+/u', ' ', str_replace("\u{00A0}", ' ', $text)));
    }

    private function upper(string $text): string
    {
        return mb_strtoupper(str_replace(['i', 'ı'], ['İ', 'I'], $this->text($text)), 'UTF-8');
    }

    private function date(string $text): CarbonImmutable
    {
        $months = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
        $days = ['PAZARTESİ', 'SALI', 'ÇARŞAMBA', 'PERŞEMBE', 'CUMA', 'CUMARTESİ', 'PAZAR'];
        if (! preg_match('/^(\d{1,2}) (\p{L}+) (20\d{2}) (\p{L}+)$/u', $this->upper($text), $m)) {
            throw new RuntimeException('Invalid calendar date');
        }
        $month = array_search($m[2], $months, true);
        if ($month === false || ! checkdate($month + 1, (int) $m[1], (int) $m[3])) {
            throw new RuntimeException('Invalid calendar date');
        }
        $date = CarbonImmutable::create((int) $m[3], $month + 1, (int) $m[1], 12, 0, 0, 'Europe/Istanbul');
        if ($days[$date->dayOfWeekIso - 1] !== $m[4]) {
            throw new RuntimeException('Calendar weekday mismatch');
        }

        return $date;
    }

    public function parse(string $html, int $year): array
    {
        if (strlen($html) > 1048576 || ! str_contains(strtolower($html), '</table>')) {
            throw new RuntimeException('Invalid calendar document');
        }
        $previous = libxml_use_internal_errors(true);
        try {
            $dom = new DOMDocument;
            if (! $dom->loadHTML('<?xml encoding="UTF-8">'.$html, LIBXML_NONET)) {
                throw new RuntimeException('Invalid calendar HTML');
            }
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }
        $xpath = new DOMXPath($dom);
        $tables = [];
        foreach ($xpath->query('//table') as $table) {
            if (str_contains($this->upper($table->textContent), $year.' YILI SINAV TAKVİMİ')) {
                $tables[] = $table;
            }
        }
        if (count($tables) !== 1) {
            throw new RuntimeException('Calendar table missing or ambiguous');
        }
        $entries = [];
        $header = false;
        $basic = [];
        $renewal = [];
        foreach ($xpath->query('.//tr', $tables[0]) as $row) {
            $cells = [];
            foreach ($xpath->query('./th|./td', $row) as $cell) {
                $cells[] = $this->text($cell->textContent);
            }
            if (array_map($this->upper(...), $cells) === ['SN', 'SINAVIN ADI', 'SINAV TARİHİ', 'EĞİTİM BİTİŞ TARİHİ']) {
                $header = true;

                continue;
            }
            $name = $this->upper($cells[1] ?? '');
            if (! str_contains($name, 'TEMEL') && ! str_contains($name, 'YENİLEME')) {
                continue;
            }
            if (! $header || count($cells) !== 4 || ! preg_match('/^ÖZEL GÜVENLİK (\d{1,4})\. TEMEL EĞİTİM VE (\d{1,4})\. YENİLEME EĞİTİMİ SINAVI$/u', $name, $m)) {
                throw new RuntimeException('Unrecognized exam row');
            }
            $exam = $this->date($cells[2]);
            $deadline = $this->date($cells[3]);
            if ($exam->year !== $year || $deadline->greaterThanOrEqualTo($exam) || $deadline->year < $year - 1 || (int) $m[1] < 1 || (int) $m[2] < 1 || isset($basic[$m[1]]) || isset($renewal[$m[2]])) {
                throw new RuntimeException('Invalid or duplicate exam row');
            }
            $basic[$m[1]] = true;
            $renewal[$m[2]] = true;
            $entries[] = ['basic_number' => (int) $m[1], 'renewal_number' => (int) $m[2], 'exam_date' => $exam->toDateString(), 'training_deadline' => $deadline->toDateString()];
        }
        usort($entries, fn ($a, $b) => strcmp($a['exam_date'], $b['exam_date']));
        if (! $header || count($entries) < 1 || count($entries) > 12) {
            throw new RuntimeException('Empty or oversized calendar');
        }
        for ($i = 1; $i < count($entries); $i++) {
            if ($entries[$i]['exam_date'] <= $entries[$i - 1]['exam_date'] || $entries[$i]['basic_number'] <= $entries[$i - 1]['basic_number'] || $entries[$i]['renewal_number'] <= $entries[$i - 1]['renewal_number']) {
                throw new RuntimeException('Inconsistent exam sequence');
            }
        }

        return $entries;
    }
}
