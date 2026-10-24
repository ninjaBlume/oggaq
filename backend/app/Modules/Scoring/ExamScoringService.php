<?php

namespace App\Modules\Scoring;

use App\Modules\Scoring\Models\ScoringRule;
use Illuminate\Validation\ValidationException;

// Integer rational arithmetic: thresholds use the exact fraction, display rounding happens only at the end.
class ExamScoringService
{
    public function calculate(ScoringRule $rule, array $input): array
    {
        $c = $rule->configuration;
        $input = $this->validateInputs($c, $input);
        $scale = 1;
        foreach (['general_count', 'weapon_count', 'shooting_count'] as $key) {
            $scale = $this->lcm($scale, max(1, $c[$key]));
        }
        $parts = [];
        $numerators = [];
        $missing = [];
        foreach (['general' => 'Genel bilgi', 'weapon' => 'Silah bilgisi', 'shooting' => 'Uygulamalı atış'] as $key => $label) {
            $count = $c[$key.'_count'];
            if ($key === 'general' && $c['requires_previous']) {
                $value = $input['previous_general_score'];
                $numerators[$key] = $value === null ? null : (int) round($value * 100) * $scale;
                if ($value === null) {
                    $missing[] = 'previous_general_score';
                }
                $parts[] = ['key' => 'previous_general', 'label' => 'Önceki silahsız sınav puanı', 'count' => 0, 'correct' => 0, 'wrong' => 0, 'blank' => 0, 'score' => $value, 'maximum' => 100];

                continue;
            }
            if ($count === 0) {
                $numerators[$key] = 0;

                continue;
            }
            $correct = $key === 'shooting' ? $input['shooting_hits'] : $input[$key.'_correct'];
            $wrong = $key === 'shooting' ? ($correct === null ? 0 : $count - $correct) : $input[$key.'_wrong'];
            if ($correct === null) {
                $missing[] = 'shooting_hits';
            }
            $numerators[$key] = $correct === null ? null : $correct * 10000 * intdiv($scale, $count);
            $parts[] = ['key' => $key, 'label' => $label, 'count' => $count, 'correct' => $correct, 'wrong' => $wrong, 'blank' => $correct === null ? 0 : $count - $correct - $wrong,
                'score' => $correct === null ? null : $this->rounded($correct * $c[$key.'_maximum'], $count, $c['decimals']), 'maximum' => $c[$key.'_maximum']];
        }
        // Section numerator is a 0..100 score times 100 times the common denominator.
        $denominator = 100 * $scale * 10000;
        $low = $high = 0;
        foreach (['general', 'weapon', 'shooting'] as $key) {
            $weight = $c[$key.'_weight'];
            $low += ($numerators[$key] ?? 0) * $weight;
            $high += ($numerators[$key] ?? 10000 * $scale) * $weight;
        }
        $minimum = $this->rounded($low, $denominator, $c['decimals']);
        $maximum = $this->rounded($high, $denominator, $c['decimals']);
        $score = $missing === [] ? $minimum : null;
        $checks = [];
        foreach ($c['minimums'] as $key => $min) {
            if ($key === 'total') {
                $n = $low;
                $d = $denominator;
                $known = $missing === [];
            } elseif ($key === 'weapon_total') {
                $n = ($numerators['weapon'] ?? 0) * $c['weapon_maximum'] + ($numerators['shooting'] ?? 0) * $c['shooting_maximum'];
                $d = 10000 * $scale;
                $known = $numerators['weapon'] !== null && $numerators['shooting'] !== null;
            } else {
                $n = $numerators[$key] ?? 0;
                $d = 100 * $scale;
                $known = $numerators[$key] !== null;
            }
            $labels = ['general' => $c['requires_previous'] ? 'Önceki silahsız temel puanı' : 'Genel bölüm', 'weapon' => 'Silah bilgisi (%100)', 'shooting' => 'Uygulamalı atış (%100)', 'weapon_total' => 'Silah bilgisi ve atış toplamı', 'total' => 'Nihai puan'];
            $checks[] = ['section' => $key, 'label' => $labels[$key], 'minimum' => $min, 'met' => $known ? $n >= $min * $d : null];
        }
        $passed = null;
        if ($missing === [] && $c['decision_mode'] === 'pass_fail') {
            $passed = ! in_array(false, array_column($checks, 'met'), true);
        }
        $status = $missing !== [] ? (in_array('shooting_hits', $missing, true) ? 'awaiting_shooting' : 'awaiting_previous_score') : ($c['decision_mode'] === 'level' ? 'level' : ($c['decision_mode'] === 'unverified' ? 'unverified' : ($passed ? 'passed' : 'failed')));
        $messages = ['awaiting_shooting' => 'Atış sonucu bekleniyor', 'awaiting_previous_score' => 'Önceki silahsız sınav puanı bekleniyor', 'level' => 'Seviye tespit puanı', 'unverified' => 'Tahmini puan — başarı koşulu doğrulanmadı', 'passed' => 'Başarı koşulları sağlanıyor', 'failed' => 'Başarı koşulları sağlanmıyor'];

        return ['rule_id' => $rule->id, 'rule_version' => $rule->version, 'title' => $rule->title, 'final_score' => $score, 'minimum_score' => $minimum, 'maximum_score' => $maximum,
            'status' => $status, 'status_label' => $messages[$status], 'passed' => $passed, 'decision_mode' => $c['decision_mode'], 'sections' => $parts, 'checks' => $checks,
            'formula' => $c['formula'], 'verification_note' => $rule->verification_note, 'source_urls' => $rule->source_urls,
            'notice' => 'Uygulama hesaplamasıdır; resmî sınav sonucu değildir.', 'input' => $input];
    }

