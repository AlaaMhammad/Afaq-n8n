<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/v1/ai/sessions/{uuid}/messages — rehydrates the Copilot widget.
 * The unguessable session UUID acts as the capability; transcripts are already PII-scrubbed.
 */
class AiSessionController extends Controller
{
    public function messages(ChatSession $chatSession): JsonResponse
    {
        $messages = $chatSession->messages()
            ->whereIn('role', ['user', 'assistant'])
            ->reorder('id', 'desc')
            ->limit(50)
            ->get()
            ->reverse()
            ->values()
            ->map(fn (ChatMessage $m) => [
                'id' => $m->id,
                'role' => $m->role,
                'content' => $m->content,
                'tools' => collect($m->tool_calls ?? [])->pluck('name')->all(),
                'created_at' => $m->created_at->toIso8601String(),
            ]);

        return response()->json(['data' => $messages, 'meta' => ['session_id' => $chatSession->id, 'locale' => $chatSession->locale]]);
    }
}
