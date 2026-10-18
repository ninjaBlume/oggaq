<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per reviewed import: the source file hash, the plan hash and the report the approver saw.
        Schema::create('import_batches', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('source_system', 60);
            $table->string('source_name', 255);
            $table->char('source_sha256', 64);
            $table->string('adapter_version', 40);
            $table->char('plan_sha256', 64);
            $table->char('report_sha256', 64);
            $table->jsonb('report');
            $table->string('status', 20);
            $table->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('approved_at')->nullable();
            $table->timestampTz('committed_at')->nullable();
            $table->text('failure')->nullable();
            $table->timestampsTz();
            $table->index(['source_system', 'source_sha256']);
        });
        DB::statement("ALTER TABLE import_batches ADD CONSTRAINT import_batch_status CHECK (status IN ('previewed', 'committed', 'failed'))");
        // Maps a stable source key to what it became, so re-running an import never duplicates content.
        Schema::create('import_records', function (Blueprint $table) {
            $table->string('source_system', 60);
            $table->string('source_table', 60);
            $table->string('source_key', 120);
            $table->foreignUuid('batch_id')->constrained('import_batches')->restrictOnDelete();
            $table->string('target_type', 40);
            $table->uuid('target_id');
            $table->timestampTz('created_at');
            $table->primary(['source_system', 'source_table', 'source_key']);
            $table->index('batch_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('import_records');
        Schema::dropIfExists('import_batches');
    }
};
