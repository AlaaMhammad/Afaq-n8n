<?php

namespace App\Services\AI;

use App\Services\AI\Contracts\EmbeddingDriver;
use App\Services\AI\Drivers\Embedding\FakeEmbeddingDriver;
use App\Services\AI\Drivers\Embedding\GeminiEmbeddingDriver;
use App\Services\AI\Drivers\Embedding\OllamaEmbeddingDriver;
use Illuminate\Support\Manager;

/**
 * Resolves the embedding driver from config('ai.embeddings') — `EMBEDDING_DRIVER=gemini|ollama|fake`.
 * Every driver produces config('ai.embeddings.dimensions')-sized vectors (768) to match the pgvector column.
 *
 * @method EmbeddingDriver driver(?string $driver = null)
 */
class EmbeddingManager extends Manager
{
    public function getDefaultDriver(): string
    {
        return $this->config->get('ai.embeddings.default', 'gemini');
    }

    protected function createGeminiDriver(): EmbeddingDriver
    {
        return new GeminiEmbeddingDriver($this->config->get('ai.embeddings.drivers.gemini'), $this->dimensions());
    }

    protected function createOllamaDriver(): EmbeddingDriver
    {
        return new OllamaEmbeddingDriver($this->config->get('ai.embeddings.drivers.ollama'), $this->dimensions());
    }

    protected function createFakeDriver(): EmbeddingDriver
    {
        return new FakeEmbeddingDriver($this->dimensions());
    }

    private function dimensions(): int
    {
        return (int) $this->config->get('ai.embeddings.dimensions', 768);
    }
}
