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
                'model' => env('GEMINI_CHAT_MODEL', 'gemini-2.5-flash'),
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
                'model' => env('EMBEDDING_MODEL', 'text-embedding-004'),
                'batch' => 100,
            ],

            'ollama' => [
                'base_url' => env('OLLAMA_BASE_URL', 'http://host.docker.internal:11434'),
                'model' => env('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text'),
                'batch' => 32,
            ],

            'fake' => [],
        ],
    ],

    'rag' => [
        'top_k' => 5,
        'min_score' => 0.55,
        'chunk_tokens' => 350,
        'overlap' => 50,
    ],

    'agent' => [
        'max_tool_iterations' => 4,
        'history_window' => 12,
        'max_seconds' => 60,
    ],

    'n8n' => [
        'webhook_url' => env('N8N_WEBHOOK_URL'),
        'webhook_secret' => env('N8N_WEBHOOK_SECRET'),
    ],

];
