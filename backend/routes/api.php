<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ChildController;
use App\Http\Controllers\Api\V1\HomeworkController;
use App\Http\Controllers\Api\V1\ReportController;
use App\Http\Controllers\Api\V1\RewardController;
use App\Http\Controllers\Api\V1\TaskController;
use App\Http\Controllers\Api\V1\UploadController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/wechat-login', [AuthController::class, 'wechatLogin']);

    Route::middleware('api.token')->group(function () {
        Route::apiResource('children', ChildController::class);
        Route::apiResource('homeworks', HomeworkController::class);

        Route::get('/tasks/today', [TaskController::class, 'today']);
        Route::post('/tasks/{task}/submit', [TaskController::class, 'submit']);

        Route::post('/upload', [UploadController::class, 'store']);
        Route::get('/assets/{asset}/download', [UploadController::class, 'download']);

        Route::get('/rewards/overview', [RewardController::class, 'overview']);

        Route::get('/reports/weekly', [ReportController::class, 'weekly']);
    });
});
