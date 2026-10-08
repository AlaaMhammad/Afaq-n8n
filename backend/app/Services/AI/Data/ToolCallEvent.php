<?php

namespace App\Services\AI\Data;

final readonly class ToolCallEvent extends LlmEvent
{
    public function __construct(public ToolCall $call) {}
}
