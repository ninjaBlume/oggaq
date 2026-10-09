<?php

namespace Tests\Feature;

use App\Modules\Tenancy\Actions\ProvisionMembership;
use App\Modules\Tenancy\Models\StudyContext;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_platform_admin_can_create_tenant_and_audit_is_recorded(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $response = $this->asToken($admin)->postJson('/api/v1/admin/tenants', ['name' => 'Kurum A', 'slug' => 'kurum-a'])
            ->assertCreated()->assertJsonPath('data.status', 'active');
        $this->assertDatabaseHas('audit_events', ['actor_id' => $admin->id, 'tenant_id' => $response->json('data.id'), 'action' => 'tenant.created']);
    }

    public function test_student_cannot_create_or_list_tenants(): void
    {
        $this->asToken($this->createUser())->postJson('/api/v1/admin/tenants', ['name' => 'Kurum A', 'slug' => 'kurum-a'])->assertForbidden();
        $this->getJson('/api/v1/admin/tenants')->assertForbidden();
        $this->assertDatabaseCount('tenants', 0);
    }

    public function test_admin_provisions_membership_and_separate_context_transactionally(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $student = $this->createUser();
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $response = $this->asToken($admin)->postJson("/api/v1/admin/tenants/{$tenant->id}/memberships", ['user_id' => $student->id, 'role' => 'student'])
            ->assertCreated()->assertJsonPath('data.tenant_id', $tenant->id);
        $this->assertDatabaseHas('study_contexts', ['user_id' => $student->id, 'tenant_id' => $tenant->id, 'membership_id' => $response->json('data.id')]);
        $this->assertEquals(2, $student->studyContexts()->count());
        $this->assertDatabaseHas('audit_events', ['actor_id' => $admin->id, 'action' => 'membership.created']);
    }

    public function test_repeated_provisioning_does_not_duplicate_membership_or_context(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $student = $this->createUser();
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $payload = ['user_id' => $student->id, 'role' => 'student'];
        $url = "/api/v1/admin/tenants/{$tenant->id}/memberships";
        $this->asToken($admin)->postJson($url, $payload)->assertCreated();
        $this->postJson($url, $payload)->assertStatus(409)->assertJsonPath('code', 'membership_exists');
        $this->assertDatabaseCount('memberships', 1);
        $this->assertEquals(2, $student->studyContexts()->count());
    }

    public function test_company_admin_cannot_provision_users_or_escalate_membership(): void
    {
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $admin = $this->createUser();
        $this->createMembership($admin, $tenant, 'company_admin');
        $this->asToken($admin)->postJson("/api/v1/admin/tenants/{$tenant->id}/memberships", ['user_id' => $admin->id, 'role' => 'company_admin'])->assertForbidden();
        $this->getJson('/api/v1/admin/tenants')->assertForbidden();
    }

    public function test_tenant_id_injection_is_rejected_by_server(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $student = $this->createUser();
        $a = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $b = Tenant::create(['name' => 'Kurum B', 'slug' => 'kurum-b']);
        $this->asToken($admin)->postJson("/api/v1/admin/tenants/{$a->id}/memberships", [
            'user_id' => $student->id, 'role' => 'student', 'tenant_id' => $b->id,
        ])->assertUnprocessable()->assertJsonStructure(['errors' => ['tenant_id']]);
        $this->assertDatabaseCount('memberships', 0);
    }

    public function test_company_admin_can_only_list_and_view_own_tenant_members(): void
    {
        $a = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $b = Tenant::create(['name' => 'Kurum B', 'slug' => 'kurum-b']);
        $adminA = $this->createUser();
        $this->createMembership($adminA, $a, 'company_admin');
        $studentA = $this->createUser();
        $studentB = $this->createUser();
        $memberA = $this->createMembership($studentA, $a);
        $memberB = $this->createMembership($studentB, $b);
        $this->asToken($adminA)->getJson("/api/v1/tenants/{$a->id}/memberships?tenant_id={$b->id}")
            ->assertOk()->assertJsonCount(2, 'data')->assertJsonMissing(['user_id' => $studentB->id]);
        $this->getJson("/api/v1/tenants/{$a->id}/memberships/{$memberA->id}")->assertOk()
            ->assertJsonMissingPath('data.user.password')->assertJsonMissingPath('data.user.platform_role');
        $this->getJson("/api/v1/tenants/{$b->id}/memberships")->assertForbidden();
        $this->getJson("/api/v1/tenants/{$b->id}/profile")->assertForbidden();
        $this->getJson("/api/v1/tenants/{$a->id}/memberships/{$memberB->id}")->assertNotFound();
    }

    public function test_student_cannot_read_member_directory(): void
    {
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $student = $this->createUser();
        $this->createMembership($student, $tenant);
        $this->asToken($student)->getJson("/api/v1/tenants/{$tenant->id}/memberships")->assertForbidden();
    }

    public function test_multi_tenant_student_sees_own_contexts_without_exposing_other_users(): void
    {
        $a = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $b = Tenant::create(['name' => 'Kurum B', 'slug' => 'kurum-b']);
        $student = $this->createUser();
        $this->createMembership($student, $a);
        $this->createMembership($student, $b);
        $other = $this->createUser();
        $this->createMembership($other, $a);
        $response = $this->asToken($student)->getJson('/api/v1/me/contexts')->assertOk()->assertJsonCount(3, 'data');
        foreach ($response->json('data') as $context) {
            $this->getJson('/api/v1/contexts/'.$context['id'])->assertOk();
        }
        $foreign = $other->studyContexts()->whereNull('tenant_id')->firstOrFail();
        $this->getJson('/api/v1/contexts/'.$foreign->id)->assertNotFound();
    }

    public function test_company_admin_cannot_view_student_personal_or_tenant_context(): void
    {
        $a = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $admin = $this->createUser();
        $student = $this->createUser();
        $this->createMembership($admin, $a, 'company_admin');
        $this->createMembership($student, $a);
        $this->asToken($admin);
        foreach ($student->studyContexts()->get() as $context) {
            $this->getJson('/api/v1/contexts/'.$context->id)->assertNotFound();
        }
    }

    public function test_revocation_immediately_removes_context_access_but_keeps_personal_context(): void
    {
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $platformAdmin = $this->createUser(['platform_role' => 'platform_admin']);
        $student = $this->createUser();
        $member = $this->createMembership($student, $tenant);
        $context = StudyContext::where('membership_id', $member->id)->firstOrFail();
        $this->asToken($platformAdmin)->deleteJson("/api/v1/admin/tenants/{$tenant->id}/memberships/{$member->id}")->assertOk();
        $this->deleteJson("/api/v1/admin/tenants/{$tenant->id}/memberships/{$member->id}")->assertOk();
        $this->assertDatabaseHas('memberships', ['id' => $member->id, 'status' => 'revoked']);
        $this->assertDatabaseHas('study_contexts', ['id' => $context->id, 'tenant_id' => $tenant->id]);
        $this->asToken($student)->getJson('/api/v1/me/contexts')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.kind', 'personal');
        $this->getJson('/api/v1/contexts/'.$context->id)->assertForbidden();
        $this->assertEquals(1, DB::table('audit_events')->where('action', 'membership.revoked')->count());
    }

    public function test_revoked_company_admin_loses_directory_access_with_existing_token(): void
    {
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $admin = $this->createUser();
        $member = $this->createMembership($admin, $tenant, 'company_admin');
        $this->asToken($admin)->getJson("/api/v1/tenants/{$tenant->id}/memberships")->assertOk();
        $member->update(['status' => 'revoked', 'revoked_at' => now()]);
        $this->getJson("/api/v1/tenants/{$tenant->id}/memberships")->assertForbidden();
    }

    public function test_inactive_tenant_is_not_an_active_context(): void
    {
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $user = $this->createUser();
        $this->createMembership($user, $tenant, 'company_admin');
        $tenant->forceFill(['status' => 'inactive'])->save();
        $this->asToken($user)->getJson('/api/v1/me/contexts')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/tenants/{$tenant->id}/memberships")->assertForbidden();
    }

    public function test_revocation_cannot_target_another_tenant_membership(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $a = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $b = Tenant::create(['name' => 'Kurum B', 'slug' => 'kurum-b']);
        $member = $this->createMembership($this->createUser(), $b);
        $this->asToken($admin)->deleteJson("/api/v1/admin/tenants/{$a->id}/memberships/{$member->id}")->assertNotFound();
        $this->assertEquals('active', $member->fresh()->status);
    }

    public function test_member_pagination_is_bounded(): void
    {
        $admin = $this->createUser(['platform_role' => 'platform_admin']);
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        $this->asToken($admin)->getJson("/api/v1/tenants/{$tenant->id}/memberships?per_page=1000")->assertUnprocessable();
    }

    public function test_mutation_rechecks_the_actors_current_role_in_transaction(): void
    {
        $actor = $this->createUser(['platform_role' => 'platform_admin']);
        $student = $this->createUser();
        $tenant = Tenant::create(['name' => 'Kurum A', 'slug' => 'kurum-a']);
        DB::table('users')->where('id', $actor->id)->update(['platform_role' => 'student']);
        try {
            app(ProvisionMembership::class)->execute($actor, $tenant, ['user_id' => $student->id, 'role' => 'student']);
            $this->fail('A stale admin snapshot must not provision memberships.');
        } catch (AuthorizationException $exception) {
            $this->assertDatabaseCount('memberships', 0);
        }
    }
}
