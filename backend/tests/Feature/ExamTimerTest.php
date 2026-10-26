<?php

namespace Tests\Feature;

use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class ExamTimerTest extends TestCase
{
    use RefreshDatabase;

    private function start(string $policy = 'pause_on_exit'): array
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $subject = Subject::create(['name' => 'Sentetik süre', 'code' => Str::uuid()]);
        $source = QuestionSource::create(['title' => 'Sentetik test kaynağı']);
        $q = app(SaveQuestion::class)->execute($admin, ['source_id' => $source->id, 'subject_id' => $subject->id, 'stem' => 'Sentetik zaman sorusu', 'options' => ['A', 'B'], 'correct_option_position' => 1]);
        app(PublishQuestion::class)->execute($admin, $q, $q->revision);
        $student = $this->createUser();
        $this->asToken($student);
        $context = $student->studyContexts()->firstOrFail()->id;

        return $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', ['id' => (string) Str::uuid(), 'question_count' => 1, 'duration_seconds' => 120, 'timer_policy' => $policy])->assertOk()->json('data');
    }

    private function url(array $exam, string $suffix = ''): string
    {
        return '/api/v1/contexts/'.$exam['context_id'].'/exam-attempts/'.$exam['id'].$suffix;
    }

    private function timer(array $exam, string $action, string $session): array
    {
        return $this->postJson($this->url($exam, '/timer'), ['action' => $action, 'session_id' => $session])->assertOk()->json('data');
    }

    public function test_student_pause_survives_exit_and_resumes_with_correct_elapsed_result(): void
    {
        $exam = $this->start();
        $session = (string) Str::uuid();
        $this->assertTrue($exam['timer_paused']);
        $this->assertSame(120, $exam['remaining_seconds']);
        $clock = $this->timer($exam, 'resume', $session);
        $this->assertFalse($clock['timer_paused']);
        $this->travel(20)->seconds();
        $clock = $this->timer($exam, 'pause', $session);
        $this->assertTrue($clock['timer_paused']);
        $this->assertSame(100, $clock['remaining_seconds']);
        $this->travel(600)->seconds();
        $this->artisan('exams:expire')->assertSuccessful();
        $this->getJson($this->url($exam))->assertOk()->assertJsonPath('data.status', 'active')->assertJsonPath('data.remaining_seconds', 100);
        $clock = $this->timer($exam, 'resume', $session);
        $this->assertSame(100, $clock['remaining_seconds']);
        $this->travel(10)->seconds();
        $row = $exam['questions'][0];
        $answer = $this->putJson($this->url($exam, '/answers/'.$row['id']), ['base_version' => $clock['revision'], 'timer_session_id' => $session, 'selected_option_id' => $row['question']['options'][0]['id']])->assertOk()->json('data');
        $this->postJson($this->url($exam, '/finish'), ['base_version' => $answer['revision'], 'timer_session_id' => $session])->assertOk()
            ->assertJsonPath('data.result.correct', 1)->assertJsonPath('data.result.elapsed_seconds', 30);
    }

    public function test_abrupt_disconnect_freezes_after_lease_and_another_device_can_resume(): void
    {
        $exam = $this->start();
        $old = (string) Str::uuid();
        $new = (string) Str::uuid();
        $this->timer($exam, 'resume', $old);
        $this->travel(10)->seconds();
        $this->timer($exam, 'heartbeat', $old);
        $this->travel(300)->seconds();
        $clock = $this->getJson($this->url($exam, '/state'))->assertOk()->assertJsonPath('data.timer_paused', true)->assertJsonPath('data.remaining_seconds', 80)->json('data');
        $clock = $this->timer($exam, 'resume', $new);
        $this->assertSame(80, $clock['remaining_seconds']);
        foreach (['pause', 'heartbeat'] as $action) {
            $this->postJson($this->url($exam, '/timer'), ['action' => $action, 'session_id' => $old])->assertConflict();
        }
        $this->putJson($this->url($exam, '/answers/'.$exam['questions'][0]['id']), ['base_version' => $clock['revision'], 'timer_session_id' => $old, 'selected_option_id' => $exam['questions'][0]['question']['options'][0]['id']])->assertConflict()->assertJsonPath('code', 'timer_session_conflict');
    }

    public function test_continuous_choice_still_expires_and_pause_does_not_change_it(): void
    {
        $exam = $this->start('continuous');
        $session = (string) Str::uuid();
        $clock = $this->timer($exam, 'pause', $session);
        $this->assertFalse($clock['timer_paused']);
        $this->assertSame($exam['deadline_at'], $clock['deadline_at']);
        $this->travel(121)->seconds();
        $this->getJson($this->url($exam))->assertOk()->assertJsonPath('data.status', 'completed')->assertJsonPath('data.finish_reason', 'expired');
    }

    public function test_paused_answers_are_blocked_and_timer_access_is_scoped_and_validated(): void
    {
        $exam = $this->start();
        $session = (string) Str::uuid();
        $row = $exam['questions'][0];
        $this->putJson($this->url($exam, '/answers/'.$row['id']), ['base_version' => 1, 'timer_session_id' => $session, 'selected_option_id' => $row['question']['options'][0]['id']])->assertConflict()->assertJsonPath('code', 'exam_paused');
        try {
            DB::transaction(fn () => DB::table('exam_answers')->where('id', $row['id'])->update(['selected_option_id' => $row['question']['options'][0]['id']]));
            $this->fail('Paused answer accepted');
        } catch (QueryException $e) {
            $this->assertSame('23514', $e->getCode());
        }
        $this->postJson($this->url($exam, '/timer'), ['action' => 'unknown', 'session_id' => 'bad'])->assertUnprocessable();
        $this->asToken($this->createUser());
        $this->postJson($this->url($exam, '/timer'), ['action' => 'resume', 'session_id' => $session])->assertNotFound();
    }

    public function test_policy_is_idempotent_and_database_rejects_arbitrary_extension(): void
    {
        $exam = $this->start();
        $session = (string) Str::uuid();
        $clock = $this->timer($exam, 'resume', $session);
        $again = $this->timer($exam, 'resume', $session);
        $this->assertSame($clock['revision'], $again['revision']);
        $this->postJson('/api/v1/contexts/'.$exam['context_id'].'/exam-attempts', ['id' => $exam['id'], 'question_count' => 1, 'duration_seconds' => 120, 'timer_policy' => 'continuous'])->assertConflict();
        foreach ([['timer_policy' => 'continuous', 'revision' => $clock['revision'] + 1], ['paused_seconds' => 1000, 'deadline_at' => now()->addSeconds(1120), 'revision' => $clock['revision'] + 1]] as $changes) {
            try {
                DB::transaction(fn () => DB::table('exam_attempts')->where('id', $exam['id'])->update($changes));
                $this->fail('Timer setting changed');
            } catch (QueryException $error) {
                $this->assertSame('23514', $error->getCode());
            }
        }
        $this->travel(20)->seconds();
        $paused = $this->timer($exam, 'pause', $session);
        $this->travel(20)->seconds();
        $repeat = $this->timer($exam, 'pause', $session);
        $this->assertSame($paused['remaining_seconds'], $repeat['remaining_seconds']);
        $this->assertSame($paused['revision'], $repeat['revision']);
    }

    public function test_paused_history_is_read_only_and_running_expiry_is_still_exact(): void
    {
        $exam = $this->start();
        $session = (string) Str::uuid();
        $clock = $this->timer($exam, 'resume', $session);
        $this->travel(35)->seconds();
        $this->getJson('/api/v1/contexts/'.$exam['context_id'].'/exam-attempts')->assertOk()->assertJsonPath('data.0.timer_paused', true)->assertJsonPath('data.0.remaining_seconds', 90);
        $this->assertDatabaseHas('exam_attempts', ['id' => $exam['id'], 'paused_at' => null, 'revision' => $clock['revision']]);
        $clock = $this->timer($exam, 'resume', $session);
        for ($i = 0; $i < 5; $i++) {
            $this->travel(15)->seconds();
            $clock = $this->timer($exam, 'heartbeat', $session);
        }
        $this->travel(16)->seconds();
        $this->getJson($this->url($exam))->assertOk()->assertJsonPath('data.status', 'completed')->assertJsonPath('data.finish_reason', 'expired')->assertJsonPath('data.result.elapsed_seconds', 120);
    }

    public function test_pending_migration_keeps_legacy_shared_development_usable(): void
    {
        $exam = $this->start('continuous');
        $migration = require database_path('migrations/2026_10_26_000003_add_student_exam_timer_choice.php');
        $migration->down();
        $this->getJson($this->url($exam))->assertOk()->assertJsonPath('data.timer_policy', 'continuous')->assertJsonPath('data.timer_paused', false);
        $input = ['id' => (string) Str::uuid(), 'question_count' => 1, 'duration_seconds' => 120];
        $this->postJson('/api/v1/contexts/'.$exam['context_id'].'/exam-attempts', $input)->assertOk()->assertJsonPath('data.timer_policy', 'continuous');
        $input['id'] = (string) Str::uuid();
        $input['timer_policy'] = 'pause_on_exit';
        $this->postJson('/api/v1/contexts/'.$exam['context_id'].'/exam-attempts', $input)->assertStatus(503)->assertJsonPath('code', 'timer_unavailable');
        $this->artisan('exams:expire')->assertSuccessful();
    }
}
