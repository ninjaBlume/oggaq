<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class OfficialExamTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    private ExamType $type;

    private QuestionSource $source;

    private Subject $subject;

    /** @var Question[] */
    private array $questions = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->createUser(['platform_role' => 'platform_admin']);
        $this->type = ExamType::create(['name' => 'Sentetik sınav türü', 'code' => 'type-'.Str::lower(Str::random(8))]);
        $this->source = QuestionSource::create(['title' => 'Sentetik test kaynağı — resmî soru değildir']);
        $this->subject = Subject::create(['name' => 'Sentetik ders', 'code' => Str::uuid()]);
        foreach (range(0, 2) as $index) {
            $this->questions[] = $this->publishedQuestion('Sentetik '.$index);
        }
    }

    // Option position 1 is always the correct answer.
    private function publishedQuestion(string $stem): Question
    {
        $question = app(SaveQuestion::class)->execute($this->admin, ['source_id' => $this->source->id, 'subject_id' => $this->subject->id, 'exam_type_id' => $this->type->id, 'stem' => $stem, 'options' => ['A', 'B'], 'correct_option_position' => 1, 'explanation' => 'Gizli açıklama']);

        return app(PublishQuestion::class)->execute($this->admin, $question, $question->revision);
    }

    private function versionIds(array $order = [0, 1, 2]): array
    {
        return array_map(fn (int $index) => $this->questions[$index]->published_version_id, $order);
    }

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'exam_type_id' => $this->type->id, 'source_id' => $this->source->id, 'title' => 'Sentetik çıkmış sınav',
            'year' => 2023, 'term' => '1. dönem', 'exam_number' => '1', 'question_version_ids' => $this->versionIds(),
        ], $overrides);
    }

    private function createExam(array $overrides = [], bool $publish = false): array
    {
        $this->asToken($this->admin);
        $exam = $this->postJson('/api/v1/admin/official-exams', $this->payload($overrides))->assertCreated()->json('data');
        if ($publish) {
            $exam = $this->postJson('/api/v1/admin/official-exams/'.$exam['id'].'/publish')->assertOk()->json('data');
        }

        return $exam;
    }

    private function startOfficial(string $officialExamId, array $overrides = [], ?User $student = null)
    {
        $student ??= $this->createUser();
        $this->asToken($student);
        $context = $student->studyContexts()->firstOrFail()->id;

        return $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', array_merge(['id' => (string) Str::uuid(), 'official_exam_id' => $officialExamId, 'duration_seconds' => 600], $overrides));
    }

    private function assertRejectedByDatabase(callable $mutation): void
    {
        try {
            DB::transaction($mutation);
            $this->fail('The database accepted an invalid official exam change.');
        } catch (QueryException $error) {
            $this->assertSame('23514', $error->getCode());
        }
    }

    public function test_admin_builds_ordered_draft_and_students_only_see_published_metadata(): void
    {
        $order = [2, 0, 1];
        $draft = $this->createExam(['question_version_ids' => $this->versionIds($order)]);
        $this->assertSame('draft', $draft['status']);
        $this->assertSame(3, $draft['question_count']);
        $this->assertSame($this->versionIds($order), array_column(array_column($draft['questions'], 'question'), 'id'));
        $this->assertSame([1, 2, 3], array_column($draft['questions'], 'position'));
        $this->assertArrayHasKey('correct_option_id', $draft['questions'][0]['question']);
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/official-exams')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/official-exams/'.$draft['id'])->assertNotFound();
        $this->asToken($this->admin);
        $published = $this->postJson('/api/v1/admin/official-exams/'.$draft['id'].'/publish')->assertOk()->assertJsonPath('data.status', 'published')->json('data');
        $again = $this->postJson('/api/v1/admin/official-exams/'.$draft['id'].'/publish')->assertOk()->json('data');
        $this->assertSame($published['published_at'], $again['published_at']);
        $this->asToken($this->createUser());
        $list = $this->getJson('/api/v1/official-exams')->assertOk()->assertJsonCount(1, 'data')->json('data');
        $this->assertSame(['id', 'title', 'exam_type_id', 'exam_type', 'weapon_status', 'year', 'term', 'exam_number', 'question_count', 'source', 'published_at'], array_keys($list[0]));
        $this->getJson('/api/v1/official-exams/'.$draft['id'])->assertOk()->assertJsonPath('data.question_count', 3)->assertJsonMissingPath('data.questions');
        $this->getJson('/api/v1/official-exams?year=2023')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/official-exams?year=2020')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/official-exams?exam_type_id='.$this->type->id)->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/official-exams?status=draft')->assertUnprocessable();
    }

    public function test_weapon_status_is_a_separate_attribute_from_the_exam_type(): void
    {
        $this->asToken($this->admin);
        $armed = $this->postJson('/api/v1/admin/official-exams', $this->payload(['weapon_status' => 'armed']))->assertCreated()->assertJsonPath('data.weapon_status', 'armed')->assertJsonPath('data.exam_type.name', $this->type->name)->json('data');
        // The same type, year, term and number can exist once per weapon status.
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['weapon_status' => 'unarmed']))->assertCreated();
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['weapon_status' => 'armed']))->assertConflict()->assertJsonPath('code', 'duplicate_official_exam');
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['weapon_status' => 'sometimes']))->assertUnprocessable()->assertJsonValidationErrors('weapon_status');
        foreach (DB::table('official_exams')->pluck('id') as $id) {
            $this->postJson('/api/v1/admin/official-exams/'.$id.'/publish')->assertOk();
        }
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/official-exams?weapon_status=armed')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $armed['id']);
        $this->getJson('/api/v1/official-exams?weapon_status=unarmed&exam_type_id='.$this->type->id)->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/official-exams?weapon_status=bogus')->assertUnprocessable();
        $this->assertRejectedByDatabase(fn () => DB::table('official_exams')->insert(['id' => (string) Str::uuid(), 'exam_type_id' => $this->type->id, 'title' => 'Sentetik', 'year' => 2020, 'weapon_status' => 'both', 'created_at' => now(), 'updated_at' => now()]));
    }

    public function test_only_platform_admin_manages_official_exams(): void
    {
        $exam = $this->createExam();
        $this->asToken($this->createUser());
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['exam_number' => '2']))->assertForbidden();
        $this->getJson('/api/v1/admin/official-exams')->assertForbidden();
        $this->getJson('/api/v1/admin/official-exams/'.$exam['id'])->assertForbidden();
        $this->putJson('/api/v1/admin/official-exams/'.$exam['id'], $this->payload())->assertForbidden();
        $this->postJson('/api/v1/admin/official-exams/'.$exam['id'].'/publish')->assertForbidden();
        $this->assertDatabaseHas('official_exams', ['id' => $exam['id'], 'published_at' => null]);
        $this->asToken($this->admin);
        $this->getJson('/api/v1/admin/official-exams?status=draft')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/admin/official-exams?status=published')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_draft_exam_can_pin_a_draft_question_until_it_is_completed_published_and_swapped(): void
    {
        $this->asToken($this->admin);
        $unfinished = app(SaveQuestion::class)->execute($this->admin, ['source_id' => $this->source->id, 'subject_id' => $this->subject->id, 'stem' => 'Seçenekleri eksik soru', 'options' => []]);
        $ids = [$this->questions[0]->published_version_id, $unfinished->latest_version_id];
        $exam = $this->postJson('/api/v1/admin/official-exams', $this->payload(['question_version_ids' => $ids]))->assertCreated()->assertJsonPath('data.status', 'draft')->assertJsonPath('data.questions.1.published_version_id', null)->assertJsonPath('data.questions.0.published_version_id', $ids[0])->json('data');
        $this->postJson('/api/v1/admin/official-exams/'.$exam['id'].'/publish')->assertUnprocessable()->assertJsonValidationErrors('question_version_ids');
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/official-exams')->assertOk()->assertJsonCount(0, 'data');
        $this->asToken($this->admin);
        $fixed = app(SaveQuestion::class)->execute($this->admin, ['source_id' => $this->source->id, 'subject_id' => $this->subject->id, 'stem' => 'Seçenekleri eksik soru', 'options' => ['A', 'B'], 'correct_option_position' => 2, 'base_version' => $unfinished->revision], $unfinished);
        $published = app(PublishQuestion::class)->execute($this->admin, $fixed, $fixed->revision);
        $shown = $this->getJson('/api/v1/admin/official-exams/'.$exam['id'])->assertOk()->assertJsonPath('data.questions.1.published_version_id', $published->published_version_id)->json('data');
        $this->assertNotSame($shown['questions'][1]['question']['id'], $published->published_version_id);
        $this->putJson('/api/v1/admin/official-exams/'.$exam['id'], $this->payload(['question_version_ids' => [$ids[0], $published->published_version_id]]))->assertOk();
        $this->postJson('/api/v1/admin/official-exams/'.$exam['id'].'/publish')->assertOk()->assertJsonPath('data.status', 'published');
    }

    public function test_questions_must_be_unique_and_the_client_cannot_set_state(): void
    {
        $this->asToken($this->admin);
        $first = $this->questions[0];
        $oldVersion = $first->published_version_id;
        $revised = app(SaveQuestion::class)->execute($this->admin, ['source_id' => $this->source->id, 'subject_id' => $this->subject->id, 'stem' => 'Yeni sürüm', 'options' => ['A', 'B'], 'correct_option_position' => 2, 'base_version' => $first->revision], $first);
        app(PublishQuestion::class)->execute($this->admin, $revised, $revised->revision);
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['question_version_ids' => [$oldVersion, $revised->fresh()->published_version_id]]))->assertUnprocessable()->assertJsonValidationErrors('question_version_ids');
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['question_version_ids' => [$oldVersion, $oldVersion]]))->assertUnprocessable();
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['question_version_ids' => []]))->assertUnprocessable();
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['published_at' => now()->toISOString()]))->assertUnprocessable()->assertJsonValidationErrors('published_at');
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['year' => 1800]))->assertUnprocessable()->assertJsonValidationErrors('year');
        $this->assertDatabaseCount('official_exams', 0);
        $this->assertDatabaseCount('official_exam_questions', 0);
    }

    public function test_identity_is_unique_but_questions_can_belong_to_several_exams(): void
    {
        $this->createExam();
        $this->postJson('/api/v1/admin/official-exams', $this->payload())->assertConflict()->assertJsonPath('code', 'duplicate_official_exam');
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['exam_number' => '2']))->assertCreated();
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['term' => null, 'exam_number' => null]))->assertCreated();
        $this->postJson('/api/v1/admin/official-exams', $this->payload(['term' => null, 'exam_number' => null]))->assertConflict();
        $this->assertDatabaseCount('official_exams', 3);
        $this->assertDatabaseCount('official_exam_questions', 9);
    }

    public function test_draft_can_be_replaced_but_published_exam_is_immutable_everywhere(): void
    {
        $exam = $this->createExam();
        $reordered = $this->putJson('/api/v1/admin/official-exams/'.$exam['id'], $this->payload(['title' => 'Düzeltilmiş başlık', 'question_version_ids' => $this->versionIds([1, 2])]))->assertOk()->assertJsonPath('data.title', 'Düzeltilmiş başlık')->assertJsonPath('data.question_count', 2)->json('data');
        $this->assertSame($this->versionIds([1, 2]), array_column(array_column($reordered['questions'], 'question'), 'id'));
        $this->assertDatabaseCount('official_exam_questions', 2);
        $this->postJson('/api/v1/admin/official-exams/'.$exam['id'].'/publish')->assertOk();
        $this->putJson('/api/v1/admin/official-exams/'.$exam['id'], $this->payload())->assertConflict()->assertJsonPath('code', 'already_published');
        $this->assertDatabaseCount('official_exam_questions', 2);
        $this->assertRejectedByDatabase(fn () => DB::table('official_exam_questions')->where('official_exam_id', $exam['id'])->where('position', 1)->update(['position' => 9]));
        $this->assertRejectedByDatabase(fn () => DB::table('official_exam_questions')->where('official_exam_id', $exam['id'])->delete());
        $this->assertRejectedByDatabase(fn () => DB::table('official_exam_questions')->insert(['official_exam_id' => $exam['id'], 'position' => 3, 'question_id' => $this->questions[0]->id, 'question_version_id' => $this->questions[0]->published_version_id]));
        $this->assertRejectedByDatabase(fn () => DB::table('official_exams')->where('id', $exam['id'])->update(['title' => 'Değiştirildi']));
        $this->assertRejectedByDatabase(fn () => DB::table('official_exams')->where('id', $exam['id'])->delete());
    }

    private function revise(Question $question, string $stem, bool $publish = true): Question
    {
        $saved = app(SaveQuestion::class)->execute($this->admin, ['source_id' => $this->source->id, 'subject_id' => $this->subject->id, 'stem' => $stem, 'options' => ['X', 'Y'], 'correct_option_position' => 2, 'base_version' => $question->revision], $question);

        return $publish ? app(PublishQuestion::class)->execute($this->admin, $saved, $saved->revision) : $saved;
    }

    public function test_published_exam_takes_only_a_newer_published_version_of_the_same_question_and_keeps_old_attempts(): void
    {
        $exam = $this->createExam([], true);
        $student = $this->createUser();
        $before = $this->startOfficial($exam['id'], [], $student)->assertOk()->json('data');
        $this->asToken($this->admin);
        $url = '/api/v1/admin/official-exams/'.$exam['id'].'/questions/'.$this->questions[1]->id;
        $draftOnly = $this->revise($this->questions[1], 'Yalnız taslak', false);
        $this->putJson($url, ['question_version_id' => $draftOnly->latest_version_id])->assertUnprocessable()->assertJsonValidationErrors('question_version_id');
        $this->putJson($url, ['question_version_id' => $this->questions[0]->published_version_id])->assertUnprocessable();
        $this->putJson($url, ['question_version_id' => $this->questions[1]->published_version_id])->assertOk();
        $this->assertDatabaseCount('official_exam_question_changes', 0);

        $published = app(PublishQuestion::class)->execute($this->admin, $draftOnly->refresh(), $draftOnly->revision);
        $updated = $this->putJson($url, ['question_version_id' => $published->published_version_id])->assertOk()->assertJsonPath('data.status', 'published')->assertJsonPath('data.questions.1.question.stem', 'Yalnız taslak')->assertJsonPath('data.questions.1.position', 2)->json('data');
        $this->assertSame(3, $updated['question_count']);
        $this->assertDatabaseHas('official_exam_question_changes', ['official_exam_id' => $exam['id'], 'question_id' => $this->questions[1]->id, 'from_version_id' => $this->questions[1]->published_version_id, 'to_version_id' => $published->published_version_id, 'actor_id' => $this->admin->id]);
        $this->assertDatabaseHas('audit_events', ['target_id' => $exam['id'], 'action' => 'official_exam.question_version_updated']);
        // Going back to an older version is not a correction.
        $this->putJson($url, ['question_version_id' => $this->questions[1]->published_version_id])->assertUnprocessable();

        $this->asToken($student);
        $context = $before['context_id'];
        $old = $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$before['id'])->assertOk()->json('data');
        $this->assertSame($this->versionIds(), array_column(array_column($old['questions'], 'question'), 'id'));
        $after = $this->startOfficial($exam['id'], [], $student)->assertOk()->json('data');
        $this->assertSame('Yalnız taslak', $after['questions'][1]['question']['stem']);
        $this->assertSame([1, 2, 3], array_column($after['questions'], 'position'));
    }

    public function test_draft_exam_can_swap_any_version_of_the_same_question_and_only_admins_may_change_it(): void
    {
        $exam = $this->createExam();
        $draft = $this->revise($this->questions[2], 'Taslak sürüm', false);
        $url = '/api/v1/admin/official-exams/'.$exam['id'].'/questions/'.$this->questions[2]->id;
        $this->putJson($url, ['question_version_id' => $draft->latest_version_id])->assertOk()->assertJsonPath('data.questions.2.question.stem', 'Taslak sürüm')->assertJsonPath('data.questions.2.published_version_id', $this->questions[2]->published_version_id);
        $this->putJson('/api/v1/admin/official-exams/'.$exam['id'].'/questions/'.(string) Str::uuid(), ['question_version_id' => $draft->latest_version_id])->assertNotFound();
        $this->asToken($this->createUser());
        $this->putJson($url, ['question_version_id' => $this->questions[2]->published_version_id])->assertForbidden();
        $this->assertSame($draft->latest_version_id, DB::table('official_exam_questions')->where('official_exam_id', $exam['id'])->where('question_id', $this->questions[2]->id)->value('question_version_id'));
    }

    public function test_database_only_allows_the_audited_version_correction_in_a_published_exam(): void
    {
        $exam = $this->createExam([], true);
        $row = fn () => DB::table('official_exam_questions')->where('official_exam_id', $exam['id'])->where('question_id', $this->questions[0]->id);
        $unpublished = $this->revise($this->questions[0], 'Taslak', false);
        $this->assertRejectedByDatabase(fn () => $row()->update(['question_version_id' => $unpublished->latest_version_id]));
        $this->assertRejectedByDatabase(fn () => $row()->update(['question_version_id' => $this->questions[1]->published_version_id]));
        $newer = app(PublishQuestion::class)->execute($this->admin, $unpublished->refresh(), $unpublished->revision);
        $this->assertRejectedByDatabase(fn () => $row()->update(['question_version_id' => $newer->published_version_id, 'position' => 9]));
        $this->assertSame(1, $row()->update(['question_version_id' => $newer->published_version_id]));
        $this->assertRejectedByDatabase(fn () => $row()->update(['question_version_id' => $this->questions[0]->published_version_id]));
    }

    public function test_database_rejects_unpublished_versions_and_empty_or_gapped_publication(): void
    {
        $draftQuestion = app(SaveQuestion::class)->execute($this->admin, ['source_id' => $this->source->id, 'subject_id' => $this->subject->id, 'stem' => 'Taslak', 'options' => ['A', 'B'], 'correct_option_position' => 1]);
        $now = now();
        $id = (string) Str::uuid();
        $base = ['exam_type_id' => $this->type->id, 'title' => 'Sentetik', 'year' => 2022, 'created_at' => $now, 'updated_at' => $now];
        $this->assertRejectedByDatabase(fn () => DB::table('official_exams')->insert($base + ['id' => $id, 'published_at' => $now]));
        DB::table('official_exams')->insert($base + ['id' => $id]);
        // A draft exam may pin a draft version, but such an exam can never be published.
        DB::table('official_exam_questions')->insert(['official_exam_id' => $id, 'position' => 1, 'question_id' => $draftQuestion->id, 'question_version_id' => $draftQuestion->latest_version_id]);
        $this->assertRejectedByDatabase(fn () => DB::table('official_exams')->where('id', $id)->update(['published_at' => $now]));
        DB::table('official_exam_questions')->where('official_exam_id', $id)->delete();
        DB::table('official_exam_questions')->insert(['official_exam_id' => $id, 'position' => 2, 'question_id' => $this->questions[0]->id, 'question_version_id' => $this->questions[0]->published_version_id]);
        $this->assertRejectedByDatabase(fn () => DB::table('official_exams')->where('id', $id)->update(['published_at' => $now]));
    }

    public function test_official_attempt_keeps_original_order_pinned_versions_and_server_grading(): void
    {
        $order = [2, 0, 1];
        $exam = $this->createExam(['question_version_ids' => $this->versionIds($order)], true);
        $student = $this->createUser();
        $attempt = $this->startOfficial($exam['id'], [], $student)->assertOk()->assertJsonPath('data.official_exam.id', $exam['id'])->assertJsonPath('data.official_exam.year', 2023)->assertJsonPath('data.question_count', 3)->json('data');
        $this->assertSame($this->versionIds($order), array_column(array_column($attempt['questions'], 'question'), 'id'));
        $this->assertSame(array_map(fn (int $index) => $this->questions[$index]->id, $order), array_column($attempt['questions'], 'question_id'));
        foreach ($attempt['questions'] as $row) {
            $this->assertNull($row['feedback']);
            $this->assertArrayNotHasKey('correct_option_id', $row['question']);
        }
        // A newer published version changes nothing for this or any later attempt of the same past exam.
        $first = $this->questions[2];
        $revised = app(SaveQuestion::class)->execute($this->admin, ['source_id' => $this->source->id, 'subject_id' => $this->subject->id, 'stem' => 'Yeni sürüm', 'options' => ['X', 'Y'], 'correct_option_position' => 2, 'base_version' => $first->revision], $first);
        app(PublishQuestion::class)->execute($this->admin, $revised, $revised->revision);
        $this->asToken($student);
        $url = '/api/v1/contexts/'.$attempt['context_id'].'/exam-attempts/'.$attempt['id'];
        $rows = $attempt['questions'];
        $this->putJson($url.'/answers/'.$rows[0]['id'], ['base_version' => 1, 'selected_option_id' => $rows[0]['question']['options'][0]['id']])->assertOk();
        $this->putJson($url.'/answers/'.$rows[1]['id'], ['base_version' => 2, 'selected_option_id' => $rows[1]['question']['options'][1]['id']])->assertOk();
        $done = $this->postJson($url.'/finish', ['base_version' => 3])->assertOk()->assertJsonPath('data.result.correct', 1)->assertJsonPath('data.result.incorrect', 1)->assertJsonPath('data.result.blank', 1)->json('data');
        $this->assertSame('Sentetik 2', $done['questions'][0]['question']['stem']);
        $this->assertSame('correct', $done['questions'][0]['feedback']['outcome']);
        $second = $this->startOfficial($exam['id'], [], $student)->assertOk()->json('data');
        $this->assertSame($this->versionIds($order), array_column(array_column($second['questions'], 'question'), 'id'));
        $this->getJson('/api/v1/contexts/'.$attempt['context_id'].'/exam-attempts')->assertOk()->assertJsonPath('data.0.official_exam.title', 'Sentetik çıkmış sınav');
    }

    public function test_official_start_is_idempotent_and_rejects_conflicting_or_unpublished_settings(): void
    {
        $exam = $this->createExam([], true);
        $draft = $this->createExam(['exam_number' => '2']);
        $student = $this->createUser();
        $id = (string) Str::uuid();
        $first = $this->startOfficial($exam['id'], ['id' => $id], $student)->assertOk()->json('data');
        $again = $this->startOfficial($exam['id'], ['id' => $id], $student)->assertOk()->json('data');
        $this->assertSame($first['questions'], $again['questions']);
        $this->startOfficial($exam['id'], ['id' => $id, 'duration_seconds' => 900], $student)->assertConflict();
        $this->assertDatabaseCount('exam_attempts', 1);
        $this->startOfficial($exam['id'], ['question_count' => 2], $student)->assertUnprocessable();
        $this->startOfficial($exam['id'], ['subject_id' => $this->subject->id], $student)->assertUnprocessable();
        $this->startOfficial($draft['id'], [], $student)->assertUnprocessable()->assertJsonValidationErrors('official_exam_id');
        $this->startOfficial((string) Str::uuid(), [], $student)->assertUnprocessable();
        $context = $student->studyContexts()->firstOrFail()->id;
        $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', ['id' => (string) Str::uuid(), 'duration_seconds' => 600])->assertUnprocessable()->assertJsonValidationErrors('question_count');
        $this->assertDatabaseCount('exam_attempts', 1);
    }

    public function test_database_requires_official_attempts_to_copy_the_published_template(): void
    {
        $exam = $this->createExam(['question_version_ids' => $this->versionIds([2, 0, 1])], true);
        $draft = $this->createExam(['exam_number' => '2']);
        $student = $this->createUser();
        $context = $student->studyContexts()->firstOrFail()->id;
        $started = now()->startOfSecond();
        $attempt = fn (string $official, int $count) => [
            'id' => (string) Str::uuid(), 'study_context_id' => $context, 'official_exam_id' => $official, 'question_count' => $count,
            'duration_seconds' => 60, 'scoring_rule' => 'correct_ratio_v1', 'revision' => 1, 'started_at' => $started, 'deadline_at' => $started->copy()->addSeconds(60),
        ];
        $this->assertRejectedByDatabase(fn () => DB::table('exam_attempts')->insert($attempt($draft['id'], 3)));
        $this->assertRejectedByDatabase(fn () => DB::table('exam_attempts')->insert($attempt($exam['id'], 2)));
        $this->assertRejectedByDatabase(fn () => DB::table('exam_attempts')->insert($attempt($exam['id'], 3) + ['subject_id' => $this->subject->id]));
        $row = $attempt($exam['id'], 3);
        DB::table('exam_attempts')->insert($row);
        $answer = fn (int $position, int $index) => ['id' => (string) Str::uuid(), 'exam_attempt_id' => $row['id'], 'position' => $position, 'question_id' => $this->questions[$index]->id, 'question_version_id' => $this->questions[$index]->published_version_id];
        $this->assertRejectedByDatabase(fn () => DB::table('exam_answers')->insert($answer(1, 0)));
        DB::table('exam_answers')->insert($answer(1, 2));
        $this->assertRejectedByDatabase(fn () => DB::table('exam_attempts')->where('id', $row['id'])->update(['official_exam_id' => null, 'revision' => 2]));
    }
}
