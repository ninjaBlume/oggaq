<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('official_exams', function (Blueprint $table) {
            $table->boolean('generate_unarmed')->default(false);
            $table->foreignUuid('derived_from_id')->nullable()->constrained('official_exams')->restrictOnDelete();
            $table->unique('derived_from_id');
        });
        DB::unprepared(<<<'SQL'
ALTER TABLE official_exams ADD CONSTRAINT official_exam_variant_shape CHECK (
    (NOT generate_unarmed OR (weapon_status IS NOT NULL AND weapon_status = 'armed' AND subject_id IS NULL AND derived_from_id IS NULL))
    AND (derived_from_id IS NULL OR (derived_from_id <> id AND NOT generate_unarmed AND weapon_status IS NOT NULL AND weapon_status = 'unarmed' AND subject_id IS NULL))
);

CREATE OR REPLACE FUNCTION validate_official_exam_pair(root_id uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE parent official_exams%ROWTYPE; child official_exams%ROWTYPE;
BEGIN
    SELECT * INTO parent FROM official_exams WHERE id = root_id;
    IF NOT FOUND THEN RETURN; END IF;
    SELECT * INTO child FROM official_exams WHERE derived_from_id = root_id;
    IF child.id IS NOT NULL AND NOT parent.generate_unarmed THEN
        RAISE EXCEPTION 'Derived exams require an armed source configured for both variants' USING ERRCODE = '23514';
    END IF;
    IF child.published_at IS NOT NULL AND parent.published_at IS NULL THEN
        RAISE EXCEPTION 'Derived exam cannot be published before its source' USING ERRCODE = '23514';
    END IF;
    IF NOT parent.generate_unarmed OR parent.published_at IS NULL THEN RETURN; END IF;
    IF child.id IS NULL OR child.published_at IS NULL
        OR (SELECT count(*) FROM official_exam_questions WHERE official_exam_id = parent.id) <> 125
        OR (SELECT count(*) FROM official_exam_questions WHERE official_exam_id = child.id) <> 100
        OR ROW(child.exam_type_id, child.year, child.term, child.exam_number, child.source_id)
            IS DISTINCT FROM ROW(parent.exam_type_id, parent.year, parent.term, parent.exam_number, parent.source_id)
        OR EXISTS (
            SELECT 1 FROM official_exam_questions p
            LEFT JOIN official_exam_questions c ON c.official_exam_id = child.id AND c.position = p.position
            WHERE p.official_exam_id = parent.id AND p.position <= 100
                AND (c.question_id IS DISTINCT FROM p.question_id OR c.question_version_id IS DISTINCT FROM p.question_version_id)
        ) THEN
        RAISE EXCEPTION 'Published variants must share the same first 100 questions and versions' USING ERRCODE = '23514';
    END IF;
END $$;

CREATE OR REPLACE FUNCTION guard_official_exam_pair() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE exam_id uuid; root_id uuid;
BEGIN
    IF TG_TABLE_NAME = 'official_exams' THEN
        IF TG_OP = 'DELETE' THEN root_id := coalesce(OLD.derived_from_id, OLD.id);
        ELSE root_id := coalesce(NEW.derived_from_id, NEW.id); END IF;
    ELSE
        IF TG_OP = 'DELETE' THEN exam_id := OLD.official_exam_id; ELSE exam_id := NEW.official_exam_id; END IF;
        SELECT coalesce(derived_from_id, id) INTO root_id FROM official_exams WHERE id = exam_id;
    END IF;
    PERFORM validate_official_exam_pair(root_id);
    RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER official_exam_pair_complete AFTER INSERT OR UPDATE OR DELETE ON official_exams
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION guard_official_exam_pair();
CREATE CONSTRAINT TRIGGER official_exam_pair_questions AFTER INSERT OR UPDATE OR DELETE ON official_exam_questions
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION guard_official_exam_pair();
SQL);
    }

    public function down(): void
    {
        DB::unprepared('DROP TRIGGER official_exam_pair_questions ON official_exam_questions; DROP TRIGGER official_exam_pair_complete ON official_exams; DROP FUNCTION guard_official_exam_pair(); DROP FUNCTION validate_official_exam_pair(uuid); ALTER TABLE official_exams DROP CONSTRAINT official_exam_variant_shape;');
        Schema::table('official_exams', function (Blueprint $table) {
            $table->dropForeign(['derived_from_id']);
            $table->dropUnique(['derived_from_id']);
            $table->dropColumn(['derived_from_id', 'generate_unarmed']);
        });
    }
};
