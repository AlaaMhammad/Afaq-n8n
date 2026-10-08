<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\AiChatRequest;
use App\Models\ChatSession;
use App\Services\AI\ChatOrchestrator;
use App\Services\AI\Exceptions\PromptRejectedException;
use App\Services\AI\PiiScrubber;
use App\Services\AI\PromptGuard;
use App\Services\AI\SseEmitter;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * POST /api/v1/ai/chat — streams one Afaq Copilot turn as Server-Sent Events.
 * Validation, prompt-guard blocks and throttling fail *before* the stream starts,
 * so they return normal problem+json responses with the proper status code.
 */
class AiChatController extends Controller
{
    public function __invoke(AiChatRequest $request, PromptGuard $guard, PiiScrubber $scrubber, ChatOrchestrator $orchestrator): StreamedResponse
    {
        $locale = $request->validated('locale');
        App::setLocale($locale);

        $message = $guard->sanitize($request->validated('message'));
        if ($message === '') {
            throw ValidationException::withMessages(['message' => __('validation.required', ['attribute' => 'message'])]);
        }

        $session = $this->resolveSession($request, $locale);

        try {
            $verdict = $guard->inspect($message);
        } catch (PromptRejectedException $e) {
            $session->messages()->create(['role' => 'user', 'content' => $scrubber->scrub($message), 'flagged' => true]);
            $session->forceFill(['last_activity_at' => now()])->save();

            throw $e;
        }

        $section = $request->validated('context.active_section');

        return response()->stream(
            fn () => $orchestrator->handle($session, $message, $locale, $section, $verdict['flagged'], $request, new SseEmitter),
            200,
            [
                'Content-Type' => 'text/event-stream; charset=utf-8',
                'Cache-Control' => 'no-cache, no-transform',
                'X-Accel-Buffering' => 'no',
                'Connection' => 'keep-alive',
            ],
        );
    }

    private function resolveSession(AiChatRequest $request, string $locale): ChatSession
    {
        $session = $request->validated('session_id')
            ? ChatSession::find($request->validated('session_id'))
            : null;

        $session ??= ChatSession::create([
            'ip_hash' => hash('sha256', $request->ip().config('app.key')),
            'user_agent' => Str::limit((string) $request->userAgent(), 500, ''),
        ]);

        $session->forceFill(['locale' => $locale, 'last_activity_at' => now()])->save();

        return $session;
    }
}
