<?php

use App\Services\AI\Contracts\EmbeddingTask;
use App\Services\AI\Data\ChatRequest;
use App\Services\AI\Data\ChatTurn;
use App\Services\AI\Data\TextDelta;
use App\Services\AI\Data\ToolCall;
use App\Services\AI\Data\ToolCallEvent;
use App\Services\AI\Data\ToolDefinition;
use App\Services\AI\Data\TurnEnd;
use App\Services\AI\Drivers\Embedding\FakeEmbeddingDriver;
use App\Services\AI\Drivers\Embedding\GeminiEmbeddingDriver;
use App\Services\AI\Drivers\Embedding\OllamaEmbeddingDriver;
use App\Services\AI\Drivers\Llm\GeminiLlmDriver;
use App\Services\AI\Drivers\Llm\OllamaLlmDriver;
use App\Services\AI\EmbeddingManager;
use App\Services\AI\Exceptions\AiProviderException;
use App\Services\AI\LlmManager;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Sleep;

function sse(array ...$chunks): string
{
    return implode('', array_map(fn ($c) => 'data: '.json_encode($c)."\r\n\r\n", $chunks));
}

function geminiDriver(array $overrides = []): GeminiLlmDriver
{
    return new GeminiLlmDriver([
        'api_key' => 'test-key', 'base_url' => 'https://gemini.test/v1beta', 'model' => 'gemini-3.5-flash',
        'fallback_model' => 'gemini-3.5-flash-lite', 'thinking_level' => 'low', 'timeout' => 10, ...$overrides,
    ]);
}

function collectEvents(Generator $stream): array
{
    return iterator_to_array($stream, false);
}

beforeEach(fn () => Sleep::fake());

