<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Badge extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'child_id',
        'badge_code',
        'badge_name',
        'awarded_at',
    ];

    protected $casts = [
        'awarded_at' => 'datetime',
    ];
}
