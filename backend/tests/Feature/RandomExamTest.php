<?php

namespace Tests\Feature;

use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionVersion;
use App\Modules\Scoring\Models\ScoringPeriod;
use App\Modules\Scoring\Models\ScoringRule;
use App\Modules\Tenancy\Actions\RevokeMembership;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\Support\RandomExamPool;
use Tests\TestCase;

class RandomExamTest extends TestCase
{
    use RefreshDatabase;

    private function pool(string $education = 'basic', int $number = 122): array
    {
        return RandomExamPool::create($this->createUser(['platform_role' => 'platform_admin']), $education, $number);
    }

    private function student(): string
    {
        $user = $this->createUser();
        $this->asToken($user);

        return $user->studyContexts()->firstOrFail()->id;
    }

    private function start(string $context, array $input = []): array
    {
        return $this->postJson('/api/v1/contexts/'.$context.'/random-exam', $input + ['id' => (string) Str::uuid(),
            'education_type' => 'basic', 'weapon_status' => 'armed', 'duration_seconds' => 9000])->assertOk()->json('data');
    }

    public function test_fixed_counts_weighted_sections_pinned_versions_and_resume_are_authoritative(): void
    {
        $pool = $this->pool();
        $context = $this->student();
        $this->getJson('/api/v1/contexts/'.$context.'/random-exam')->assertOk()->assertJsonPath('data', null);
        $exam = $this->start($context);
        $this->assertCount(125, $exam['questions']);
        $this->assertCount(125, array_unique(array_column($exam['questions'], 'question_id')));
        $this->assertSame($pool['reference']->id, $exam['random_exam']['reference_exam_id']);
        $this->assertSame([60, 40, 25], array_column($exam['random_exam']['distribution'], 'question_count'));
        foreach ($exam['questions'] as $i => $question) {
            $this->assertContains($question['question']['id'], $pool['versions']);
            $this->assertSame($i < 100 ? false : true, $question['question']['subject_id'] === $pool['subjects'][2]->id);
        }
        $again = $this->start($context, ['education_type' => 'renewal', 'weapon_status' => 'weapon_difference']);
        $this->assertSame($exam['id'], $again['id']);
        $this->assertSame($exam['questions'], $again['questions']);
        $this->getJson('/api/v1/contexts/'.$context.'/random-exam')->assertOk()->assertJsonPath('data.id', $exam['id'])->assertJsonMissingPath('data.questions');
        $this->assertDatabaseCount('exam_attempts', 1);
    }

    public function test_account_export_preserves_random_exam_identity_and_distribution_without_exposing_another_users_exam(): void
    {
        $this->pool();
        $otherContext = $this->student();
        $other = $this->start($otherContext);
        $context = $this->student();
        $mine = $this->start($context, ['weapon_status' => 'weapon_difference']);
        $raw = $this->post('/api/v1/me/export', ['current_password' => self::PASSWORD], ['Accept' => 'application/json'])->assertOk()->streamedContent();
        $data = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        $this->assertCount(1, $data['exam_attempts']);
        $this->assertSame($context, $data['exam_attempts'][0]['context_id']);
        $this->assertSame('basic', $data['exam_attempts'][0]['random_exam']['education_type']);
        $this->assertSame('weapon_difference', $data['exam_attempts'][0]['random_exam']['weapon_status']);
        $this->assertEquals($mine['random_exam']['distribution'], $data['exam_attempts'][0]['random_exam']['distribution']);
        $this->assertStringNotContainsString($otherContext, $raw);
        $this->assertStringNotContainsString($other['id'], $raw);
    }

