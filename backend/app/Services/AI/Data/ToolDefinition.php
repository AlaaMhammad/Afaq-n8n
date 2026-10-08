<?php

namespace App\Services\AI\Data;

final readonly class ToolDefinition
{
    /**
     * @param  array<string, mixed>  $parameters  JSON Schema (object)
     */
    public function __construct(
        public string $name,
        public string $description,
        public array $parameters,
    ) {}
}
