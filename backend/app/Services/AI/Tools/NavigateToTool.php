<?php

namespace App\Services\AI\Tools;

use App\Services\AI\Contracts\Tool;
use Illuminate\Validation\Rule;

/** Scrolls the visitor's page to a section (client-side action only). */
final class NavigateToTool implements Tool
{
    public const SECTIONS = ['hero', 'services', 'portfolio', 'team', 'order'];

    public function name(): string
    {
        return 'navigate_to';
    }

    public function description(): string
    {
        return 'Scroll the visitor\'s page to a section. Use when the user wants to see the services, the portfolio, the team, the order/booking form, or go back to the top (hero).';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'section_id' => ['type' => 'string', 'enum' => self::SECTIONS, 'description' => 'Target section of the page.'],
            ],
            'required' => ['section_id'],
        ];
    }

    public function rules(ToolContext $context): array
    {
        return ['section_id' => ['required', 'string', Rule::in(self::SECTIONS)]];
    }

    public function execute(array $args, ToolContext $context): ToolResult
    {
        return new ToolResult(
            ok: true,
            forModel: ['ok' => true, 'navigated_to' => $args['section_id']],
            summary: "Navigated to {$args['section_id']}",
            clientActions: [['type' => 'navigate_to', 'payload' => ['sectionId' => $args['section_id']]]],
        );
    }
}
