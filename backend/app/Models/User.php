<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Str;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'openid',
        'nickname',
        'avatar_url',
        'mobile',
        'status',
        'api_token',
    ];

    protected $hidden = [
        'remember_token',
        'api_token',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $user): void {
            if (! $user->api_token) {
                $user->api_token = Str::random(60);
            }
        });
    }
}
