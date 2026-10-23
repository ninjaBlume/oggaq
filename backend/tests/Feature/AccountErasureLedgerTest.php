<?php

namespace Tests\Feature;

use App\Models\User;
use App\Modules\Identity\AccountErasureLedger;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use RuntimeException;
use Tests\TestCase;

class AccountErasureLedgerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
    }

    private function deleteAccount(User $user)
    {
        return $this->asToken($user)->deleteJson('/api/v1/me', ['current_password' => self::PASSWORD, 'confirmation' => 'HESABIMI SİL']);
    }

    // What a restore from an older backup does: the user and their study context are back in the database.
    private function resurrect(array $attributes): void
    {
        DB::table('users')->insert($attributes);
        DB::table('study_contexts')->insert(['id' => (string) Str::uuid(), 'user_id' => $attributes['id'], 'created_at' => now(), 'updated_at' => now()]);
    }

    private function exportFile(): string
    {
        $file = tempnam(sys_get_temp_dir(), 'erasures');
        $this->artisan('accounts:export-erasures', ['--to' => $file])->assertSuccessful();

        return $file;
    }

    public function test_deleting_an_account_writes_only_a_keyed_hash_in_the_same_transaction(): void
    {
        $user = $this->createUser(['email' => 'leaving-ledger@example.test']);
        $this->deleteAccount($user)->assertOk();

        $rows = DB::table('account_erasures')->get();
        $this->assertCount(1, $rows);
        $this->assertSame(AccountErasureLedger::hash($user->id), $rows[0]->user_hash);
        $this->assertMatchesRegularExpression('/^[0-9a-f]{64}$/', $rows[0]->user_hash);
        $stored = json_encode($rows);
        $this->assertStringNotContainsString($user->id, $stored);
        $this->assertStringNotContainsString('leaving-ledger', $stored);
        $this->assertSame(['id', 'user_hash', 'erased_at'], array_keys((array) $rows[0]));
    }

    public function test_a_refused_deletion_leaves_no_ledger_entry(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);

        $this->deleteAccount($admin)->assertStatus(409);

        $this->assertSame(0, DB::table('account_erasures')->count());
    }

    public function test_the_hash_depends_on_the_secret_and_a_production_instance_refuses_to_run_without_one(): void
    {
        $id = (string) Str::uuid();
        config(['security.erasure_key' => 'first-secret']);
        $first = AccountErasureLedger::hash($id);
        config(['security.erasure_key' => 'second-secret']);
        $this->assertNotSame($first, AccountErasureLedger::hash($id));
        $this->assertSame(AccountErasureLedger::hash($id), AccountErasureLedger::hash(strtoupper($id)));

        config(['security.erasure_key' => '']);
        $this->app['env'] = 'production';
        $this->expectException(RuntimeException::class);
        AccountErasureLedger::hash($id);
    }

    public function test_the_ledger_is_append_only(): void
    {
        AccountErasureLedger::record((string) Str::uuid(), now());

        foreach (['update account_erasures set erased_at = now()', 'delete from account_erasures'] as $statement) {
            try {
                DB::transaction(fn () => DB::statement($statement));
                $this->fail('The ledger accepted: '.$statement);
            } catch (QueryException $exception) {
                $this->assertStringContainsString('append-only', $exception->getMessage());
            }
        }
        $this->assertSame(1, DB::table('account_erasures')->count());
    }

    public function test_a_restored_account_is_found_and_only_removed_with_force(): void
    {
        $leaving = $this->createUser();
        $bystander = $this->createUser();
        $attributes = (array) DB::table('users')->where('id', $leaving->id)->first();
        $this->deleteAccount($leaving)->assertOk();
        $this->resurrect($attributes);

        $this->artisan('accounts:reapply-erasures')->expectsOutputToContain('geri gelmiş hesap: 1')->expectsOutputToContain('Hiçbir şey silinmedi')->assertSuccessful();
        $this->assertNotNull(User::find($leaving->id));

        $this->artisan('accounts:reapply-erasures', ['--force' => true])->expectsOutputToContain('Silinen hesap: 1')->assertSuccessful();
        $this->assertNull(User::find($leaving->id));
        $this->assertSame(0, DB::table('study_contexts')->where('user_id', $leaving->id)->count());
        $this->assertNotNull(User::find($bystander->id));
        $this->assertSame(1, DB::table('study_contexts')->where('user_id', $bystander->id)->count());
        // Running it again finds nothing.
        $this->artisan('accounts:reapply-erasures', ['--force' => true])->expectsOutputToContain('geri gelmiş hesap: 0')->assertSuccessful();
    }

    public function test_someone_who_registered_again_with_the_same_address_is_not_mistaken_for_a_restored_account(): void
    {
        $first = $this->createUser(['email' => 'same-address@example.test']);
        $this->deleteAccount($first)->assertOk();
        $second = $this->createUser(['email' => 'same-address@example.test']);

        $this->artisan('accounts:reapply-erasures', ['--force' => true])->expectsOutputToContain('geri gelmiş hesap: 0')->assertSuccessful();

        $this->assertNotNull(User::find($second->id));
    }

    public function test_the_ledger_export_brings_back_erasures_that_the_restored_backup_does_not_know(): void
    {
        $leaving = $this->createUser();
        $attributes = (array) DB::table('users')->where('id', $leaving->id)->first();
        $this->deleteAccount($leaving)->assertOk();
        $file = $this->exportFile();
        $lines = array_filter(explode("\n", (string) file_get_contents($file)));
        $this->assertCount(1, $lines);
        $this->assertSame(['user_hash', 'erased_at'], array_keys(json_decode($lines[0], true)));
        $this->assertSame('0640', substr(sprintf('%o', fileperms($file)), -4));

        // The restored database has neither the erasure nor the entry in its own ledger copy (older backup).
        DB::statement('truncate account_erasures');
        $this->resurrect($attributes);
        $this->artisan('accounts:reapply-erasures')->expectsOutputToContain('geri gelmiş hesap: 0')->assertSuccessful();
        $this->artisan('accounts:reapply-erasures', ['--from' => $file, '--force' => true])->expectsOutputToContain('Listeye eklenen yeni kayıt: 1')->expectsOutputToContain('Silinen hesap: 1')->assertSuccessful();

        $this->assertNull(User::find($leaving->id));
        $this->assertSame(1, DB::table('account_erasures')->count());
        unlink($file);
    }

    public function test_counting_with_an_export_file_writes_nothing_to_the_ledger(): void
    {
        $leaving = $this->createUser();
        $attributes = (array) DB::table('users')->where('id', $leaving->id)->first();
        $this->deleteAccount($leaving)->assertOk();
        $file = $this->exportFile();
        DB::statement('truncate account_erasures');
        $this->resurrect($attributes);

        $this->artisan('accounts:reapply-erasures', ['--from' => $file])->expectsOutputToContain('Dosyadan okunan kayıt: 1')->expectsOutputToContain('geri gelmiş hesap: 1')->assertSuccessful();

        $this->assertSame(0, DB::table('account_erasures')->count());
        $this->assertNotNull(User::find($leaving->id));
        unlink($file);
    }

    public function test_a_damaged_export_changes_nothing(): void
    {
        $user = $this->createUser();
        $file = tempnam(sys_get_temp_dir(), 'erasures');
        file_put_contents($file, json_encode(['user_hash' => AccountErasureLedger::hash($user->id), 'erased_at' => now()->toIso8601String()])."\n".json_encode(['user_hash' => 'not-a-hash', 'erased_at' => 'x'])."\n");

        $this->artisan('accounts:reapply-erasures', ['--from' => $file, '--force' => true])->assertFailed();

        $this->assertNotNull(User::find($user->id));
        unlink($file);
    }

    public function test_a_platform_admin_on_the_list_is_never_removed_automatically(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        AccountErasureLedger::record($admin->id, now());

        $this->artisan('accounts:reapply-erasures', ['--force' => true])->expectsOutputToContain('Elle incelenmeli')->assertFailed();

        $this->assertNotNull(User::find($admin->id));
    }

    public function test_the_export_goes_to_standard_output_without_a_target(): void
    {
        AccountErasureLedger::record((string) Str::uuid(), now());

        $this->artisan('accounts:export-erasures')->expectsOutputToContain('"user_hash"')->assertSuccessful();
    }
}
