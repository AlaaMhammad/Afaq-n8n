<?php

namespace App\Services\AI\Data;

final readonly class TurnEnd extends LlmEvent
{
    public function __construct(
        public ?int $inputTokens = null,
        public ?int $outputTokens = null,
        public string $finishReason = 'stop',
    ) {}

    /** @return array{input: int|null, output: int|null} */
    public function usage(): array
    {
        return ['input' => $this->inputTokens, 'output' => $this->outputTokens];
    }
}
