<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A list of people who asked to be erased, kept only so that a restored backup cannot bring them back: it holds
        // an irreversible keyed hash of the user id (HMAC-SHA256, key from ERASURE_LEDGER_KEY) and the date, never the
        // id, the e-mail or anything else. Append-only: rows are never changed or removed.
        Schema::create('account_erasures', function ($table) {
            $table->uuid('id')->primary();
            $table->char('user_hash', 64)->unique();
            $table->timestampTz('erased_at');
        });
        DB::unprepared("ALTER TABLE account_erasures ADD CONSTRAINT account_erasures_hash_hex CHECK (user_hash ~ '^[0-9a-f]{64}$')");
        DB::unprepared(<<<'SQL'
CREATE OR REPLACE FUNCTION guard_account_erasure() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'The erasure ledger is append-only' USING ERRCODE = '23514';
END $$ LANGUAGE plpgsql
SQL);
        DB::unprepared('CREATE TRIGGER guard_account_erasure BEFORE UPDATE OR DELETE ON account_erasures FOR EACH ROW EXECUTE FUNCTION guard_account_erasure()');
    }

    public function down(): void
    {
        Schema::dropIfExists('account_erasures');
        DB::unprepared('DROP FUNCTION IF EXISTS guard_account_erasure()');
    }
};
