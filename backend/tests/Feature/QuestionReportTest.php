<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\QuestionReport;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class QuestionReportTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private function pool(int $count = 3): array
    {
        $this->admin = $this->createUser(['platform_role' => 'platform_admin']);
        $subject = Subject::create(['name' => 'Sentetik bildirim dersi', 'code' => Str::uuid()]);
        $source = QuestionSource::create(['title' => 'Sentetik test kaynağı']);
        $questions = [];
        for ($i = 0; $i < $count; $i++) {
            $question = app(SaveQuestion::class)->execute($this->admin, ['source_id' => $source->id, 'subject_id' => $subject->id, 'stem' => 'Sentetik bildirim '.$i, 'options' => ['A', 'B'], 'correct_option_position' => 1]);
            $questions[] = app(PublishQuestion::class)->execute($this->admin, $question, $question->revision);
        }

        return $questions;
    }

    // The signed-in student starts a three-question exam; $finish closes it so its result can be reported from.
    private function exam(bool $finish = true): array
    {
        $context = $this->getJson('/api/v1/me/contexts')->assertOk()->json('data.0.id');
        $exam = $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', ['id' => (string) Str::uuid(), 'question_count' => 3, 'duration_seconds' => 60])->assertOk()->json('data');
        if ($finish) {
            $this->postJson($this->url($exam, '/finish'), ['base_version' => $exam['revision']])->assertOk();
            $exam = $this->getJson($this->url($exam))->assertOk()->json('data');
        }

        return $exam;
    }

    private function url(array $exam, string $suffix = ''): string
    {
        return '/api/v1/contexts/'.$exam['context_id'].'/exam-attempts/'.$exam['id'].$suffix;
    }

    private function report(array $exam, int $index, array $input = ['reason' => 'wrong_answer_key'], ?string $answerId = null)
    {
        return $this->postJson($this->url($exam, '/answers/'.($answerId ?? $exam['questions'][$index]['id']).'/report'), $input);
    }

    // Exams draw their questions in random order: find the row of one question.
    private function reportQuestion(array $exam, string $questionId, array $input = ['reason' => 'wrong_answer_key'])
    {
        $row = collect($exam['questions'])->firstWhere('question_id', $questionId);

        return $this->postJson($this->url($exam, '/answers/'.$row['id'].'/report'), $input);
    }

    private function student(): User
    {
        $student = $this->createUser();
        $this->asToken($student);

        return $student;
    }

    public function test_a_student_reports_a_question_from_a_finished_exam_pinned_to_the_version_seen(): void
    {
        $this->pool();
        $student = $this->student();
        $exam = $this->exam();
        $row = $exam['questions'][0];
        $created = $this->report($exam, 0, ['reason' => 'typo', 'note' => '  Soru kökünde yazım hatası var.  '])->assertCreated()->assertJsonPath('data.status', 'open')->assertJsonPath('data.reason', 'typo')->json('data');
        $this->assertDatabaseHas('question_reports', ['id' => $created['id'], 'user_id' => $student->id, 'question_id' => $row['question_id'], 'question_version_id' => $row['question']['id'], 'exam_attempt_id' => $exam['id'], 'note' => 'Soru kökünde yazım hatası var.', 'status' => 'open']);
        $this->assertDatabaseHas('audit_events', ['actor_id' => $student->id, 'target_id' => $created['id'], 'action' => 'question.reported']);
        // The reload keeps the state: only the reported question is flagged.
        $reloaded = $this->getJson($this->url($exam))->assertOk()->json('data.questions');
        $this->assertSame([true, false, false], array_column($reloaded, 'reported'));
        // Idempotent: reporting the same question again is the same report, with its first reason.
        $this->report($exam, 0, ['reason' => 'other'])->assertOk()->assertJsonPath('data.id', $created['id'])->assertJsonPath('data.reason', 'typo');
        $this->assertSame(1, QuestionReport::count());
        $this->assertStringNotContainsString('Soru kökünde', json_encode($this->getJson('/api/v1/me')->json()));
    }

    public function test_no_report_while_the_timer_runs_and_never_for_an_answer_of_another_attempt_or_user(): void
    {
        $this->pool();
        $this->student();
        $running = $this->exam(finish: false);
        $this->report($running, 0)->assertStatus(409)->assertJsonPath('code', 'attempt_active');
        $this->assertSame([false, false, false], array_column($running['questions'], 'reported'));
        $this->assertSame(0, QuestionReport::count());

        $first = $this->exam();
        $second = $this->exam();
        // An answer id of the first attempt does not work through the second.
        $this->report($second, 0, ['reason' => 'typo'], $first['questions'][0]['id'])->assertNotFound();
        $this->report($second, 0, ['reason' => 'typo'], (string) Str::uuid())->assertNotFound();

        $this->student();
        $this->report($first, 0)->assertNotFound();
        $this->assertSame(0, QuestionReport::count());
    }

    public function test_reports_validate_input_and_refuse_identity_fields(): void
    {
        $this->pool();
        $student = $this->student();
        $exam = $this->exam();
        $this->report($exam, 0, [])->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->report($exam, 0, ['reason' => 'rude'])->assertStatus(422)->assertJsonValidationErrors('reason');
        $this->report($exam, 0, ['reason' => 'typo', 'note' => str_repeat('a', 501)])->assertStatus(422)->assertJsonValidationErrors('note');
        $this->report($exam, 0, ['reason' => 'typo', 'user_id' => (string) Str::uuid()])->assertStatus(422)->assertJsonValidationErrors('user_id');
        $this->report($exam, 0, ['reason' => 'typo', 'status' => 'fixed'])->assertStatus(422)->assertJsonValidationErrors('status');
        $this->report($exam, 0, ['reason' => 'typo', 'note' => str_repeat('ğ', 500)])->assertCreated();
        $this->assertSame($student->id, QuestionReport::firstOrFail()->user_id);
        $this->report($exam, 1, ['reason' => 'other', 'note' => "  \n "])->assertCreated();
        $this->assertNull(QuestionReport::where('question_id', $exam['questions'][1]['question_id'])->firstOrFail()->note);
    }

    public function test_reporting_is_rate_limited_per_student(): void
    {
        $this->pool();
        $this->student();
        $exam = $this->exam();
        for ($i = 0; $i < 20; $i++) {
            $this->report($exam, 0)->assertSuccessful();
        }
        $this->report($exam, 0)->assertStatus(429);
        // Another student has their own allowance.
        $this->student();
        $other = $this->exam();
        $this->report($other, 0)->assertCreated();
    }

    public function test_only_platform_admins_read_the_queue_and_it_never_names_the_reporter(): void
    {
        $questions = $this->pool();
        $first = $this->student();
        $exam = $this->exam();
        $this->report($exam, 0, ['reason' => 'wrong_answer_key', 'note' => 'Cevap anahtarı yanlış görünüyor.'])->assertCreated();
        $this->report($exam, 1, ['reason' => 'unclear'])->assertCreated();
        $second = $this->student();
        $other = $this->exam();
        $reportedQuestion = $exam['questions'][0]['question_id'];
        $this->report($other, array_search($reportedQuestion, array_column($other['questions'], 'question_id'), true), ['reason' => 'typo', 'note' => 'Bir de yazım hatası var.'])->assertCreated();

        foreach (['/api/v1/admin/question-reports', '/api/v1/admin/question-reports/summary'] as $path) {
            $this->getJson($path)->assertForbidden();
        }
        $this->postJson('/api/v1/admin/question-reports/'.$reportedQuestion.'/resolve', ['status' => 'fixed'])->assertForbidden();
        $this->assertSame(3, QuestionReport::where('status', 'open')->count());

        $this->asToken($this->admin);
        $this->getJson('/api/v1/admin/question-reports/summary')->assertOk()->assertJsonPath('data.open_questions', 2)->assertJsonPath('data.open_reports', 3);
        $response = $this->getJson('/api/v1/admin/question-reports')->assertOk()->assertJsonCount(2, 'data');
        $group = collect($response->json('data'))->firstWhere('question_id', $reportedQuestion);
        $this->assertSame(2, $group['report_count']);
        $this->assertEquals(['wrong_answer_key' => 1, 'typo' => 1], $group['reasons']);
        $this->assertEqualsCanonicalizing(['Cevap anahtarı yanlış görünüyor.', 'Bir de yazım hatası var.'], array_column($group['notes'], 'note'));
        $this->assertSame('Sentetik bildirim', substr($group['stem_excerpt'], 0, 17));
        $this->assertSame('Sentetik bildirim dersi', $group['subject']['name']);
        $this->assertSame([1, 1], [$group['reported_version'], $group['current_version']]);
        $this->assertSame([], $group['exams']);
        $this->assertNull($group['resolution']);
        // No identity of any reporter anywhere in the payload.
        $body = $response->getContent();
        foreach ([$first, $second] as $student) {
            $this->assertStringNotContainsString($student->id, $body);
            $this->assertStringNotContainsString($student->email, $body);
            $this->assertStringNotContainsString($student->name, $body);
        }
        $this->assertStringNotContainsString('user_id', $body);
        $this->assertCount(3, $questions);
    }

    public function test_the_queue_lists_only_the_newest_notes_and_pages_by_cursor(): void
    {
        [$busy, $quiet] = $this->pool();
        for ($i = 0; $i < 7; $i++) {
            $this->student();
            $this->reportQuestion($this->exam(), $busy->id, ['reason' => 'other', 'note' => 'Not '.$i])->assertCreated();
        }
        $this->student();
        $exam = $this->exam();
        $this->reportQuestion($exam, $quiet->id, ['reason' => 'outdated'])->assertCreated();
        $this->reportQuestion($exam, $busy->id, ['reason' => 'outdated'])->assertCreated();

        $this->asToken($this->admin);
        $page = $this->getJson('/api/v1/admin/question-reports?per_page=1')->assertOk()->assertJsonCount(1, 'data');
        $this->assertNotNull($page->json('links.next'));
        $next = $this->getJson($page->json('links.next'))->assertOk()->assertJsonCount(1, 'data');
        $this->assertNotSame($page->json('data.0.question_id'), $next->json('data.0.question_id'));
        $big = collect($this->getJson('/api/v1/admin/question-reports')->json('data'))->firstWhere('question_id', $busy->id);
        $this->assertSame(8, $big['report_count']);
        $this->assertCount(5, $big['notes']);
        $this->assertSame('Not 6', $big['notes'][0]['note']);
        $this->getJson('/api/v1/admin/question-reports?status=resolved')->assertStatus(422);
    }

    public function test_resolving_closes_every_open_report_of_the_question_and_keeps_the_history(): void
    {
        $question = $this->pool()[0]->id;
        foreach ([1, 2] as $_) {
            $this->student();
            $this->reportQuestion($this->exam(), $question, ['reason' => 'wrong_answer_key', 'note' => 'Anahtar yanlış'])->assertCreated();
        }
        $this->asToken($this->admin);
        $this->postJson('/api/v1/admin/question-reports/'.$question.'/resolve', ['status' => 'open'])->assertStatus(422);
        $this->postJson('/api/v1/admin/question-reports/'.$question.'/resolve', ['status' => 'fixed', 'resolution_note' => str_repeat('x', 501)])->assertStatus(422);
        $this->postJson('/api/v1/admin/question-reports/'.(string) Str::uuid().'/resolve', ['status' => 'fixed'])->assertNotFound();
        $this->postJson('/api/v1/admin/question-reports/'.$question.'/resolve', ['status' => 'fixed', 'resolution_note' => 'Cevap anahtarı düzeltildi.'])->assertOk()->assertJsonPath('data.closed_reports', 2);
        $this->assertSame(2, QuestionReport::where('status', 'fixed')->where('resolved_by', $this->admin->id)->where('resolution_note', 'Cevap anahtarı düzeltildi.')->count());
        $this->assertDatabaseHas('audit_events', ['actor_id' => $this->admin->id, 'target_id' => $question, 'action' => 'question_reports.fixed']);
        $this->getJson('/api/v1/admin/question-reports/summary')->assertOk()->assertJsonPath('data.open_questions', 0);
        $this->getJson('/api/v1/admin/question-reports')->assertOk()->assertJsonCount(0, 'data');
        $closed = $this->getJson('/api/v1/admin/question-reports?status=fixed')->assertOk()->assertJsonCount(1, 'data')->json('data.0');
        $this->assertSame(2, $closed['report_count']);
        $this->assertSame('fixed', $closed['resolution']['status']);
        $this->assertSame('Cevap anahtarı düzeltildi.', $closed['resolution']['note']);
        $this->getJson('/api/v1/admin/question-reports?status=dismissed')->assertOk()->assertJsonCount(0, 'data');
        // Nothing left to close.
        $this->postJson('/api/v1/admin/question-reports/'.$question.'/resolve', ['status' => 'dismissed'])->assertStatus(409)->assertJsonPath('code', 'no_open_reports');
        // A student can raise the problem again: a new report, the old ones stay closed.
        $this->student();
        $this->reportQuestion($this->exam(), $question, ['reason' => 'outdated'])->assertCreated();
        $this->assertSame([1, 2], [QuestionReport::where('status', 'open')->count(), QuestionReport::where('status', 'fixed')->count()]);
        $this->asToken($this->admin);
        $this->postJson('/api/v1/admin/question-reports/'.$question.'/resolve', ['status' => 'dismissed'])->assertOk()->assertJsonPath('data.closed_reports', 1);
        $this->assertSame(1, QuestionReport::where('status', 'dismissed')->count());
    }

    public function test_a_report_keeps_the_version_the_student_saw_after_the_question_is_corrected(): void
    {
        [$first] = $this->pool();
        $this->student();
        $exam = $this->exam();
        $index = array_search($first->id, array_column($exam['questions'], 'question_id'), true);
        $seen = $exam['questions'][$index]['question']['id'];
        $this->report($exam, $index)->assertCreated();
        $question = app(SaveQuestion::class)->execute($this->admin, ['source_id' => $first->latestVersion->source_id, 'subject_id' => $first->latestVersion->subject_id, 'stem' => 'Düzeltilmiş soru kökü', 'options' => ['A', 'B'], 'correct_option_position' => 2, 'base_version' => $first->revision], $first);
        app(PublishQuestion::class)->execute($this->admin, $question, $question->revision);
        $this->assertSame($seen, QuestionReport::firstOrFail()->question_version_id);
        $this->asToken($this->admin);
        $group = $this->getJson('/api/v1/admin/question-reports')->assertOk()->json('data.0');
        $this->assertSame([1, 2], [$group['reported_version'], $group['current_version']]);
        $this->assertSame('Düzeltilmiş soru kökü', $group['stem_excerpt']);
    }

    public function test_the_database_guards_reports(): void
    {
        $this->pool();
        $student = $this->student();
        $exam = $this->exam();
        $row = $exam['questions'][0];
        $base = ['id' => (string) Str::uuid(), 'question_id' => $row['question_id'], 'question_version_id' => $row['question']['id'], 'user_id' => $student->id, 'reason' => 'typo', 'status' => 'open', 'created_at' => now()];
        $insert = fn (array $changes) => DB::table('question_reports')->insert(array_merge($base, ['id' => (string) Str::uuid()], $changes));
        $expect = function (callable $action, string $code) {
            try {
                // A savepoint, so the rejected write does not poison the test transaction.
                DB::transaction($action);
                $this->fail('The database accepted a bad write.');
            } catch (QueryException $exception) {
                $this->assertSame($code, $exception->getCode());
            }
        };
        $expect(fn () => $insert(['reason' => 'rude']), '23514');
        $expect(fn () => $insert(['status' => 'reviewing']), '23514');
        $expect(fn () => $insert(['note' => str_repeat('a', 501)]), '23514');
        $expect(fn () => $insert(['status' => 'fixed']), '23514');
        $expect(fn () => $insert(['question_id' => (string) Str::uuid()]), '23503');
        $insert([]);
        // One open report per student and question; a closed one does not count.
        $expect(fn () => $insert([]), '23505');
        $insert(['user_id' => null]);
        $insert(['user_id' => null]);
        $id = DB::table('question_reports')->where('user_id', $student->id)->value('id');
        $expect(fn () => DB::table('question_reports')->where('id', $id)->update(['note' => 'sonradan']), '23514');
        $expect(fn () => DB::table('question_reports')->where('id', $id)->update(['reason' => 'other']), '23514');
        $expect(fn () => DB::table('question_reports')->where('id', $id)->update(['question_version_id' => DB::table('question_versions')->where('id', '<>', $row['question']['id'])->value('id')]), '23514');
        $expect(fn () => DB::table('question_reports')->where('id', $id)->update(['user_id' => $this->admin->id]), '23514');
        DB::table('question_reports')->where('id', $id)->update(['status' => 'dismissed', 'resolved_at' => now(), 'resolved_by' => $this->admin->id]);
        $expect(fn () => DB::table('question_reports')->where('id', $id)->update(['status' => 'open', 'resolved_at' => null]), '23514');
        $expect(fn () => DB::table('question_reports')->where('id', $id)->update(['resolution_note' => 'sonradan']), '23514');
        // Severing the link to the reporter (a deleted account) stays possible and keeps the report.
        DB::table('question_reports')->where('id', $id)->update(['user_id' => null]);
        $this->assertNull(DB::table('question_reports')->where('id', $id)->value('user_id'));
    }
}
