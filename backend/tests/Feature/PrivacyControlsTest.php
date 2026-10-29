<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Documents\Actions\DocumentExports;
use App\Modules\Identity\AccountErasureLedger;
use App\Modules\Jobs\Actions\ReviewJobApplication;
use App\Modules\Jobs\Actions\SaveJobPosting;
use App\Modules\Jobs\Models\JobApplication;
use App\Modules\Jobs\Models\JobPosting;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Tests\TestCase;

class PrivacyControlsTest extends TestCase
{
    use RefreshDatabase;

    private function registration(array $extra = []): array
    {
        return $extra + ['name' => 'Örnek Öğrenci', 'email' => 'privacy@example.test',
            'password' => self::PASSWORD, 'password_confirmation' => self::PASSWORD];
    }

    private function version(): string
    {
        return array_key_last(config('privacy_notices'));
    }

    private function application(array $job = [], array $attributes = []): JobApplication
    {
        $posting = new JobPosting;
        $posting->forceFill($job + ['title' => 'Sentetik ilan', 'company_name' => 'Örnek şirket', 'city' => 'Ankara',
            'description' => 'Sentetik test', 'status' => 'published', 'weapon_requirement' => 'any', 'revision' => 1])->save();
        $application = new JobApplication;
        $application->forceFill($attributes + ['job_posting_id' => $posting->id, 'user_id' => $this->createUser()->id,
            'contact_name' => 'Örnek Öğrenci', 'contact_email' => 'example@example.test', 'phone' => '+905550000001',
            'cover_letter' => 'Sentetik ön yazı', 'job_snapshot' => $posting->only(['id', 'title']), 'status' => 'submitted', 'revision' => 1])->save();

        return $application;
    }

    public function test_registration_records_the_server_hash_and_time_without_consent_ip_or_user_agent(): void
    {
        $response = $this->postJson('/api/v1/auth/register', $this->registration([
            'privacy_notice_version' => $this->version(), 'content_hash' => str_repeat('a', 64), 'recorded_at' => '2001-01-01',
        ]))->assertCreated();
        $row = DB::table('privacy_notice_receipts')->sole();
        $this->assertSame($response->json('data.id'), $row->user_id);
        $this->assertSame(config('privacy_notices')[$this->version()], $row->content_hash);
        $this->assertSame('registration', $row->scope);
        $this->assertEqualsWithDelta(now()->timestamp, strtotime($row->recorded_at), 2);
        $this->assertSame(['id', 'user_id', 'scope', 'notice_version', 'content_hash', 'recorded_at'], array_keys((array) $row));
    }

