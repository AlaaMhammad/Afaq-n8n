<?php

namespace App\Services\AI\Drivers\Embedding;

use App\Services\AI\Contracts\EmbeddingDriver;
use App\Services\AI\Contracts\EmbeddingTask;
use App\Services\AI\Support\Vectors;

/**
 * Deterministic, offline embeddings (EMBEDDING_DRIVER=fake).
 *
 * Vectors are a hashed bag-of-words, so texts sharing words are genuinely closer in cosine space —
 * good enough for retrieval tests without network access. Exact vectors can be pinned with `returnFor()`.
 */
final class FakeEmbeddingDriver implements EmbeddingDriver
{
    /** @var array<string, list<float>> */
    private static array $overrides = [];

    public function __construct(private readonly int $dimensions = 768) {}

    /** @param list<float> $vector */
    public static function returnFor(string $text, array $vector): void
    {
        self::$overrides[$text] = $vector;
    }

    public static function reset(): void
    {
        self::$overrides = [];
    }

    public function embed(string $text, EmbeddingTask $task = EmbeddingTask::Query): array
    {
        return self::$overrides[$text] ?? $this->bagOfWords($text);
    }

    public function embedMany(array $texts, EmbeddingTask $task = EmbeddingTask::Document): array
    {
        return array_map(fn (string $text) => $this->embed($text, $task), array_values($texts));
    }

    public function dimensions(): int
    {
        return $this->dimensions;
    }

    public function model(): string
    {
        return 'fake/bag-of-words';
    }

    /** @return list<float> */
    private function bagOfWords(string $text): array
    {
        $vector = array_fill(0, $this->dimensions, 0.0);
        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY) ?: ['∅'];

        foreach ($words as $word) {
            $vector[crc32($word) % $this->dimensions] += 1.0;
        }

        return Vectors::normalize($vector);
    }
}
