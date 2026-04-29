<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('children', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 50);
            $table->tinyInteger('gender')->nullable()->comment('1=boy,2=girl');
            $table->date('birth_date')->nullable();
            $table->string('age_group', 20)->comment('3-6,7-9,10-12');
            $table->string('grade', 20)->nullable();
            $table->timestamps();

            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('children');
    }
};