describe('GeminiLlmDriver', function () {
    it('maps turns, tools and thought signatures onto the Gemini wire format', function () {
        Http::fake(['*' => Http::response(sse(['candidates' => [['content' => ['parts' => [['text' => 'ok']]], 'finishReason' => 'STOP']]]))]);

        $call = new ToolCall('call_1', 'navigate_to', ['section_id' => 'team'], ['thoughtSignature' => 'SIG']);
        collectEvents(geminiDriver()->stream(new ChatRequest(
            system: 'SYS',
            turns: [ChatTurn::user('hi'), ChatTurn::assistant('', [$call]), ChatTurn::toolResult($call, ['ok' => true])],
            tools: [new ToolDefinition('navigate_to', 'desc', ['type' => 'object', 'properties' => []])],
        )));

        Http::assertSent(function (Request $request) {
            $body = $request->data();

            return str_ends_with($request->url(), 'models/gemini-3.5-flash:streamGenerateContent?alt=sse')
                && $request->hasHeader('x-goog-api-key', 'test-key')
                && $body['systemInstruction']['parts'][0]['text'] === 'SYS'
                && $body['contents'][0] === ['role' => 'user', 'parts' => [['text' => 'hi']]]
                && $body['contents'][1]['role'] === 'model'
                && $body['contents'][1]['parts'][0]['functionCall']['id'] === 'call_1'
                && $body['contents'][1]['parts'][0]['thoughtSignature'] === 'SIG'
                && $body['contents'][2]['parts'][0]['functionResponse'] === ['id' => 'call_1', 'name' => 'navigate_to', 'response' => ['result' => ['ok' => true]]]
                && $body['tools'][0]['functionDeclarations'][0]['name'] === 'navigate_to'
                && $body['generationConfig']['thinkingConfig'] === ['thinkingLevel' => 'low'];
        });
    });

    it('parses streamed text, tool calls and usage', function () {
        Http::fake(['*' => Http::response(sse(
            ['candidates' => [['content' => ['parts' => [['text' => 'Hel'], ['thought' => true, 'text' => 'hidden']]]]]],
            ['candidates' => [['content' => ['parts' => [['text' => 'lo'], ['functionCall' => ['id' => 'c9', 'name' => 'trigger_3d_workflow', 'args' => ['mode' => 'exploded']], 'thoughtSignature' => 'S']]]]]],
            ['candidates' => [['finishReason' => 'STOP']], 'usageMetadata' => ['promptTokenCount' => 50, 'candidatesTokenCount' => 7, 'thoughtsTokenCount' => 3]],
        ))]);

        $events = collectEvents(geminiDriver()->stream(new ChatRequest('s', [ChatTurn::user('x')])));

        expect($events[0])->toEqual(new TextDelta('Hel'))
            ->and($events[1])->toEqual(new TextDelta('lo'))
            ->and($events[2])->toBeInstanceOf(ToolCallEvent::class)
            ->and($events[2]->call)->toEqual(new ToolCall('c9', 'trigger_3d_workflow', ['mode' => 'exploded'], ['thoughtSignature' => 'S']))
            ->and($events[3])->toEqual(new TurnEnd(50, 10, 'tool_calls'));
    });

    it('retries a transient failure, then falls back to the secondary model', function () {
        Http::fakeSequence()
            ->push(['error' => ['message' => 'high demand']], 503)
            ->push(['error' => ['message' => 'high demand']], 503)
            ->push(sse(['candidates' => [['content' => ['parts' => [['text' => 'from fallback']]]]]]));

        $events = collectEvents(geminiDriver()->stream(new ChatRequest('s', [ChatTurn::user('x')])));

        expect($events[0])->toEqual(new TextDelta('from fallback'));
        $urls = collect(Http::recorded())->map(fn ($pair) => $pair[0]->url())->all();
        expect($urls[0])->toContain('gemini-3.5-flash:')->and($urls[2])->toContain('gemini-3.5-flash-lite:');
    });

    it('does not retry auth errors', function () {
        Http::fake(['*' => Http::response(['error' => ['message' => 'API key not valid']], 400)]);
        expect(fn () => collectEvents(geminiDriver()->stream(new ChatRequest('s', [ChatTurn::user('x')]))))
            ->toThrow(AiProviderException::class, 'API key not valid');
        Http::assertSentCount(1);
    });

    it('does not retry once output has been streamed', function () {
        Http::fake(['*' => Http::response(sse(
            ['candidates' => [['content' => ['parts' => [['text' => 'partial']]]]]],
            ['error' => ['code' => 503, 'message' => 'overloaded']],
        ))]);
        expect(fn () => collectEvents(geminiDriver()->stream(new ChatRequest('s', [ChatTurn::user('x')]))))
            ->toThrow(AiProviderException::class, 'overloaded');
    });

    it('requires an API key', function () {
        expect(fn () => collectEvents(geminiDriver(['api_key' => null])->stream(new ChatRequest('s', []))))
            ->toThrow(AiProviderException::class, 'GEMINI_API_KEY');
    });
});

describe('GeminiEmbeddingDriver', function () {
    $driver = fn () => new GeminiEmbeddingDriver(['api_key' => 'k', 'base_url' => 'https://gemini.test/v1beta', 'model' => 'gemini-embedding-2', 'batch' => 2, 'max_retries' => 2], 4);

    it('batches requests, sets task type and dimensionality, and normalises vectors', function () use ($driver) {
        Http::fake(['*' => Http::sequence()
            ->push(['embeddings' => [['values' => [3, 4, 0, 0]], ['values' => [0, 0, 0, 2]]]])
            ->push(['embeddings' => [['values' => [1, 0, 0, 0]]]]),
        ]);

        $vectors = $driver()->embedMany(['a', 'b', 'c'], EmbeddingTask::Document);

        expect($vectors)->toBe([[0.6, 0.8, 0.0, 0.0], [0.0, 0.0, 0.0, 1.0], [1.0, 0.0, 0.0, 0.0]]);
        Http::assertSentCount(2);
        Http::assertSent(fn (Request $r) => str_ends_with($r->url(), 'models/gemini-embedding-2:batchEmbedContents')
            && $r['requests'][0]['taskType'] === 'RETRIEVAL_DOCUMENT'
            && $r['requests'][0]['outputDimensionality'] === 4);
    });

    it('honours retryDelay on 429', function () use ($driver) {
        Http::fakeSequence()
            ->push(['error' => ['message' => 'quota', 'details' => [['retryDelay' => '7s']]]], 429)
            ->push(['embeddings' => [['values' => [1, 0, 0, 0]]]]);

        expect($driver()->embed('q'))->toBe([1.0, 0.0, 0.0, 0.0]);
        Sleep::assertSlept(fn ($duration) => (int) $duration->totalSeconds === 7);
    });

    it('gives up after max retries', function () use ($driver) {
        Http::fake(['*' => Http::response(['error' => ['message' => 'quota']], 429)]);
        expect(fn () => $driver()->embed('q'))->toThrow(AiProviderException::class);
    });

    it('rejects vectors of the wrong dimension', function () use ($driver) {
        Http::fake(['*' => Http::response(['embeddings' => [['values' => [1, 0]]]])]);

        expect(fn () => $driver()->embed('q'))->toThrow(AiProviderException::class, 'expects 4');
    });
});

