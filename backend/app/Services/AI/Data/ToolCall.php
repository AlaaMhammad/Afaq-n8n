<?php

namespace App\Services\AI\Data;

/**
 * A tool invocation requested by the model.
 *
 * `providerMeta` carries opaque provider state that must be echoed back verbatim on the
 * next request — e.g. Gemini 3 `thoughtSignature`, without which multi-step tool use fails.
 */
final readonly class ToolCall
{
    /**
     * @param  array<string, mixed>  $args
     * @param  array<string, mixed>  $providerMeta
     */
    public function __construct(
        public string $id,
        public string $name,
        public array $args,
        public array $providerMeta = [],
    ) {}
}
