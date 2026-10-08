<?php

namespace App\Services\AI\Data;

final readonly class TextDelta extends LlmEvent
{
    public function __construct(public string $text) {}
}
