<?php

namespace App\Services\AI\Drivers\Embedding;

use App\Services\AI\Contracts\EmbeddingDriver;
use App\Services\AI\Contracts\EmbeddingTask;
use App\Services\AI\Exceptions\AiProviderException;
use App\Services\AI\Support\Vectors;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

/**
 * Local Ollama embeddings via `POST /api/embed`. nomic-embed-text (768-d) expects
 * "search_query: " / "search_document: " task prefixes, applied when `task_prefixes` is on.
 */
final class OllamaEmbeddingDriver implements EmbeddingDriver
{
    /** @param array{base_url: string, model: string, batch: int, task_prefixes?: bool} $config */
    public function __construct(private readonly array $config, private readonly int $dimensions) {}

    public function embed(string $text, EmbeddingTask $task = EmbeddingTask::Query): array
    {
        return $this->embedMany([$text], $task)[0];
    }

    public function embedMany(array $texts, EmbeddingTask $task = EmbeddingTask::Document): array
    {
        $prefix = ($this->config['task_prefixes'] ?? false)
            ? ($task === EmbeddingTask::Query ? 'search_query: ' : 'search_document: ')
            : '';

        $vectors = [];

        foreach (array_chunk(array_values($texts), max(1, $this->config['batch'] ?? 32)) as $batch) {
            try {
                $response = Http::baseUrl(rtrim($this->config['base_url'], '/'))
                    ->timeout(120)
                    ->connectTimeout(5)
                    ->post('api/embed', [
                        'model' => $this->config['model'],
                        'input' => array_map(fn (string $text) => $prefix.$text, $batch),
                    ]);
            } catch (ConnectionException $e) {
                throw new AiProviderException('Ollama is unreachable at '.$this->config['base_url'].': '.$e->getMessage(), previous: $e);
            }

            if ($response->failed()) {
                throw AiProviderException::fromResponse('Ollama embeddings', $response->status(), $response->json('error'));
            }

            foreach ($response->json('embeddings') ?? [] as $values) {
                if (count($values) !== $this->dimensions) {
                    throw new AiProviderException("{$this->config['model']} returns ".count($values)."-d vectors; the vector column expects {$this->dimensions}. Pick a {$this->dimensions}-d model (e.g. nomic-embed-text).");
                }
                $vectors[] = Vectors::normalize($values);
            }
        }

        if (count($vectors) !== count($texts)) {
            throw new AiProviderException('Ollama returned '.count($vectors).' embeddings for '.count($texts).' inputs.');
        }

        return $vectors;
    }

    public function dimensions(): int
    {
        return $this->dimensions;
    }

    public function model(): string
    {
        return 'ollama/'.$this->config['model'];
    }
}
