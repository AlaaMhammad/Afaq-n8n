<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\ResolvesTranslations;
use App\Models\Project;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * A portfolio case study including its 3D workflow specification
 * (schema: docs/01_architecture/database_schema.md §4.1), labels resolved to the request locale.
 *
 * @mixin Project
 */
class ProjectResource extends JsonResource
{
    use ResolvesTranslations;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        $workflow = $this->workflow_metadata ?? [];

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->translated($request, 'title'),
            'client' => $this->client,
            'summary' => $this->translated($request, 'summary'),
            'metrics' => $this->metrics,
            'workflow' => [
                'version' => $workflow['version'] ?? 1,
                'camera' => $workflow['camera'] ?? null,
                'nodes' => array_map(fn (array $node) => [
                    ...$node,
                    'label' => $this->localize($request, $node['label'] ?? null),
                ], $workflow['nodes'] ?? []),
                'edges' => array_map(fn (array $edge) => array_filter([
                    ...$edge,
                    'label' => $this->localize($request, $edge['label'] ?? null),
                ], fn ($v) => $v !== null), $workflow['edges'] ?? []),
            ],
            'services' => $this->whenLoaded('services', fn () => $this->services->map(fn (Service $service) => [
                'slug' => $service->slug,
                'title' => $this->wantsAllTranslations($request) ? $service->getTranslations('title') : $service->title,
            ])->values()),
            'live_url' => $this->live_url,
            'cover_url' => $this->cover_path ? Storage::disk(config('afaq.media.disk'))->url($this->cover_path) : null,
            'is_featured' => $this->is_featured,
            'order' => $this->order,
        ];
    }
}
