<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RewardAccount extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'child_id',
        'total_points',
        'streak_days',
        'updated_at',
    ];
}
