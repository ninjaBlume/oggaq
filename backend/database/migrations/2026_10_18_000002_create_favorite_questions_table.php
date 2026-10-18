<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Favorites belong to a study context, so personal and institution histories never mix.
        Schema::create('favorite_questions', function (Blueprint $table) {
            $table->foreignUuid('study_context_id')->constrained()->restrictOnDelete();
            $table->foreignUuid('question_id')->constrained()->restrictOnDelete();
            $table->timestampTz('created_at');
            $table->primary(['study_context_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('favorite_questions');
    }
};
