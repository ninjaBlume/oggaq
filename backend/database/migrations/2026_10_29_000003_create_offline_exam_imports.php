<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offline_exam_imports', function (Blueprint $table) {
            $table->foreignUuid('exam_attempt_id')->primary()->constrained('exam_attempts')->cascadeOnDelete();
            $table->string('payload_hash', 64);
            $table->timestampTz('client_started_at');
            $table->timestampTz('client_finished_at');
            $table->unsignedInteger('client_elapsed_seconds');
            $table->timestampTz('received_at');
        });
        DB::unprepared(<<<'SQL'
ALTER TABLE offline_exam_imports ADD CONSTRAINT offline_exam_import_valid CHECK (
    payload_hash ~ '^[a-f0-9]{64}$' AND client_finished_at >= client_started_at AND client_elapsed_seconds BETWEEN 0 AND 10800
);
CREATE OR REPLACE FUNCTION guard_offline_exam_import() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'DELETE' AND coalesce(current_setting('oggaq.account_erasure', true), '') = 'on' THEN RETURN OLD; END IF;
    RAISE EXCEPTION 'Offline exam import receipts are immutable' USING ERRCODE = '23514';
END $$;
CREATE TRIGGER guard_offline_exam_import BEFORE UPDATE OR DELETE ON offline_exam_imports FOR EACH ROW EXECUTE FUNCTION guard_offline_exam_import();
SQL);
    }

    public function down(): void
    {
        if (DB::table('offline_exam_imports')->exists() && ! app()->environment('testing')) {
            throw new RuntimeException('Çevrimdışı sınav geçmişi varken bu migration geri alınamaz.');
        }
        Schema::dropIfExists('offline_exam_imports');
        DB::statement('DROP FUNCTION IF EXISTS guard_offline_exam_import()');
    }
};
