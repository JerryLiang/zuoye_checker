<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class ApiTokenAuth
{
    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();

        if (! $token) {
            return response()->json(['code' => 401, 'message' => '未登录', 'data' => null], 401);
        }

        $user = User::query()->where('api_token', $token)->first();

        if (! $user) {
            return response()->json(['code' => 401, 'message' => '登录已失效', 'data' => null], 401);
        }

        Auth::setUser($user);
        $request->setUserResolver(fn () => $user);

        return $next($request);
    }
}
