<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class JobsTest extends TestCase
{
    use RefreshDatabase;

    private function posting(array $extra = []): array
    {
        return $extra + ['title' => 'Sentetik ÖGG ilanı', 'company_name' => 'Sentetik firma', 'city' => 'İstanbul', 'description' => 'Yalnız otomatik test ilanıdır.', 'weapon_requirement' => 'any', 'status' => 'published', 'expires_at' => null];
    }

    private function application(): array
    {
        return ['contact_name' => 'Sentetik Aday', 'contact_email' => 'candidate@example.test', 'phone' => '+90 555 123 45 67', 'cover_letter' => 'Sentetik başvuru notu.'];
    }

    private function job(array $extra = []): array
    {
        $this->asToken($this->createUser(['platform_role' => 'platform_admin']));

        return $this->postJson('/api/v1/admin/job-postings', $this->posting($extra))->assertCreated()->json('data');
    }

    public function test_only_platform_admin_can_manage_jobs_and_view_applications(): void
    {
        $job = $this->job();
        $student = $this->createUser();
        $tenant = Tenant::create(['name' => 'Sentetik kurum', 'slug' => 'jobs']);
        $this->createMembership($student, $tenant, 'company_admin');
        $this->asToken($student);
        $this->getJson('/api/v1/job-postings')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/v1/admin/job-postings', $this->posting())->assertForbidden();
        $this->getJson('/api/v1/admin/job-postings')->assertForbidden();
        $this->getJson('/api/v1/admin/job-postings/'.$job['id'].'/applications')->assertForbidden();
        $this->patchJson('/api/v1/admin/job-postings/'.$job['id'], $this->posting() + ['base_version' => 1])->assertForbidden();
    }

    public function test_drafts_closed_and_expired_jobs_are_hidden_and_refuse_new_applications(): void
    {
        $draft = $this->job(['status' => 'draft']);
        $closed = $this->job(['status' => 'closed']);
        $open = $this->job(['expires_at' => now()->addMinute()->toISOString()]);
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/job-postings')->assertOk()->assertJsonCount(1, 'data');
        foreach ([$draft, $closed] as $job) {
            $this->getJson('/api/v1/job-postings/'.$job['id'])->assertNotFound();
            $this->postJson('/api/v1/job-postings/'.$job['id'].'/applications', $this->application())->assertUnprocessable();
        }
        $this->travel(61)->seconds();
        $this->getJson('/api/v1/job-postings')->assertJsonCount(0, 'data');
        $this->postJson('/api/v1/job-postings/'.$open['id'].'/applications', $this->application())->assertUnprocessable();
    }

    public function test_application_is_idempotent_private_encrypted_and_preserves_the_job_snapshot(): void
    {
        $job = $this->job();
        $student = $this->createUser();
        $this->asToken($student);
        $url = '/api/v1/job-postings/'.$job['id'].'/applications';
        $application = $this->postJson($url, $this->application())->assertCreated()->json('data');
        $this->postJson($url, $this->application())->assertOk()->assertJsonPath('data.id', $application['id']);
        $this->assertDatabaseCount('job_applications', 1);
        $this->postJson($url, array_replace($this->application(), ['phone' => '5559998877']))->assertConflict();
        $raw = DB::table('job_applications')->first();
        $this->assertNotSame($this->application()['phone'], $raw->phone);
        $this->assertNotSame($this->application()['contact_email'], $raw->contact_email);
        $this->assertNotSame($this->application()['cover_letter'], $raw->cover_letter);
        $this->getJson('/api/v1/job-postings/'.$job['id'])->assertOk()->assertJsonPath('data.application_id', $application['id'])->assertJsonMissingPath('data.applications_count');
        $this->asToken($this->createUser());
        $this->getJson('/api/v1/me/job-applications')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/v1/job-postings/'.$job['id'])->assertJsonPath('data.application_id', null);
        $this->asToken($this->createUser(['platform_role' => 'platform_admin']));
        $this->patchJson('/api/v1/admin/job-postings/'.$job['id'], $this->posting(['title' => 'Değişen ilan', 'status' => 'closed']) + ['base_version' => 1])->assertOk();
        $this->patchJson('/api/v1/admin/job-postings/'.$job['id'], $this->posting() + ['base_version' => 1])->assertConflict();
        $this->getJson('/api/v1/admin/job-postings/'.$job['id'].'/applications')->assertOk()->assertJsonPath('data.0.phone', $this->application()['phone']);
        $this->patchJson('/api/v1/admin/job-applications/'.$application['id'], ['status' => 'reviewing', 'base_version' => 1])->assertOk();
        $this->patchJson('/api/v1/admin/job-applications/'.$application['id'], ['status' => 'rejected', 'base_version' => 1])->assertConflict();
        $this->asToken($student);
        $this->getJson('/api/v1/me/job-applications')->assertOk()->assertJsonPath('data.0.status', 'reviewing')->assertJsonPath('data.0.job.title', $job['title']);
        $this->patchJson('/api/v1/admin/job-applications/'.$application['id'], ['status' => 'accepted', 'base_version' => 2])->assertForbidden();
        $this->postJson($url, $this->application())->assertOk()->assertJsonPath('data.id', $application['id']);
    }

    public function test_validation_and_identity_fields_cannot_be_forged(): void
    {
        $job = $this->job();
        $this->asToken($this->createUser());
        $url = '/api/v1/job-postings/'.$job['id'].'/applications';
        foreach ([['phone' => 'letters'], ['phone' => '-------'], ['contact_email' => 'bad'], ['cover_letter' => str_repeat('x', 2001)], ['user_id' => $this->createUser()->id], ['status' => 'accepted']] as $extra) {
            $this->postJson($url, array_replace($this->application(), $extra))->assertUnprocessable();
        }
        $this->assertDatabaseCount('job_applications', 0);
        $this->asToken($this->createUser(['platform_role' => 'platform_admin']));
        $this->postJson('/api/v1/admin/job-postings', $this->posting(['expires_at' => now()->subDay()->toISOString()]))->assertUnprocessable();
    }

    public function test_job_applications_export_and_erase_with_the_person(): void
    {
        $job = $this->job();
        $student = $this->createUser();
        $other = $this->createUser();
        $this->asToken($other);
        $this->postJson('/api/v1/job-postings/'.$job['id'].'/applications', $this->application())->assertCreated();
        $this->asToken($student);
        $this->postJson('/api/v1/job-postings/'.$job['id'].'/applications', $this->application())->assertCreated();
        $export = $this->post('/api/v1/me/export', ['current_password' => self::PASSWORD], ['Accept' => 'application/json'])->assertOk()->streamedContent();
        $data = json_decode($export, true);
        $this->assertCount(1, $data['job_applications']);
        $this->assertSame($this->application()['phone'], $data['job_applications'][0]['phone']);
        $this->deleteJson('/api/v1/me', ['current_password' => self::PASSWORD, 'confirmation' => 'HESABIMI SİL'])->assertOk();
        $this->assertDatabaseMissing('job_applications', ['user_id' => $student->id]);
        $this->assertDatabaseHas('job_applications', ['user_id' => $other->id]);
        $this->assertDatabaseHas('job_postings', ['id' => $job['id']]);
    }
}
