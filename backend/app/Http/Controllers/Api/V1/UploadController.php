<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Child;
use App\Models\FileAsset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class UploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'child_id' => ['nullable', 'integer'],
            'biz_type' => ['required', 'string', 'in:homework_input,task_submission'],
            'file' => ['required', 'file', 'max:10240'],
        ]);

        if (! empty($validated['child_id'])) {
            Child::query()->where('id', $validated['child_id'])->where('user_id', $request->user()->id)->firstOrFail();
        }

        $file = $request->file('file');
        $mime = $file?->getMimeType() ?: 'application/octet-stream';

        $allowed = [
            'image/jpeg', 'image/png', 'image/webp',
            'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/aac', 'audio/ogg',
        ];

        if (! in_array($mime, $allowed, true)) {
            return response()->json(['code' => 422, 'message' => '不支持的文件类型', 'data' => null], 422);
        }

        $ext = $file?->getClientOriginalExtension() ?: 'bin';
        $filename = (string) Str::uuid().'.'.$ext;
        $datePath = now()->format('Y/m/d');
        $dir = 'uploads/'.$datePath;
        $relativePath = $dir.'/'.$filename;

        Storage::disk('local')->putFileAs($dir, $file, $filename);

        $asset = FileAsset::create([
            'user_id' => $request->user()->id,
            'child_id' => $validated['child_id'] ?? null,
            'biz_type' => $validated['biz_type'],
            'file_type' => str_starts_with($mime, 'image/') ? 'image' : 'audio',
            'mime_type' => $mime,
            'original_name' => $file?->getClientOriginalName(),
            'storage_path' => $relativePath,
            'file_size' => $file?->getSize() ?? 0,
            'sha256' => $file?->getRealPath() ? hash_file('sha256', $file->getRealPath()) : null,
            'created_at' => now(),
        ]);

        return response()->json([
            'code' => 0,
            'message' => 'uploaded',
            'data' => [
                'id' => $asset->id,
                'storage_path' => $asset->storage_path,
            ],
        ]);
    }

    public function download(Request $request, FileAsset $asset): StreamedResponse|JsonResponse
    {
        if ($asset->user_id !== $request->user()->id) {
            return response()->json(['code' => 403, 'message' => '无权访问该文件', 'data' => null], 403);
        }

        if (! Storage::disk('local')->exists($asset->storage_path)) {
            return response()->json(['code' => 404, 'message' => '文件不存在', 'data' => null], 404);
        }

        return Storage::disk('local')->download($asset->storage_path, $asset->original_name ?: basename($asset->storage_path));
    }
}
