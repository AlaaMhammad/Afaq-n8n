<?php

namespace App\Http\Requests;

use App\Services\AI\Tools\NavigateToTool;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** POST /api/v1/ai/chat — docs/02_api_specs/endpoints.md §4 */
class AiChatRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'session_id' => ['nullable', 'uuid'],
            'message' => ['required', 'string', 'min:1', 'max:2000'],
            'locale' => ['required', Rule::in(['ar', 'en'])],
            'context' => ['nullable', 'array'],
            'context.active_section' => ['nullable', Rule::in(NavigateToTool::SECTIONS)],
        ];
    }
}
