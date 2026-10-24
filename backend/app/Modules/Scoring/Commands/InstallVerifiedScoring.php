<?php

namespace App\Modules\Scoring\Commands;

use App\Models\User;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\Scoring\Actions\ManageScoring;
use App\Modules\Scoring\Models\ScoringPeriod;
use App\Modules\Scoring\Models\ScoringRule;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class InstallVerifiedScoring extends Command
{
    protected $signature = 'scoring:install-verified {--link-existing : Kaynak başlığı Temel Eğitim olarak doğrulanan mevcut tam sınavlara puanlama metaverisi bağla}';

    protected $description = 'Resmî kaynaklarla doğrulanan puan bileşenlerini ve açık belirsizlikleri kurar; soru/cevap/eski deneme puanı değiştirmez.';

    public function handle(ManageScoring $action): int
    {
        $actor = User::where('platform_role', 'platform_admin')->where('status', 'active')->whereNotNull('email_verified_at')->first();
        if (! $actor) {
            $this->error('Doğrulanmış aktif platform yöneticisi gerekli.');

            return self::FAILURE;
        }
        $counts = DB::transaction(function () use ($actor, $action) {
            $faq = 'https://www.egm.gov.tr/ozelguvenlik/sinav-sikca-sorulan-sorular';
            $law = 'https://www.mevzuat.gov.tr/mevzuatmetin/yonetmelik/7.5.7190.pdf';
            $rg = 'https://www.resmigazete.gov.tr/eskiler/2025/07/20250704-2.htm';
            $guide = 'https://www.egm.gov.tr/kurumlar/egm.gov.tr/IcSite/ozelguvenlik/Kilavuz/123-99/02_SINAV-KILAVUZU_WEB.pdf';
            $guide114 = 'https://www.egm.gov.tr/kurumlar/egm.gov.tr/IcSite/ozelguvenlik/Kilavuz/114-90/SINAV-KILAVUZU-WEB.pdf';
            $guide104 = 'https://www.egm.gov.tr/kurumlar/egm.gov.tr/IcSite/ozelguvenlik/02_104Temel-80-Yenileme-SINAV-TALIMATI-WEB-19072023.pdf';
            $rules = [];
            foreach (['basic', 'renewal', 'weapon_difference'] as $education) {
                foreach (['unarmed', 'armed'] as $weapon) {
                    if ($education === 'weapon_difference' && $weapon === 'unarmed') {
                        continue;
                    }
                    foreach (['legacy', 'guide_2026'] as $model) {
                        if ($education === 'weapon_difference' && $model !== 'legacy') {
                            continue;
                        } // ordinary certificate holders: current transition not independently confirmed
                        $unarmed = $weapon === 'unarmed';
                        $renewal = $education === 'renewal';
                        $difference = $education === 'weapon_difference';
                        $current = $model !== 'legacy';
                        $mode = $renewal ? 'level' : ($current && ! $unarmed ? 'unverified' : 'pass_fail');
                        $c = ['general_count' => $difference ? 0 : 100, 'weapon_count' => $unarmed ? 0 : 25, 'shooting_count' => $unarmed ? 0 : 5, 'general_maximum' => 100, 'weapon_maximum' => $unarmed ? 0 : 50, 'shooting_maximum' => $unarmed ? 0 : 50,
                            'general_weight' => $unarmed ? 10000 : 5000, 'weapon_weight' => $unarmed ? 0 : 2500, 'shooting_weight' => $unarmed ? 0 : 2500, 'requires_previous' => $difference, 'decision_mode' => $mode,
                            'minimums' => $mode !== 'pass_fail' ? [] : ($unarmed ? ['general' => 60] : ($difference ? ['general' => 60, 'weapon_total' => 50, 'total' => 60] : ['general' => 50, 'weapon_total' => 50, 'total' => 60])),
                            'decimals' => 2, 'formula' => $unarmed ? 'Genel doğru sayısı × 1' : ($difference ? '(Önceki silahsız temel puanı + silah doğrusu × 2 + isabet × 10) / 2' : '(Genel doğru sayısı + silah doğrusu × 2 + isabet × 10) / 2')];
                        $code = 'verified_'.$model.'_'.$education.'_'.$weapon;
                        $note = $current ? 'Dönem kılavuzundaki 100+25 soru ile puan bileşenleri kullanılır. 2025 yönetmeliği ve EGM SSS farklı başarı koşulları içerdiğinden silahlı temelde kesin geçti/kaldı kararı verilmez; 80+20 modeli bu dönemlere otomatik atanmaz.' : 'Temmuz 2025 öncesi model: EGM SSS soru 3 ve dönem talimatları. Yanlışlar doğruları götürmez. Yenileme seviye tespitidir. Silah farkı silahsız sertifikadan geçiş içindir; MYO fark sınavı bu kuralın kapsamında değildir.';
                        $attrs = ['code' => $code, 'title' => ($current ? 'EGM dönem kılavuzu' : 'Temmuz 2025 öncesi').' · '.['basic' => 'Temel eğitim', 'renewal' => 'Yenileme', 'weapon_difference' => 'Silah farkı'][$education].' · '.($unarmed ? 'Silahsız' : 'Silahlı'),
                            'education_type' => $education, 'weapon_status' => $weapon, 'effective_from' => $current ? '2025-07-04' : '2022-01-01', 'effective_until' => $current ? '2026-10-24' : '2025-06-29',
                            'period_from' => $renewal ? ($current ? 92 : 76) : ($current ? 116 : 100), 'period_until' => $renewal ? ($current ? 99 : 91) : ($current ? 123 : 115), 'configuration' => $c,
                            'source_urls' => $current ? [$guide, $faq, $law] : [$faq, $guide104, $guide114], 'verification_note' => $note];
                        $r = ScoringRule::where('code', $code)->where('version', 1)->first();
                        if (! $r) {
                            $r = $action->save($actor, $attrs);
                            $r = $action->publish($actor, $r->id);
                        } elseif ($r->configuration != $c) {
                            throw new \RuntimeException('Kurulu kural yerelde tanımlı sürümden farklı; üzerine yazılmadı: '.$code);
                        }
                        $rules[$model][$education][$weapon] = $r;
                    }
                }
            }
            // The new regulation is stored as a draft only: no period is guessed from its publication date.
            foreach (['basic', 'renewal'] as $edu) {
                foreach (['armed', 'unarmed'] as $weapon) {
                    $code = 'regulation_2025_'.$edu.'_'.$weapon;
                    if (ScoringRule::where('code', $code)->exists()) {
                        continue;
                    }
                    $armed = $weapon === 'armed';
                    $renewal = $edu === 'renewal';
                    $c = ['general_count' => $renewal ? 40 : 80, 'weapon_count' => $armed ? 20 : 0, 'shooting_count' => $armed ? 5 : 0, 'general_maximum' => 100, 'weapon_maximum' => $armed ? 100 : 0, 'shooting_maximum' => $armed ? 100 : 0,
                        'general_weight' => $armed ? 5000 : 10000, 'weapon_weight' => $armed ? 2500 : 0, 'shooting_weight' => $armed ? 2500 : 0, 'requires_previous' => false, 'decision_mode' => $renewal ? 'level' : 'pass_fail',
                        'minimums' => $renewal ? [] : ($armed ? ['general' => 60, 'weapon' => 60, 'shooting' => 60] : ['general' => 60]), 'decimals' => 2, 'formula' => $armed ? 'Genel bölüm (%100) × %50 + silah bölümü (%100) × %25 + atış (%100) × %25' : 'Genel doğru / genel soru sayısı × 100'];
                    $action->save($actor, ['code' => $code, 'title' => '2025 yönetmelik modeli — uygulama dönemi bekliyor', 'education_type' => $edu, 'weapon_status' => $weapon, 'effective_from' => '2025-07-04', 'effective_until' => null, 'period_from' => $renewal ? 100 : 124, 'period_until' => 10000, 'configuration' => $c, 'source_urls' => [$rg, $law], 'verification_note' => 'Yönetmelik md.37–39 doğrulandı; ilk uygulanacak sınav dönemi netleşmediği için taslaktır. Dönem aralıkları etkinleştirme onayı değildir; resmî kılavuzla doğrulanıp düzenlenmelidir.']);
                }
            }
            $dates = [104 => '2023-08-26', 114 => '2025-04-12', 119 => '2026-02-22', 120 => '2026-05-03', 121 => '2026-07-05', 122 => '2026-08-29', 123 => '2026-10-24'];
            // Existing source title explicitly identifies basic education. Deneme/Ders alone never implies it.
            $existing = OfficialExam::with('source', 'examType')->whereNull('subject_id')->whereNotNull('published_at')->get()->filter(fn ($e) => $e->examType?->code === 'ogg-deneme' && $e->source?->title === 'Özel Güvenlik '.$e->exam_number.'. Temel Eğitim Sınavı soruları');
            foreach ($existing as $e) {
                $n = (int) $e->exam_number;
                if ($n < 100 || $n > 115 || isset($dates[$n])) {
                    continue;
                }if (preg_match('/\((\d{2})\.(\d{2})\.(\d{4})\)/', $e->title, $m)) {
                    $dates[$n] = $m[3].'-'.$m[2].'-'.$m[1];
                }
            }
            // For post-change imported periods the date provenance remains the imported exam, with an unverified decision.
            foreach ($existing as $e) {
                $n = (int) $e->exam_number;
                if ($n < 116 || $n > 118 || isset($dates[$n])) {
                    continue;
                }if (preg_match('/\((\d{2})\.(\d{2})\.(\d{4})\)/', $e->title, $m)) {
                    $dates[$n] = $m[3].'-'.$m[2].'-'.$m[1];
                }
            }
            foreach ($dates as $n => $date) {
                foreach (['armed', 'unarmed'] as $weapon) {
                    $rule = $rules[$n <= 115 ? 'legacy' : 'guide_2026']['basic'][$weapon];
                    if (! ScoringPeriod::where('education_type', 'basic')->where('weapon_status', $weapon)->where('number', $n)->exists()) {
                        $action->period($actor, ['scoring_rule_id' => $rule->id, 'number' => $n, 'exam_date' => $date, 'source_url' => $n >= 119 ? 'https://www.egm.gov.tr/ozelguvenlik/2026-sinav-takvimi' : ($n === 114 ? $guide114 : ($n === 104 ? $guide104 : $faq))]);
                    }
                }
            }
            foreach ([[80, 104, '2023-08-26', $guide104], [90, 114, '2025-04-12', $guide114], [99, 123, '2026-10-24', $guide]] as [$number,$basic,$date,$source]) {
                foreach (['armed', 'unarmed'] as $weapon) {
                    if (! ScoringPeriod::where('education_type', 'renewal')->where('weapon_status', $weapon)->where('number', $number)->exists()) {
                        $action->period($actor, ['scoring_rule_id' => $rules[$basic <= 115 ? 'legacy' : 'guide_2026']['renewal'][$weapon]->id, 'number' => $number, 'exam_date' => $date, 'source_url' => $source]);
                    }
                }
            }
            if (! ScoringPeriod::where('education_type', 'weapon_difference')->where('number', 104)->exists()) {
                $action->period($actor, ['scoring_rule_id' => $rules['legacy']['weapon_difference']['armed']->id, 'number' => 104, 'exam_date' => '2023-08-26', 'source_url' => $guide104]);
            }
            $links = 0;
            if ($this->option('link-existing')) {
                foreach ($existing as $e) {
                    $p = ScoringPeriod::where('education_type', 'basic')->where('weapon_status', $e->weapon_status)->where('number', (int) $e->exam_number)->first();
                    if ($p && ! DB::table('official_exam_scoring')->where('official_exam_id', $e->id)->exists()) {
                        $action->link($actor, $e, $p->id);
                        $links++;
                    }
                }
            }

            return ['rules' => ScoringRule::count(), 'periods' => ScoringPeriod::count(), 'new_links' => $links];
        });
        $this->info(json_encode($counts, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        return self::SUCCESS;
    }
}
