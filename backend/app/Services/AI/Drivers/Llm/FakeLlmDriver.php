<?php

namespace App\Services\AI\Drivers\Llm;

use App\Services\AI\Contracts\LlmDriver;
use App\Services\AI\Data\ChatRequest;
use App\Services\AI\Data\LlmEvent;
use App\Services\AI\Data\TextDelta;
use App\Services\AI\Data\TurnEnd;
use Generator;

/**
 * Deterministic driver for tests and offline development (LLM_DRIVER=fake).
 * Each stream() call replays the next scripted turn; requests are recorded for assertions.
 */
final class FakeLlmDriver implements LlmDriver
{
    /** @var list<list<LlmEvent>> */
    private static array $script = [];

    /** @var list<ChatRequest> */
    private static array $requests = [];

    /** @param list<LlmEvent> ...$turns one array of events per model turn */
    public static function script(array ...$turns): void
    {
        self::$script = array_values($turns);
        self::$requests = [];
    }

    /** @return list<ChatRequest> */
    public static function requests(): array
    {
        return self::$requests;
    }

    public static function reset(): void
    {
        self::$script = [];
        self::$requests = [];
    }

    public function name(): string
    {
        return 'fake/scripted';
    }

    public function stream(ChatRequest $request): Generator
    {
        self::$requests[] = $request;

        $events = array_shift(self::$script) ?? [
            new TextDelta('This is a fake response. Set LLM_DRIVER=gemini for real answers.'),
            new TurnEnd(10, 12),
        ];

        foreach ($events as $event) {
            yield $event;
        }
    }
}
