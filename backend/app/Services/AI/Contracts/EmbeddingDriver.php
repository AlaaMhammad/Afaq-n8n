<?php

namespace App\Services\AI\Contracts;

/**
 * Turns text into fixed-size vectors for pgvector retrieval.
 * Implementations (Gemini, Ollama, Fake) are bound by AiServiceProvider — Phase 3.
 * Spec: docs/04_features/rag_and_ai_agent.md §1.1
 */
interface EmbeddingDriver
{
    /** @return list<float> */
    public function embed(string $text, EmbeddingTask $task = EmbeddingTask::Query): array;

    /**
     * @param  list<string>  $texts
     * @return list<list<float>>
     */
    public function embedMany(array $texts, EmbeddingTask $task = EmbeddingTask::Document): array;

    /** Must equal config('ai.embeddings.dimensions') — the vector(768) column size. */
    public function dimensions(): int;

    /** Provider-qualified model id, e.g. "gemini/text-embedding-004". */
    public function model(): string;
}
