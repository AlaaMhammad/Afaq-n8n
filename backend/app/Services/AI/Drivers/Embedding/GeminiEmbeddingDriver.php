<?php

namespace App\Services\AI\Drivers\Embedding;

use App\Services\AI\Contracts\EmbeddingDriver;
use App\Services\AI\Contracts\EmbeddingTask;
use App\Services\AI\Exceptions\AiProviderException;
use App\Services\AI\Support\Vectors;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

/**
 * Gemini embeddings via `models/{model}:batchEmbedContents` (≤100 texts per request),
 * truncated to `outputDimensionality` and L2-normalised (truncated Matryoshka vectors are not unit length).
 * Retries 429/5xx honouring the server's retryDelay — important on the AI Studio free tier.
 */
final class GeminiEmbeddingDriver implements EmbeddingDriver
{
    /**
     * @param  array{api_key: ?string, base_url: string, model: string, batch: int, max_retries?: int}  $config
     */
    public function __construct(private readonly array $config, private readonly int $dimensions) {}

    public function embed(string $text, EmbeddingTask $task = EmbeddingTask::Query): array
    {
        return $this->embedMany([$text], $task)[0];
    }

    public function embedMany(array $texts, EmbeddingTask $task = EmbeddingTask::Document): array
    {
        $vectors = [];

        foreach (array_chunk(array_values($texts), max(1, $this->config['batch'] ?? 100)) as $batch) {
            array_push($vectors, ...$this->requestBatch($batch, $task));
        }

        return $vectors;
    }

    public function dimensions(): int
    {
        return $this->dimensions;
    }

    public function model(): string
    {
        return 'gemini/'.$this->config['model'];
    }

    /**
     * @param  list<string>  $texts
     * @return list<list<float>>
     */
    private function requestBatch(array $texts, EmbeddingTask $task): array
    {
        if (blank($this->config['api_key'] ?? null)) {
            throw new AiProviderException('GEMINI_API_KEY is not configured.');
        }

        $model = 'models/'.$this->config['model'];
        $payload = ['requests' => array_map(fn (string $text) => [
            'model' => $model,
            'content' => ['parts' => [['text' => $text]]],
            'taskType' => $task === EmbeddingTask::Query ? 'RETRIEVAL_QUERY' : 'RETRIEVAL_DOCUMENT',
            'outputDimensionality' => $this->dimensions,
        ], $texts)];

        $maxRetries = $this->config['max_retries'] ?? 5;

        for ($attempt = 0; ; $attempt++) {
            try {
                $response = Http::baseUrl(rtrim($this->config['base_url'], '/'))
                    ->withHeaders(['x-goog-api-key' => $this->config['api_key']])
                    ->acceptJson()
                    ->timeout(60)
                    ->connectTimeout(10)
                    ->post("{$model}:batchEmbedContents", $payload);
            } catch (ConnectionException $e) {
                if ($attempt >= $maxRetries) {
                    throw new AiProviderException('Gemini embeddings unreachable: '.$e->getMessage(), previous: $e);
                }
                Sleep::for(2 ** $attempt)->seconds();

                continue;
            }

            if ($response->successful()) {
                return $this->vectorsFrom($response, count($texts));
            }

            $retryable = $response->status() === 429 || $response->serverError();
            if (! $retryable || $attempt >= $maxRetries) {
                throw AiProviderException::fromResponse('Gemini embeddings', $response->status(), $response->json('error.message'));
            }

            Sleep::for($this->retryDelay($response, $attempt))->seconds();
        }
    }

    /** @return list<list<float>> */
    private function vectorsFrom(Response $response, int $expected): array
    {
        $vectors = array_map(fn (array $embedding) => $embedding['values'] ?? [], $response->json('embeddings') ?? []);

        if (count($vectors) !== $expected) {
            throw new AiProviderException("Gemini returned {$expected} inputs → ".count($vectors).' embeddings.');
        }

        return array_map(function (array $values) {
            if (count($values) !== $this->dimensions) {
                throw new AiProviderException('Embedding has '.count($values)." dimensions; the vector column expects {$this->dimensions}.");
            }

            return Vectors::normalize($values);
        }, $vectors);
    }

    /** Server hint (`RetryInfo.retryDelay: "20s"` or Retry-After), else exponential backoff; capped at 60 s. */
    private function retryDelay(Response $response, int $attempt): int
    {
        foreach ($response->json('error.details') ?? [] as $detail) {
            if (isset($detail['retryDelay']) && preg_match('/^(\d+(?:\.\d+)?)s$/', $detail['retryDelay'], $m)) {
                return min(60, (int) ceil((float) $m[1]));
            }
        }

        if (is_numeric($header = $response->header('Retry-After'))) {
            return min(60, (int) $header);
        }

        return min(60, 2 ** ($attempt + 1));
    }
}
