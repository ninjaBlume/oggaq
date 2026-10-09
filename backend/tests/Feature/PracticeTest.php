<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\Study\Actions\AnswerPracticeAttempt;
use App\Modules\Study\Models\PracticeAttempt;
use App\Modules\Tenancy\Actions\RevokeMembership;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PracticeTest extends TestCase
{
    use RefreshDatabase;

    private function question(bool $published = true): Question
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $subject = Subject::create(['name' => 'Sentetik ders', 'code' => Str::uuid()]);
        $source = QuestionSource::create(['title' => 'Yalnız sentetik test']);
        $question = app(SaveQuestion::class)->execute($admin, [
            'subject_id' => $subject->id, 'source_id' => $source->id,
            'stem' => 'Sentetik soru', 'options' => ['A', 'B'], 'correct_option_position' => 1,
            'explanation' => 'Sentetik açıklama',
        ]);

        return $published ? app(PublishQuestion::class)->execute($admin, $question, $question->revision) : $question;
    }

    private function start(Question $question, ?string $context = null, array $overrides = []): array
    {
        $context ??= $this->getJson('/api/v1/me/contexts')->assertOk()->json('data.0.id');

        return $this->postJson('/api/v1/contexts/'.$context.'/practice-attempts', array_merge([
            'id' => (string) Str::uuid(), 'question_id' => $question->id, 'question_version_id' => $question->published_version_id,
        ], $overrides))->assertOk()->json('data');
    }

    private function url(array $attempt, string $suffix = ''): string
    {
        return '/api/v1/contexts/'.$attempt['context_id'].'/practice-attempts/'.$attempt['id'].$suffix;
    }

    public function test_personal_practice_hides_answers_until_server_grading_and_persists_history(): void
    {
        $question = $this->question();
        $this->asToken($this->createUser());
        $attempt = $this->start($question);
        $this->assertNull($attempt['feedback']);
        $this->assertArrayNotHasKey('correct_option_id', $attempt['question']);
        $this->assertArrayNotHasKey('explanation', $attempt['question']);
        $this->getJson($this->url($attempt))->assertOk()->assertJsonPath('data.outcome', 'pending');
        $this->postJson($this->url($attempt, '/answer'), ['selected_option_id' => $attempt['question']['options'][0]['id']])
            ->assertOk()->assertJsonPath('data.outcome', 'correct')->assertJsonPath('data.feedback.explanation', 'Sentetik açıklama');
        $this->getJson('/api/v1/contexts/'.$attempt['context_id'].'/practice-attempts')->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.outcome', 'correct');
        $this->getJson('/api/v1/questions/'.$question->id)->assertOk()->assertJsonMissingPath('data.version.correct_option_id')->assertJsonMissingPath('data.version.explanation');
    }

    public function test_incorrect_and_explicit_skipped_answers_are_distinct(): void
    {
        $question = $this->question();
        $this->asToken($this->createUser());
        $wrong = $this->start($question);
        $this->postJson($this->url($wrong, '/answer'), ['selected_option_id' => $wrong['question']['options'][1]['id']])->assertOk()->assertJsonPath('data.outcome', 'incorrect');
        $skip = $this->start($question);
        $this->postJson($this->url($skip, '/answer'), ['selected_option_id' => null])->assertOk()->assertJsonPath('data.outcome', 'skipped');
        $this->assertDatabaseCount('practice_attempts', 2);
    }

    public function test_begin_and_answer_retries_do_not_duplicate_or_change_result(): void
    {
        $question = $this->question();
        $this->asToken($this->createUser());
        $attempt = $this->start($question);
        $again = $this->start($question, $attempt['context_id'], ['id' => $attempt['id']]);
        $this->assertEquals($attempt, $again);
        $input = ['selected_option_id' => $attempt['question']['options'][0]['id']];
        $first = $this->postJson($this->url($attempt, '/answer'), $input)->assertOk()->json('data');
        $second = $this->postJson($this->url($attempt, '/answer'), $input)->assertOk()->json('data');
        $this->assertSame($first, $second);
        $this->assertDatabaseCount('practice_attempts', 1);
        $this->postJson($this->url($attempt, '/answer'), ['selected_option_id' => null])->assertConflict()->assertJsonPath('code', 'answer_locked');
    }

    public function test_idempotency_key_cannot_be_reused_for_a_different_question_or_context(): void
    {
        $question = $this->question();
        $other = $this->question();
        $user = $this->createUser();
        $this->asToken($user);
        $attempt = $this->start($question);
        $this->postJson('/api/v1/contexts/'.$attempt['context_id'].'/practice-attempts', ['id' => $attempt['id'], 'question_id' => $other->id, 'question_version_id' => $other->published_version_id])->assertConflict();
        $tenant = Tenant::create(['name' => 'Sentetik kurum', 'slug' => 'sample']);
        $this->createMembership($user, $tenant);
        $context = $user->studyContexts()->where('tenant_id', $tenant->id)->firstOrFail();
        $this->postJson('/api/v1/contexts/'.$context->id.'/practice-attempts', ['id' => $attempt['id'], 'question_id' => $question->id, 'question_version_id' => $question->published_version_id])->assertConflict();
        $this->assertDatabaseCount('practice_attempts', 1);
    }

    public function test_existing_attempt_keeps_original_version_when_new_answer_key_is_published(): void
    {
        $question = $this->question();
        $student = $this->createUser();
        $this->asToken($student);
        $attempt = $this->start($question);
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $question = app(SaveQuestion::class)->execute($admin, [
            'subject_id' => $question->publishedVersion->subject_id, 'source_id' => $question->publishedVersion->source_id,
            'stem' => 'Yeni sentetik metin', 'options' => ['Yeni A', 'Yeni B'], 'correct_option_position' => 2,
            'explanation' => 'Yeni açıklama', 'base_version' => $question->revision,
        ], $question);
        $question = app(PublishQuestion::class)->execute($admin, $question, $question->revision);
        $this->postJson($this->url($attempt, '/answer'), ['selected_option_id' => $attempt['question']['options'][0]['id']])->assertOk()->assertJsonPath('data.outcome', 'correct')->assertJsonPath('data.question.stem', 'Sentetik soru');
        $this->start($question, $attempt['context_id'], ['id' => $attempt['id'], 'question_version_id' => $attempt['question']['id']]);
        $this->postJson('/api/v1/contexts/'.$attempt['context_id'].'/practice-attempts', ['id' => (string) Str::uuid(), 'question_id' => $question->id, 'question_version_id' => $attempt['question']['id']])->assertConflict()->assertJsonPath('code', 'question_changed');
        $fresh = $this->start($question);
        $this->assertSame('Yeni sentetik metin', $fresh['question']['stem']);
    }

    public function test_other_question_options_missing_selection_and_client_grade_are_rejected(): void
    {
        $question = $this->question();
        $other = $this->question();
        $this->asToken($this->createUser());
        $attempt = $this->start($question);
        $this->postJson($this->url($attempt, '/answer'), ['selected_option_id' => $other->publishedVersion->options[0]->id])->assertUnprocessable()->assertJsonValidationErrors('selected_option_id');
        $this->postJson($this->url($attempt, '/answer'), [])->assertUnprocessable()->assertJsonValidationErrors('selected_option_id');
        $this->postJson($this->url($attempt, '/answer'), ['selected_option_id' => null, 'is_correct' => true, 'user_id' => (string) Str::uuid()])->assertUnprocessable()->assertJsonValidationErrors(['is_correct', 'user_id']);
        $this->assertDatabaseHas('practice_attempts', ['id' => $attempt['id'], 'answered_at' => null]);
    }

    public function test_another_user_including_platform_admin_cannot_read_or_write_personal_history(): void
    {
        $question = $this->question();
        $this->asToken($this->createUser());
        $attempt = $this->start($question);
        foreach ([$this->createUser(), $this->createUser(['platform_role' => 'platform_admin'])] as $user) {
            $this->asToken($user);
            $this->getJson($this->url($attempt))->assertNotFound();
            $this->getJson('/api/v1/contexts/'.$attempt['context_id'].'/practice-attempts')->assertNotFound();
            $this->postJson($this->url($attempt, '/answer'), ['selected_option_id' => null])->assertNotFound();
        }
    }

    public function test_tenant_and_personal_contexts_are_isolated_and_revocation_blocks_all_access(): void
    {
        $question = $this->question();
        $user = $this->createUser();
        $tenant = Tenant::create(['name' => 'Sentetik kurum', 'slug' => 'sample']);
        $membership = $this->createMembership($user, $tenant);
        $context = $user->studyContexts()->where('tenant_id', $tenant->id)->firstOrFail();
        $this->asToken($user);
        $personal = $this->start($question);
        $tenantAttempt = $this->start($question, $context->id);
        $this->getJson('/api/v1/contexts/'.$context->id.'/practice-attempts')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/contexts/'.$personal['context_id'].'/practice-attempts/'.$tenantAttempt['id'])->assertNotFound();
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        app(RevokeMembership::class)->execute($admin, $tenant, $membership->id);
        $this->getJson($this->url($tenantAttempt))->assertForbidden();
        $this->getJson('/api/v1/contexts/'.$context->id.'/practice-attempts')->assertForbidden();
        $this->postJson($this->url($tenantAttempt, '/answer'), ['selected_option_id' => null])->assertForbidden();
        $this->getJson($this->url($personal))->assertOk();
    }

    public function test_company_admin_cannot_read_students_personal_or_tenant_attempts(): void
    {
        $question = $this->question();
        $tenant = Tenant::create(['name' => 'Sentetik kurum', 'slug' => 'sample']);
        $student = $this->createUser();
        $this->createMembership($student, $tenant);
        $this->asToken($student);
        $personal = $this->start($question);
        $company = $this->start($question, $student->studyContexts()->where('tenant_id', $tenant->id)->firstOrFail()->id);
        $manager = $this->createUser();
        $this->createMembership($manager, $tenant, 'company_admin');
        $this->asToken($manager);
        $this->getJson($this->url($personal))->assertNotFound();
        $this->getJson($this->url($company))->assertNotFound();
    }

    public function test_transaction_action_rechecks_current_tenant_status(): void
    {
        $question = $this->question();
        $student = $this->createUser();
        $tenant = Tenant::create(['name' => 'Sentetik kurum', 'slug' => 'sample']);
        $this->createMembership($student, $tenant);
        $context = $student->studyContexts()->where('tenant_id', $tenant->id)->firstOrFail();
        $this->asToken($student);
        $attempt = $this->start($question, $context->id);
        $tenant->forceFill(['status' => 'inactive'])->save();
        $this->expectException(AuthorizationException::class);
        app(AnswerPracticeAttempt::class)->execute($student, $context->id, $attempt['id'], null);
    }

    public function test_draft_and_nonexistent_question_cannot_be_practiced(): void
    {
        $draft = $this->question(false);
        $user = $this->createUser();
        $this->asToken($user);
        $context = $user->studyContexts()->firstOrFail()->id;
        $this->postJson('/api/v1/contexts/'.$context.'/practice-attempts', ['id' => (string) Str::uuid(), 'question_id' => $draft->id, 'question_version_id' => $draft->latest_version_id])->assertNotFound();
        $this->assertDatabaseCount('practice_attempts', 0);
    }

    public function test_unverified_and_inactive_accounts_cannot_start_practice(): void
    {
        $question = $this->question();
        foreach ([['email_verified_at' => null], ['status' => 'suspended']] as $attributes) {
            $user = $this->createUser($attributes);
            $this->asToken($user);
            $this->postJson('/api/v1/contexts/'.$user->studyContexts()->firstOrFail()->id.'/practice-attempts', ['id' => (string) Str::uuid(), 'question_id' => $question->id, 'question_version_id' => $question->published_version_id])->assertForbidden();
        }
    }

    public function test_history_cursor_has_no_duplicates_and_stays_scoped(): void
    {
        $question = $this->question();
        $this->asToken($this->createUser());
        $first = $this->start($question);
        $this->start($question);
        $this->start($question);
        $page = $this->getJson('/api/v1/contexts/'.$first['context_id'].'/practice-attempts?per_page=2')->assertOk();
        $this->assertCount(2, $page->json('data'));
        $next = $this->getJson($page->json('links.next'))->assertOk();
        $this->assertCount(1, $next->json('data'));
        $this->assertEmpty(array_intersect(array_column($page->json('data'), 'id'), array_column($next->json('data'), 'id')));
    }

    public function test_database_rejects_draft_version_and_wrong_grade_even_outside_api(): void
    {
        $draft = $this->question(false);
        $user = $this->createUser();
        try {
            DB::transaction(fn () => DB::table('practice_attempts')->insert(['id' => Str::uuid(), 'study_context_id' => $user->studyContexts()->firstOrFail()->id, 'question_id' => $draft->id, 'question_version_id' => $draft->latest_version_id, 'created_at' => now()]));
            $this->fail('Draft accepted.');
        } catch (QueryException) {
            $this->assertDatabaseCount('practice_attempts', 0);
        }
        $question = $this->question();
        $this->asToken($user);
        $attempt = $this->start($question);
        $this->expectException(QueryException::class);
        DB::transaction(fn () => DB::table('practice_attempts')->where('id', $attempt['id'])->update(['selected_option_id' => $attempt['question']['options'][0]['id'], 'is_correct' => false, 'answered_at' => now()]));
    }

    public function test_database_rejects_completed_result_updates(): void
    {
        $question = $this->question();
        $this->asToken($this->createUser());
        $attempt = $this->start($question);
        $this->postJson($this->url($attempt, '/answer'), ['selected_option_id' => null])->assertOk();
        $this->expectException(QueryException::class);
        DB::transaction(fn () => PracticeAttempt::whereKey($attempt['id'])->update(['selected_option_id' => $attempt['question']['options'][0]['id'], 'is_correct' => true]));
    }

    public function test_locked_action_rejects_a_stale_actor_after_account_suspension(): void
    {
        $question = $this->question();
        $user = $this->createUser();
        $this->asToken($user);
        $attempt = $this->start($question);
        User::whereKey($user->id)->update(['status' => 'suspended']);
        $this->expectException(AuthorizationException::class);
        app(AnswerPracticeAttempt::class)->execute($user, $attempt['context_id'], $attempt['id'], null);
    }

    public function test_database_rejects_a_selected_option_from_another_published_version(): void
    {
        $question = $this->question();
        $other = $this->question();
        $this->asToken($this->createUser());
        $attempt = $this->start($question);
        $this->expectException(QueryException::class);
        DB::transaction(fn () => DB::table('practice_attempts')->where('id', $attempt['id'])->update([
            'selected_option_id' => $other->publishedVersion->options[0]->id,
            'is_correct' => false, 'answered_at' => now(),
        ]));
    }

    public function test_database_rejects_a_grade_without_answer_timestamp(): void
    {
        $question = $this->question();
        $this->asToken($this->createUser());
        $attempt = $this->start($question);
        $this->expectException(QueryException::class);
        DB::transaction(fn () => DB::table('practice_attempts')->where('id', $attempt['id'])->update(['is_correct' => false]));
    }
}