describe('Ollama drivers', function () {
    it('streams NDJSON chat with tool calls', function () {
        Http::fake(['*' => Http::response(implode("\n", [
            json_encode(['message' => ['content' => 'Hi ']]),
            json_encode(['message' => ['content' => '', 'tool_calls' => [['function' => ['name' => 'navigate_to', 'arguments' => ['section_id' => 'order']]]]]]),
            json_encode(['done' => true, 'done_reason' => 'stop', 'prompt_eval_count' => 20, 'eval_count' => 5]),
        ]))]);

        $driver = new OllamaLlmDriver(['base_url' => 'http://ollama.test:11434', 'model' => 'qwen2.5:7b-instruct', 'timeout' => 10]);
        $events = collectEvents($driver->stream(new ChatRequest('SYS', [ChatTurn::user('x')], [new ToolDefinition('navigate_to', 'd', ['type' => 'object'])])));

        expect($events[0])->toEqual(new TextDelta('Hi '))
            ->and($events[1]->call->name)->toBe('navigate_to')
            ->and($events[1]->call->args)->toBe(['section_id' => 'order'])
            ->and($events[2])->toEqual(new TurnEnd(20, 5, 'tool_calls'));
        Http::assertSent(fn (Request $r) => $r['messages'][0] === ['role' => 'system', 'content' => 'SYS'] && $r['tools'][0]['type'] === 'function');
    });

    it('applies nomic task prefixes to embeddings', function () {
        Http::fake(['*' => Http::response(['embeddings' => [[0, 2, 0]]])]);

        $vector = (new OllamaEmbeddingDriver(['base_url' => 'http://ollama.test:11434', 'model' => 'nomic-embed-text', 'batch' => 8, 'task_prefixes' => true], 3))
            ->embed('hello', EmbeddingTask::Query);

        expect($vector)->toBe([0.0, 1.0, 0.0]);
        Http::assertSent(fn (Request $r) => $r['input'] === ['search_query: hello']);
    });
});

describe('Managers', function () {
    it('resolve drivers from configuration', function () {
        config(['ai.llm.default' => 'ollama', 'ai.embeddings.default' => 'fake']);

        expect(app(LlmManager::class)->driver())->toBeInstanceOf(OllamaLlmDriver::class)
            ->and(app(LlmManager::class)->driver('gemini'))->toBeInstanceOf(GeminiLlmDriver::class)
            ->and(app(EmbeddingManager::class)->driver())->toBeInstanceOf(FakeEmbeddingDriver::class)
            ->and(app(EmbeddingManager::class)->driver()->dimensions())->toBe(768);
    });

    it('fake embeddings place texts sharing words closer together', function () {
        $fake = new FakeEmbeddingDriver(768);
        $dot = fn ($a, $b) => array_sum(array_map(fn ($x, $y) => $x * $y, $a, $b));

        $q = $fake->embed('whatsapp automation price');
        expect($dot($q, $fake->embed('whatsapp automation pricing and price')))
            ->toBeGreaterThan($dot($q, $fake->embed('team members and their CVs')));
    });
});
