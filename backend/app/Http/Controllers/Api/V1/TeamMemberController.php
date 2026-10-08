<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\TeamMemberResource;
use App\Models\TeamMember;
use App\Support\PublicApiCache;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TeamMemberController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = PublicApiCache::remember('team', $request->query('translations') === 'all', fn () => TeamMemberResource::collection(
            TeamMember::active()->orderBy('order')->get(),
        )->resolve($request));

        return response()->json(['data' => $data]);
    }

    /** Inline PDF preview, or a download with `?download=1`; external CV URLs redirect. */
    public function cv(Request $request, TeamMember $teamMember): StreamedResponse|RedirectResponse
    {
        abort_unless($teamMember->is_active && filled($teamMember->cv_url), 404);

        if (Str::startsWith($teamMember->cv_url, ['http://', 'https://'])) {
            return redirect()->away($teamMember->cv_url);
        }

        $disk = Storage::disk(config('afaq.media.disk'));
        abort_unless($disk->exists($teamMember->cv_url), 404);

        return $disk->response(
            $teamMember->cv_url,
            Str::slug($teamMember->getTranslation('name', 'en')).'-cv.pdf',
            [
                'Content-Type' => 'application/pdf',
                'X-Content-Type-Options' => 'nosniff',
                'Cache-Control' => 'public, max-age=3600',
            ],
            $request->boolean('download') ? 'attachment' : 'inline',
        );
    }
}
