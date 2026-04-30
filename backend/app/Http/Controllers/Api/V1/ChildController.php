<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Child;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChildController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $children = Child::query()
            ->where('user_id', $user->id)
            ->orderByDesc('id')
            ->get();

        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $children]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'gender' => ['nullable', 'integer', 'in:1,2'],
            'birth_date' => ['nullable', 'date'],
            'age_group' => ['required', 'string', 'in:3-6,7-9,10-12'],
            'grade' => ['nullable', 'string', 'max:20'],
        ]);

        $child = Child::query()->create([
            ...$validated,
            'user_id' => $request->user()->id,
        ]);

        return response()->json(['code' => 0, 'message' => 'created', 'data' => $child], 201);
    }

    public function show(Request $request, Child $child): JsonResponse
    {
        $this->ensureOwnership($request, $child);

        return response()->json(['code' => 0, 'message' => 'ok', 'data' => $child]);
    }

    public function update(Request $request, Child $child): JsonResponse
    {
        $this->ensureOwnership($request, $child);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:50'],
            'gender' => ['nullable', 'integer', 'in:1,2'],
            'birth_date' => ['nullable', 'date'],
            'age_group' => ['sometimes', 'string', 'in:3-6,7-9,10-12'],
            'grade' => ['nullable', 'string', 'max:20'],
        ]);

        $child->update($validated);

        return response()->json(['code' => 0, 'message' => 'updated', 'data' => $child]);
    }

    public function destroy(Request $request, Child $child): JsonResponse
    {
        $this->ensureOwnership($request, $child);
        $child->delete();

        return response()->json(['code' => 0, 'message' => 'deleted', 'data' => null]);
    }

    private function ensureOwnership(Request $request, Child $child): void
    {
        abort_unless($child->user_id === $request->user()->id, 403, '无权限操作该孩子');
    }
}
