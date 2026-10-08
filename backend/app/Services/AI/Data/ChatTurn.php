<?php

namespace App\Services\AI\Data;

/**
 * One provider-neutral conversation turn. Drivers translate these into their wire format.
 */
final readonly class ChatTurn
{
    public const USER = 'user';

    public const ASSISTANT = 'assistant';

    public const TOOL = 'tool';

    /**
     * @param  list<ToolCall>  $toolCalls  assistant turns only
     * @param  array<string, mixed>|null  $toolResult  tool turns only
     */
    private function __construct(
        public string $role,
        public ?string $text = null,
        public array $toolCalls = [],
        public ?ToolCall $respondsTo = null,
        public ?array $toolResult = null,
    ) {}

    public static function user(string $text): self
    {
        return new self(self::USER, $text);
    }

    /** @param list<ToolCall> $toolCalls */
    public static function assistant(?string $text, array $toolCalls = []): self
    {
        return new self(self::ASSISTANT, $text === '' ? null : $text, $toolCalls);
    }

    /** @param array<string, mixed> $result */
    public static function toolResult(ToolCall $call, array $result): self
    {
        return new self(self::TOOL, respondsTo: $call, toolResult: $result);
    }
}
