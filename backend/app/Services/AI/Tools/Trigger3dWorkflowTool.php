<?php

namespace App\Services\AI\Tools;

use App\Models\Project;
use App\Services\AI\Contracts\Tool;
use Illuminate\Validation\Rule;

/** Shows a portfolio workflow in the 3D viewer, assembled or exploded (client-side action). */
final class Trigger3dWorkflowTool implements Tool
{
    public const MODES = ['assembled', 'exploded'];

    public function name(): string
    {
        return 'trigger_3d_workflow';
    }

    public function description(): string
    {
        return 'Show one of the portfolio projects\' automation workflows in the interactive 3D viewer, either assembled or exploded (nodes pulled apart to reveal each step). Use when the user asks to see, explore, open, explode or assemble a project.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'project_slug' => ['type' => 'string', 'enum' => $this->slugs(), 'description' => 'Slug of the portfolio project.'],
                'mode' => ['type' => 'string', 'enum' => self::MODES, 'description' => 'assembled = normal view, exploded = nodes pulled apart.'],
            ],
            'required' => ['project_slug', 'mode'],
        ];
    }

    public function rules(ToolContext $context): array
    {
        return [
            'project_slug' => ['required', 'string', Rule::exists('projects', 'slug')],
            'mode' => ['required', Rule::in(self::MODES)],
        ];
    }

    public function execute(array $args, ToolContext $context): ToolResult
    {
        $project = Project::where('slug', $args['project_slug'])->firstOrFail();
        $nodes = collect($project->workflow_metadata['nodes'] ?? [])
            ->map(fn (array $node) => $node['label'][$context->locale] ?? $node['label']['en'] ?? $node['id'])
            ->all();

        return new ToolResult(
            ok: true,
            forModel: [
                'ok' => true,
                'project_title' => $project->getTranslation('title', $context->locale),
                'mode' => $args['mode'],
                'nodes_in_order' => $nodes,
                'metrics' => $project->metrics,
            ],
            summary: "Showed {$project->slug} ({$args['mode']})",
            clientActions: [['type' => 'trigger_3d_workflow', 'payload' => ['projectSlug' => $project->slug, 'mode' => $args['mode']]]],
        );
    }

    /** @return list<string> */
    private function slugs(): array
    {
        return Project::orderBy('order')->pluck('slug')->all();
    }
}
