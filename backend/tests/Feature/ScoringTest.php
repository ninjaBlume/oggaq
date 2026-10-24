<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Identity\Actions\DeleteAccount;
use App\Modules\Identity\Actions\ExportAccountData;
use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\OfficialExam;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\Scoring\Actions\ManageScoring;
use App\Modules\Scoring\ExamScoringService;
use App\Modules\Scoring\Models\ExamScoreResult;
use App\Modules\Scoring\Models\ScoringPeriod;
use App\Modules\Scoring\Models\ScoringRule;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ScoringTest extends TestCase
{
    use RefreshDatabase;

    private function config(string $kind = 'armed'): array
    {
        $u = $kind === 'unarmed';

        return ['general_count' => 100, 'weapon_count' => $u ? 0 : 25, 'shooting_count' => $u ? 0 : 5, 'general_maximum' => 100, 'weapon_maximum' => $u ? 0 : 50, 'shooting_maximum' => $u ? 0 : 50, 'general_weight' => $u ? 10000 : 5000, 'weapon_weight' => $u ? 0 : 2500, 'shooting_weight' => $u ? 0 : 2500, 'requires_previous' => false, 'decision_mode' => 'pass_fail', 'minimums' => $u ? ['general' => 60] : ['general' => 50, 'weapon_total' => 50, 'total' => 60], 'decimals' => 2, 'formula' => 'Sentetik test; resmî mevzuat testi değildir.'];
    }

    private function rule(array $config = [], array $extra = []): ScoringRule
    {
        return new ScoringRule(['id' => (string) Str::uuid(), 'code' => 'synthetic', 'version' => 1, 'title' => 'Sentetik puanlama', 'education_type' => 'basic', 'weapon_status' => 'armed', 'effective_from' => '2022-01-01', 'effective_until' => '2025-06-29', 'period_from' => 100, 'period_until' => 115, 'configuration' => array_replace($this->config(), $config), 'source_urls' => ['https://www.egm.gov.tr/ozelguvenlik/sinav-sikca-sorulan-sorular'], 'verification_note' => 'Sentetik test; gerçek kullanıcı veya resmî dönem verisi değildir.', 'created_at' => now(), ...$extra]);
    }

    private function input(array $extra = []): array
    {
        return array_replace(['general_correct' => 70, 'general_wrong' => 10, 'weapon_correct' => 15, 'weapon_wrong' => 5, 'shooting_hits' => 2, 'previous_general_score' => null], $extra);
    }

    private function period(User $admin, array $config = [], array $extra = []): ScoringPeriod
    {
        $r = $this->rule($config, $extra);
        $r->created_by = $admin->id;
        $r->published_at = now();
        $r->save();

        return ScoringPeriod::create(['education_type' => $r->education_type, 'weapon_status' => $r->weapon_status, 'number' => 104, 'exam_date' => '2023-08-26', 'source_url' => 'https://www.egm.gov.tr', 'scoring_rule_id' => $r->id, 'created_at' => now()])->load('rule');
    }

    public function test_legacy_boundaries_full_zero_and_wrong_answers(): void
    {
        $e = app(ExamScoringService::class);
        $r = $this->rule();
        $out = $e->calculate($r, $this->input());
        $this->assertSame(60.0, $out['final_score']);
        $this->assertTrue($out['passed']);
        $this->assertFalse($e->calculate($r, $this->input(['general_correct' => 49, 'weapon_correct' => 25, 'weapon_wrong' => 0, 'shooting_hits' => 5]))['passed']);
        $this->assertSame(100.0, $e->calculate($r, $this->input(['general_correct' => 100, 'general_wrong' => 0, 'weapon_correct' => 25, 'weapon_wrong' => 0, 'shooting_hits' => 5]))['final_score']);
        $this->assertSame(0.0, $e->calculate($r, $this->input(['general_correct' => 0, 'general_wrong' => 100, 'weapon_correct' => 0, 'weapon_wrong' => 25, 'shooting_hits' => 0]))['final_score']);
        $this->assertSame($out['final_score'], $e->calculate($r, $this->input(['general_wrong' => 30, 'weapon_wrong' => 10]))['final_score']);
        $u = $this->rule($this->config('unarmed'), ['weapon_status' => 'unarmed']);
        foreach ([60 => true, 59 => false] as $n => $pass) {
            $this->assertSame($pass, $e->calculate($u, $this->input(['general_correct' => $n, 'weapon_correct' => 0, 'weapon_wrong' => 0, 'shooting_hits' => null]))['passed']);
        }
    }

    public function test_missing_shooting_never_becomes_zero_or_definite_failure(): void
    {
        $out = app(ExamScoringService::class)->calculate($this->rule(), $this->input(['shooting_hits' => null]));
        $this->assertNull($out['final_score']);
        $this->assertNull($out['passed']);
        $this->assertSame('awaiting_shooting', $out['status']);
        $this->assertSame(50.0, $out['minimum_score']);
        $this->assertSame(75.0, $out['maximum_score']);
    }

    public function test_renewal_is_level_assessment_and_weapon_difference_requires_previous_score(): void
    {
        $e = app(ExamScoringService::class);
        foreach (['armed', 'unarmed'] as $kind) {
            $c = $this->config($kind);
            $c['decision_mode'] = 'level';
            $c['minimums'] = [];
            $out = $e->calculate($this->rule($c, ['education_type' => 'renewal', 'weapon_status' => $kind]), $this->input(['general_correct' => 0, 'weapon_correct' => 0, 'weapon_wrong' => 0, 'shooting_hits' => $kind === 'armed' ? 0 : null]));
            $this->assertSame('level', $out['status']);
            $this->assertNull($out['passed']);
        }
        $r = $this->rule(['general_count' => 0, 'requires_previous' => true, 'minimums' => ['weapon_total' => 50, 'total' => 60]], ['education_type' => 'weapon_difference']);
        $out = $e->calculate($r, $this->input(['general_correct' => 0, 'general_wrong' => 0, 'previous_general_score' => 70, 'weapon_correct' => 20, 'shooting_hits' => 1]));
        $this->assertSame(60.0, $out['final_score']);
        $this->assertTrue($out['passed']);
        $out = $e->calculate($r, $this->input(['general_correct' => 0, 'general_wrong' => 0]));
        $this->assertSame('awaiting_previous_score', $out['status']);
        $this->assertNull($out['passed']);
    }

    public function test_synthetic_new_model_is_independent_and_rounding_does_not_change_thresholds(): void
    {
        $e = app(ExamScoringService::class);
        $r = $this->rule(['general_count' => 80, 'weapon_count' => 20, 'weapon_maximum' => 100, 'shooting_maximum' => 100, 'minimums' => ['general' => 60, 'weapon' => 60, 'shooting' => 60]], ['period_from' => 124, 'period_until' => 200, 'effective_from' => '2027-01-01', 'effective_until' => null]);
        $out = $e->calculate($r, $this->input(['general_correct' => 48, 'general_wrong' => 0, 'weapon_correct' => 12, 'weapon_wrong' => 0, 'shooting_hits' => 3]));
        $this->assertSame(60.0, $out['final_score']);
        $this->assertTrue($out['passed']);
        $this->assertFalse($e->calculate($r, $this->input(['general_correct' => 80, 'general_wrong' => 0, 'weapon_correct' => 20, 'weapon_wrong' => 0, 'shooting_hits' => 2]))['passed']);
        $c = $this->config('unarmed');
        $c['general_count'] = 3;
        $c['minimums'] = ['general' => 67];
        $c['decimals'] = 0;
        $out = $e->calculate($this->rule($c, ['weapon_status' => 'unarmed']), $this->input(['general_correct' => 2, 'general_wrong' => 0, 'weapon_correct' => 0, 'weapon_wrong' => 0, 'shooting_hits' => null]));
        $this->assertSame(67.0, $out['final_score']);
        $this->assertFalse($out['passed']);
        $out = $e->calculate($this->rule(['decision_mode' => 'unverified', 'minimums' => []]), $this->input());
        $this->assertSame('unverified', $out['status']);
        $this->assertNull($out['passed']);
    }

    public function test_api_validates_inputs_and_saves_private_idempotent_history(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $p = $this->period($admin);
        $student = $this->createUser();
        $this->asToken($student);
        $body = $this->input() + ['period_id' => $p->id, 'id' => (string) Str::uuid()];
        $this->postJson('/api/v1/me/score-calculations/preview', $body)->assertOk()->assertJsonPath('data.final_score', 60);
        $this->assertDatabaseCount('exam_score_results', 0);
        foreach ([['general_correct' => 101], ['general_wrong' => 40], ['weapon_correct' => 26], ['shooting_hits' => 6], ['shooting_hits' => -1]] as $bad) {
            $this->postJson('/api/v1/me/score-calculations/preview', array_replace($body, $bad))->assertUnprocessable();
        }
        $this->postJson('/api/v1/me/score-calculations', $body)->assertCreated();
        $this->postJson('/api/v1/me/score-calculations', $body)->assertOk();
        $this->assertDatabaseCount('exam_score_results', 1);
        $this->postJson('/api/v1/me/score-calculations', array_replace($body, ['general_correct' => 71]))->assertConflict();
        $this->getJson('/api/v1/me/score-calculations')->assertJsonCount(1, 'data');
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/me/score-calculations')->assertJsonCount(0, 'data');
        $this->postJson('/api/v1/me/score-calculations', $body)->assertConflict();
        $this->getJson('/api/v1/admin/scoring-rules')->assertForbidden();
    }

    public function test_rule_management_is_platform_only_versioned_and_checks_date_overlap(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $this->asToken($admin);
        $r = $this->rule();
        $body = $r->only(['code', 'title', 'education_type', 'weapon_status', 'period_from', 'period_until', 'configuration', 'source_urls', 'verification_note']);
        $body += ['effective_from' => '2022-01-01', 'effective_until' => '2025-06-29'];
        $id = $this->postJson('/api/v1/admin/scoring-rules', $body)->assertCreated()->json('data.id');
        $this->postJson('/api/v1/admin/scoring-rules/'.$id.'/publish', [])->assertUnprocessable();
        $this->postJson('/api/v1/admin/scoring-rules/'.$id.'/publish', ['source_verified' => true])->assertOk();
        $this->putJson('/api/v1/admin/scoring-rules/'.$id, $body)->assertConflict();
        $other = $this->postJson('/api/v1/admin/scoring-rules', $body)->assertCreated()->assertJsonPath('data.version', 2)->json('data.id');
        $this->postJson('/api/v1/admin/scoring-rules/'.$other.'/publish', ['source_verified' => true])->assertUnprocessable();
        $this->postJson('/api/v1/admin/scoring-rules', array_replace($body, ['effective_until' => '2021-01-01']))->assertUnprocessable();
        $this->postJson('/api/v1/admin/scoring-rules/'.$id.'/archive')->assertOk();
        $this->postJson('/api/v1/admin/scoring-rules/'.$other.'/publish', ['source_verified' => true])->assertOk();
        $this->asToken($this->createUser());
        $this->postJson('/api/v1/admin/scoring-rules', $body)->assertForbidden();
    }

    public function test_exam_uses_server_section_counts_and_appends_shooting_without_regrading_history(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $p = $this->period($admin, ['general_count' => 2, 'weapon_count' => 1]);
        $source = QuestionSource::create(['title' => 'Sentetik puanlama test kaynağı']);
        $subject = Subject::create(['name' => 'Sentetik puan dersi', 'code' => 'synthetic-score']);
        $type = ExamType::create(['name' => 'Sentetik Deneme', 'code' => 'synthetic-score']);
        $versions = [];
        foreach (range(1, 3) as $i) {
            $q = app(SaveQuestion::class)->execute($admin, ['source_id' => $source->id, 'subject_id' => $subject->id, 'stem' => 'Sentetik puan sorusu '.$i, 'options' => ['Doğru', 'Yanlış'], 'correct_option_position' => 1]);
            $q = app(PublishQuestion::class)->execute($admin, $q, $q->revision);
            $versions[] = $q->published_version_id;
        }
        $official = app(SaveOfficialExam::class)->execute($admin, ['exam_type_id' => $type->id, 'title' => 'Sentetik 3 soruluk sınav', 'year' => 2023, 'exam_number' => '104', 'weapon_status' => 'armed', 'question_version_ids' => $versions, 'scoring_period_id' => $p->id]);
        app(PublishOfficialExam::class)->execute($admin, $official);
        $student = $this->createUser();
        $this->asToken($student);
        $context = $student->studyContexts()->firstOrFail()->id;
        $path = '/api/v1/contexts/'.$context.'/exam-attempts';
        $exam = $this->postJson($path, ['id' => (string) Str::uuid(), 'official_exam_id' => $official->id, 'duration_seconds' => 600])->assertOk()->assertJsonPath('data.score_result', null)->json('data');
        foreach ($exam['questions'] as $i => $answer) {
            $exam = $this->putJson($path.'/'.$exam['id'].'/answers/'.$answer['id'], ['base_version' => $exam['revision'], 'selected_option_id' => $answer['question']['options'][$i === 1 ? 1 : 0]['id']])->assertOk()->json('data');
        }
        $done = $this->postJson($path.'/'.$exam['id'].'/finish', ['base_version' => $exam['revision']])->assertOk()->assertJsonPath('data.score_result.output.status', 'awaiting_shooting')->assertJsonPath('data.score_result.output.passed', null)->json('data');
        $body = ['id' => (string) Str::uuid(), 'shooting_hits' => 3, 'previous_general_score' => null];
        $this->postJson($path.'/'.$exam['id'].'/score', $body + ['general_correct' => 100])->assertUnprocessable();
        $saved = $this->postJson($path.'/'.$exam['id'].'/score', $body)->assertCreated()->assertJsonPath('data.output.final_score', 65)->assertJsonPath('data.output.passed', true)->json('data');
        $this->postJson($path.'/'.$exam['id'].'/score', $body)->assertJsonPath('data.id', $saved['id']);
        $this->assertDatabaseCount('exam_score_results', 2);
        $this->getJson($path.'/'.$exam['id'])->assertJsonPath('data.score_result.id', $saved['id'])->assertJsonPath('data.result.score_percent', $done['result']['score_percent']);
        $this->assertSame('awaiting_shooting', ExamScoreResult::findOrFail($done['score_result']['id'])->output['status']);
        $this->asToken($this->createUser());
        $this->postJson($path.'/'.$exam['id'].'/score', $body)->assertNotFound();
        $this->asToken($admin);
        app(ManageScoring::class)->archive($admin, $p->scoring_rule_id);
        $incompatible = $this->rule([], ['version' => 2]);
        $incompatible->published_at = now();
        $incompatible->save();
        $this->putJson('/api/v1/admin/scoring-periods/'.$p->id, ['scoring_rule_id' => $incompatible->id, 'number' => 104, 'exam_date' => '2023-08-26', 'source_url' => 'https://www.egm.gov.tr'])->assertUnprocessable();
        $this->assertSame($p->scoring_rule_id, $p->fresh()->scoring_rule_id);
    }

    public function test_full_exam_with_63_general_and_13_weapon_correct_scores_both_variants_from_saved_answers(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $this->artisan('scoring:install-verified')->assertSuccessful();
        $period = ScoringPeriod::where('education_type', 'basic')->where('weapon_status', 'armed')->where('number', 104)->firstOrFail();
        $source = QuestionSource::create(['title' => 'Sentetik 63/13 puanlama test kaynağı']);
        $subject = Subject::create(['name' => 'Sentetik puanlama dersi', 'code' => 'synthetic-63-13']);
        $type = ExamType::create(['name' => 'Sentetik deneme', 'code' => 'synthetic-63-13']);
        $versions = [];
        foreach (range(1, 125) as $position) {
            $question = app(SaveQuestion::class)->execute($admin, ['source_id' => $source->id, 'subject_id' => $subject->id, 'stem' => 'Sentetik 63/13 sorusu '.$position, 'options' => ['Doğru', 'Yanlış'], 'correct_option_position' => 1]);
            $question = app(PublishQuestion::class)->execute($admin, $question, $question->revision);
            $versions[] = $question->published_version_id;
        }
        $official = app(SaveOfficialExam::class)->execute($admin, ['exam_type_id' => $type->id, 'source_id' => $source->id, 'title' => 'Sentetik 63/13 denemesi', 'year' => 2023, 'exam_number' => '104', 'weapon_status' => 'armed', 'generate_unarmed' => true, 'question_version_ids' => $versions, 'scoring_period_id' => $period->id]);
        app(PublishOfficialExam::class)->execute($admin, $official);
        $unarmed = OfficialExam::where('derived_from_id', $official->id)->firstOrFail();
        $student = $this->createUser();
        $this->asToken($student);
        $path = '/api/v1/contexts/'.$student->studyContexts()->firstOrFail()->id.'/exam-attempts';
        $complete = function (OfficialExam $template) use ($path): array {
            $exam = $this->postJson($path, ['id' => (string) Str::uuid(), 'official_exam_id' => $template->id, 'duration_seconds' => 3600])->assertOk()->json('data');
            foreach ($exam['questions'] as $index => $answer) {
                $position = $index + 1;
                if ($position === 114) {
                    continue; // One blank in the weapon section; no blank in the first 100.
                }
                $this->travel(2)->seconds(); // Simulate answering time without bypassing API throttling.
                $correct = $position <= 63 || ($position >= 101 && $position <= 113);
                $exam = $this->putJson($path.'/'.$exam['id'].'/answers/'.$answer['id'], ['base_version' => $exam['revision'], 'selected_option_id' => $answer['question']['options'][$correct ? 0 : 1]['id']])->assertOk()->json('data');
            }

            return $this->postJson($path.'/'.$exam['id'].'/finish', ['base_version' => $exam['revision']])->assertOk()->json('data');
        };
        $armed = $complete($official);
        $this->assertSame(76, $armed['result']['correct']);
        $this->assertSame(48, $armed['result']['incorrect']);
        $this->assertSame(1, $armed['result']['blank']);
        $this->assertEquals(60.8, $armed['result']['score_percent']);
        $score = $armed['score_result']['output'];
        $this->assertEquals(['general_correct' => 63, 'general_wrong' => 37, 'weapon_correct' => 13, 'weapon_wrong' => 11, 'shooting_hits' => null, 'previous_general_score' => null], $armed['score_result']['input']);
        $this->assertSame([63, 13, null], array_column($score['sections'], 'correct'));
        $this->assertSame([37, 11, 0], array_column($score['sections'], 'wrong'));
        $this->assertSame([0, 1, 0], array_column($score['sections'], 'blank'));
        $this->assertEquals([63, 26, null], array_column($score['sections'], 'score'));
        $this->assertNull($score['final_score']);
        $this->assertNull($score['passed']);
        $this->assertSame('awaiting_shooting', $score['status']);
        $this->assertSame(44.5, $score['minimum_score']);
        $this->assertSame(69.5, $score['maximum_score']);
        foreach ([44.5, 49.5, 54.5, 59.5, 64.5, 69.5] as $hits => $expected) {
            $this->postJson($path.'/'.$armed['id'].'/score', ['id' => (string) Str::uuid(), 'shooting_hits' => $hits])->assertCreated()->assertJsonPath('data.output.final_score', $expected)->assertJsonPath('data.output.passed', $hits >= 4);
        }
        $this->getJson($path.'/'.$armed['id'])->assertOk()->assertJsonPath('data.result.correct', 76)->assertJsonPath('data.result.incorrect', 48)->assertJsonPath('data.result.blank', 1)->assertJsonPath('data.result.score_percent', 60.8)->assertJsonPath('data.score_result.output.final_score', 69.5);
        $this->assertSame('awaiting_shooting', ExamScoreResult::findOrFail($armed['score_result']['id'])->output['status']);
        $withoutWeapon = $complete($unarmed);
        $this->assertSame(100, $withoutWeapon['question_count']);
        $this->assertSame(63, $withoutWeapon['result']['correct']);
        $this->assertSame(37, $withoutWeapon['result']['incorrect']);
        $this->assertSame(0, $withoutWeapon['result']['blank']);
        $this->assertEquals(63, $withoutWeapon['result']['score_percent']);
        $this->assertEquals(63, $withoutWeapon['score_result']['output']['final_score']);
        $this->assertTrue($withoutWeapon['score_result']['output']['passed']);
        $this->assertCount(1, $withoutWeapon['score_result']['output']['sections']);
        $this->assertDatabaseCount('exam_score_results', 8);
    }

    public function test_verified_install_is_idempotent_and_keeps_unconfirmed_models_in_draft(): void
    {
        $this->createUser(['platform_role' => 'platform_admin']);
        $this->artisan('scoring:install-verified')->assertSuccessful();
        $count = ScoringRule::count();
        $periods = ScoringPeriod::count();
        $this->artisan('scoring:install-verified')->assertSuccessful();
        $this->assertDatabaseCount('scoring_rules', $count);
        $this->assertDatabaseCount('scoring_periods', $periods);
        $this->assertSame(4, ScoringRule::whereNull('published_at')->count());
        $modern = ScoringRule::where('code', 'regulation_2025_basic_armed')->firstOrFail();
        $this->assertDatabaseMissing('scoring_periods', ['scoring_rule_id' => $modern->id]);
        $current = ScoringPeriod::with('rule')->where('education_type', 'basic')->where('weapon_status', 'armed')->where('number', 123)->firstOrFail();
        $this->assertSame('unverified', $current->rule->configuration['decision_mode']);
        $this->assertDatabaseMissing('scoring_periods', ['education_type' => 'weapon_difference', 'number' => 123]);
        $renewal = ScoringPeriod::with('rule')->where('education_type', 'renewal')->where('weapon_status', 'unarmed')->where('number', 99)->firstOrFail();
        $this->assertSame('level', $renewal->rule->configuration['decision_mode']);
        $difference = ScoringRule::where('education_type', 'weapon_difference')->firstOrFail();
        $out = app(ExamScoringService::class)->calculate($difference, $this->input(['general_correct' => 0, 'general_wrong' => 0, 'weapon_correct' => 25, 'weapon_wrong' => 0, 'shooting_hits' => 5, 'previous_general_score' => 59]));
        $this->assertFalse($out['passed']);
        $this->assertSame(79.5, $out['final_score']);
    }

    public function test_period_rebinding_preserves_existing_manual_calculations_and_retries(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $p = $this->period($admin);
        $this->asToken($admin);
        $body = $this->input() + ['period_id' => $p->id, 'expected_rule_id' => $p->scoring_rule_id, 'id' => (string) Str::uuid()];
        $old = $this->postJson('/api/v1/me/score-calculations', $body)->assertCreated()->json('data');
        app(ManageScoring::class)->archive($admin, $p->scoring_rule_id);
        $replacement = $this->rule(['decision_mode' => 'unverified', 'minimums' => []], ['version' => 2]);
        $replacement->published_at = now();
        $replacement->save();
        $this->putJson('/api/v1/admin/scoring-periods/'.$p->id, ['scoring_rule_id' => $replacement->id, 'number' => 104, 'exam_date' => '2023-08-26', 'source_url' => 'https://www.egm.gov.tr'])->assertOk();
        $this->postJson('/api/v1/me/score-calculations', $body)->assertOk()->assertJsonPath('data.output.status', 'passed')->assertJsonPath('data.output.rule_id', $old['output']['rule_id']);
        $body['id'] = (string) Str::uuid();
        $this->postJson('/api/v1/me/score-calculations/preview', $body)->assertStatus(409)->assertJsonPath('code', 'scoring_rule_changed');
        $this->postJson('/api/v1/me/score-calculations', $body)->assertStatus(409)->assertJsonPath('code', 'scoring_rule_changed');
        $this->assertDatabaseMissing('exam_score_results', ['id' => $body['id']]);
        $body['expected_rule_id'] = $replacement->id;
        $this->postJson('/api/v1/me/score-calculations', $body)->assertCreated()->assertJsonPath('data.output.status', 'unverified');
        $this->assertSame('passed', ExamScoreResult::findOrFail($old['id'])->output['status']);
    }

    public function test_private_score_data_is_exported_and_erased_with_the_account(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $p = $this->period($admin);
        $user = $this->createUser();
        $this->asToken($user);
        $this->postJson('/api/v1/me/score-calculations', $this->input() + ['period_id' => $p->id, 'id' => (string) Str::uuid()])->assertCreated();
        $request = Request::create('/');
        $raw = '';
        app(ExportAccountData::class)->write($user, $request, function ($part) use (&$raw) {
            $raw .= $part;
        });
        $data = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        $this->assertCount(1, $data['score_calculations']);
        DB::transaction(fn () => app(DeleteAccount::class)->erasePersonalData($user));
        $this->assertDatabaseCount('exam_score_results', 0);
    }

    public function test_database_protects_published_rules_and_calculated_score_history(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $p = $this->period($admin);
        $this->asToken($admin);
        $id = $this->postJson('/api/v1/me/score-calculations', $this->input() + ['period_id' => $p->id, 'id' => (string) Str::uuid()])->assertCreated()->json('data.id');
        foreach ([fn () => DB::table('scoring_rules')->where('id', $p->scoring_rule_id)->update(['title' => 'Changed']), fn () => DB::table('exam_score_results')->where('id', $id)->update(['output' => json_encode(['final_score' => 100])]), fn () => DB::table('exam_score_results')->where('id', $id)->delete()] as $write) {
            try {
                DB::transaction($write);
                $this->fail('Immutable update accepted');
            } catch (QueryException $e) {
                $this->assertSame('23514', $e->getCode());
            }
        }
    }
}
