<?php

namespace App\Services\AI\Contracts;

use App\Services\AI\Tools\ToolContext;
use App\Services\AI\Tools\ToolResult;

/**
 * A capability the agent may invoke. Arguments are validated against rules() by the
 * ToolRegistry before execute() runs — tools never see unvalidated model output.
 */
interface Tool
{
    public function name(): string;

    public function description(): string;

    /** @return array<string, mixed> JSON Schema for the arguments (type: object) */
    public function parameters(): array;

    /** @return array<string, mixed> Laravel validation rules for the arguments */
    public function rules(ToolContext $context): array;

    /** @param array<string, mixed> $args validated arguments */
    public function execute(array $args, ToolContext $context): ToolResult;
}
