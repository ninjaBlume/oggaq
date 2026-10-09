<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\QuestionBank\Models\Topic;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class QuestionBankTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        $subject = Subject::create(['name' => 'Sentetik ders', 'code' => 'test-'.Str::lower(Str::random(8))]);
        $topic = Topic::create(['subject_id' => $subject->id, 'name' => 'Sentetik konu', 'code' => 'test-topic']);
        $type = ExamType::create(['name' => 'Sentetik sınav türü', 'code' => 'test-'.Str::lower(Str::random(8))]);
        $source = QuestionSource::create(['title' => 'Test verisi — resmî soru değildir', 'citation' => 'Yalnız otomatik test']);

        return array_merge([
            'subject_id' => $subject->id, 'topic_id' => $topic->id, 'exam_type_id' => $type->id,
            'source_id' => $source->id, 'stem' => 'Sentetik soru metni', 'explanation' => 'Gizli cevap açıklaması',
            'options' => ['Sentetik A', 'Sentetik B', 'Sentetik C'], 'correct_option_position' => 2,
        ], $overrides);
    }

    private function draft(User $admin, array $payload): Question
    {
        return app(SaveQuestion::class)->execute($admin, $payload);
    }

    private function publish(User $admin, Question $question): Question
    {
        return app(PublishQuestion::class)->execute($admin, $question, $question->revision);
    }

    public function test_admin_can_create_catalogs_and_subject_scoped_subtopics(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $this->asToken($admin);
        $subject = $this->postJson('/api/v1/admin/subjects', ['name' => '  Sentetik ders  ', 'code' => 'sample'])
            ->assertCreated()->assertJsonPath('data.name', 'Sentetik ders')->json('data.id');
        $topic = $this->postJson('/api/v1/admin/topics', ['subject_id' => $subject, 'name' => 'Konu', 'code' => 'topic'])
            ->assertCreated()->json('data.id');
        $child = $this->postJson('/api/v1/admin/topics', ['subject_id' => $subject, 'parent_id' => $topic, 'name' => 'Alt konu', 'code' => 'child'])
            ->assertCreated()->assertJsonPath('data.parent_id', $topic)->json('data.id');
        $this->postJson('/api/v1/admin/exam-types', ['name' => 'Esnek tür', 'code' => 'sample-type'])->assertCreated();
        $this->postJson('/api/v1/admin/question-sources', ['title' => 'Sentetik kaynak', 'url' => 'https://example.test/source'])->assertCreated();
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/subjects')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/exam-types')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/v1/subjects/'.$subject.'/topics')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/v1/subjects/'.Str::uuid().'/topics')->assertNotFound();
        $this->assertDatabaseHas('topics', ['id' => $child, 'subject_id' => $subject]);
    }

    public function test_catalog_validation_rejects_duplicate_codes_invalid_urls_and_cross_subject_parent(): void
    {
        $this->asToken($this->createUser(['platform_role' => 'platform_admin']));
        $payload = $this->payload();
        $this->postJson('/api/v1/admin/subjects', ['name' => 'Ders', 'code' => Subject::find($payload['subject_id'])->code])
            ->assertUnprocessable()->assertJsonValidationErrors('code');
        $other = Subject::create(['name' => 'Başka ders', 'code' => 'other']);
        $this->postJson('/api/v1/admin/topics', ['subject_id' => $other->id, 'parent_id' => $payload['topic_id'], 'name' => 'Alt', 'code' => 'child'])
            ->assertUnprocessable()->assertJsonValidationErrors('parent_id');
        $this->postJson('/api/v1/admin/question-sources', ['title' => 'Kaynak', 'url' => 'file:///secret'])
            ->assertUnprocessable()->assertJsonValidationErrors('url');
    }

    public function test_admin_creates_a_transactional_draft_with_ordered_options_and_audit(): void
    {
        $this->asToken($this->createUser(['platform_role' => 'platform_admin']));
        $response = $this->postJson('/api/v1/admin/questions', $this->payload(['stem' => '  Sentetik soru  ']))
            ->assertCreated()->assertJsonPath('data.revision', 1)->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.latest_version.stem', 'Sentetik soru')->assertJsonPath('data.has_pending_changes', true);
        $options = $response->json('data.latest_version.options');
        $this->assertSame([1, 2, 3], array_column($options, 'position'));
        $this->assertSame($options[1]['id'], $response->json('data.latest_version.correct_option_id'));
        $this->assertDatabaseHas('audit_events', ['target_id' => $response->json('data.id'), 'tenant_id' => null, 'action' => 'question.created']);
    }

    public function test_students_and_company_admins_cannot_manage_central_content(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $payload = $this->payload();
        $question = $this->draft($admin, $payload);
        $student = $this->createUser();
        $this->createMembership($student, Tenant::create(['name' => 'Test kurum', 'slug' => 'test']), 'company_admin');
        $this->asToken($student);
        foreach (['subjects', 'topics', 'exam-types', 'question-sources', 'questions'] as $path) {
            $this->getJson('/api/v1/admin/'.$path)->assertForbidden();
        }
        $this->postJson('/api/v1/admin/questions', $payload)->assertForbidden();
        $this->postJson('/api/v1/admin/subjects', ['name' => 'Ders', 'code' => 'attack'])->assertForbidden();
        $this->patchJson('/api/v1/admin/questions/'.$question->id, $payload + ['base_version' => 1])->assertForbidden();
        $this->postJson('/api/v1/admin/questions/'.$question->id.'/publish', ['base_version' => 1])->assertForbidden();
        $this->getJson('/api/v1/admin/questions/'.$question->id)->assertForbidden();
        $this->getJson('/api/v1/admin/questions/'.$question->id.'/versions')->assertForbidden();
    }

    public function test_question_bank_requires_authenticated_verified_active_accounts(): void
    {
        $this->getJson('/api/v1/questions')->assertUnauthorized();
        $user = $this->createUser(['email_verified_at' => null]);
        $this->asToken($user)->getJson('/api/v1/questions')->assertForbidden();
        $user->forceFill(['email_verified_at' => now(), 'status' => 'suspended'])->save();
        $this->getJson('/api/v1/questions')->assertForbidden();
    }

    public function test_drafts_and_answer_keys_are_not_visible_to_students(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $draft = $this->draft($admin, $this->payload(['stem' => 'Gizli taslak']));
        $published = $this->publish($admin, $this->draft($admin, $this->payload()));
        $this->asToken($this->createUser());
        $list = $this->getJson('/api/v1/questions')->assertOk()->assertJsonCount(1, 'data');
        $this->assertSame($published->id, $list->json('data.0.id'));
        $this->assertStringNotContainsString('correct_option_id', $list->getContent());
        $this->assertStringNotContainsString('explanation', $list->getContent());
        $this->assertStringNotContainsString('Gizli taslak', $list->getContent());
        $this->getJson('/api/v1/questions/'.$draft->id)->assertNotFound();
        $this->getJson('/api/v1/questions/'.$published->id)->assertOk()
            ->assertJsonMissingPath('data.version.correct_option_id')->assertJsonMissingPath('data.version.explanation');
        $this->getJson('/api/v1/questions?include_answers=1')->assertUnprocessable();
    }

    public function test_publication_requires_source_answer_and_two_options_without_partial_writes(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $question = $this->draft($admin, $this->payload(['options' => ['A'], 'correct_option_position' => null, 'source_id' => null]));
        $this->asToken($admin)->postJson('/api/v1/admin/questions/'.$question->id.'/publish', ['base_version' => 1])
            ->assertUnprocessable()->assertJsonValidationErrors(['options', 'correct_option_position', 'source_id']);
        $this->assertDatabaseHas('questions', ['id' => $question->id, 'revision' => 1, 'published_version_id' => null]);
        $this->assertDatabaseMissing('audit_events', ['target_id' => $question->id, 'action' => 'question.published']);
    }

    public function test_editing_creates_new_version_and_keeps_previous_publication_until_republished(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $payload = $this->payload();
        $question = $this->publish($admin, $this->draft($admin, $payload));
        $oldId = $question->published_version_id;
        $this->asToken($admin);
        $edit = $this->patchJson('/api/v1/admin/questions/'.$question->id, array_merge($payload, [
            'base_version' => 2, 'stem' => 'Yeni taslak', 'correct_option_position' => 1,
        ]))->assertOk()->assertJsonPath('data.revision', 3)->assertJsonPath('data.latest_version.version', 2)
            ->assertJsonPath('data.has_pending_changes', true)->assertJsonPath('data.published_version_id', $oldId);
        $newId = $edit->json('data.latest_version.id');
        $this->getJson('/api/v1/questions/'.$question->id)->assertOk()->assertJsonPath('data.version.stem', $payload['stem']);
        $this->postJson('/api/v1/admin/questions/'.$question->id.'/publish', ['base_version' => 3])
            ->assertOk()->assertJsonPath('data.revision', 4)->assertJsonPath('data.published_version_id', $newId)
            ->assertJsonPath('data.has_pending_changes', false);
        $this->getJson('/api/v1/questions/'.$question->id)->assertOk()->assertJsonPath('data.version.stem', 'Yeni taslak');
        $history = $this->getJson('/api/v1/admin/questions/'.$question->id.'/versions')->assertOk()->assertJsonCount(2, 'data');
        $this->assertSame($oldId, $history->json('data.1.id'));
        $this->assertSame($payload['stem'], $history->json('data.1.stem'));
        $this->assertSame(2, $history->json('data.1.options.1.position'));
        $this->assertSame($history->json('data.1.options.1.id'), $history->json('data.1.correct_option_id'));
    }

    public function test_stale_edit_and_publish_are_conflicts_and_do_not_create_extra_versions(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $payload = $this->payload();
        $question = $this->draft($admin, $payload);
        $this->asToken($admin);
        $this->patchJson('/api/v1/admin/questions/'.$question->id, $payload + ['base_version' => 1])->assertOk();
        $this->patchJson('/api/v1/admin/questions/'.$question->id, $payload + ['base_version' => 1])
            ->assertConflict()->assertJsonPath('code', 'version_conflict');
        $this->postJson('/api/v1/admin/questions/'.$question->id.'/publish', ['base_version' => 1])->assertConflict();
        $this->assertDatabaseCount('question_versions', 2);
        $this->assertDatabaseCount('question_options', 6);
        $this->assertDatabaseHas('questions', ['id' => $question->id, 'revision' => 2, 'published_version_id' => null]);
    }

    public function test_repeated_current_publication_does_not_change_revision_or_duplicate_audit(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $question = $this->publish($admin, $this->draft($admin, $this->payload()));
        $publishedAt = $question->latestVersion->published_at;
        $this->asToken($admin)->postJson('/api/v1/admin/questions/'.$question->id.'/publish', ['base_version' => 2])
            ->assertOk()->assertJsonPath('data.revision', 2);
        $this->assertSame(1, DB::table('audit_events')->where('action', 'question.published')->count());
        $this->assertTrue($question->fresh()->latestVersion->published_at->equalTo($publishedAt));
    }

    public function test_question_validation_rejects_cross_subject_topics_protected_fields_and_invalid_answer(): void
    {
        $this->asToken($this->createUser(['platform_role' => 'platform_admin']));
        $payload = $this->payload();
        $other = Subject::create(['name' => 'Başka ders', 'code' => 'other']);
        $this->postJson('/api/v1/admin/questions', array_merge($payload, ['subject_id' => $other->id]))
            ->assertUnprocessable()->assertJsonValidationErrors('topic_id');
        $this->postJson('/api/v1/admin/questions', $payload + ['tenant_id' => Str::uuid(), 'published_at' => now()->toISOString()])
            ->assertUnprocessable()->assertJsonValidationErrors(['tenant_id', 'published_at']);
        $this->postJson('/api/v1/admin/questions', array_merge($payload, ['correct_option_position' => 4]))
            ->assertUnprocessable()->assertJsonValidationErrors('correct_option_position');
        $this->postJson('/api/v1/admin/questions', array_merge($payload, ['options' => ['A', ' a ']]))
            ->assertUnprocessable()->assertJsonValidationErrors('options.0');
        $this->postJson('/api/v1/admin/questions', array_merge($payload, ['subject_id' => ['unexpected']]))->assertUnprocessable();
        $this->assertDatabaseCount('questions', 0);
    }

    public function test_pagination_and_filters_follow_published_version_rather_than_pending_changes(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $payload = $this->payload();
        $first = $this->publish($admin, $this->draft($admin, $payload));
        $second = $this->publish($admin, $this->draft($admin, $payload));
        $newPayload = $this->payload();
        app(SaveQuestion::class)->execute($admin, $newPayload + ['base_version' => 2], $first);
        $this->asToken($this->createUser());
        $url = '/api/v1/questions?subject_id='.$payload['subject_id'].'&exam_type_id='.$payload['exam_type_id'].'&source_id='.$payload['source_id'].'&topic_id='.$payload['topic_id'].'&per_page=1';
        $page = $this->getJson($url)->assertOk()->assertJsonCount(1, 'data');
        $this->assertNotNull($page->json('links.next'));
        $next = $this->getJson($page->json('links.next'))->assertOk()->assertJsonCount(1, 'data');
        $this->assertNotSame($page->json('data.0.id'), $next->json('data.0.id'));
        $this->getJson('/api/v1/questions?subject_id='.$newPayload['subject_id'])->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/questions?per_page=101')->assertUnprocessable();
        $this->getJson('/api/v1/questions?subject_id=bad')->assertUnprocessable();
        $this->getJson('/api/v1/questions?status=draft')->assertUnprocessable();
        $this->asToken($admin)->getJson('/api/v1/admin/questions?subject_id='.$newPayload['subject_id'])
            ->assertOk()->assertJsonPath('data.0.id', $first->id)->assertJsonCount(1, 'data');
    }

    public function test_action_rechecks_admin_role_instead_of_trusting_stale_identity(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $payload = $this->payload();
        User::whereKey($admin->id)->update(['platform_role' => 'student']);
        $this->expectException(AuthorizationException::class);
        app(SaveQuestion::class)->execute($admin, $payload);
    }

    public function test_failed_domain_write_rolls_back_question_version_options_and_audit(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $payload = $this->payload(['source_id' => (string) Str::uuid()]);
        try {
            app(SaveQuestion::class)->execute($admin, $payload);
            $this->fail('Foreign key failure was expected.');
        } catch (QueryException $exception) {
            $this->assertSame('23503', $exception->errorInfo[0]);
        }
        $this->assertDatabaseCount('questions', 0);
        $this->assertDatabaseCount('question_versions', 0);
        $this->assertDatabaseCount('question_options', 0);
        $this->assertDatabaseCount('audit_events', 0);
    }

    public function test_database_blocks_changes_to_published_content(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $question = $this->publish($admin, $this->draft($admin, $this->payload()));
        $this->expectException(QueryException::class);
        DB::table('question_versions')->where('id', $question->published_version_id)->update(['stem' => 'Tampering']);
    }

    public function test_database_blocks_deletion_of_published_version(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $question = $this->publish($admin, $this->draft($admin, $this->payload()));
        $this->expectException(QueryException::class);
        DB::table('question_versions')->where('id', $question->published_version_id)->delete();
    }

    public function test_database_blocks_changes_to_published_options(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $question = $this->publish($admin, $this->draft($admin, $this->payload()));
        $this->expectException(QueryException::class);
        DB::table('question_options')->where('question_version_id', $question->published_version_id)->update(['text' => 'Tampering']);
    }

    public function test_database_blocks_inserting_options_into_published_version(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $question = $this->publish($admin, $this->draft($admin, $this->payload()));
        $this->expectException(QueryException::class);
        DB::table('question_options')->insert(['id' => Str::uuid(), 'question_version_id' => $question->published_version_id, 'position' => 4, 'text' => 'New']);
    }

    public function test_database_blocks_deleting_options_from_published_version(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $question = $this->publish($admin, $this->draft($admin, $this->payload()));
        $this->expectException(QueryException::class);
        DB::table('question_options')->where('question_version_id', $question->published_version_id)->delete();
    }

    public function test_database_rejects_answer_from_another_version(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $first = $this->draft($admin, $this->payload());
        $second = $this->draft($admin, $this->payload());
        $this->expectException(QueryException::class);
        DB::table('question_versions')->where('id', $first->latest_version_id)->update([
            'correct_option_id' => $second->latestVersion->options[0]->id,
        ]);
    }

    public function test_database_rejects_topic_from_another_subject(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $question = $this->draft($admin, $this->payload());
        $other = Subject::create(['name' => 'Başka ders', 'code' => 'other']);
        $this->expectException(QueryException::class);
        DB::table('question_versions')->where('id', $question->latest_version_id)->update(['subject_id' => $other->id]);
    }

    public function test_database_rejects_version_pointer_to_another_question(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $first = $this->draft($admin, $this->payload());
        $second = $this->draft($admin, $this->payload());
        $this->expectException(QueryException::class);
        DB::table('questions')->where('id', $first->id)->update(['latest_version_id' => $second->latest_version_id]);
    }

    public function test_database_rejects_draft_as_public_version(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $question = $this->draft($admin, $this->payload());
        $this->expectException(QueryException::class);
        DB::table('questions')->where('id', $question->id)->update(['published_version_id' => $question->latest_version_id]);
    }
}
