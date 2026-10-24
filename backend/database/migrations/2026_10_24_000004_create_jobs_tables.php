<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('job_postings', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->string('title', 240);
            $t->string('company_name', 200);
            $t->string('city', 100);
            $t->text('description');
            $t->string('weapon_requirement', 20)->default('any');
            $t->string('status', 20)->default('draft');
            $t->unsignedInteger('revision')->default(1);
            $t->timestampTz('expires_at')->nullable();
            $t->timestampsTz();
            $t->index(['status', 'created_at', 'id']);
        });
        Schema::create('job_applications', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('job_posting_id')->constrained('job_postings')->restrictOnDelete();
            $t->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $t->text('contact_name');
            $t->text('contact_email');
            $t->text('phone');
            $t->text('cover_letter')->nullable();
            $t->jsonb('job_snapshot');
            $t->string('status', 20)->default('submitted');
            $t->unsignedInteger('revision')->default(1);
            $t->timestampsTz();
            $t->unique(['user_id', 'job_posting_id']);
            $t->index(['job_posting_id', 'created_at', 'id']);
            $t->index(['user_id', 'created_at', 'id']);
        });
        DB::statement("ALTER TABLE job_postings ADD CONSTRAINT job_posting_values CHECK (status IN ('draft','published','closed') AND weapon_requirement IN ('any','armed','unarmed') AND revision > 0)");
        DB::statement("ALTER TABLE job_applications ADD CONSTRAINT job_application_values CHECK (status IN ('submitted','reviewing','accepted','rejected') AND revision > 0)");
    }

    public function down(): void
    {
        Schema::dropIfExists('job_applications');
        Schema::dropIfExists('job_postings');
    }
};
