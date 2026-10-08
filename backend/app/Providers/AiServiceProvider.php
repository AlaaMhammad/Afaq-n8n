<?php

namespace App\Providers;

use App\Services\AI\Contracts\EmbeddingDriver;
use App\Services\AI\Contracts\LlmDriver;
use App\Services\AI\EmbeddingManager;
use App\Services\AI\LlmManager;
use App\Services\AI\Tools\NavigateToTool;
use App\Services\AI\Tools\SubmitServiceInquiryTool;
use App\Services\AI\Tools\ToolRegistry;
use App\Services\AI\Tools\Trigger3dWorkflowTool;
use Illuminate\Support\ServiceProvider;

/**
 * Wires the AI layer: drivers are resolved from config/ai.php, so switching Gemini ↔ Ollama
 * is a .env change (LLM_DRIVER / EMBEDDING_DRIVER) followed by `rag:index-knowledge --force`.
 */
class AiServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(LlmManager::class);
        $this->app->singleton(EmbeddingManager::class);

        $this->app->bind(LlmDriver::class, fn ($app) => $app->make(LlmManager::class)->driver());
        $this->app->bind(EmbeddingDriver::class, fn ($app) => $app->make(EmbeddingManager::class)->driver());

        $this->app->singleton(ToolRegistry::class, fn ($app) => new ToolRegistry([
            $app->make(NavigateToTool::class),
            $app->make(Trigger3dWorkflowTool::class),
            $app->make(SubmitServiceInquiryTool::class),
        ]));
    }
}
