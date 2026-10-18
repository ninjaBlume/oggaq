<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Attempt revision at which this answer last changed; 0 means never changed since the pinned snapshot.
        Schema::table('exam_answers', fn (Blueprint $table) => $table->unsignedInteger('changed_revision')->default(0));
    }

    public function down(): void
    {
        Schema::table('exam_answers', fn (Blueprint $table) => $table->dropColumn('changed_revision'));
    }
};
