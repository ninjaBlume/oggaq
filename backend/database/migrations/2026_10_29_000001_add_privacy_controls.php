<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('privacy_notice_receipts', function ($table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained()->cascadeOnDelete();
            $table->string('scope', 30);
            $table->string('notice_version', 40);
            $table->char('content_hash', 64);
            $table->timestampTz('recorded_at');
            $table->unique(['user_id', 'scope', 'notice_version']);
        });
        DB::statement("ALTER TABLE privacy_notice_receipts ADD CONSTRAINT privacy_receipt_scope CHECK (scope IN ('registration', 'job_application', 'document'))");
        DB::statement("ALTER TABLE privacy_notice_receipts ADD CONSTRAINT privacy_receipt_hash CHECK (content_hash ~ '^[0-9a-f]{64}$')");
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_privacy_receipt() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Privacy notice receipts cannot be updated' USING ERRCODE = '23514';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER guard_privacy_receipt BEFORE UPDATE ON privacy_notice_receipts FOR EACH ROW EXECUTE FUNCTION guard_privacy_receipt();
SQL);
        Schema::table('job_postings', fn ($table) => $table->timestampTz('closed_at')->nullable()->index());
        Schema::table('job_applications', function ($table) {
            $table->timestampTz('resolved_at')->nullable()->index();
            $table->timestampTz('retention_hold_until')->nullable();
        });
        // Historical transition dates are not known: start their retention clock at migration time.
        DB::table('job_postings')->where('status', 'closed')->update(['closed_at' => now()]);
        DB::table('job_applications')->whereIn('status', ['accepted', 'rejected'])->update(['resolved_at' => now()]);
        Schema::create('privacy_erasure_runs', function ($table) {
            $table->uuid('id')->primary();
            $table->string('policy_version', 40);
            $table->unsignedInteger('job_applications');
            $table->unsignedInteger('audit_events');
            $table->unsignedInteger('account_erasures');
            $table->timestampTz('executed_at')->index();
        });
        DB::statement('ALTER TABLE privacy_erasure_runs ADD CONSTRAINT privacy_erasure_counts CHECK (job_applications >= 0 AND audit_events >= 0 AND account_erasures >= 0 AND job_applications + audit_events + account_erasures > 0)');
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_privacy_erasure_run() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' AND current_setting('oggaq.privacy_prune', true) = 'on'
       AND OLD.executed_at < CURRENT_TIMESTAMP - INTERVAL '3 years' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Erasure proof must be retained unchanged for three years' USING ERRCODE = '23514';
END $$ LANGUAGE plpgsql;
CREATE TRIGGER guard_privacy_erasure_run BEFORE UPDATE OR DELETE ON privacy_erasure_runs FOR EACH ROW EXECUTE FUNCTION guard_privacy_erasure_run();
CREATE OR REPLACE FUNCTION guard_account_erasure() RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'DELETE' AND current_setting('oggaq.privacy_prune', true) = 'on'
       AND OLD.erased_at < CURRENT_TIMESTAMP - INTERVAL '3 years' THEN
        RETURN OLD;
    END IF;
    RAISE EXCEPTION 'The erasure ledger is append-only' USING ERRCODE = '23514';
END $$ LANGUAGE plpgsql;
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_account_erasure() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'The erasure ledger is append-only' USING ERRCODE = '23514';
END $$ LANGUAGE plpgsql;
SQL);
        Schema::dropIfExists('privacy_erasure_runs');
        DB::statement('DROP FUNCTION IF EXISTS guard_privacy_erasure_run()');
        Schema::table('job_applications', fn ($table) => $table->dropColumn(['resolved_at', 'retention_hold_until']));
        Schema::table('job_postings', fn ($table) => $table->dropColumn('closed_at'));
        Schema::dropIfExists('privacy_notice_receipts');
        DB::statement('DROP FUNCTION IF EXISTS guard_privacy_receipt()');
    }
};
