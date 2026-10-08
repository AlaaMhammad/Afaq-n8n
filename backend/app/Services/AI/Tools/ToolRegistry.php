<?php

namespace App\Services\AI\Tools;

use App\Services\AI\Contracts\Tool;
use App\Services\AI\Data\ToolCall;
use App\Services\AI\Data\ToolDefinition;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Validator;
use Throwable;

/**
 * Tool gate (docs/05_security/prompt_guard.md §5): allow-list, schema-shaped arguments,
 * Laravel validation, and failures reported back to the model instead of thrown.
 */
final class ToolRegistry
{
    /** @var array<string, Tool> */
    private array $tools = [];

    /** @param iterable<Tool> $tools */
    public function __construct(iterable $tools)
    {
        foreach ($tools as $tool) {
            $this->tools[$tool->name()] = $tool;
        }
    }

    /** @return list<ToolDefinition> */
    public function definitions(): array
    {
        return array_values(array_map(
            fn (Tool $tool) => new ToolDefinition($tool->name(), $tool->description(), $tool->parameters()),
            $this->tools,
        ));
    }

    public function execute(ToolCall $call, ToolContext $context): ToolResult
    {
        $tool = $this->tools[$call->name] ?? null;

        if (! $tool) {
            return ToolResult::error("Unknown tool \"{$call->name}\".");
        }

        // Only declared properties survive; anything else the model invented is dropped.
        $args = Arr::only($call->args, array_keys($tool->parameters()['properties'] ?? []));
        $validator = Validator::make($args, $tool->rules($context));

        if ($validator->fails()) {
            return ToolResult::error('Invalid arguments.', ['validation_errors' => $validator->errors()->toArray()]);
        }

        try {
            return $tool->execute($validator->validated(), $context);
        } catch (Throwable $e) {
            report($e);

            return ToolResult::error('The tool failed unexpectedly. Apologise and offer the booking form instead.');
        }
    }
}
