<?php

/*
|--------------------------------------------------------------------------
| AI drivers (LLM + embeddings)
|--------------------------------------------------------------------------
|
| Adapter/Driver pattern: the active driver is chosen by LLM_DRIVER and
| EMBEDDING_DRIVER. Implementations live in app/Services/AI/Drivers and are
| resolved by AiManager (Phase 3). The embedding dimension must match the
| knowledge_documents.embedding vector(768) column.
|
| Spec: docs/04_features/rag_and_ai_agent.md
|
*/

return [

    'llm' => [
        'default' => env('LLM_DRIVER', 'gemini'),

        'drivers' => [
            'gemini' => [
                'api_key' => env('GEMINI_API_KEY'),
                'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),
                'model' => env('GEMINI_CHAT_MODEL', 'gemini-3.5-flash'),
                // Gemini 3 reasoning depth: low keeps chat latency down ("minimal" is not supported by Gemini 3 flash models)
                'thinking_level' => env('GEMINI_THINKING_LEVEL', 'low'),
                // Used when the primary model is overloaded (503) or rate-limited (429) after a retry
                'fallback_model' => env('GEMINI_FALLBACK_MODEL', 'gemini-3.5-flash-lite'),
                'timeout' => 60,
            ],

            'ollama' => [
                'base_url' => env('OLLAMA_BASE_URL', 'http://host.docker.internal:11434'),
                'model' => env('OLLAMA_CHAT_MODEL', 'qwen2.5:7b-instruct'),
                'timeout' => 120,
            ],

            'fake' => [],
        ],
    ],

    'embeddings' => [
        'default' => env('EMBEDDING_DRIVER', 'gemini'),
        'dimensions' => (int) env('EMBEDDING_DIMENSIONS', 768),

        'drivers' => [
            'gemini' => [
                'api_key' => env('GEMINI_API_KEY'),
                'base_url' => env('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com/v1beta'),
                'model' => env('EMBEDDING_MODEL', 'gemini-embedding-2'),
                'batch' => 100,
                'max_retries' => 5,
            ],

            'ollama' => [
                'base_url' => env('OLLAMA_BASE_URL', 'http://host.docker.internal:11434'),
                'model' => env('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text'),
                'batch' => 32,
                // nomic-embed-text expects task prefixes ("search_query: " / "search_document: ")
                'task_prefixes' => (bool) env('OLLAMA_EMBEDDING_TASK_PREFIXES', true),
            ],

            'fake' => [],
        ],
    ],

    'rag' => [
        'top_k' => 5,
        // Calibrated on gemini-embedding-2 @768: relevant top hits 0.64–0.89, off-topic ≤ 0.57
        'min_score' => (float) env('RAG_MIN_SCORE', 0.60),
        'chunk_tokens' => 350,
        'overlap' => 50,
    ],

    'agent' => [
        'max_tool_iterations' => 4,
        'history_window' => 12,
        'max_seconds' => 60,
        'temperature' => 0.4,
        'max_output_tokens' => 1024,
        // submit_service_inquiry limits
        'inquiries_per_ip_per_day' => 3,
        'inquiry_dedupe_minutes' => 10,
    ],

    'n8n' => [
        'webhook_url' => env('N8N_WEBHOOK_URL'),
        'webhook_secret' => env('N8N_WEBHOOK_SECRET'),
        'timeout' => 15,
    ],

];
