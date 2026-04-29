<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Child extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'gender',
        'birth_date',
        'age_group',
        'grade',
    ];

    protected $casts = [
        'birth_date' => 'date',
    ];
}
