<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION lock_submitted_exam_answer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF OLD.selected_option_id IS NOT NULL AND NEW.selected_option_id IS DISTINCT FROM OLD.selected_option_id THEN
        RAISE EXCEPTION 'Submitted exam answers are immutable' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
CREATE TRIGGER submitted_exam_answer_lock BEFORE UPDATE OF selected_option_id ON exam_answers
FOR EACH ROW EXECUTE FUNCTION lock_submitted_exam_answer();
SQL);
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER submitted_exam_answer_lock ON exam_answers; DROP FUNCTION lock_submitted_exam_answer();');
    }
};