    public function test_finishing_with_blanks_releases_the_slot_and_old_operation_retry_never_creates_another_exam(): void
    {
        $this->pool();
        $context = $this->student();
        $operation = (string) Str::uuid();
        $exam = $this->start($context, ['id' => $operation, 'weapon_status' => 'unarmed']);
        $this->assertCount(100, $exam['questions']);
        $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$exam['id'].'/finish', ['base_version' => $exam['revision']])->assertOk()->assertJsonPath('data.result.blank', 100);
        $new = $this->start($context, ['weapon_status' => 'weapon_difference']);
        $this->assertNotSame($exam['id'], $new['id']);
        $this->assertCount(25, $new['questions']);
        $this->assertSame('weapon', $new['random_exam']['distribution'][0]['section']);
        $old = $this->start($context, ['id' => $operation, 'weapon_status' => 'unarmed']);
        $this->assertSame($exam['id'], $old['id']);
        $this->assertSame('completed', $old['status']);
        $this->assertSame($exam['id'], $this->start($context, ['id' => $operation, 'weapon_status' => 'unarmed', 'duration_seconds' => '9000'])['id']);
        $this->assertDatabaseCount('exam_attempts', 2);
    }

    public function test_expired_exam_releases_slot_but_paused_exam_stays_the_same(): void
    {
        $this->pool();
        $context = $this->student();
        $old = $this->start($context, ['duration_seconds' => 60]);
        $this->travel(61)->seconds();
        $this->getJson('/api/v1/contexts/'.$context.'/random-exam')->assertOk()->assertJsonPath('data', null);
        $this->assertDatabaseHas('exam_attempts', ['id' => $old['id'], 'finish_reason' => 'expired']);
        $paused = $this->start($context, ['duration_seconds' => 60, 'timer_policy' => 'pause_on_exit']);
        $this->travel(100)->minutes();
        $this->assertSame($paused['id'], $this->start($context)['id']);
        $this->assertDatabaseCount('exam_attempts', 2);
    }

    public function test_education_pools_are_separate_and_missing_reference_is_atomic(): void
    {
        $pool = $this->pool('renewal', 98);
        $context = $this->student();
        $this->postJson('/api/v1/contexts/'.$context.'/random-exam', ['id' => (string) Str::uuid(), 'education_type' => 'basic', 'weapon_status' => 'armed', 'duration_seconds' => 9000])->assertUnprocessable();
        $this->assertDatabaseCount('exam_attempts', 0);
        $exam = $this->start($context, ['education_type' => 'renewal']);
        $this->assertSame('renewal', $exam['random_exam']['education_type']);
        foreach ($exam['questions'] as $row) {
            $this->assertContains($row['question']['id'], $pool['versions']);
        }
    }

    public function test_other_users_and_revoked_tenants_cannot_resume_or_create(): void
    {
        $pool = $this->pool();
        $owner = $this->createUser();
        $this->asToken($owner);
        $context = $owner->studyContexts()->firstOrFail()->id;
        $exam = $this->start($context);
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/contexts/'.$context.'/random-exam')->assertNotFound();
        $this->postJson('/api/v1/contexts/'.$context.'/random-exam', ['id' => $exam['id'], 'education_type' => 'basic', 'weapon_status' => 'armed', 'duration_seconds' => 9000])->assertNotFound();
        $tenant = Tenant::create(['name' => 'Sentetik kurum', 'slug' => 'random-test']);
        $membership = $this->createMembership($owner, $tenant);
        $tenantContext = $owner->studyContexts()->where('membership_id', $membership->id)->firstOrFail()->id;
        $this->asToken($owner);
        $this->start($tenantContext);
        app(RevokeMembership::class)->execute($pool['admin'], $tenant, $membership->id);
        $this->getJson('/api/v1/contexts/'.$tenantContext.'/random-exam')->assertForbidden();
        $this->postJson('/api/v1/contexts/'.$tenantContext.'/random-exam', ['id' => (string) Str::uuid(), 'education_type' => 'basic', 'weapon_status' => 'armed', 'duration_seconds' => 9000])->assertForbidden();
        $this->getJson('/api/v1/contexts/'.$context.'/random-exam')->assertOk()->assertJsonPath('data.id', $exam['id']);
    }

    public function test_database_rejects_second_open_random_and_changing_distribution(): void
    {
        $this->pool();
        $context = $this->student();
        $exam = $this->start($context);
        try {
            DB::transaction(fn () => DB::table('exam_attempts')->where('id', $exam['id'])->update(['random_distribution' => '[]', 'revision' => 2]));
            $this->fail('Random snapshot changed');
        } catch (QueryException $e) {
            $this->assertSame('23514', $e->getCode());
        }
        $copy = (array) DB::table('exam_attempts')->where('id', $exam['id'])->first();
        $copy['id'] = (string) Str::uuid();
        try {
            DB::transaction(fn () => DB::table('exam_attempts')->insert($copy));
            $this->fail('Second active random created');
        } catch (QueryException $e) {
            $this->assertSame('23505', $e->getCode());
        }
        $this->assertDatabaseCount('exam_attempts', 1);
    }

    public function test_reference_order_uses_exam_period_not_import_time(): void
    {
        $pool = $this->pool();
        $older = app(SaveOfficialExam::class)->execute($pool['admin'], ['exam_type_id' => $pool['reference']->exam_type_id,
            'title' => 'Sonradan yüklenen eski sentetik sınav', 'year' => 2026, 'education_type' => 'basic', 'weapon_status' => 'armed',
            'exam_number' => '121', 'question_version_ids' => $pool['versions']]);
        app(PublishOfficialExam::class)->execute($pool['admin'], $older);
        $exam = $this->start($this->student());
        $this->assertSame($pool['reference']->id, $exam['random_exam']['reference_exam_id']);
    }

    public function test_insufficient_topic_quota_does_not_create_partial_attempt(): void
    {
        $pool = $this->pool();
        $version = QuestionVersion::findOrFail($pool['versions'][0]);
        $q = Question::findOrFail($version->question_id);
        $changed = app(SaveQuestion::class)->execute($pool['admin'], ['base_version' => $q->revision, 'subject_id' => $pool['subjects'][2]->id, 'topic_id' => $pool['topics'][2]->id,
            'source_id' => $version->source_id, 'stem' => 'Sentetik yeni konu sınıflaması', 'options' => ['A', 'B'], 'correct_option_position' => 1], $q);
        app(PublishQuestion::class)->execute($pool['admin'], $changed, $changed->revision);
        $context = $this->student();
        $this->postJson('/api/v1/contexts/'.$context.'/random-exam', ['id' => (string) Str::uuid(), 'education_type' => 'basic', 'weapon_status' => 'armed', 'duration_seconds' => 9000])->assertUnprocessable();
        $this->assertDatabaseCount('exam_attempts', 0);
    }

    public function test_random_score_pins_verified_period_and_keeps_weapon_section_and_shooting(): void
    {
        $pool = $this->pool();
        $rule = ScoringRule::create(['code' => 'synthetic-random', 'version' => 1, 'title' => 'Yalnız sentetik puanlama',
            'education_type' => 'basic', 'weapon_status' => 'armed', 'effective_from' => '2026-01-01', 'effective_until' => '2026-12-31',
            'period_from' => 119, 'period_until' => 123, 'source_urls' => ['https://example.test/synthetic-rule'], 'verification_note' => 'Yalnız test; resmî kural değildir.',
            'created_by' => $pool['admin']->id, 'created_at' => now(), 'published_at' => now(),
            'configuration' => ['general_count' => 100, 'weapon_count' => 25, 'shooting_count' => 5, 'general_maximum' => 100, 'weapon_maximum' => 50, 'shooting_maximum' => 50,
                'general_weight' => 5000, 'weapon_weight' => 2500, 'shooting_weight' => 2500, 'requires_previous' => false, 'decision_mode' => 'pass_fail',
                'minimums' => ['general' => 50, 'weapon_total' => 50, 'total' => 60], 'decimals' => 2, 'formula' => 'Sentetik test']]);
        $period = ScoringPeriod::create(['education_type' => 'basic', 'weapon_status' => 'armed', 'number' => 122, 'exam_date' => '2026-08-29',
            'source_url' => 'https://example.test/synthetic-rule', 'scoring_rule_id' => $rule->id, 'created_at' => now()]);
        $context = $this->student();
        $exam = $this->start($context);
        $path = '/api/v1/contexts/'.$context.'/exam-attempts/'.$exam['id'];
        $this->assertTrue($exam['scoring_available']);
        foreach ([0, 100] as $index) {
            $row = $exam['questions'][$index];
            $exam = $this->putJson($path.'/answers/'.$row['id'], ['base_version' => $exam['revision'], 'selected_option_id' => $row['question']['options'][0]['id']])->assertOk()->json('data');
        }
        $done = $this->postJson($path.'/finish', ['base_version' => $exam['revision']])->assertOk()->assertJsonPath('data.score_result.output.status', 'awaiting_shooting')->json('data');
        $this->assertSame($period->id, $done['score_result']['period_id']);
        $this->postJson($path.'/score', ['id' => (string) Str::uuid(), 'shooting_hits' => 4])->assertCreated()
            ->assertJsonPath('data.input.general_correct', 1)->assertJsonPath('data.input.weapon_correct', 1)->assertJsonPath('data.output.final_score', 21.5);
    }

    public function test_untrusted_inputs_cannot_change_counts_or_reference(): void
    {
        $context = $this->student();
        $base = ['id' => (string) Str::uuid(), 'education_type' => 'basic', 'weapon_status' => 'armed', 'duration_seconds' => 9000];
        foreach (['question_count' => 1, 'random_reference_exam_id' => (string) Str::uuid(), 'random_distribution' => []] as $key => $value) {
            $this->postJson('/api/v1/contexts/'.$context.'/random-exam', $base + [$key => $value])->assertUnprocessable();
        }
        $this->assertDatabaseCount('exam_attempts', 0);
    }
}
