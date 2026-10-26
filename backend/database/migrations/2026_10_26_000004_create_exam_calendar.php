<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_calendar_sources', function (Blueprint $t) {
            $t->smallInteger('year')->primary();
            $t->string('source_url', 200);
            $t->uuid('active_snapshot_id')->nullable();
            $t->string('status', 30)->default('unavailable');
            $t->timestampTz('checked_at')->nullable();
            $t->timestampTz('verified_at')->nullable();
        });
        Schema::create('exam_calendar_snapshots', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->smallInteger('year');
            $t->foreign('year')->references('year')->on('exam_calendar_sources')->restrictOnDelete();
            $t->char('content_hash', 64);
            $t->jsonb('entries');
            $t->timestampTz('created_at');
            $t->unique(['year', 'content_hash']);
            $t->unique(['year', 'id']);
        });
        Schema::table('exam_calendar_sources', function (Blueprint $t) {
            $t->foreign(['year', 'active_snapshot_id'], 'calendar_active_snapshot_fk')->references(['year', 'id'])->on('exam_calendar_snapshots')->restrictOnDelete();
        });
        DB::unprepared(<<<'SQL'
ALTER TABLE exam_calendar_sources ADD CONSTRAINT calendar_source_valid CHECK (
 year BETWEEN 2020 AND 2100 AND source_url = 'https://www.egm.gov.tr/ozelguvenlik/' || year::text || '-sinav-takvimi'
 AND status IN ('ready','unavailable','not_published','fetch_failed','invalid_source','review_required')
 AND ((active_snapshot_id IS NULL AND verified_at IS NULL) OR (active_snapshot_id IS NOT NULL AND verified_at IS NOT NULL))
);
ALTER TABLE exam_calendar_snapshots ADD CONSTRAINT calendar_entries_valid CHECK (jsonb_typeof(entries)='array' AND jsonb_array_length(entries) BETWEEN 1 AND 12);
CREATE OR REPLACE FUNCTION guard_exam_calendar_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Calendar snapshots are immutable'; END $$;
CREATE TRIGGER exam_calendar_snapshot_guard BEFORE UPDATE OR DELETE ON exam_calendar_snapshots FOR EACH ROW EXECUTE FUNCTION guard_exam_calendar_snapshot();
SQL);
    }

    public function down(): void
    {
        Schema::table('exam_calendar_sources', fn (Blueprint $t) => $t->dropForeign('calendar_active_snapshot_fk'));
        Schema::dropIfExists('exam_calendar_snapshots');
        Schema::dropIfExists('exam_calendar_sources');
        DB::unprepared('DROP FUNCTION IF EXISTS guard_exam_calendar_snapshot()');
    }
};
