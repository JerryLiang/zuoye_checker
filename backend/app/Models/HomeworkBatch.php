<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class HomeworkBatch extends Model
{
    protected $fillable = [
        'user_id',
        'child_id',
        'subject',
        'input_source',
        'raw_text',
        'batch_date',
        'status',
    ];

    public function tasks(): HasMany
    {
        return $this->hasMany(TaskItem::class, 'batch_id');
    }
}
