<?php

namespace App\Services\AI\Contracts;

use App\Services\AI\Data\ChatRequest;
use App\Services\AI\Data\LlmEvent;
use App\Services\AI\Exceptions\AiProviderException;
use Generator;

/**
 * Streams one model turn as provider-neutral events.
 * Implementations: Gemini (default), Ollama, Fake — selected by LLM_DRIVER.
 * Spec: docs/04_features/rag_and_ai_agent.md §1
 */
interface LlmDriver
{
    /**
     * @return Generator<int, LlmEvent>
     *
     * @throws AiProviderException
     */
    public function stream(ChatRequest $request): Generator;

    /** Provider-qualified model id, e.g. "gemini/gemini-3.8-flash". */
    public function name(): string;
}
