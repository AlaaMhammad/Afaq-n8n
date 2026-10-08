<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use App\Support\PublicApiCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = PublicApiCache::remember('services', $request->query('translations') === 'all', fn () => ServiceResource::collection(
            Service::orderBy('order')->get(),
        )->resolve($request));

        return response()->json(['data' => $data]);
    }

    public function show(Request $request, string $slug): JsonResponse
    {
        $data = PublicApiCache::remember("services:{$slug}", $request->query('translations') === 'all', fn () => ServiceResource::make(
            Service::where('slug', $slug)->firstOrFail(),
        )->resolve($request));

        return response()->json(['data' => $data]);
    }
}
