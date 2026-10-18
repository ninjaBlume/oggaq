<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

// Draft past exams may pin draft question versions (imported questions still missing options). Publishing the exam
// is what requires every pinned version to be published, so published exams stay complete and immutable.
return new class extends Migration
{
    public function up(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_official_exam() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total integer; last_position integer;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        IF OLD.published_at IS NOT NULL THEN
            RAISE EXCEPTION 'Published official exams are immutable' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NEW.published_at IS NOT NULL THEN
        SELECT count(*), coalesce(max(position), 0) INTO total, last_position FROM official_exam_questions WHERE official_exam_id = NEW.id;
        IF total < 1 OR last_position <> total THEN
            RAISE EXCEPTION 'Publication requires contiguous positions starting at one' USING ERRCODE = '23514';
        END IF;
        IF EXISTS (SELECT 1 FROM official_exam_questions q JOIN question_versions v ON v.id = q.question_version_id WHERE q.official_exam_id = NEW.id AND v.published_at IS NULL) THEN
            RAISE EXCEPTION 'Publication requires published question versions' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION guard_official_exam_question() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id uuid; parent_published timestamptz;
BEGIN
    IF TG_OP = 'DELETE' THEN parent_id := OLD.official_exam_id; ELSE parent_id := NEW.official_exam_id; END IF;
    SELECT published_at INTO parent_published FROM official_exams WHERE id = parent_id FOR UPDATE;
    IF parent_published IS NOT NULL THEN
        RAISE EXCEPTION 'Published official exam questions are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END $$;
SQL);
    }

    public function down(): void
    {
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_official_exam() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE total integer; last_position integer;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        IF OLD.published_at IS NOT NULL THEN
            RAISE EXCEPTION 'Published official exams are immutable' USING ERRCODE = '23514';
        END IF;
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    IF NEW.published_at IS NOT NULL THEN
        SELECT count(*), coalesce(max(position), 0) INTO total, last_position FROM official_exam_questions WHERE official_exam_id = NEW.id;
        IF total < 1 OR last_position <> total THEN
            RAISE EXCEPTION 'Publication requires contiguous positions starting at one' USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION guard_official_exam_question() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE parent_id uuid; parent_published timestamptz; version_published timestamptz;
BEGIN
    IF TG_OP = 'DELETE' THEN parent_id := OLD.official_exam_id; ELSE parent_id := NEW.official_exam_id; END IF;
    SELECT published_at INTO parent_published FROM official_exams WHERE id = parent_id FOR UPDATE;
    IF parent_published IS NOT NULL THEN
        RAISE EXCEPTION 'Published official exam questions are immutable' USING ERRCODE = '23514';
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    SELECT published_at INTO version_published FROM question_versions WHERE id = NEW.question_version_id;
    IF version_published IS NULL THEN
        RAISE EXCEPTION 'Official exams require published question versions' USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END $$;
SQL);
    }
};
