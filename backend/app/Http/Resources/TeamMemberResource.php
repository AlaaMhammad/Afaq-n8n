<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\ResolvesTranslations;
use App\Models\TeamMember;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin TeamMember */
class TeamMemberResource extends JsonResource
{
    use ResolvesTranslations;

    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->translated($request, 'name'),
            'role' => $this->translated($request, 'role'),
            'bio' => $this->translated($request, 'bio'),
            'avatar_url' => $this->avatarUrl(),
            'cv' => $this->cv_url ? [
                'preview_url' => route('api.v1.team.cv', $this->resource),
                'download_url' => route('api.v1.team.cv', [$this->resource, 'download' => 1]),
            ] : null,
            'skills' => $this->skills ?? [],
            'social_links' => (object) ($this->social_links ?? []),
            'order' => $this->order,
        ];
    }
}
