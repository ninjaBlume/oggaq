<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\Tenancy\Actions\RevokeMembership;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class StudyInsightsTest extends TestCase
{
    use RefreshDatabase;

    private Subject $first;

    private Subject $second;

    // Two questions in the first subject, one in the second; the option at index 0 is always the correct one.
    private function pool(): array
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $this->first = Subject::create(['name' => 'A sentetik ders', 'code' => Str::uuid()]);
        $this->second = Subject::create(['name' => 'B sentetik ders', 'code' => Str::uuid()]);
        $source = QuestionSource::create(['title' => 'Sentetik test kaynağı']);
        $questions = [];
        foreach ([$this->first, $this->first, $this->second] as $index => $subject) {
            $question = app(SaveQuestion::class)->execute($admin, ['source_id' => $source->id, 'subject_id' => $subject->id, 'stem' => 'Sentetik '.$index, 'options' => ['A', 'B'], 'correct_option_position' => 1]);
            $questions[] = app(PublishQuestion::class)->execute($admin, $question, $question->revision);
        }

        return $questions;
    }

    private function context(): string
    {
        return $this->getJson('/api/v1/me/contexts')->assertOk()->json('data.0.id');
    }

    // $option: index of the chosen option, or null to skip the question.
    private function practice(Question $question, ?int $option, ?string $context = null): void
    {
        $context ??= $this->context();
        $attempt = $this->postJson('/api/v1/contexts/'.$context.'/practice-attempts', ['id' => (string) Str::uuid(), 'question_id' => $question->id, 'question_version_id' => $question->published_version_id])->assertOk()->json('data');
        $this->postJson('/api/v1/contexts/'.$context.'/practice-attempts/'.$attempt['id'].'/answer', ['selected_option_id' => $option === null ? null : $attempt['question']['options'][$option]['id']])->assertOk();
    }

    private function review(string $kind, ?string $context = null)
    {
        return $this->getJson('/api/v1/contexts/'.($context ?? $this->context()).'/review-questions?kind='.$kind);
    }

    public function test_incorrect_and_blank_lists_follow_the_latest_outcome_of_each_question(): void
    {
        [$a, $b, $c] = $this->pool();
        $this->asToken($this->createUser());
        $this->practice($a, 1);
        $this->practice($b, null);
        $this->practice($c, 0);
        $this->assertSame([$a->id], array_column($this->review('incorrect')->assertOk()->json('data'), 'id'));
        $this->assertSame([$b->id], array_column($this->review('blank')->assertOk()->json('data'), 'id'));
        // Answering the wrong question correctly later removes it; the skipped one turns incorrect.
        // Timestamps have second precision, so later answers are made in later seconds.
        $this->travel(2)->seconds();
        $this->practice($a, 0);
        $this->practice($b, 1);
        $this->review('incorrect')->assertOk()->assertJsonPath('data.0.id', $b->id)->assertJsonCount(1, 'data');
        $this->review('blank')->assertOk()->assertJsonCount(0, 'data');
    }

    private function startReviewExam(string $kind, int $count, ?string $context = null, array $extra = [])
    {
        $context ??= $this->context();

        return $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', array_merge(['id' => (string) Str::uuid(), 'review_kind' => $kind, 'question_count' => $count, 'duration_seconds' => 600], $extra));
    }

    public function test_review_summary_counts_each_list_and_a_review_exam_draws_only_from_its_list(): void
    {
        [$a, $b, $c] = $this->pool();
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/contexts/'.$this->context().'/review-summary')->assertOk()->assertExactJson(['data' => ['incorrect' => 0, 'blank' => 0, 'favorite' => 0]]);
        $this->practice($a, 1);
        $this->practice($b, null);
        $this->practice($c, 1);
        $this->putJson('/api/v1/contexts/'.$this->context().'/favorites/'.$c->id)->assertOk();
        $this->getJson('/api/v1/contexts/'.$this->context().'/review-summary')->assertOk()->assertExactJson(['data' => ['incorrect' => 2, 'blank' => 1, 'favorite' => 1]]);

        $wrong = $this->startReviewExam('incorrect', 2)->assertOk()->json('data');
        $this->assertEqualsCanonicalizing([$a->id, $c->id], array_column($wrong['questions'], 'question_id'));
        $this->assertNull($wrong['official_exam']);
        $blank = $this->startReviewExam('blank', 1)->assertOk()->json('data');
        $this->assertSame([$b->id], array_column($blank['questions'], 'question_id'));
        $favorite = $this->startReviewExam('favorite', 1)->assertOk()->json('data');
        $this->assertSame([$c->id], array_column($favorite['questions'], 'question_id'));
        // A subject filter narrows the review list too.
        $this->startReviewExam('incorrect', 1, null, ['subject_id' => $this->second->id])->assertOk()->assertJsonPath('data.questions.0.question_id', $c->id);
    }

    public function test_review_exam_needs_enough_questions_and_cannot_mix_with_a_past_exam_or_unknown_kinds(): void
    {
        [$a] = $this->pool();
        $this->asToken($this->createUser());
        $this->practice($a, 1);
        $this->startReviewExam('incorrect', 2)->assertUnprocessable()->assertJsonValidationErrors('question_count');
        $this->startReviewExam('blank', 1)->assertUnprocessable();
        $this->startReviewExam('everything', 1)->assertUnprocessable()->assertJsonValidationErrors('review_kind');
        $this->postJson('/api/v1/contexts/'.$this->context().'/exam-attempts', ['id' => (string) Str::uuid(), 'review_kind' => 'incorrect', 'official_exam_id' => (string) Str::uuid(), 'duration_seconds' => 600])->assertUnprocessable();
        $this->assertDatabaseCount('exam_attempts', 0);
    }

    public function test_review_lists_of_another_context_are_not_visible_in_the_summary_or_a_review_exam(): void
    {
        [$a] = $this->pool();
        $this->asToken($this->createUser());
        $personal = $this->context();
        $this->practice($a, 1, $personal);
        $other = $this->createUser();
        $this->asToken($other);
        $this->getJson('/api/v1/contexts/'.$this->context().'/review-summary')->assertOk()->assertJsonPath('data.incorrect', 0);
        $this->startReviewExam('incorrect', 1)->assertUnprocessable();
        $this->getJson('/api/v1/contexts/'.$personal.'/review-summary')->assertNotFound();
    }

    public function test_exam_answers_feed_review_lists_only_after_the_exam_is_finished(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $context = $this->context();
        $exam = $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', ['id' => (string) Str::uuid(), 'question_count' => 3, 'duration_seconds' => 60])->assertOk()->json('data');
        $row = $exam['questions'][0];
        $this->putJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$exam['id'].'/answers/'.$row['id'], ['base_version' => 1, 'selected_option_id' => $row['question']['options'][1]['id']])->assertOk();
        $this->review('incorrect', $context)->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$exam['id'].'/finish', ['base_version' => 2])->assertOk();
        $this->review('incorrect', $context)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $row['question_id']);
        $this->review('blank', $context)->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_review_lists_never_expose_the_answer_key_and_are_paginated(): void
    {
        $questions = $this->pool();
        $this->asToken($this->createUser());
        foreach ($questions as $question) {
            $this->practice($question, 1);
        }
        $page = $this->getJson('/api/v1/contexts/'.$this->context().'/review-questions?kind=incorrect&per_page=2')->assertOk()->assertJsonCount(2, 'data')->json();
        $this->assertNotNull($page['meta']['next_cursor']);
        $this->assertArrayNotHasKey('correct_option_id', $page['data'][0]['version']);
        $this->assertArrayNotHasKey('explanation', $page['data'][0]['version']);
        $this->getJson($page['links']['next'])->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_history_is_separate_per_context_and_never_visible_to_other_users(): void
    {
        [$a] = $this->pool();
        $student = $this->createUser();
        $tenant = Tenant::create(['name' => 'Sentetik kurum', 'slug' => 'insights']);
        $membership = $this->createMembership($student, $tenant);
        $this->asToken($student);
        $personal = $this->context();
        $company = $student->studyContexts()->where('tenant_id', $tenant->id)->firstOrFail()->id;
        $this->practice($a, 1, $company);
        $this->review('incorrect', $personal)->assertOk()->assertJsonCount(0, 'data');
        $this->review('incorrect', $company)->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/contexts/'.$personal.'/stats')->assertOk()->assertJsonPath('data.answers.total', 0);
        $this->getJson('/api/v1/contexts/'.$company.'/stats')->assertOk()->assertJsonPath('data.answers.total', 1);
        $this->asToken($this->createUser());
        $this->review('incorrect', $company)->assertNotFound();
        $this->getJson('/api/v1/contexts/'.$company.'/stats')->assertNotFound();
        $this->putJson('/api/v1/contexts/'.$company.'/favorites/'.$a->id)->assertNotFound();
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $this->asToken($admin);
        $this->review('incorrect', $company)->assertNotFound();
        $this->asToken($student);
        app(RevokeMembership::class)->execute($admin, $tenant, $membership->id);
        $this->review('incorrect', $company)->assertForbidden();
        $this->getJson('/api/v1/contexts/'.$company.'/stats')->assertForbidden();
        $this->putJson('/api/v1/contexts/'.$company.'/favorites/'.$a->id)->assertForbidden();
        $this->review('incorrect', $personal)->assertOk();
    }

    public function test_favorites_are_idempotent_context_scoped_and_only_for_published_questions(): void
    {
        [$a, $b] = $this->pool();
        $this->asToken($this->createUser());
        $context = $this->context();
        $url = fn (Question $question) => '/api/v1/contexts/'.$context.'/favorites/'.$question->id;
        $this->putJson($url($a))->assertOk()->assertJsonPath('data.favorite', true);
        $this->putJson($url($a))->assertOk();
        $this->putJson($url($b))->assertOk();
        $this->assertDatabaseCount('favorite_questions', 2);
        $this->review('favorite', $context)->assertOk()->assertJsonCount(2, 'data');
        $attempt = $this->postJson('/api/v1/contexts/'.$context.'/practice-attempts', ['id' => (string) Str::uuid(), 'question_id' => $a->id, 'question_version_id' => $a->published_version_id])->assertOk()->assertJsonPath('data.is_favorite', true)->json('data');
        $this->getJson('/api/v1/contexts/'.$context.'/practice-attempts/'.$attempt['id'])->assertOk()->assertJsonPath('data.is_favorite', true);
        $this->getJson('/api/v1/contexts/'.$context.'/practice-attempts')->assertOk()->assertJsonPath('data.0.is_favorite', true);
        $this->deleteJson($url($a))->assertOk()->assertJsonPath('data.favorite', false);
        $this->getJson('/api/v1/contexts/'.$context.'/practice-attempts/'.$attempt['id'])->assertOk()->assertJsonPath('data.is_favorite', false);
        $this->deleteJson($url($a))->assertOk();
        $this->review('favorite', $context)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $b->id);
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $draft = app(SaveQuestion::class)->execute($admin, ['source_id' => $a->publishedVersion->source_id, 'subject_id' => $this->first->id, 'stem' => 'Taslak', 'options' => ['A', 'B'], 'correct_option_position' => 1]);
        $this->putJson('/api/v1/contexts/'.$context.'/favorites/'.$draft->id)->assertNotFound();
        $this->putJson('/api/v1/contexts/'.$context.'/favorites/'.Str::uuid())->assertNotFound();
        $this->assertDatabaseCount('favorite_questions', 1);
    }

    public function test_stats_count_every_graded_answer_by_subject_and_finished_exams(): void
    {
        [$a, $b, $c] = $this->pool();
        $this->asToken($this->createUser());
        $this->practice($a, 0);
        $this->practice($a, 1);
        $this->practice($b, null);
        $this->practice($c, 0);
        $context = $this->context();
        $started = $this->postJson('/api/v1/contexts/'.$context.'/practice-attempts', ['id' => (string) Str::uuid(), 'question_id' => $c->id, 'question_version_id' => $c->published_version_id])->assertOk();
        $this->assertSame('pending', $started->json('data.outcome'));
        $stats = $this->getJson('/api/v1/contexts/'.$context.'/stats')->assertOk()->json('data');
        $this->assertEquals(['correct' => 2, 'incorrect' => 1, 'blank' => 1, 'total' => 4, 'accuracy_percent' => 50.0], $stats['answers']);
        $this->assertSame(['A sentetik ders', 'B sentetik ders'], array_column($stats['subjects'], 'name'));
        $this->assertEquals(['correct' => 1, 'incorrect' => 1, 'blank' => 1, 'total' => 3], array_intersect_key($stats['subjects'][0], array_flip(['correct', 'incorrect', 'blank', 'total'])));
        $this->assertEquals(100.0, $stats['subjects'][1]['accuracy_percent']);
        $this->assertEquals(['completed' => 0, 'average_score_percent' => null, 'best_score_percent' => null], $stats['exams']);
        $exam = $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', ['id' => (string) Str::uuid(), 'question_count' => 2, 'duration_seconds' => 60, 'subject_id' => $this->first->id])->assertOk()->json('data');
        $row = $exam['questions'][0];
        $this->putJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$exam['id'].'/answers/'.$row['id'], ['base_version' => 1, 'selected_option_id' => $row['question']['options'][1]['id']])->assertOk();
        $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$exam['id'].'/finish', ['base_version' => 2])->assertOk();
        $stats = $this->getJson('/api/v1/contexts/'.$context.'/stats')->assertOk()->json('data');
        $this->assertEquals(['completed' => 0, 'average_score_percent' => null, 'best_score_percent' => null], $stats['exams']);
        $this->assertSame(6, $stats['answers']['total']);
        $this->assertSame(2, $stats['answers']['incorrect']);
        $this->assertSame(2, $stats['answers']['blank']);
    }

    public function test_an_exam_finished_without_a_single_answer_is_abandoned_and_counts_for_nothing(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $context = $this->context();
        $exam = $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', ['id' => (string) Str::uuid(), 'question_count' => 3, 'duration_seconds' => 60])->assertOk()->json('data');
        $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts?scope=all')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$exam['id'].'/finish', ['base_version' => 1])->assertOk();
        // The attempt itself stays readable, but it is no result: not listed, not in the stats, not in the review lists.
        $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$exam['id'])->assertOk()->assertJsonPath('data.status', 'completed');
        $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts')->assertOk()->assertJsonCount(0, 'data');
        $stats = $this->getJson('/api/v1/contexts/'.$context.'/stats')->assertOk()->json('data');
        $this->assertEquals(['completed' => 0, 'average_score_percent' => null, 'best_score_percent' => null], $stats['exams']);
        $this->assertSame(0, $stats['answers']['total']);
        $this->review('blank', $context)->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_personal_insights_allow_unverified_user_and_validate_input(): void
    {
        $this->pool();
        $unverified = $this->createUser(['email_verified_at' => null]);
        $this->asToken($unverified);
        $context = $unverified->studyContexts()->firstOrFail()->id;
        $this->getJson('/api/v1/contexts/'.$context.'/stats')->assertOk();
        $this->review('incorrect', $context)->assertOk();
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/contexts/'.$this->context().'/review-questions')->assertUnprocessable()->assertJsonValidationErrors('kind');
        $this->review('everything')->assertUnprocessable();
        $this->getJson('/api/v1/contexts/'.$this->context().'/review-questions?kind=blank&per_page=101')->assertUnprocessable();
    }

    public function test_review_answers_count_as_practice_but_never_as_another_exam_or_normal_result(): void
    {
        $this->pool();
        $admin = User::where('platform_role', 'platform_admin')->firstOrFail();
        $versionIds = Question::orderBy('id')->pluck('published_version_id')->all();
        $type = ExamType::create(['name' => 'Sentetik tam sınav', 'code' => (string) Str::uuid()]);
        $template = app(SaveOfficialExam::class)->execute($admin, ['exam_type_id' => $type->id, 'title' => 'Sentetik asıl sınav', 'year' => 2026, 'weapon_status' => 'armed', 'exam_number' => '1', 'question_version_ids' => $versionIds]);
        app(PublishOfficialExam::class)->execute($admin, $template);
        $this->asToken($this->createUser());
        $context = $this->context();
        $base = $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts', ['id' => (string) Str::uuid(), 'official_exam_id' => $template->id, 'duration_seconds' => 600])->assertOk()->json('data');
        $row = $base['questions'][0];
        $this->putJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$base['id'].'/answers/'.$row['id'], ['base_version' => 1, 'selected_option_id' => $row['question']['options'][1]['id']])->assertOk();
        $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$base['id'].'/finish', ['base_version' => 2])->assertOk();
        $this->putJson('/api/v1/contexts/'.$context.'/favorites/'.$row['question_id'])->assertOk();
        $baseline = $this->getJson('/api/v1/contexts/'.$context.'/stats')->assertOk()->json('data');
        $reviewIds = [];
        foreach (['incorrect', 'blank', 'favorite'] as $kind) {
            $this->travel(2)->seconds();
            $review = $this->startReviewExam($kind, 1, $context)->assertOk()->assertJsonPath('data.review_kind', $kind)->json('data');
            $reviewIds[] = $review['id'];
            $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $base['id']);
            $answer = $review['questions'][0];
            $this->putJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$review['id'].'/answers/'.$answer['id'], ['base_version' => 1, 'selected_option_id' => $answer['question']['options'][0]['id']])->assertOk();
            $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$review['id'].'/finish', ['base_version' => 2])->assertOk()->assertJsonPath('data.result.correct', 1);
            $stats = $this->getJson('/api/v1/contexts/'.$context.'/stats')->assertOk()->json('data');
            $this->assertSame($baseline['exams'], $stats['exams']);
            $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$review['id'])->assertOk()->assertJsonPath('data.review_kind', $kind);
        }
        $this->assertSame($baseline['answers']['total'] + 3, $stats['answers']['total']);
        $this->assertSame($baseline['answers']['correct'] + 3, $stats['answers']['correct']);
        $this->assertSame(50, $stats['answers']['accuracy_percent']);
        $this->review('incorrect', $context)->assertOk()->assertJsonCount(0, 'data');
        $this->review('blank', $context)->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts?scope=exams')->assertOk()->assertJsonCount(1, 'data');
        $history = $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts?scope=review')->assertOk()->assertJsonCount(3, 'data')->json('data');
        $this->assertEqualsCanonicalizing($reviewIds, array_column($history, 'id'));
        $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts?scope=all')->assertOk()->assertJsonCount(4, 'data');
        $page = $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts?scope=review&per_page=1')->assertOk()->assertJsonCount(1, 'data')->json();
        $this->assertStringContainsString('scope=review', $page['links']['next']);
        $this->getJson($page['links']['next'])->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $reviewIds[1]);
        $export = json_decode($this->post('/api/v1/me/export', ['current_password' => self::PASSWORD], ['Accept' => 'application/json'])->assertOk()->streamedContent(), true, flags: JSON_THROW_ON_ERROR);
        $this->assertCount(3, array_filter(array_column($export['exam_attempts'], 'review_kind')));
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts?scope=review')->assertNotFound();
    }

    public function test_review_kind_is_immutable_and_part_of_idempotency_with_validated_history_scope(): void
    {
        [$a] = $this->pool();
        $this->asToken($this->createUser());
        $context = $this->context();
        $this->practice($a, 1, $context);
        $id = (string) Str::uuid();
        $this->startReviewExam('incorrect', 1, $context, ['id' => $id])->assertOk();
        $this->startReviewExam('incorrect', 1, $context, ['id' => $id])->assertOk()->assertJsonPath('data.id', $id);
        $this->startReviewExam('favorite', 1, $context, ['id' => $id])->assertConflict();
        try {
            DB::transaction(fn () => DB::table('exam_attempts')->where('id', $id)->update(['review_kind' => null, 'revision' => 2]));
            $this->fail('Review kind was changed');
        } catch (QueryException $error) {
            $this->assertSame('23514', $error->errorInfo[0]);
        }
        $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts?scope=unknown')->assertUnprocessable()->assertJsonValidationErrors('scope');
        $this->assertDatabaseCount('exam_attempts', 1);
    }

    public function test_missing_review_schema_rejects_new_reviews_instead_of_recording_another_normal_exam(): void
    {
        $this->pool();
        $this->asToken($this->createUser());
        $context = $this->context();
        DB::statement('ALTER TABLE exam_attempts RENAME COLUMN review_kind TO pending_review_kind');
        try {
            $this->startReviewExam('favorite', 1, $context)->assertStatus(503)->assertJsonPath('code', 'review_unavailable');
            $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts?scope=review')->assertStatus(503);
            $this->getJson('/api/v1/contexts/'.$context.'/exam-attempts')->assertOk()->assertJsonCount(0, 'data');
            $this->getJson('/api/v1/contexts/'.$context.'/stats')->assertOk()->assertJsonPath('data.exams.completed', 0);
            $this->assertDatabaseCount('exam_attempts', 0);
        } finally {
            DB::statement('ALTER TABLE exam_attempts RENAME COLUMN pending_review_kind TO review_kind');
        }
    }
}
