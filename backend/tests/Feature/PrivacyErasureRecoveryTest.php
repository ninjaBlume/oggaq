<?php

namespace Tests\Feature;

use App\Modules\Identity\AccountErasureLedger;
use App\Modules\Jobs\Models\JobApplication;
use App\Modules\Jobs\Models\JobPosting;
use App\Support\PrivacyErasureLedger;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

class PrivacyErasureRecoveryTest extends TestCase
{
    use RefreshDatabase;

    private function application(array $attributes = []): object
    {
        $user = $this->createUser();
        $job = new JobPosting;
        $job->forceFill(['title' => 'Sentetik ilan', 'company_name' => 'Örnek', 'city' => 'Ankara', 'description' => 'Test', 'status' => 'published', 'weapon_requirement' => 'any', 'revision' => 1])->save();
        $row = new JobApplication;
        $row->forceFill($attributes + ['job_posting_id' => $job->id, 'user_id' => $user->id, 'contact_name' => 'Örnek', 'contact_email' => 'synthetic@example.test', 'phone' => '+905550000000', 'cover_letter' => 'Sentetik', 'job_snapshot' => ['id' => $job->id], 'status' => 'submitted', 'revision' => 1])->save();

        return DB::table('job_applications')->where('id', $row->id)->first();
    }

    public function test_targeted_erasure_preserves_account_and_uses_a_separate_hash_and_atomic_proof(): void
    {
        $row = $this->application();
        $other = $this->application();
        $this->artisan('privacy:erase-application', ['application' => $row->id])->assertSuccessful();
        $this->assertDatabaseCount('application_erasures', 0);
        $this->artisan('privacy:erase-application', ['application' => $row->id, '--force' => true])->assertSuccessful();
        $this->assertDatabaseMissing('job_applications', ['id' => $row->id]);
        $this->assertDatabaseHas('job_applications', ['id' => $other->id]);
        $this->assertDatabaseHas('users', ['id' => $row->user_id]);
        $entry = (array) DB::table('application_erasures')->sole();
        $this->assertSame(PrivacyErasureLedger::applicationHash($row->id), $entry['application_hash']);
        $this->assertNotSame(AccountErasureLedger::hash($row->id), $entry['application_hash']);
        $this->assertStringNotContainsString($row->id, json_encode($entry));
        $this->assertDatabaseHas('privacy_erasure_runs', ['job_applications' => 1]);
    }

    public function test_erasure_export_reapplies_only_deleted_application_after_restore_without_deleting_its_owner(): void
    {
        $row = $this->application();
        $file = tempnam(sys_get_temp_dir(), 'privacy-test-');
        try {
            $this->artisan('privacy:erase-application', ['application' => $row->id, '--force' => true])->assertSuccessful();
            $this->artisan('privacy:export-erasures', ['--to' => $file])->assertSuccessful();
            $this->assertSame('0600', substr(sprintf('%o', fileperms($file)), -4));
            $this->assertStringNotContainsString($row->user_id, file_get_contents($file));
            DB::statement('TRUNCATE application_erasures');
            DB::table('job_applications')->insert((array) $row);
            $this->artisan('privacy:reapply-erasures', ['--from' => $file])->assertSuccessful();
            $this->assertDatabaseCount('application_erasures', 0);
            $this->assertDatabaseHas('job_applications', ['id' => $row->id]);
            $this->artisan('privacy:reapply-erasures', ['--from' => $file, '--force' => true])->assertSuccessful();
            $this->assertDatabaseMissing('job_applications', ['id' => $row->id]);
            $this->assertDatabaseHas('users', ['id' => $row->user_id]);
            $this->artisan('privacy:reapply-erasures', ['--from' => $file, '--force' => true])->assertSuccessful();
            $this->assertDatabaseCount('application_erasures', 1);
        } finally {
            unlink($file);
        }
    }

    public function test_corrupt_or_unknown_scope_in_export_does_not_merge_valid_earlier_entries(): void
    {
        $file = tempnam(sys_get_temp_dir(), 'privacy-test-');
        try {
            $valid = ['scope' => 'job_application', 'hash' => str_repeat('a', 64), 'erased_at' => now()->subMinute()->toIso8601String()];
            file_put_contents($file, json_encode($valid)."\n".json_encode($valid + ['bad' => true])."\n".'{"scope":"unknown"}');
            $this->artisan('privacy:reapply-erasures', ['--from' => $file, '--force' => true])->assertFailed();
            $this->assertDatabaseCount('application_erasures', 0);
        } finally {
            unlink($file);
        }
    }

    public function test_legacy_account_exports_are_supported_but_admins_remain_protected(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $student = $this->createUser();
        $file = tempnam(sys_get_temp_dir(), 'privacy-test-');
        try {
            file_put_contents($file, implode("\n", array_map(fn ($user) => json_encode([
                'user_hash' => AccountErasureLedger::hash($user->id), 'erased_at' => now()->subMinute()->toIso8601String(),
            ]), [$admin, $student])));
            $this->artisan('privacy:reapply-erasures', ['--from' => $file, '--force' => true])->assertFailed();
            $this->assertDatabaseHas('users', ['id' => $admin->id]);
            $this->assertDatabaseMissing('users', ['id' => $student->id]);
        } finally {
            unlink($file);
        }
    }

    public function test_holds_prevent_manual_erasure_and_failed_proof_rolls_back_data_and_ledger(): void
    {
        $held = $this->application(['retention_hold_until' => now()->addDay()]);
        $this->artisan('privacy:erase-application', ['application' => $held->id, '--force' => true])->assertFailed();
        $row = $this->application();
        try {
            DB::unprepared("CREATE FUNCTION reject_recovery_proof() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'test rollback'; END $$ LANGUAGE plpgsql; CREATE TRIGGER reject_recovery_proof BEFORE INSERT ON privacy_erasure_runs FOR EACH ROW EXECUTE FUNCTION reject_recovery_proof()");
            try {
                $this->artisan('privacy:erase-application', ['application' => $row->id, '--force' => true])->run();
                $this->fail('Expected proof failure');
            } catch (QueryException) {
                $this->assertDatabaseHas('job_applications', ['id' => $row->id]);
                $this->assertDatabaseCount('application_erasures', 0);
            }
        } finally {
            DB::unprepared('DROP TRIGGER IF EXISTS reject_recovery_proof ON privacy_erasure_runs; DROP FUNCTION IF EXISTS reject_recovery_proof()');
        }
    }

    public function test_periodic_erasure_records_ledger_and_only_expired_ledgers_can_be_pruned(): void
    {
        $row = $this->application(['status' => 'rejected', 'resolved_at' => now()->subDays(181)]);
        $this->artisan('privacy:prune', ['--force' => true])->assertSuccessful();
        $this->assertDatabaseHas('application_erasures', ['application_hash' => PrivacyErasureLedger::applicationHash($row->id)]);
        try {
            DB::transaction(fn () => DB::table('application_erasures')->delete());
            $this->fail('Early ledger deletion allowed');
        } catch (QueryException) {
            $this->assertDatabaseCount('application_erasures', 1);
        }
        DB::table('application_erasures')->insert(['id' => (string) Str::uuid(), 'application_hash' => str_repeat('b', 64), 'erased_at' => now()->subYears(3)->subDay()]);
        $this->artisan('privacy:prune', ['--force' => true])->assertSuccessful();
        $this->assertDatabaseCount('application_erasures', 1);
    }
}
