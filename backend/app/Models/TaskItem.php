<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class TaskItem extends Model
{
    protected $fillable = [
        'batch_id',
        'child_id',
        'title',
        'task_type',
        'subject',
        'expected_minutes',
        'check_mode',
        'pass_score',
        'status',
        'sort_order',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(HomeworkBatch::class, 'batch_id');
    }

    public function submission(): HasOne
    {
        return $this->hasOne(TaskSubmission::class, 'task_id')->latestOfMany();
    }
}
