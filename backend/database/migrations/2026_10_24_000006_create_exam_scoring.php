<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('scoring_rules', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('code', 80);
            $t->unsignedInteger('version');
            $t->string('title', 200);
            $t->string('education_type', 24);
            $t->string('weapon_status', 12);
            $t->date('effective_from');
            $t->date('effective_until')->nullable();
            $t->unsignedInteger('period_from');
            $t->unsignedInteger('period_until');
            $t->jsonb('configuration');
            $t->jsonb('source_urls');
            $t->text('verification_note');
            $t->foreignUuid('created_by')->nullable()->constrained('users')->nullOnDelete();
            $t->timestampTz('created_at');
            $t->timestampTz('published_at')->nullable();
            $t->timestampTz('archived_at')->nullable();
            $t->unique(['code', 'version']);
            $t->index(['education_type', 'weapon_status']);
        });
        Schema::create('scoring_periods', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('education_type', 24);
            $t->string('weapon_status', 12);
            $t->unsignedInteger('number');
            $t->date('exam_date');
            $t->string('source_url', 2000);
            $t->foreignUuid('scoring_rule_id')->index()->constrained('scoring_rules')->restrictOnDelete();
            $t->timestampTz('created_at');
            $t->unique(['education_type', 'weapon_status', 'number']);
        });
        // Separate metadata keeps published question templates untouched.
        Schema::create('official_exam_scoring', function (Blueprint $t) {
            $t->foreignUuid('official_exam_id')->primary()->constrained('official_exams')->restrictOnDelete();
            $t->foreignUuid('scoring_period_id')->index()->constrained('scoring_periods')->restrictOnDelete();
        });
        Schema::create('exam_score_results', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('user_id')->constrained('users')->cascadeOnDelete();
            $t->foreignUuid('exam_attempt_id')->nullable()->constrained('exam_attempts')->cascadeOnDelete();
            $t->unsignedInteger('revision')->default(1);
            $t->uuid('operation_id')->nullable()->unique();
            $t->foreignUuid('scoring_rule_id')->index()->constrained('scoring_rules')->restrictOnDelete();
            $t->foreignUuid('scoring_period_id')->index()->constrained('scoring_periods')->restrictOnDelete();
            $t->jsonb('input')->nullable();
            $t->jsonb('output')->nullable();
            $t->timestampTz('created_at');
            $t->unique(['exam_attempt_id', 'revision']);
            $t->index(['user_id', 'created_at', 'id']);
        });
        DB::unprepared(<<<'SQL'
ALTER TABLE scoring_rules ADD CONSTRAINT scoring_rule_shape CHECK (
 education_type IN ('basic','renewal','weapon_difference') AND weapon_status IN ('armed','unarmed')
 AND (education_type <> 'weapon_difference' OR weapon_status = 'armed')
 AND version > 0 AND period_from > 0 AND period_until >= period_from
 AND (effective_until IS NULL OR effective_until >= effective_from)
 AND jsonb_typeof(configuration) = 'object' AND jsonb_typeof(source_urls) = 'array'
 AND jsonb_array_length(source_urls) > 0 AND (archived_at IS NULL OR published_at IS NOT NULL)
);
ALTER TABLE scoring_rules ADD CONSTRAINT scoring_configuration_shape CHECK (
 configuration ?& array['general_count','weapon_count','shooting_count','general_weight','weapon_weight','shooting_weight','general_maximum','weapon_maximum','shooting_maximum','minimums','decision_mode','requires_previous','decimals','formula']
 AND (configuration->>'general_count')::int BETWEEN 0 AND 200 AND (configuration->>'weapon_count')::int BETWEEN 0 AND 200
 AND (configuration->>'shooting_count')::int BETWEEN 0 AND 20
 AND (configuration->>'general_count')::int + (configuration->>'weapon_count')::int BETWEEN 1 AND 200
 AND (configuration->>'general_weight')::int >= 0 AND (configuration->>'weapon_weight')::int >= 0 AND (configuration->>'shooting_weight')::int >= 0
 AND (configuration->>'general_weight')::int + (configuration->>'weapon_weight')::int + (configuration->>'shooting_weight')::int = 10000
 AND (configuration->>'decimals')::int BETWEEN 0 AND 4
 AND configuration->>'decision_mode' IN ('pass_fail','level','unverified')
 AND ((configuration->>'requires_previous')::bool = (education_type='weapon_difference'))
 AND (education_type <> 'renewal' OR configuration->>'decision_mode' <> 'pass_fail')
);
ALTER TABLE scoring_periods ADD CONSTRAINT scoring_period_shape CHECK (number > 0 AND education_type IN ('basic','renewal','weapon_difference') AND weapon_status IN ('armed','unarmed'));
ALTER TABLE exam_score_results ADD CONSTRAINT score_result_shape CHECK (revision > 0 AND ((input IS NULL AND output IS NULL AND exam_attempt_id IS NOT NULL AND revision = 1) OR (jsonb_typeof(input) = 'object' AND jsonb_typeof(output) = 'object' AND input IS NOT NULL AND output IS NOT NULL)));
CREATE OR REPLACE FUNCTION guard_scoring_rule() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP <> 'INSERT' AND OLD.published_at IS NOT NULL THEN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Published scoring rules cannot be deleted' USING ERRCODE='23514'; END IF;
  IF (to_jsonb(NEW) - 'archived_at' - 'created_by') IS DISTINCT FROM (to_jsonb(OLD) - 'archived_at' - 'created_by') THEN
   RAISE EXCEPTION 'Published scoring rules require a new version' USING ERRCODE='23514';
  END IF;
 END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 IF NEW.published_at IS NOT NULL AND NEW.archived_at IS NULL THEN
  PERFORM pg_advisory_xact_lock(hashtext('scoring_rule:' || NEW.education_type || ':' || NEW.weapon_status));
  IF EXISTS (SELECT 1 FROM scoring_rules r WHERE r.id <> NEW.id AND r.published_at IS NOT NULL AND r.archived_at IS NULL
   AND r.education_type=NEW.education_type AND r.weapon_status=NEW.weapon_status
   AND daterange(r.effective_from, r.effective_until + 1, '[)') && daterange(NEW.effective_from, NEW.effective_until + 1, '[)')
   AND int4range(r.period_from,r.period_until+1,'[)') && int4range(NEW.period_from,NEW.period_until+1,'[)')) THEN
   RAISE EXCEPTION 'Published scoring rule ranges overlap' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER scoring_rule_guard BEFORE INSERT OR UPDATE OR DELETE ON scoring_rules FOR EACH ROW EXECUTE FUNCTION guard_scoring_rule();
CREATE OR REPLACE FUNCTION guard_scoring_period() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE r scoring_rules%ROWTYPE;
BEGIN
 IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Scoring periods cannot be deleted' USING ERRCODE='23514'; END IF;
 IF TG_OP = 'UPDATE' AND (to_jsonb(NEW) - 'scoring_rule_id' - 'source_url') IS DISTINCT FROM (to_jsonb(OLD) - 'scoring_rule_id' - 'source_url') THEN RAISE EXCEPTION 'Period identity and date are immutable' USING ERRCODE='23514'; END IF;
 SELECT * INTO r FROM scoring_rules WHERE id=NEW.scoring_rule_id;
 IF r.published_at IS NULL OR r.education_type<>NEW.education_type OR r.weapon_status<>NEW.weapon_status
 OR NEW.number NOT BETWEEN r.period_from AND r.period_until OR NEW.exam_date < r.effective_from OR (r.effective_until IS NOT NULL AND NEW.exam_date>r.effective_until) THEN
  RAISE EXCEPTION 'Period must match a published rule and its applicability' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER scoring_period_guard BEFORE INSERT OR UPDATE OR DELETE ON scoring_periods FOR EACH ROW EXECUTE FUNCTION guard_scoring_period();
CREATE OR REPLACE FUNCTION guard_exam_score_result() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner uuid; expected_rule uuid; config jsonb; rule_version integer; finished timestamptz; total integer; correct_general integer; wrong_general integer; correct_weapon integer; wrong_weapon integer;
BEGIN
 IF TG_OP = 'DELETE' THEN
  IF coalesce(current_setting('oggaq.account_erasure',true),'') = 'on' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Score history cannot be deleted' USING ERRCODE='23514';
 END IF;
 IF TG_OP = 'UPDATE' AND (OLD.output IS NOT NULL OR NEW.output IS NULL OR
  ROW(NEW.id,NEW.user_id,NEW.exam_attempt_id,NEW.revision,NEW.scoring_rule_id,NEW.scoring_period_id,NEW.created_at)
  IS DISTINCT FROM ROW(OLD.id,OLD.user_id,OLD.exam_attempt_id,OLD.revision,OLD.scoring_rule_id,OLD.scoring_period_id,OLD.created_at)) THEN
  RAISE EXCEPTION 'Calculated scores are immutable; append a new revision' USING ERRCODE='23514';
 END IF;
 SELECT scoring_rule_id INTO expected_rule FROM scoring_periods WHERE id=NEW.scoring_period_id;
 IF expected_rule IS DISTINCT FROM NEW.scoring_rule_id AND NOT EXISTS (SELECT 1 FROM exam_score_results base WHERE base.exam_attempt_id = NEW.exam_attempt_id AND base.revision = 1 AND base.scoring_rule_id = NEW.scoring_rule_id AND base.scoring_period_id = NEW.scoring_period_id) THEN RAISE EXCEPTION 'Score rule must match its period' USING ERRCODE='23514'; END IF;
 SELECT configuration,version INTO config,rule_version FROM scoring_rules WHERE id=NEW.scoring_rule_id;
 IF NEW.output IS NOT NULL AND (NEW.output->>'rule_id' IS DISTINCT FROM NEW.scoring_rule_id::text OR (NEW.output->>'rule_version')::int IS DISTINCT FROM rule_version) THEN
  RAISE EXCEPTION 'Score output must identify its pinned rule' USING ERRCODE='23514';
 END IF;
 IF NEW.exam_attempt_id IS NOT NULL THEN
  SELECT c.user_id INTO owner FROM exam_attempts a JOIN study_contexts c ON c.id=a.study_context_id WHERE a.id=NEW.exam_attempt_id;
  IF owner IS DISTINCT FROM NEW.user_id THEN RAISE EXCEPTION 'Score owner does not own the attempt' USING ERRCODE='23514'; END IF;
  SELECT finished_at,question_count INTO finished,total FROM exam_attempts WHERE id=NEW.exam_attempt_id;
  IF total <> (config->>'general_count')::int+(config->>'weapon_count')::int THEN RAISE EXCEPTION 'Scoring sections must match the full attempt' USING ERRCODE='23514'; END IF;
  IF NEW.output IS NOT NULL THEN
   IF finished IS NULL THEN RAISE EXCEPTION 'Running exams have no score output' USING ERRCODE='23514'; END IF;
   SELECT count(*) FILTER(WHERE position <= (config->>'general_count')::int AND is_correct=true),
          count(*) FILTER(WHERE position <= (config->>'general_count')::int AND selected_option_id IS NOT NULL AND is_correct=false),
          count(*) FILTER(WHERE position > (config->>'general_count')::int AND is_correct=true),
          count(*) FILTER(WHERE position > (config->>'general_count')::int AND selected_option_id IS NOT NULL AND is_correct=false)
     INTO correct_general,wrong_general,correct_weapon,wrong_weapon FROM exam_answers WHERE exam_attempt_id=NEW.exam_attempt_id;
   IF ROW((NEW.input->>'general_correct')::int,(NEW.input->>'general_wrong')::int,(NEW.input->>'weapon_correct')::int,(NEW.input->>'weapon_wrong')::int)
     IS DISTINCT FROM ROW(correct_general,wrong_general,correct_weapon,wrong_weapon) THEN
    RAISE EXCEPTION 'Score section counts must come from the saved answers' USING ERRCODE='23514';
   END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER exam_score_result_guard BEFORE INSERT OR UPDATE OR DELETE ON exam_score_results FOR EACH ROW EXECUTE FUNCTION guard_exam_score_result();
SQL);
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_score_results');
        Schema::dropIfExists('official_exam_scoring');
        Schema::dropIfExists('scoring_periods');
        Schema::dropIfExists('scoring_rules');
        DB::unprepared('DROP FUNCTION IF EXISTS guard_exam_score_result(); DROP FUNCTION IF EXISTS guard_scoring_period(); DROP FUNCTION IF EXISTS guard_scoring_rule();');
    }
};
