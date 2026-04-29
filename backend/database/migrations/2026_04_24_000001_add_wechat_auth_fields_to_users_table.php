<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('openid', 64)->nullable()->unique()->after('id');
            $table->string('nickname', 64)->nullable()->after('email');
            $table->string('avatar_url', 255)->nullable()->after('nickname');
            $table->string('mobile', 20)->nullable()->after('avatar_url');
            $table->unsignedTinyInteger('status')->default(1)->after('mobile');
            $table->string('api_token', 80)->nullable()->unique()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['openid']);
            $table->dropUnique(['api_token']);
            $table->dropColumn(['openid', 'nickname', 'avatar_url', 'mobile', 'status', 'api_token']);
        });
    }
};
