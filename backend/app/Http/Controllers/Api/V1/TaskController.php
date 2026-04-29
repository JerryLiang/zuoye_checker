<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CheckResult;
use App\Models\Child;
use App\Models\DailyCompletion;
use App\Models\RewardAccount;
use App\Models\RewardRecord;
use App\Models\TaskItem;
use App\Models\TaskSubmission;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function today(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'child_id' => ['required', 'integer'],
            'date' => ['nullable', 'date'],
        ]);

        Child::query()->where('id', $validated['child_id'])->where('user_id', $request->user()->id)->firstOrFail();
        $date = $validated['date'] ?? Carbon::today()->toDateString();

        $tasks = TaskItem::query()
            ->where('child_id', $validated['child_id'])
            ->whereHas('batch', fn ($q) => $q->where('batch_date', $date))
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $tasks]);
    }

    public function submit(Request $request, TaskItem $task): JsonResponse
    {
        $validated = $request->validate([
            'child_id' => ['required', 'integer'],
            'submit_type' => ['required', 'integer', 'in:1,2,3'],
            'submit_text' => ['nullable', 'string'],
            'file_asset_id' => ['nullable', 'integer'],
        ]);

        abort_unless($task->child_id === (int) $validated['child_id'], 403, '任务归属不匹配');
        Child::query()->where('id', $validated['child_id'])->where('user_id', $request->user()->id)->firstOrFail();

        $submission = TaskSubmission::query()->create([
            'task_id' => $task->id,
            'child_id' => $validated['child_id'],
            'submit_type' => $validated['submit_type'],
            'submit_text' => $validated['submit_text'] ?? null,
            'file_asset_id' => $validated['file_asset_id'] ?? null,
            'submitted_at' => now(),
        ]);

        $score = 0;
        $isPassed = 0;
        if (! empty($validated['file_asset_id'])) {
            $score = 85;
            $isPassed = 1;
        } elseif (mb_strlen((string) ($validated['submit_text'] ?? '')) >= 6) {
            $score = 80;
            $isPassed = 1;
        } else {
            $score = 40;
        }

        $check = CheckResult::query()->create([
            'submission_id' => $submission->id,
            'task_id' => $task->id,
            'check_engine' => 'rule_v1',
            'is_passed' => $isPassed,
            'score' => $score,
            'feedback' => $isPassed ? '完成得不错，继续加油！' : '再补充一点内容就更好了。',
            'detail_json' => ['rule' => 'simple_v1'],
            'checked_at' => now(),
        ]);

        if ($isPassed) {
            $task->update(['status' => 2]);

            RewardAccount::query()->firstOrCreate(
                ['child_id' => $task->child_id],
                ['total_points' => 0, 'streak_days' => 0]
            );

            RewardAccount::query()->where('child_id', $task->child_id)->increment('total_points', 2);

            RewardRecord::query()->create([
                'child_id' => $task->child_id,
                'source_type' => 'task_complete',
                'source_id' => $task->id,
                'points' => 2,
                'description' => '完成任务奖励积分',
            ]);

            $batchDate = optional($task->batch)->batch_date;
            if ($batchDate) {
                $allCount = TaskItem::query()->where('batch_id', $task->batch_id)->count();
                $doneCount = TaskItem::query()->where('batch_id', $task->batch_id)->where('status', 2)->count();

                DailyCompletion::query()->updateOrCreate(
                    [
                        'child_id' => $task->child_id,
                        'completion_date' => $batchDate,
                    ],
                    [
                        'total_tasks' => $allCount,
                        'completed_tasks' => $doneCount,
                        'is_all_completed' => $allCount > 0 && $allCount === $doneCount ? 1 : 0,
                    ]
                );
            }
        }

        return response()->json([
            'code' => 0,
            'message' => 'submitted',
            'data' => [
                'submission' => $submission,
                'check_result' => $check,
            ],
        ]);
    }
}
