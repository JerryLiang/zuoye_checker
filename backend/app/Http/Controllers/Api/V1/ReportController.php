<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\CheckResult;
use App\Models\RewardRecord;
use App\Models\TaskItem;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function weekly(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'child_id' => ['required', 'integer'],
            'start_date' => ['nullable', 'date'],
        ]);

        Child::query()->where('id', $validated['child_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $startDate = isset($validated['start_date'])
            ? Carbon::parse($validated['start_date'])
            : Carbon::now()->startOfWeek(Carbon::MONDAY);

        $weekStart = $startDate->copy()->startOfWeek(Carbon::MONDAY);
        $weekEnd = $weekStart->copy()->endOfWeek(Carbon::SUNDAY);

        // Get all tasks for the week
        $tasks = TaskItem::query()
            ->where('child_id', $validated['child_id'])
            ->whereHas('batch', function ($q) use ($weekStart, $weekEnd) {
                $q->whereBetween('batch_date', [
                    $weekStart->toDateString(),
                    $weekEnd->toDateString(),
                ]);
            })
            ->with(['batch'])
            ->get();

        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('status', 2)->count();
        $completionRate = $totalTasks > 0 ? round($completedTasks / $totalTasks * 100, 1) : 0;

        // Average score from check results
        $avgScore = CheckResult::query()
            ->whereIn('task_id', $tasks->pluck('id'))
            ->avg('score') ?? 0;
        $avgScore = round($avgScore, 1);

        // Total points earned this week
        $totalPoints = RewardRecord::query()
            ->where('child_id', $validated['child_id'])
            ->whereBetween('created_at', [
                $weekStart->startOfDay(),
                $weekEnd->endOfDay(),
            ])
            ->sum('points');

        // Daily breakdown
        $dailyStats = [];
        for ($i = 0; $i < 7; $i++) {
            $date = $weekStart->copy()->addDays($i)->toDateString();
            $dayTasks = $tasks->filter(fn ($t) => optional($t->batch)->batch_date === $date);
            $dayTotal = $dayTasks->count();
            $dayCompleted = $dayTasks->where('status', 2)->count();

            $dayAvgScore = 0;
            if ($dayTotal > 0) {
                $dayAvgScore = CheckResult::query()
                    ->whereIn('task_id', $dayTasks->pluck('id'))
                    ->avg('score') ?? 0;
                $dayAvgScore = round($dayAvgScore, 1);
            }

            $dailyStats[] = [
                'date' => $date,
                'weekday' => $weekStart->copy()->addDays($i)->locale('zh_CN')->shortDayName,
                'total' => $dayTotal,
                'completed' => $dayCompleted,
                'avg_score' => $dayAvgScore,
            ];
        }

        return response()->json([
            'code' => 0,
            'message' => 'ok',
            'data' => [
                'child_id' => (int) $validated['child_id'],
                'week_start' => $weekStart->toDateString(),
                'week_end' => $weekEnd->toDateString(),
                'summary' => [
                    'total_tasks' => $totalTasks,
                    'completed_tasks' => $completedTasks,
                    'completion_rate' => $completionRate,
                    'avg_score' => $avgScore,
                    'total_points' => (int) $totalPoints,
                ],
                'daily_stats' => $dailyStats,
            ],
        ]);
    }
}
