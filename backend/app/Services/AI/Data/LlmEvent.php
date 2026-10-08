<?php

namespace App\Services\AI\Data;

/**
 * Normalised streaming events yielded by every LlmDriver:
 *  - TextDelta      a chunk of visible answer text
 *  - ToolCallEvent  the model wants a tool executed
 *  - TurnEnd        the model finished this turn (with token usage when known)
 */
abstract readonly class LlmEvent {}
