<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function wechatLogin(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'openid' => ['required', 'string', 'max:64'],
            'nickname' => ['nullable', 'string', 'max:64'],
            'avatar_url' => ['nullable', 'string', 'max:255'],
        ]);

        $user = User::query()->updateOrCreate(
            ['openid' => $validated['openid']],
            [
                'nickname' => $validated['nickname'] ?? null,
                'avatar_url' => $validated['avatar_url'] ?? null,
                'status' => 1,
                'api_token' => Str::random(60),
            ]
        );

        return response()->json([
            'code' => 0,
            'message' => 'ok',
            'data' => [
                'token' => $user->api_token,
                'user' => $user,
            ],
        ]);
    }
}
