<?php

namespace App\Services\AI\Tools;

/**
 * Outcome of a tool call:
 *  - forModel       what the LLM sees as the function response
 *  - clientActions  UI side-effects streamed to the browser as `action` events
 *  - summary        short, PII-free line for transcripts and the `tool_result` event
 */
final readonly class ToolResult
{
    /**
     * @param  array<string, mixed>  $forModel
     * @param  list<array{type: string, payload: array<string, mixed>}>  $clientActions
     */
    public function __construct(
        public bool $ok,
        public array $forModel,
        public string $summary,
        public array $clientActions = [],
    ) {}

    /** @param array<string, mixed> $details */
    public static function error(string $message, array $details = []): self
    {
        return new self(false, ['ok' => false, 'error' => $message, ...$details], $message);
    }
}
