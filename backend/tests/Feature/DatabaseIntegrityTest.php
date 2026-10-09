<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Models\StudyContext;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DatabaseIntegrityTest extends TestCase
{
    use RefreshDatabase;

    private function assertConstraint(callable $operation, string $sqlState): void
    {
        try {
            DB::transaction($operation);
            $this->fail('Expected PostgreSQL integrity constraint violation.');
        } catch (QueryException $exception) {
            $this->assertEquals($sqlState, $exception->errorInfo[0]);
        }
    }

    public function test_postgresql_is_the_central_database(): void
    {
        $this->assertEquals('pgsql', DB::connection()->getDriverName());
        $this->assertEquals('oggaq_test', DB::connection()->getDatabaseName());
    }

    public function test_null_tenant_does_not_allow_duplicate_personal_contexts(): void
    {
        $user = $this->createUser();
        $this->assertConstraint(fn () => StudyContext::create(['user_id' => $user->id]), '23505');
        $this->assertEquals(1, $user->studyContexts()->count());
    }

    public function test_cross_tenant_and_cross_user_contexts_fail_composite_foreign_key(): void
    {
        $user = $this->createUser();
        $other = $this->createUser();
        $a = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $b = Tenant::create(['name' => 'Kurum B', 'slug' => 'kurum-b']);
        $member = $this->createMembership($user, $a);
        $this->assertConstraint(fn () => StudyContext::create(['user_id' => $user->id, 'tenant_id' => $b->id, 'membership_id' => $member->id]), '23503');
        $this->assertConstraint(fn () => StudyContext::create(['user_id' => $other->id, 'tenant_id' => $a->id, 'membership_id' => $member->id]), '23503');
    }

    public function test_tenant_context_without_membership_is_rejected(): void
    {
        $user = $this->createUser();
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $this->assertConstraint(fn () => StudyContext::create(['user_id' => $user->id, 'tenant_id' => $tenant->id]), '23514');
    }

    public function test_membership_roles_and_revocation_state_are_constrained(): void
    {
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $member = $this->createMembership($this->createUser(), $tenant);
        $this->assertConstraint(fn () => $member->update(['role' => 'platform_admin']), '23514');
        $this->assertConstraint(fn () => DB::table('memberships')->where('id', $member->id)->update(['status' => 'revoked']), '23514');
    }

    public function test_email_normalization_and_user_roles_are_constrained(): void
    {
        $user = $this->createUser();
        $this->assertConstraint(fn () => DB::table('users')->where('id', $user->id)->update(['email' => 'UPPER@EXAMPLE.TEST']), '23514');
        $this->assertConstraint(fn () => DB::table('users')->where('id', $user->id)->update(['platform_role' => 'company_admin']), '23514');
    }

    public function test_rollbacks_remove_domain_and_context_writes_together(): void
    {
        try {
            DB::transaction(function () {
                $this->createUser(['email' => 'rollback@example.test']);
                throw new \RuntimeException('rollback');
            });
        } catch (\RuntimeException $exception) {
            $this->assertEquals('rollback', $exception->getMessage());
        }
        $this->assertDatabaseCount('users', 0);
        $this->assertDatabaseCount('study_contexts', 0);
    }
}
