<?php

namespace App\Services\AI\Data;

final readonly class ChatRequest
{
    /**
     * @param  list<ChatTurn>  $turns
     * @param  list<ToolDefinition>  $tools
     */
    public function __construct(
        public string $system,
        public array $turns,
        public array $tools = [],
        public float $temperature = 0.4,
        public int $maxOutputTokens = 1024,
    ) {}
}
