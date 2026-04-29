<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DailyCompletion extends Model
{
    use HasFactory;

    protected $fillable = [
        'child_id',
        'completion_date',
        'total_tasks',
        'completed_tasks',
        'is_all_completed',
    ];

    protected $casts = [
        'completion_date' => 'date',
    ];
}
