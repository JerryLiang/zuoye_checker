<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FileAsset extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'child_id',
        'biz_type',
        'file_type',
        'mime_type',
        'original_name',
        'storage_path',
        'file_size',
        'sha256',
        'created_at',
    ];
}
