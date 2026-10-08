<?php

namespace App\Models;

use App\Domain\Knowledge\Enums\KnowledgeCategory;
use App\Services\AI\Contracts\EmbeddingDriver;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Pgvector\Laravel\HasNeighbors;
use Pgvector\Laravel\Vector;

/**
 * A source document (parent_id = null) or one of its embedded chunks.
 * See docs/04_features/rag_and_ai_agent.md
 */
class KnowledgeDocument extends Model
{
    use HasFactory, HasNeighbors;

    public const STATUS_INDEXED = 'indexed';

    public const STATUS_STALE = 'stale';

    public const STATUS_PENDING = 'pending';

    protected $fillable = [
        'parent_id',
        'title',
        'content',
        'category',
        'locale',
        'chunk_index',
        'embedding',
        'content_hash',
        'embedding_model',
        'indexed_at',
        'metadata',
    ];

    protected $attributes = [
        'metadata' => '{}',
    ];

    protected $hidden = ['embedding'];

    protected function casts(): array
    {
        return [
            'category' => KnowledgeCategory::class,
            'embedding' => Vector::class,
            'indexed_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function chunks(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('chunk_index');
    }

    /** @param Builder<self> $query */
    public function scopeSources(Builder $query): void
    {
        $query->whereNull('parent_id');
    }

    /** @param Builder<self> $query */
    public function scopeOnlyChunks(Builder $query): void
    {
        $query->whereNotNull('parent_id');
    }

    public function currentContentHash(): string
    {
        return hash('sha256', $this->title."\n".$this->content);
    }

    /**
     * Index status of a source document, relative to the configured embedding model.
     */
    public function indexStatus(): string
    {
        if ($this->indexed_at === null) {
            return self::STATUS_PENDING;
        }

        $stale = $this->content_hash !== $this->currentContentHash()
            || $this->embedding_model !== self::configuredEmbeddingModel();

        return $stale ? self::STATUS_STALE : self::STATUS_INDEXED;
    }

    /** Provider-qualified id of the active embedding model, e.g. "gemini/gemini-embedding-2". */
    public static function configuredEmbeddingModel(): string
    {
        return app(EmbeddingDriver::class)->model();
    }
}
