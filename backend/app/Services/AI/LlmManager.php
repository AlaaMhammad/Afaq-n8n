<?php

namespace App\Services\AI;

use App\Services\AI\Contracts\LlmDriver;
use App\Services\AI\Drivers\Llm\FakeLlmDriver;
use App\Services\AI\Drivers\Llm\GeminiLlmDriver;
use App\Services\AI\Drivers\Llm\OllamaLlmDriver;
use Illuminate\Support\Manager;

/**
 * Resolves the chat model driver from config('ai.llm') — `LLM_DRIVER=gemini|ollama|fake`.
 *
 * @method LlmDriver driver(?string $driver = null)
 */
class LlmManager extends Manager
{
    public function getDefaultDriver(): string
    {
        return $this->config->get('ai.llm.default', 'gemini');
    }

    protected function createGeminiDriver(): LlmDriver
    {
        return new GeminiLlmDriver($this->config->get('ai.llm.drivers.gemini'));
    }

    protected function createOllamaDriver(): LlmDriver
    {
        return new OllamaLlmDriver($this->config->get('ai.llm.drivers.ollama'));
    }

    protected function createFakeDriver(): LlmDriver
    {
        return new FakeLlmDriver;
    }
}
