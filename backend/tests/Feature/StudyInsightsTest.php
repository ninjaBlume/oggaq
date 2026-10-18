<?php

namespace Tests\Feature;

use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\Tenancy\Actions\RevokeMembership;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $this->postJson('/api/v1/contexts/'.$context.'/exam-attempts/'.$exam['id'].'/finish', ['base_version' => 1])->assertOk();
        $stats = $this->getJson('/api/v1/contexts/'.$context.'/stats')->assertOk()->json('data');
        $this->assertEquals(['completed' => 1, 'average_score_percent' => 0.0, 'best_score_percent' => 0.0], $stats['exams']);
        $this->assertSame(6, $stats['answers']['total']);
        $this->assertSame(3, $stats['answers']['blank']);
    }

    public function test_new_endpoints_require_a_verified_active_user_and_valid_input(): void
    {
        $this->pool();
        $unverified = $this->createUser(['email_verified_at' => null]);
        $this->asToken($unverified);
        $context = $unverified->studyContexts()->firstOrFail()->id;
        $this->getJson('/api/v1/contexts/'.$context.'/stats')->assertForbidden();
        $this->review('incorrect', $context)->assertForbidden();
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/contexts/'.$this->context().'/review-questions')->assertUnprocessable()->assertJsonValidationErrors('kind');
        $this->review('everything')->assertUnprocessable();
        $this->getJson('/api/v1/contexts/'.$this->context().'/review-questions?kind=blank&per_page=101')->assertUnprocessable();
    }
}
