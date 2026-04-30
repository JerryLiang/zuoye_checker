<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CheckResult extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'submission_id',
        'task_id',
        'check_engine',
        'is_passed',
        'score',
        'feedback',
        'detail_json',
        'checked_at',
    ];

    protected $casts = [
        'detail_json' => 'array',
        'checked_at' => 'datetime',
    ];
}
