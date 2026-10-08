<?php

namespace App\Models;

use App\Models\Concerns\FlushesPublicApiCache;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Spatie\Translatable\HasTranslations;

class TeamMember extends Model
{
    use FlushesPublicApiCache, HasFactory, HasTranslations;

    /** @var list<string> */
    public array $translatable = ['name', 'role', 'bio'];

    protected $fillable = [
        'name',
        'role',
        'bio',
        'avatar_path',
        'cv_url',
        'skills',
        'social_links',
        'is_active',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'skills' => 'array',
            'social_links' => 'array',
            'is_active' => 'boolean',
            'order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        // Remove replaced or orphaned media from the disk (absolute CV URLs are left alone).
        static::updated(function (self $member) {
            foreach (['avatar_path', 'cv_url'] as $attribute) {
                if ($member->wasChanged($attribute)) {
                    self::deleteStoredFile($member->getOriginal($attribute));
                }
            }
        });

        static::deleted(function (self $member) {
            self::deleteStoredFile($member->avatar_path);
            self::deleteStoredFile($member->cv_url);
        });
    }

    private static function deleteStoredFile(?string $path): void
    {
        if (filled($path) && ! Str::startsWith($path, ['http://', 'https://'])) {
            Storage::disk(config('afaq.media.disk'))->delete($path);
        }
    }

    public function avatarUrl(): ?string
    {
        return $this->avatar_path ? Storage::disk(config('afaq.media.disk'))->url($this->avatar_path) : null;
    }

    /** @param Builder<self> $query */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }
}
