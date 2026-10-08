<?php

namespace App\Services\AI\Drivers\Llm;

use App\Services\AI\Contracts\LlmDriver;
use App\Services\AI\Data\ChatRequest;
use App\Services\AI\Data\ChatTurn;
use App\Services\AI\Data\LlmEvent;
use App\Services\AI\Data\TextDelta;
use App\Services\AI\Data\ToolCall;
use App\Services\AI\Data\ToolCallEvent;
use App\Services\AI\Data\ToolDefinition;
use App\Services\AI\Data\TurnEnd;
use App\Services\AI\Exceptions\AiProviderException;
use App\Services\AI\Support\StreamLines;
use Generator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Sleep;
use Illuminate\Support\Str;

/**
 * Google Gemini (AI Studio) — `models/{model}:streamGenerateContent?alt=sse`.
 * Mapping table: docs/04_features/rag_and_ai_agent.md §1.3
 */
final class GeminiLlmDriver implements LlmDriver
{
    /**
     * @param  array{api_key: ?string, base_url: string, model: string, timeout: int, thinking_level?: ?string}  $config
     */
    public function __construct(private readonly array $config) {}

    public function name(): string
    {
        return 'gemini/'.$this->config['model'];
    }

    /**
     * Transient failures (429 / 5xx / "high demand") that happen before anything was yielded are
     * retried transparently: primary model, primary again after a short pause, then the fallback model.
     * Failures after output has been yielded are thrown — the caller decides how to recover.
     */
    public function stream(ChatRequest $request): Generator
    {
        $models = array_values(array_filter([
            $this->config['model'],
            $this->config['model'],
            $this->config['fallback_model'] ?? null,
        ]));
        $payload = $this->payload($request);

        foreach ($models as $attempt => $model) {
            $yielded = false;

            try {
                foreach ($this->streamModel($model, $payload) as $event) {
                    $yielded = true;
                    yield $event;
                }

                return;
            } catch (AiProviderException $e) {
                $lastAttempt = $attempt === array_key_last($models);
                if ($yielded || $lastAttempt || ! $e->isRetryable()) {
                    throw $e;
                }

                Log::warning('Gemini transient failure, retrying', ['model' => $model, 'attempt' => $attempt + 1, 'error' => $e->getMessage()]);
                Sleep::for(500 * ($attempt + 1))->milliseconds();
            }
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return Generator<int, LlmEvent>
     */
    private function streamModel(string $model, array $payload): Generator
    {
        try {
            $response = $this->http()
                ->withOptions(['stream' => true])
                ->post("models/{$model}:streamGenerateContent?alt=sse", $payload);
        } catch (ConnectionException $e) {
            throw new AiProviderException('Gemini is unreachable: '.$e->getMessage(), 503, $e);
        }

        if ($response->failed()) {
            throw AiProviderException::fromResponse('Gemini', $response->status(), $response->json('error.message'));
        }

        $finishReason = 'stop';
        $inputTokens = $outputTokens = null;
        $sawToolCall = false;

        foreach (StreamLines::of($response) as $line) {
            if (! str_starts_with($line, 'data:')) {
                continue;
            }

            $chunk = json_decode(trim(substr($line, 5)), true);
            if (! is_array($chunk)) {
                continue;
            }
            if (isset($chunk['error'])) {
                throw AiProviderException::fromResponse('Gemini', (int) ($chunk['error']['code'] ?? 500), $chunk['error']['message'] ?? null);
            }
            if ($blocked = data_get($chunk, 'promptFeedback.blockReason')) {
                $finishReason = 'blocked:'.strtolower($blocked);
            }

            $candidate = $chunk['candidates'][0] ?? [];

            foreach ($candidate['content']['parts'] ?? [] as $part) {
                if ($part['thought'] ?? false) {
                    continue; // internal reasoning summaries are never shown
                }

                if (isset($part['functionCall'])) {
                    $sawToolCall = true;
                    yield new ToolCallEvent(new ToolCall(
                        id: $part['functionCall']['id'] ?? 'call_'.Str::lower(Str::random(10)),
                        name: $part['functionCall']['name'],
                        args: (array) ($part['functionCall']['args'] ?? []),
                        providerMeta: array_filter(['thoughtSignature' => $part['thoughtSignature'] ?? null]),
                    ));

                    continue;
                }

                if (($part['text'] ?? '') !== '') {
                    yield new TextDelta($part['text']);
                }
            }

            if (isset($candidate['finishReason'])) {
                $finishReason = strtolower($candidate['finishReason']);
            }
            if ($usage = $chunk['usageMetadata'] ?? null) {
                $inputTokens = $usage['promptTokenCount'] ?? $inputTokens;
                $outputTokens = ($usage['candidatesTokenCount'] ?? 0) + ($usage['thoughtsTokenCount'] ?? 0) ?: $outputTokens;
            }
        }

        yield new TurnEnd($inputTokens, $outputTokens, $sawToolCall ? 'tool_calls' : $finishReason);
    }

    /** @return array<string, mixed> */
    private function payload(ChatRequest $request): array
    {
        $payload = [
            'systemInstruction' => ['parts' => [['text' => $request->system]]],
            'contents' => $this->contents($request->turns),
            'generationConfig' => array_filter([
                'temperature' => $request->temperature,
                'maxOutputTokens' => $request->maxOutputTokens,
                'thinkingConfig' => filled($this->config['thinking_level'] ?? null)
                    ? ['thinkingLevel' => $this->config['thinking_level']]
                    : null,
            ], fn ($v) => $v !== null),
        ];

        if ($request->tools !== []) {
            $payload['tools'] = [[
                'functionDeclarations' => array_map(fn (ToolDefinition $tool) => [
                    'name' => $tool->name,
                    'description' => $tool->description,
                    'parameters' => $tool->parameters,
                ], $request->tools),
            ]];
            $payload['toolConfig'] = ['functionCallingConfig' => ['mode' => 'AUTO']];
        }

        return $payload;
    }

    /**
     * Gemini roles: user | model. Tool results travel as `functionResponse` parts in a user turn;
     * consecutive turns of the same role are merged (required for parallel tool calls).
     *
     * @param  list<ChatTurn>  $turns
     * @return list<array{role: string, parts: list<array<string, mixed>>}>
     */
    private function contents(array $turns): array
    {
        $contents = [];

        foreach ($turns as $turn) {
            [$role, $parts] = match ($turn->role) {
                ChatTurn::USER => ['user', [['text' => $turn->text ?? '']]],
                ChatTurn::ASSISTANT => ['model', [
                    ...($turn->text !== null ? [['text' => $turn->text]] : []),
                    ...array_map(fn (ToolCall $call) => [
                        'functionCall' => ['id' => $call->id, 'name' => $call->name, 'args' => (object) $call->args],
                        ...$call->providerMeta,
                    ], $turn->toolCalls),
                ]],
                ChatTurn::TOOL => ['user', [[
                    'functionResponse' => [
                        'id' => $turn->respondsTo->id,
                        'name' => $turn->respondsTo->name,
                        'response' => ['result' => $turn->toolResult],
                    ],
                ]]],
            };

            $last = array_key_last($contents);
            if ($last !== null && $contents[$last]['role'] === $role) {
                array_push($contents[$last]['parts'], ...$parts);
            } else {
                $contents[] = ['role' => $role, 'parts' => $parts];
            }
        }

        return $contents;
    }

    private function http(): PendingRequest
    {
        if (blank($this->config['api_key'] ?? null)) {
            throw new AiProviderException('GEMINI_API_KEY is not configured.');
        }

        return Http::baseUrl(rtrim($this->config['base_url'], '/'))
            ->withHeaders(['x-goog-api-key' => $this->config['api_key']])
            ->acceptJson()
            ->asJson()
            ->timeout($this->config['timeout'] ?? 60)
            ->connectTimeout(10);
    }
}
