<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\ResolvesTranslations;
use App\Models\Service;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Service */
class ServiceResource extends JsonResource
{
    use ResolvesTranslations;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'title' => $this->translated($request, 'title'),
            'description' => $this->translated($request, 'description'),
            'icon' => $this->icon,
            'features' => array_map(fn (array $feature) => $this->localize($request, $feature), $this->features ?? []),
            'starting_price' => $this->starting_price,
            'order' => $this->order,
        ];
    }
}
