<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_bookmarks', function (Blueprint $table) {
            $table->uuid('exam_attempt_id')->primary();
            $table->unsignedSmallInteger('position');
            $table->foreign('exam_attempt_id')->references('id')->on('exam_attempts')->cascadeOnDelete();
            $table->foreign(['exam_attempt_id', 'position'])->references(['exam_attempt_id', 'position'])->on('exam_answers')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_bookmarks');
    }
};
