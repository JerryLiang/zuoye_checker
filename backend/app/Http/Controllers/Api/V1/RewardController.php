<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Badge;
use App\Models\Child;
use App\Models\RewardAccount;
use App\Models\RewardRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RewardController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'child_id' => ['required', 'integer'],
        ]);

        $child = Child::query()->where('id', $validated['child_id'])->where('user_id', $request->user()->id)->firstOrFail();

        $account = RewardAccount::query()->firstOrCreate(
            ['child_id' => $child->id],
            ['total_points' => 0, 'streak_days' => 0]
        );

        $records = RewardRecord::query()
            ->where('child_id', $child->id)
            ->latest('id')
            ->limit(20)
            ->get();

        $badges = Badge::query()
            ->where('child_id', $child->id)
            ->latest('id')
            ->get();

        return response()->json([
            'code' => 0,
            'message' => 'ok',
            'data' => [
                'account' => $account,
                'records' => $records,
                'badges' => $badges,
            ],
        ]);
    }
}
