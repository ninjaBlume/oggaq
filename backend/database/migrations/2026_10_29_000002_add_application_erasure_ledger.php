<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('application_erasures', function ($table) {
            $table->uuid('id')->primary();
            $table->char('application_hash', 64)->unique();
            $table->timestampTz('erased_at')->index();
        });
        DB::statement("ALTER TABLE application_erasures ADD CONSTRAINT application_erasure_hash CHECK (application_hash ~ '^[0-9a-f]{64}$')");
        DB::statement('CREATE TRIGGER guard_application_erasure BEFORE UPDATE OR DELETE ON application_erasures FOR EACH ROW EXECUTE FUNCTION guard_account_erasure()');
        Schema::table('privacy_erasure_runs', fn ($table) => $table->unsignedInteger('application_erasures')->default(0));
        DB::statement('ALTER TABLE privacy_erasure_runs DROP CONSTRAINT privacy_erasure_counts');
        DB::statement('ALTER TABLE privacy_erasure_runs ADD CONSTRAINT privacy_erasure_counts CHECK (job_applications >= 0 AND audit_events >= 0 AND account_erasures >= 0 AND application_erasures >= 0 AND job_applications + audit_events + account_erasures + application_erasures > 0)');
    }

    public function down(): void
    {
        // Test database reset is disposable; an operational ledger is not.
        if (! app()->environment('testing')) {
            throw new RuntimeException('Application erasure ledger requires a reviewed data-retention migration to remove.');
        }
        Schema::dropIfExists('application_erasures');
        DB::statement('ALTER TABLE privacy_erasure_runs DROP CONSTRAINT privacy_erasure_counts');
        Schema::table('privacy_erasure_runs', fn ($table) => $table->dropColumn('application_erasures'));
        DB::statement('ALTER TABLE privacy_erasure_runs ADD CONSTRAINT privacy_erasure_counts CHECK (job_applications >= 0 AND audit_events >= 0 AND account_erasures >= 0 AND job_applications + audit_events + account_erasures > 0)');
    }
};
