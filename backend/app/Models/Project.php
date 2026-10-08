<?php

namespace App\Models;

use App\Models\Concerns\FlushesPublicApiCache;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Spatie\Translatable\HasTranslations;

class Project extends Model
{
    use FlushesPublicApiCache, HasFactory, HasTranslations;

    /** @var list<string> */
    public array $translatable = ['title', 'summary'];

    protected $fillable = [
        'title',
        'slug',
        'client',
        'summary',
        'workflow_metadata',
        'metrics',
        'live_url',
        'cover_path',
        'is_featured',
        'order',
    ];

    protected function casts(): array
    {
        return [
            'workflow_metadata' => 'array',
            'metrics' => 'array',
            'is_featured' => 'boolean',
            'order' => 'integer',
        ];
    }

    public function services(): BelongsToMany
    {
        return $this->belongsToMany(Service::class);
    }
}
