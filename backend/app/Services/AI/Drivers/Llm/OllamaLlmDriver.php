<?php

namespace App\Services\AI\Drivers\Llm;

use App\Services\AI\Contracts\LlmDriver;
use App\Services\AI\Data\ChatRequest;
use App\Services\AI\Data\ChatTurn;
use App\Services\AI\Data\TextDelta;
use App\Services\AI\Data\ToolCall;
use App\Services\AI\Data\ToolCallEvent;
use App\Services\AI\Data\ToolDefinition;
use App\Services\AI\Data\TurnEnd;
use App\Services\AI\Exceptions\AiProviderException;
use App\Services\AI\Support\StreamLines;
use Generator;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Local Ollama — `POST /api/chat` with `stream: true` (NDJSON).
 * Mapping table: docs/04_features/rag_and_ai_agent.md §1.4
 */
final class OllamaLlmDriver implements LlmDriver
{
    /** @param array{base_url: string, model: string, timeout: int} $config */
    public function __construct(private readonly array $config) {}

    public function name(): string
    {
        return 'ollama/'.$this->config['model'];
    }

    public function stream(ChatRequest $request): Generator
    {
        try {
            $response = Http::baseUrl(rtrim($this->config['base_url'], '/'))
                ->timeout($this->config['timeout'] ?? 120)
                ->connectTimeout(5)
                ->withOptions(['stream' => true])
                ->post('api/chat', [
                    'model' => $this->config['model'],
                    'messages' => $this->messages($request),
                    'tools' => array_map(fn (ToolDefinition $tool) => [
                        'type' => 'function',
                        'function' => ['name' => $tool->name, 'description' => $tool->description, 'parameters' => $tool->parameters],
                    ], $request->tools),
                    'stream' => true,
                    'options' => ['temperature' => $request->temperature, 'num_predict' => $request->maxOutputTokens],
                ]);
        } catch (ConnectionException $e) {
            throw new AiProviderException('Ollama is unreachable at '.$this->config['base_url'].': '.$e->getMessage(), previous: $e);
        }

        if ($response->failed()) {
            throw AiProviderException::fromResponse('Ollama', $response->status(), $response->json('error'));
        }

        $sawToolCall = false;

        foreach (StreamLines::of($response) as $line) {
            $chunk = json_decode($line, true);
            if (! is_array($chunk)) {
                continue;
            }
            if (isset($chunk['error'])) {
                throw new AiProviderException('Ollama error: '.$chunk['error']);
            }

            foreach ($chunk['message']['tool_calls'] ?? [] as $call) {
                $sawToolCall = true;
                $args = $call['function']['arguments'] ?? [];
                yield new ToolCallEvent(new ToolCall(
                    id: $call['id'] ?? 'call_'.Str::lower(Str::random(10)),
                    name: $call['function']['name'],
                    args: is_string($args) ? (json_decode($args, true) ?? []) : (array) $args,
                ));
            }

            if (($chunk['message']['content'] ?? '') !== '') {
                yield new TextDelta($chunk['message']['content']);
            }

            if ($chunk['done'] ?? false) {
                yield new TurnEnd(
                    $chunk['prompt_eval_count'] ?? null,
                    $chunk['eval_count'] ?? null,
                    $sawToolCall ? 'tool_calls' : ($chunk['done_reason'] ?? 'stop'),
                );

                return;
            }
        }

        yield new TurnEnd(finishReason: $sawToolCall ? 'tool_calls' : 'stop');
    }

    /** @return list<array<string, mixed>> */
    private function messages(ChatRequest $request): array
    {
        $messages = [['role' => 'system', 'content' => $request->system]];

        foreach ($request->turns as $turn) {
            $messages[] = match ($turn->role) {
                ChatTurn::USER => ['role' => 'user', 'content' => $turn->text ?? ''],
                ChatTurn::ASSISTANT => array_filter([
                    'role' => 'assistant',
                    'content' => $turn->text ?? '',
                    'tool_calls' => array_map(fn (ToolCall $call) => [
                        'function' => ['name' => $call->name, 'arguments' => (object) $call->args],
                    ], $turn->toolCalls) ?: null,
                ], fn ($v) => $v !== null),
                ChatTurn::TOOL => [
                    'role' => 'tool',
                    'tool_name' => $turn->respondsTo->name,
                    'content' => json_encode($turn->toolResult, JSON_UNESCAPED_UNICODE),
                ],
            };
        }

        return $messages;
    }
}
