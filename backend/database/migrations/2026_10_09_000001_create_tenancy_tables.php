<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('status')->default('active');
            $table->timestampsTz();
        });
        Schema::create('memberships', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('user_id')->constrained()->restrictOnDelete();
            $table->string('role');
            $table->string('status')->default('active');
            $table->timestampTz('joined_at');
            $table->timestampTz('revoked_at')->nullable();
            $table->timestampsTz();
            $table->unique(['tenant_id', 'user_id']);
            $table->unique(['id', 'tenant_id', 'user_id']);
            $table->index(['user_id', 'status']);
            $table->index(['tenant_id', 'status', 'role']);
        });
        Schema::create('study_contexts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('tenant_id')->nullable()->constrained()->restrictOnDelete();
            $table->uuid('membership_id')->nullable()->index();
            $table->timestampsTz();
            $table->foreign(['membership_id', 'tenant_id', 'user_id'])
                ->references(['id', 'tenant_id', 'user_id'])->on('memberships')->restrictOnDelete();
        });
        DB::statement("ALTER TABLE tenants ADD CONSTRAINT tenants_status_check CHECK (status IN ('active', 'inactive'))");
        DB::statement("ALTER TABLE memberships ADD CONSTRAINT memberships_role_check CHECK (role IN ('student', 'company_admin'))");
        DB::statement("ALTER TABLE memberships ADD CONSTRAINT memberships_status_check CHECK (status IN ('active', 'revoked'))");
        DB::statement("ALTER TABLE memberships ADD CONSTRAINT memberships_revocation_check CHECK ((status = 'active' AND revoked_at IS NULL) OR (status = 'revoked' AND revoked_at IS NOT NULL))");
        DB::statement('ALTER TABLE study_contexts ADD CONSTRAINT study_contexts_kind_check CHECK ((tenant_id IS NULL AND membership_id IS NULL) OR (tenant_id IS NOT NULL AND membership_id IS NOT NULL))');
        DB::statement('CREATE UNIQUE INDEX study_contexts_personal_unique ON study_contexts (user_id) WHERE tenant_id IS NULL');
        DB::statement('CREATE UNIQUE INDEX study_contexts_tenant_unique ON study_contexts (user_id, tenant_id) WHERE tenant_id IS NOT NULL');
    }

    public function down(): void
    {
        Schema::dropIfExists('study_contexts');
        Schema::dropIfExists('memberships');
        Schema::dropIfExists('tenants');
    }
};
