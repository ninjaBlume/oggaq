<?php

namespace Tests\Feature;

use App\Modules\Exams\Models\ExamAttempt;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\Tenancy\Actions\RevokeMembership;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExamTest extends TestCase
{
    use RefreshDatabase;

    private function pool(int $count = 3): array
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $subject = Subject::create(['name' => 'Sentetik deneme dersi', 'code' => Str::uuid()]);
        $source = QuestionSource::create(['title' => 'Sentetik test kaynağı']);
        $questions = [];
        for ($i = 0; $i < $count; $i++) {
            $q = app(SaveQuestion::class)->execute($admin, ['source_id' => $source->id, 'subject_id' => $subject->id, 'stem' => 'Sentetik '.$i, 'options' => ['A', 'B'], 'correct_option_position' => 1, 'explanation' => 'Yalnız test açıklaması']);
            $questions[] = app(PublishQuestion::class)->execute($admin, $q, $q->revision);
        }

        return $questions;
    }

    private function start(?string $context = null, array $input = []): array
    {
        $context ??= $this->getJson('/api/v1/me/contexts')->assertOk()->json('data.0.id');

        return $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', $input + ['id' => (string) Str::uuid(), 'question_count' => 3, 'duration_seconds' => 60])->assertOk()->json('data');
    }

    private function url(array $exam, string $suffix = ''): string
    {
        return '/api/v1/contexts/'.$exam['context_id'].'/exam-attempts/'.$exam['id'].$suffix;
    }

    private function answer(array $exam, int $index, ?int $option): array
    {
        $row = $exam['questions'][$index];

        return $this->putJson($this->url($exam, '/answers/'.$row['id']), ['base_version' => $exam['revision'], 'selected_option_id' => $option === null ? null : $row['question']['options'][$option]['id']])->assertOk()->json('data');
    }

    public function test_resume_position_survives_reopening_without_changing_answers_revision_or_deadline(): void
    {
        $this->pool();
        $student = $this->createUser();
        $this->asToken($student);
        $exam = $this->answer($this->start(), 0, 0);
        $this->assertSame(1, $exam['resume_position']);
        $saved = $this->putJson($this->url($exam, '/position'), ['position' => 3])->assertOk()->assertJsonPath('data.resume_position', 3)->json('data');
        $this->assertSame($exam['revision'], $saved['revision']);
        $this->assertSame($exam['deadline_at'], $saved['deadline_at']);
        $again = $this->getJson($this->url($exam))->assertOk()->json('data');
        $this->assertSame(3, $again['resume_position']);
        $this->assertSame($exam['questions'], $again['questions']);
        $this->putJson($this->url($exam, '/position'), ['position' => 0])->assertUnprocessable();
        $this->putJson($this->url($exam, '/position'), ['position' => 4])->assertUnprocessable();
        $this->putJson($this->url($exam, '/position'), ['position' => 1.5])->assertUnprocessable();
        $done = $this->postJson($this->url($exam, '/finish'), ['base_version' => $exam['revision']])->assertOk()->json('data');
        $this->putJson($this->url($exam, '/position'), ['position' => 2])->assertOk()->assertJsonPath('data.resume_position', 3)->assertJsonPath('data.result', $done['result']);
        $this->asToken($this->createUser());
        $this->putJson($this->url($exam, '/position'), ['position' => 1])->assertNotFound();
    }

    public function test_expired_exam_cannot_move_bookmark_or_extend_time(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $this->putJson($this->url($exam, '/position'), ['position' => 2])->assertOk();
        $this->travel(61)->seconds();
        $this->putJson($this->url($exam, '/position'), ['position' => 3])->assertOk()->assertJsonPath('data.status', 'completed')->assertJsonPath('data.resume_position', 2)->assertJsonPath('data.deadline_at', $exam['deadline_at']);
    }

    public function test_snapshot_hides_keys_and_remains_stable_with_unique_questions(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $this->assertSame('active', $exam['status']);
        $this->assertNull($exam['result']);
        $this->assertCount(3, array_unique(array_column($exam['questions'], 'question_id')));
        foreach ($exam['questions'] as $row) {
            $this->assertNull($row['feedback']);
            $this->assertArrayNotHasKey('correct_option_id', $row['question']);
            $this->assertArrayNotHasKey('explanation', $row['question']);
        }
        $again = $this->getJson($this->url($exam))->assertOk()->json('data');
        $this->assertEquals($exam['questions'], $again['questions']);
        $this->assertSame(60, strtotime($exam['deadline_at']) - strtotime($exam['started_at']));
    }

    public function test_all_answers_are_graded_once_and_late_changes_return_immutable_result(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $exam = $this->answer($exam, 0, 0);
        $exam = $this->answer($exam, 1, 1);
        $this->assertNull($exam['questions'][0]['feedback']);
        $body = ['base_version' => $exam['revision']];
        $done = $this->postJson($this->url($exam, '/finish'), $body)->assertOk()->assertJsonPath('data.result.correct', 1)->assertJsonPath('data.result.incorrect', 1)->assertJsonPath('data.result.blank', 1)->assertJsonPath('data.result.score_percent', 33.33)->json('data');
        $this->assertSame('manual', $done['finish_reason']);
        $repeat = $this->postJson($this->url($exam, '/finish'), $body)->assertOk()->json('data');
        $this->assertEquals($done['result'], $repeat['result']);
        $this->assertSame($done['revision'], $repeat['revision']);
        $late = $this->answer($done, 0, 1);
        $this->assertSame($done['questions'], $late['questions']);
        $this->assertDatabaseCount('exam_attempts', 1);
    }

    public function test_answer_can_be_changed_cleared_and_retried_without_duplicate_revision(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $new = $this->answer($exam, 0, 0);
        $again = $this->answer($exam, 0, 0);
        $this->assertSame($new['revision'], $again['revision']);
        $exam = $this->answer($new, 0, 1);
        $exam = $this->answer($exam, 0, null);
        $this->assertSame(4, $exam['revision']);
        $this->postJson($this->url($exam, '/finish'), ['base_version' => 4])->assertOk()->assertJsonPath('data.result.blank', 3)->assertJsonPath('data.result.score_percent', 0);
    }

    public function test_start_retry_returns_same_questions_and_settings_conflict_is_rejected(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $again = $this->start($exam['context_id'], ['id' => $exam['id']]);
        $this->assertSame($exam['questions'], $again['questions']);
        $this->postJson('/api/v1/contexts/'.$exam['context_id'].'/exam-attempts', ['id' => $exam['id'], 'question_count' => 2, 'duration_seconds' => 60])->assertConflict();
        $this->assertDatabaseCount('exam_attempts', 1);
    }

    public function test_stale_revision_conflicts_only_for_the_changed_answer_and_finish_needs_latest(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $new = $this->answer($exam, 0, 0);
        $first = $exam['questions'][0];
        $second = $exam['questions'][1];
        // Another question answered with the pre-change revision is an independent write and succeeds.
        $this->putJson($this->url($exam, '/answers/'.$second['id']), ['base_version' => 1, 'selected_option_id' => $second['question']['options'][1]['id']])->assertOk()->assertJsonPath('data.revision', 3)->assertJsonPath('data.questions.1.selected_option_id', $second['question']['options'][1]['id']);
        // The same question changed to a different value after the client's revision still conflicts.
        $this->putJson($this->url($exam, '/answers/'.$first['id']), ['base_version' => 1, 'selected_option_id' => $first['question']['options'][1]['id']])->assertConflict()->assertJsonPath('code', 'version_conflict');
        // Repeating the already saved value with a stale revision is a safe no-op.
        $this->putJson($this->url($exam, '/answers/'.$first['id']), ['base_version' => 1, 'selected_option_id' => $first['question']['options'][0]['id']])->assertOk()->assertJsonPath('data.revision', 3);
        $this->postJson($this->url($exam, '/finish'), ['base_version' => 1])->assertConflict();
        $this->getJson($this->url($exam))->assertOk()->assertJsonPath('data.revision', 3)->assertJsonPath('data.questions.0.selected_option_id', $new['questions'][0]['selected_option_id']);
    }

    public function test_exam_questions_report_the_contexts_favorites_before_and_after_finishing(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $this->assertSame([false, false, false], array_column($exam['questions'], 'is_favorite'));
        $favorite = $exam['questions'][1]['question_id'];
        $this->putJson('/api/v1/contexts/'.$exam['context_id'].'/favorites/'.$favorite)->assertOk();
        $done = $this->postJson($this->url($exam, '/finish'), ['base_version' => 1])->assertOk()->json('data');
        $this->assertSame([false, true, false], array_column($done['questions'], 'is_favorite'));
        $this->deleteJson('/api/v1/contexts/'.$exam['context_id'].'/favorites/'.$favorite)->assertOk();
        $this->getJson($this->url($exam))->assertOk()->assertJsonPath('data.questions.1.is_favorite', false);
    }

    public function test_deadline_ignores_late_answer_and_ends_at_original_deadline(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $exam = $this->answer($exam, 0, 0);
        $this->travel(61)->seconds();
        $done = $this->answer($exam, 1, 0);
        $this->assertSame('expired', $done['finish_reason']);
        $this->assertSame($exam['deadline_at'], $done['finished_at']);
        $this->assertSame(1, $done['result']['correct']);
        $this->assertSame(2, $done['result']['blank']);
        $this->assertSame(60, $done['result']['elapsed_seconds']);
    }

    public function test_scheduler_completes_abandoned_exam_once(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $this->travel(60)->seconds();
        $this->artisan('exams:expire')->assertSuccessful();
        $this->artisan('exams:expire')->assertSuccessful();
        $this->assertDatabaseHas('exam_attempts', ['id' => $exam['id'], 'finish_reason' => 'expired', 'revision' => 2, 'blank_count' => 3]);
    }

    public function test_opening_an_attempt_expires_it_but_history_listing_never_writes(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $other = $this->start();
        // An attempt without any answer would be abandoned and drop out of the history once it expires.
        $this->answer($exam, 0, 0);
        $this->answer($other, 0, 0);
        $this->travel(60)->seconds();
        $list = '/api/v1/contexts/'.$exam['context_id'].'/exam-attempts';
        $this->getJson($list)->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.status', 'active')->assertJsonPath('data.1.status', 'active')->assertJsonMissingPath('data.0.questions');
        $this->assertDatabaseCount('exam_attempts', 2);
        $this->assertSame(2, ExamAttempt::whereNull('finished_at')->count());
        $this->getJson($this->url($exam))->assertOk()->assertJsonPath('data.status', 'completed');
        $this->artisan('exams:expire')->assertSuccessful();
        $this->getJson($list)->assertOk()->assertJsonPath('data.0.status', 'completed')->assertJsonPath('data.1.status', 'completed');
        $this->assertSame(0, ExamAttempt::whereNull('finished_at')->count());
    }

    public function test_insufficient_pool_rolls_back_all_records(): void
    {
        $this->pool(2);
        $this->asToken($this->createUser());
        $context = $this->getJson('/api/v1/me/contexts')->json('data.0.id');
        $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', ['id' => (string) Str::uuid(), 'question_count' => 3, 'duration_seconds' => 60])->assertUnprocessable()->assertJsonValidationErrors('question_count');
        $this->assertDatabaseCount('exam_attempts', 0);
        $this->assertDatabaseCount('exam_answers', 0);
    }

    public function test_filter_and_new_publication_preserve_original_answer_key(): void
    {
        $pool = $this->pool(1);
        $this->pool(2);
        $this->asToken($this->createUser());
        $old = $pool[0];
        $exam = $this->start(null, ['question_count' => 1, 'subject_id' => $old->publishedVersion->subject_id]);
        $this->assertSame($old->id, $exam['questions'][0]['question_id']);
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $new = app(SaveQuestion::class)->execute($admin, ['source_id' => $old->publishedVersion->source_id, 'subject_id' => $old->publishedVersion->subject_id, 'stem' => 'Yeni metin', 'options' => ['Yeni A', 'Yeni B'], 'correct_option_position' => 2, 'base_version' => $old->revision], $old);
        app(PublishQuestion::class)->execute($admin, $new, $new->revision);
        $exam = $this->answer($exam, 0, 0);
        $this->postJson($this->url($exam, '/finish'), ['base_version' => $exam['revision']])->assertOk()->assertJsonPath('data.result.correct', 1)->assertJsonPath('data.questions.0.question.stem', 'Sentetik 0');
    }

    public function test_foreign_options_client_grades_and_invalid_settings_are_rejected(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $this->putJson($this->url($exam, '/answers/'.$exam['questions'][0]['id']), ['base_version' => 1, 'selected_option_id' => $exam['questions'][1]['question']['options'][0]['id']])->assertUnprocessable();
        $this->putJson($this->url($exam, '/answers/'.$exam['questions'][0]['id']), ['base_version' => 1, 'selected_option_id' => null, 'is_correct' => true])->assertUnprocessable();
        $this->postJson('/api/v1/contexts/'.$exam['context_id'].'/exam-attempts', ['id' => (string) Str::uuid(), 'question_count' => 101, 'duration_seconds' => 0, 'score_percent' => 100])->assertUnprocessable()->assertJsonValidationErrors(['question_count', 'duration_seconds', 'score_percent']);
    }

    public function test_owner_scope_even_for_admin_and_tenant_revocation(): void
    {
        $this->pool();
        $student = $this->createUser();
        $tenant = Tenant::create(['name' => 'Sentetik kurum', 'slug' => 'exam']);
        $membership = $this->createMembership($student, $tenant);
        $this->asToken($student);
        $personal = $this->start();
        $context = $student->studyContexts()->where('tenant_id', $tenant->id)->firstOrFail();
        $company = $this->start($context->id);
        $this->getJson('/api/v1/contexts/'.$personal['context_id'].'/exam-attempts/'.$company['id'])->assertNotFound();
        $this->putJson('/api/v1/contexts/'.$personal['context_id'].'/exam-attempts/'.$company['id'].'/position', ['position' => 2])->assertNotFound();
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $this->asToken($admin);
        $this->getJson($this->url($personal))->assertNotFound();
        $this->getJson($this->url($company))->assertNotFound();
        $this->putJson($this->url($company, '/position'), ['position' => 2])->assertNotFound();
        $this->asToken($student);
        app(RevokeMembership::class)->execute($admin, $tenant, $membership->id);
        $this->getJson($this->url($company))->assertForbidden();
        $this->putJson($this->url($company, '/position'), ['position' => 2])->assertForbidden();
        $this->postJson($this->url($company, '/finish'), ['base_version' => 1])->assertForbidden();
        $this->getJson($this->url($personal))->assertOk();
    }

    public function test_unverified_or_suspended_user_cannot_start(): void
    {
        $this->pool();
        foreach ([['email_verified_at' => null], ['status' => 'suspended']] as $attributes) {
            $user = $this->createUser($attributes);
            $this->asToken($user);
            $this->postJson('/api/v1/contexts/'.$user->studyContexts()->firstOrFail()->id.'/exam-attempts', ['id' => (string) Str::uuid(), 'question_count' => 1, 'duration_seconds' => 60])->assertForbidden();
        }
    }

    public function test_database_rejects_completed_answer_and_result_mutations(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        $this->postJson($this->url($exam, '/finish'), ['base_version' => 1])->assertOk();
        foreach ([fn () => DB::table('exam_answers')->where('id', $exam['questions'][0]['id'])->update(['selected_option_id' => $exam['questions'][0]['question']['options'][0]['id']]), fn () => ExamAttempt::whereKey($exam['id'])->update(['score_percent' => 100, 'revision' => 3])] as $mutation) {
            try {
                DB::transaction($mutation);
                $this->fail('Immutable result changed.');
            } catch (QueryException $error) {
                $this->assertSame('23514', $error->getCode());
            }
        }
    }

    public function test_database_rejects_snapshot_change_wrong_grade_foreign_option_and_deletion(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $exam = $this->start();
        foreach ([fn () => ExamAttempt::whereKey($exam['id'])->update(['duration_seconds' => 120, 'revision' => 2]), fn () => DB::table('exam_answers')->where('id', $exam['questions'][0]['id'])->update(['selected_option_id' => $exam['questions'][0]['question']['options'][0]['id'], 'is_correct' => false]), fn () => DB::table('exam_answers')->where('id', $exam['questions'][0]['id'])->update(['selected_option_id' => $exam['questions'][1]['question']['options'][0]['id']]), fn () => DB::table('exam_answers')->where('id', $exam['questions'][0]['id'])->delete()] as $mutation) {
            try {
                DB::transaction($mutation);
                $this->fail('Invalid snapshot accepted.');
            } catch (QueryException $error) {
                $this->assertContains($error->getCode(), ['23514', '23503']);
            }
        }
    }
}
