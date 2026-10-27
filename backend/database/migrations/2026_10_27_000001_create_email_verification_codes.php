<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_verification_codes', function (Blueprint $table) {
            $table->foreignUuid('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->string('code_hash', 64);
            $table->unsignedSmallInteger('failed_attempts')->default(0);
            $table->timestampTz('sent_at');
            $table->timestampTz('expires_at')->index();
        });
        DB::statement('ALTER TABLE email_verification_codes ADD CONSTRAINT verification_attempts_check CHECK (failed_attempts BETWEEN 0 AND 5)');
    }

    public function down(): void
    {
        Schema::dropIfExists('email_verification_codes');
    }
};
