<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Support\PublicApiCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Portfolio projects with their 3D workflow specifications. */
class ProjectController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = PublicApiCache::remember('projects', $request->query('translations') === 'all', fn () => ProjectResource::collection(
            Project::with('services')->orderBy('order')->get(),
        )->resolve($request));

        return response()->json(['data' => $data]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $data = PublicApiCache::remember("projects:{$slug}", $request->query('translations') === 'all', fn () => ProjectResource::make(
            Project::with('services')->where('slug', $slug)->firstOrFail(),
        )->resolve($request));

        return response()->json(['data' => $data]);
    }
}
