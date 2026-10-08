<?php

namespace App\Services\AI;

use App\Domain\Knowledge\ArabicNormalizer;
use App\Services\AI\Contracts\EmbeddingDriver;
use App\Services\AI\Contracts\EmbeddingTask;
use App\Services\AI\Data\RetrievedChunk;
use App\Services\AI\Support\Vectors;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Semantic search over knowledge chunks: score = cosine similarity = 1 - (embedding <=> query),
 * served by the HNSW index. Both languages are searched; same-language chunks get a small boost
 * so Arabic questions prefer Arabic sources while English-only facts remain reachable.
 */
final class Retriever
{
    private const SAME_LOCALE_BOOST = 0.03;

    public function __construct(private readonly EmbeddingDriver $embeddings) {}

    /** @return Collection<int, RetrievedChunk> */
    public function search(string $query, string $locale, ?int $k = null, ?float $minScore = null): Collection
    {
        $k ??= (int) config('ai.rag.top_k', 5);
        $minScore ??= (float) config('ai.rag.min_score', 0.55);

        $vector = Vectors::literal($this->embeddings->embed(ArabicNormalizer::normalize($query), EmbeddingTask::Query));

        $rows = DB::transaction(function () use ($vector, $k) {
            DB::statement('SET LOCAL hnsw.ef_search = 40');

            return DB::select(<<<'SQL'
                SELECT id, parent_id, title, content, category, locale,
                       1 - (embedding <=> ?::vector) AS score
                FROM knowledge_documents
                WHERE embedding IS NOT NULL
                  AND parent_id IS NOT NULL
                  AND embedding_model = ?
                ORDER BY embedding <=> ?::vector
                LIMIT ?
            SQL, [$vector, $this->embeddings->model(), $vector, $k * 3]);
        });

        return collect($rows)
            ->map(fn (object $row) => RetrievedChunk::fromRow($row))
            ->filter(fn (RetrievedChunk $chunk) => $chunk->score >= $minScore)
            ->sortByDesc(fn (RetrievedChunk $chunk) => $chunk->score + ($chunk->locale === $locale ? self::SAME_LOCALE_BOOST : 0))
            ->take($k)
            ->values();
    }
}
