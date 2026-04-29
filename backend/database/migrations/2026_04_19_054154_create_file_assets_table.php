<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('file_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedBigInteger('child_id')->nullable();
            $table->string('biz_type', 30)->comment('homework_input/task_submission');
            $table->string('file_type', 20)->comment('image/audio/other');
            $table->string('mime_type', 100);
            $table->string('original_name', 255)->nullable();
            $table->string('storage_path', 500);
            $table->unsignedBigInteger('file_size');
            $table->char('sha256', 64)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index(['user_id', 'biz_type']);
            $table->index('sha256');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('file_assets');
    }
};