    public function validateInputs(array $c, array $input): array
    {
        $out = [];
        foreach (['general', 'weapon'] as $part) {
            $correct = $input[$part.'_correct'] ?? 0;
            $wrong = $input[$part.'_wrong'] ?? 0;
            if (! is_int($correct) || ! is_int($wrong) || $correct < 0 || $wrong < 0 || $correct + $wrong > $c[$part.'_count']) {
                throw ValidationException::withMessages([$part.'_correct' => ['Doğru ve yanlış toplamı bölümün soru sayısını aşamaz.']]);
            }
            $out[$part.'_correct'] = $correct;
            $out[$part.'_wrong'] = $wrong;
        }
        $hits = $input['shooting_hits'] ?? null;
        if ($hits !== null && (! is_int($hits) || $hits < 0 || $hits > $c['shooting_count'])) {
            throw ValidationException::withMessages(['shooting_hits' => ['Atış isabet sayısı sınır dışında.']]);
        }
        if ($c['shooting_count'] === 0 && $hits !== null) {
            throw ValidationException::withMessages(['shooting_hits' => ['Bu sınavda atış bölümü yok.']]);
        }
        $previous = $input['previous_general_score'] ?? null;
        if ($previous !== null && (! is_numeric($previous) || $previous < 0 || $previous > 100 || round((float) $previous, 2) != (float) $previous || ! $c['requires_previous'])) {
            throw ValidationException::withMessages(['previous_general_score' => ['Önceki puan yalnız silah farkında 0–100 aralığında, en fazla iki ondalıkla girilebilir.']]);
        }

        return $out + ['shooting_hits' => $hits, 'previous_general_score' => $previous === null ? null : (float) $previous];
    }

    private function rounded(int $n, int $d, int $decimals): float
    {
        $factor = 10 ** $decimals;

        return intdiv($n * $factor * 2 + $d, 2 * $d) / $factor;
    }

    private function lcm(int $a, int $b): int
    {
        $x = $a;
        $y = $b;
        while ($y !== 0) {
            $r = $x % $y;
            $x = $y;
            $y = $r;
        }

        return intdiv($a, $x) * $b;
    }
}
