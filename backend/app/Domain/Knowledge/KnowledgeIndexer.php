<?php

namespace App\Domain\Knowledge;

use App\Domain\Knowledge\Enums\KnowledgeCategory;
use App\Models\KnowledgeDocument;
use App\Services\AI\Contracts\EmbeddingDriver;
use App\Services\AI\Contracts\EmbeddingTask;
use App\Services\AI\Support\Vectors;
use Illuminate\Support\Facades\DB;

/**
 * Chunk → embed → replace the chunk rows of one source document.
 *
 * Unchanged chunks (same content hash, same embedding model) reuse their stored vectors,
 * so re-indexing after a small edit only spends embedding quota on what changed.
 */
final class KnowledgeIndexer
{
    public function __construct(
        private readonly EmbeddingDriver $embeddings,
    ) {}

    /**
     * @return array{chunks: int, embedded: int, reused: int}
     */
    public function index(KnowledgeDocument $source, bool $force = false): array
    {
        $chunker = new Chunker(
            (int) config('ai.rag.chunk_tokens', 350),
            (int) config('ai.rag.overlap', 50),
        );

        // Admin-authored content is trusted and intentionally contains agency contact details,
        // so it is not PII-scrubbed (chat transcripts and logs are).
        $texts = $chunker->chunk($source->title, $source->content, $source->category === KnowledgeCategory::Faq);
        $hashes = array_map(fn (string $text) => hash('sha256', $text), $texts);
        $model = $this->embeddings->model();

        $reusable = $force ? collect() : $source->chunks()
            ->where('embedding_model', $model)
            ->whereNotNull('embedding')
            ->get(['content_hash', 'embedding'])
            ->keyBy('content_hash');

        $toEmbed = array_keys(array_filter($hashes, fn (string $hash) => ! $reusable->has($hash)));
        $fresh = $toEmbed === [] ? [] : array_combine(
            $toEmbed,
            $this->embeddings->embedMany(
                array_map(fn (int $i) => ArabicNormalizer::normalize($texts[$i]), $toEmbed),
                EmbeddingTask::Document,
            ),
        );

        $now = now();
        $rows = [];
        foreach ($texts as $i => $text) {
            $vector = $fresh[$i] ?? $reusable->get($hashes[$i])->embedding->toArray();
            $rows[] = [
                'parent_id' => $source->id,
                'title' => $source->title,
                'content' => $text,
                'category' => $source->category->value,
                'locale' => $source->locale,
                'chunk_index' => $i,
                'embedding' => Vectors::literal($vector),
                'content_hash' => $hashes[$i],
                'embedding_model' => $model,
                'indexed_at' => $now,
                'metadata' => json_encode(array_filter([
                    'seed_key' => $source->metadata['seed_key'] ?? null,
                    'service_slug' => $source->metadata['service_slug'] ?? null,
                    'project_slug' => $source->metadata['project_slug'] ?? null,
                ])) ?: '{}',
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::transaction(function () use ($source, $rows, $model, $now) {
            $source->chunks()->delete();
            KnowledgeDocument::insert($rows);

            $source->forceFill([
                'content_hash' => $source->currentContentHash(),
                'embedding_model' => $model,
                'indexed_at' => $now,
            ])->saveQuietly();
        });

        return ['chunks' => count($rows), 'embedded' => count($fresh), 'reused' => count($rows) - count($fresh)];
    }
}
