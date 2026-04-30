<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RewardRecord extends Model
{
    protected $fillable = [
        'child_id',
        'source_type',
        'source_id',
        'points',
        'description',
    ];
}
