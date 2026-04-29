<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\HomeworkBatch;
use App\Models\TaskItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HomeworkController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $items = HomeworkBatch::query()
            ->where('user_id', $request->user()->id)
            ->when($request->filled('child_id'), fn ($q) => $q->where('child_id', (int) $request->query('child_id')))
            ->orderByDesc('batch_date')
            ->orderByDesc('id')
            ->get();

        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $items]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'child_id' => ['required', 'integer'],
            'subject' => ['nullable', 'string', 'max:20'],
            'input_source' => ['required', 'integer', 'in:1,2,3,4'],
            'raw_text' => ['nullable', 'string'],
            'batch_date' => ['required', 'date'],
        ]);

        $batch = HomeworkBatch::query()->create([
            ...$validated,
            'user_id' => $request->user()->id,
            'status' => 1,
        ]);

        $raw = trim((string) ($validated['raw_text'] ?? ''));
        $segments = $raw !== ''
            ? preg_split('/[\n\r]+|[。；;]/u', $raw, -1, PREG_SPLIT_NO_EMPTY)
            : [];

        if (empty($segments)) {
            $segments = ['完成老师布置的作业'];
        }

        foreach (array_values($segments) as $idx => $title) {
            TaskItem::query()->create([
                'batch_id' => $batch->id,
                'child_id' => $batch->child_id,
                'title' => mb_substr(trim($title), 0, 255),
                'task_type' => 'other',
                'subject' => $batch->subject,
                'expected_minutes' => 10,
                'check_mode' => 1,
                'pass_score' => 60,
                'status' => 1,
                'sort_order' => $idx,
            ]);
        }

        return response()->json(['code' => 0, 'message' => 'created', 'data' => $batch], 201);
    }

    public function show(Request $request, HomeworkBatch $homework): JsonResponse
    {
        $this->ensureOwnership($request, $homework);
        $homework->load('tasks');

        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $homework]);
    }

    public function update(Request $request, HomeworkBatch $homework): JsonResponse
    {
        $this->ensureOwnership($request, $homework);

        $validated = $request->validate([
            'subject' => ['nullable', 'string', 'max:20'],
            'raw_text' => ['nullable', 'string'],
            'status' => ['nullable', 'integer', 'in:1,2'],
        ]);

        $homework->update($validated);

        return response()->json(['code' => 0, 'message' => 'updated', 'data' => $homework]);
    }

    public function destroy(Request $request, HomeworkBatch $homework): JsonResponse
    {
        $this->ensureOwnership($request, $homework);
        $homework->delete();

        return response()->json(['code' => 0, 'message' => 'deleted', 'data' => null]);
    }

    private function ensureOwnership(Request $request, HomeworkBatch $homework): void
    {
        abort_unless($homework->user_id === $request->user()->id, 403, '无权限操作该作业');
    }
}