    public function test_old_clients_can_register_but_unknown_versions_do_not_create_accounts_or_receipts(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registration(['privacy_notice_version' => 'unknown']))->assertUnprocessable();
        $this->assertDatabaseCount('users', 0);
        $this->postJson('/api/v1/auth/register', $this->registration())->assertCreated();
        $this->assertDatabaseCount('privacy_notice_receipts', 0);
    }

    public function test_failed_registration_does_not_leave_a_receipt(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registration(['privacy_notice_version' => $this->version(), 'password_confirmation' => 'wrong']))->assertUnprocessable();
        $this->assertDatabaseCount('privacy_notice_receipts', 0);
    }

    public function test_job_application_receipt_is_scoped_private_and_idempotent(): void
    {
        $existing = $this->application();
        $student = $this->createUser(['email_verified_at' => now()]);
        $url = '/api/v1/job-postings/'.$existing->job_posting_id.'/applications';
        $input = ['contact_name' => 'Örnek Başvuran', 'contact_email' => $student->email, 'phone' => '+905550000002', 'privacy_notice_version' => $this->version()];
        $this->asToken($student)->postJson($url, $input)->assertCreated();
        $this->postJson($url, $input)->assertOk();
        $this->assertDatabaseHas('privacy_notice_receipts', ['user_id' => $student->id, 'scope' => 'job_application']);
        $this->assertDatabaseCount('privacy_notice_receipts', 1);
        $this->assertDatabaseCount('job_applications', 2);
    }

    public function test_document_notice_is_recorded_before_preparation_and_never_added_to_pdf_payload(): void
    {
        $student = $this->createUser();
        $this->asToken($student)->postJson('/api/v1/documents/prepare', ['template_id' => 'petition-general',
            'fields' => ['request' => 'Talep', 'reason' => 'Gerekçe'], 'privacy_notice_version' => $this->version()])->assertOk();
        $url = $this->postJson('/api/v1/document-exports', ['template_id' => 'petition-general', 'mode' => 'blank',
            'privacy_notice_version' => $this->version()])->assertCreated()->json('data.viewer_url');
        $payload = app(DocumentExports::class)->redeem(explode('#', $url)[1]);
        $this->assertArrayNotHasKey('privacy_notice_version', $payload);
        $this->assertDatabaseCount('privacy_notice_receipts', 1);
    }

    public function test_receipts_are_exported_only_to_the_owner_and_cascade_on_account_deletion(): void
    {
        Notification::fake();
        $id = $this->postJson('/api/v1/auth/register', $this->registration(['privacy_notice_version' => $this->version()]))->assertCreated()->json('data.id');
        $owner = User::findOrFail($id);
        $this->asToken($this->createUser());
        $other = json_decode($this->post('/api/v1/me/export', ['current_password' => self::PASSWORD])->assertOk()->streamedContent(), true);
        $this->assertSame([], $other['privacy_notice_receipts']);
        $this->asToken($owner);
        $data = json_decode($this->post('/api/v1/me/export', ['current_password' => self::PASSWORD])->assertOk()->streamedContent(), true);
        $this->assertCount(1, $data['privacy_notice_receipts']);
        $this->assertArrayNotHasKey('user_id', $data['privacy_notice_receipts'][0]);
        $this->deleteJson('/api/v1/me', ['current_password' => self::PASSWORD, 'confirmation' => 'HESABIMI SİL'])->assertOk();
        $this->assertDatabaseCount('privacy_notice_receipts', 0);
    }

    public function test_notice_receipts_cannot_be_rewritten(): void
    {
        $this->postJson('/api/v1/auth/register', $this->registration(['privacy_notice_version' => $this->version()]))->assertCreated();
        $this->expectException(QueryException::class);
        DB::table('privacy_notice_receipts')->update(['notice_version' => 'fake']);
    }

    public function test_pruning_defaults_to_preview_then_deletes_only_ended_old_applications(): void
    {
        $old = now()->subDays(181);
        $closed = $this->application(['status' => 'closed', 'closed_at' => $old]);
        $expired = $this->application(['expires_at' => $old]);
        $terminal = $this->application([], ['status' => 'rejected', 'resolved_at' => $old]);
        $active = $this->application([], ['created_at' => now()->subYears(2)]);
        $recent = $this->application([], ['status' => 'accepted', 'resolved_at' => now()->subDays(179)]);
        $held = $this->application(['status' => 'closed', 'closed_at' => $old], ['retention_hold_until' => now()->addDay()]);
        $this->artisan('privacy:prune')->expectsOutputToContain('Hiçbir şey silinmedi')->assertSuccessful();
        $this->assertDatabaseCount('job_applications', 6);
        $this->artisan('privacy:prune', ['--force' => true])->assertSuccessful();
        foreach ([$closed, $expired, $terminal] as $row) {
            $this->assertDatabaseMissing('job_applications', ['id' => $row->id]);
        }
        foreach ([$active, $recent, $held] as $row) {
            $this->assertDatabaseHas('job_applications', ['id' => $row->id]);
        }
        $proof = DB::table('privacy_erasure_runs')->sole();
        $this->assertSame(3, $proof->job_applications);
        $this->assertStringNotContainsString('contact', json_encode($proof));
        $this->assertDatabaseCount('users', 6);
        $this->artisan('privacy:prune', ['--force' => true])->assertSuccessful();
        $this->assertDatabaseCount('privacy_erasure_runs', 1);
    }

    public function test_review_and_reopening_keep_the_retention_clock_accurate(): void
    {
        $application = $this->application([], ['status' => 'rejected', 'resolved_at' => now()->subDays(181)]);
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $review = app(ReviewJobApplication::class);
        $review->execute($admin, $application->id, ['status' => 'accepted', 'base_version' => 1]);
        $this->assertEquals(substr($application->resolved_at, 0, 19), substr($application->fresh()->resolved_at, 0, 19));
        $review->execute($admin, $application->id, ['status' => 'reviewing', 'base_version' => 2]);
        $this->assertNull($application->fresh()->resolved_at);
        $job = JobPosting::findOrFail($application->job_posting_id);
        $save = app(SaveJobPosting::class);
        $input = $job->only(['title', 'company_name', 'city', 'description', 'weapon_requirement', 'status', 'expires_at']);
        $save->execute($admin, array_replace($input, ['status' => 'closed', 'base_version' => 1]), $job->id);
        $this->assertNotNull($job->fresh()->closed_at);
        $save->execute($admin, array_replace($input, ['status' => 'published', 'base_version' => 2]), $job->id);
        $this->assertNull($job->fresh()->closed_at);
        $this->artisan('privacy:prune', ['--force' => true])->assertSuccessful();
        $this->assertDatabaseHas('job_applications', ['id' => $application->id]);
    }

    public function test_retention_boundary_and_expired_holds_do_not_erase_early(): void
    {
        $this->freezeTime();
        $boundary = $this->application([], ['status' => 'rejected', 'resolved_at' => now()->subDays(180)]);
        $held = $this->application([], ['status' => 'rejected', 'resolved_at' => now()->subDays(181), 'retention_hold_until' => now()->addMinute()]);
        $this->artisan('privacy:prune', ['--force' => true])->assertSuccessful();
        $this->assertDatabaseHas('job_applications', ['id' => $boundary->id]);
        $this->assertDatabaseHas('job_applications', ['id' => $held->id]);
        $this->travel(61)->seconds();
        $this->artisan('privacy:prune', ['--force' => true])->assertSuccessful();
        $this->assertDatabaseCount('job_applications', 0);
    }

    public function test_failure_to_record_erasure_proof_rolls_back_application_deletion(): void
    {
        $row = $this->application([], ['status' => 'rejected', 'resolved_at' => now()->subDays(181)]);
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION reject_test_erasure_proof() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Synthetic proof storage failure' USING ERRCODE = '23514';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER reject_test_erasure_proof BEFORE INSERT ON privacy_erasure_runs FOR EACH ROW EXECUTE FUNCTION reject_test_erasure_proof();
SQL);
        try {
            $this->artisan('privacy:prune', ['--force' => true])->run();
            $this->fail('Deletion must fail when its proof cannot be stored');
        } catch (QueryException $exception) {
            $this->assertStringContainsString('Synthetic proof storage failure', $exception->getMessage());
        }
        $this->assertDatabaseHas('job_applications', ['id' => $row->id]);
        $this->assertDatabaseCount('privacy_erasure_runs', 0);
    }

    public function test_a_hold_is_bounded_and_releasing_it_allows_due_erasure(): void
    {
        $row = $this->application([], ['status' => 'rejected', 'resolved_at' => now()->subDays(181)]);
        $this->artisan('privacy:hold-application', ['application' => $row->id, 'until' => now()->addYears(2)->format('Y-m-d')])->assertFailed();
        $this->artisan('privacy:hold-application', ['application' => $row->id, 'until' => '2027-02-31'])->assertFailed();
        $this->artisan('privacy:hold-application', ['application' => $row->id, 'until' => now()->addWeek()->format('Y-m-d')])->assertSuccessful();
        $this->artisan('privacy:prune', ['--force' => true])->assertSuccessful();
        $this->assertDatabaseHas('job_applications', ['id' => $row->id]);
        $this->artisan('privacy:hold-application', ['application' => $row->id, 'until' => 'release'])->assertSuccessful();
        $this->artisan('privacy:prune', ['--force' => true])->assertSuccessful();
        $this->assertDatabaseMissing('job_applications', ['id' => $row->id]);
    }

    public function test_old_audits_and_erasure_hashes_expire_but_recent_proof_is_protected(): void
    {
        DB::table('audit_events')->insert(['id' => (string) Str::uuid(), 'tenant_id' => null, 'actor_id' => null,
            'target_id' => (string) Str::uuid(), 'action' => 'synthetic', 'created_at' => now()->subYears(4)]);
        AccountErasureLedger::record((string) Str::uuid(), now()->subYears(4));
        AccountErasureLedger::record((string) Str::uuid(), now());
        $this->artisan('privacy:prune', ['--force' => true])->assertSuccessful();
        $this->assertDatabaseCount('audit_events', 0);
        $this->assertDatabaseCount('account_erasures', 1);
        $this->assertDatabaseHas('privacy_erasure_runs', ['audit_events' => 1, 'account_erasures' => 1]);
        foreach (['DELETE FROM privacy_erasure_runs', 'UPDATE privacy_erasure_runs SET job_applications = 999', 'DELETE FROM account_erasures'] as $sql) {
            try {
                DB::transaction(function () use ($sql) {
                    DB::statement("SET LOCAL oggaq.privacy_prune = 'on'");
                    DB::statement($sql);
                });
                $this->fail('Retention guard accepted '.$sql);
            } catch (QueryException $e) {
                $this->assertSame('23514', $e->errorInfo[0]);
            }
        }
    }
}
