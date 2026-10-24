<?php

namespace App\Modules\Scoring;

use Illuminate\Validation\ValidationException;

class RuleConfiguration
{
    public function validate(array $a): void
    {
        $c = $a['configuration'];
        $general = $c['general_count'];
        $weapon = $c['weapon_count'];
        $shooting = $c['shooting_count'];
        if ($general + $weapon > 200 || ($a['weapon_status'] === 'unarmed' && ($weapon !== 0 || $shooting !== 0 || $c['weapon_weight'] !== 0 || $c['shooting_weight'] !== 0))
          || ($a['weapon_status'] === 'armed' && ($weapon === 0 || $shooting === 0))
          || ($c['requires_previous'] !== ($a['education_type'] === 'weapon_difference'))
          || ($a['education_type'] === 'weapon_difference' && ($general !== 0 || $a['weapon_status'] !== 'armed'))
          || ($a['education_type'] !== 'weapon_difference' && $general === 0)
          || $c['general_weight'] + $c['weapon_weight'] + $c['shooting_weight'] !== 10000
          || ($c['decision_mode'] === 'pass_fail' && $c['minimums'] === [])
          || ($a['education_type'] === 'renewal' && $c['decision_mode'] === 'pass_fail')) {
            throw ValidationException::withMessages(['configuration' => ['Soru sayısı, bölüm ağırlıkları, eğitim türü veya başarı koşulları birbiriyle uyumlu değil.']]);
        }
        if ($a['effective_until'] !== null && $a['effective_until'] < $a['effective_from']) {
            throw ValidationException::withMessages(['effective_until' => ['Bitiş başlangıçtan önce olamaz.']]);
        }
        if ($a['period_until'] < $a['period_from']) {
            throw ValidationException::withMessages(['period_until' => ['Son dönem ilk dönemden önce olamaz.']]);
        }
        foreach (['general', 'weapon', 'shooting'] as $part) {
            if ($c[$part.'_count'] > 0 && ($c[$part.'_maximum'] < 1 || $c[$part.'_weight'] < 1)) {
                throw ValidationException::withMessages(['configuration' => ['Var olan bölümün puan üst sınırı ve ağırlığı sıfır olamaz.']]);
            }
            if ($c[$part.'_count'] === 0 && ! ($part === 'general' && $c['requires_previous']) && $c[$part.'_weight'] !== 0) {
                throw ValidationException::withMessages(['configuration' => ['Olmayan bölüme ağırlık verilemez.']]);
            }
        }
        foreach ($c['minimums'] as $section => $value) {
            if (($section === 'weapon' || $section === 'weapon_total' || $section === 'shooting') && $a['weapon_status'] === 'unarmed') {
                throw ValidationException::withMessages(['configuration.minimums' => ['Silahsız sınavın silah/atış barajı olamaz.']]);
            }
        }
    }
}
