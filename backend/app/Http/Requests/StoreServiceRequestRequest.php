<?php

namespace App\Http\Requests;

use App\Domain\Inquiry\Enums\BudgetRange;
use App\Domain\Inquiry\Enums\RequestSource;
use App\Domain\Inquiry\Enums\Timeline;
use App\Domain\Inquiry\ServiceRequestData;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** POST /api/v1/service-requests — docs/02_api_specs/endpoints.md §3.4 */
class StoreServiceRequestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'client_name' => ['required', 'string', 'min:2', 'max:120'],
            'client_email' => ['required', 'string', 'max:254', app()->environment('testing', 'local') ? 'email:rfc' : 'email:rfc,dns'],
            'client_phone' => ['nullable', 'string', 'regex:/^\+?[0-9٠-٩\s\-()]{8,20}$/u'],
            'company' => ['nullable', 'string', 'max:160'],
            'service_slug' => ['nullable', 'string', Rule::exists('services', 'slug')],
            'budget_range' => ['required', Rule::enum(BudgetRange::class)],
            'timeline' => ['nullable', Rule::enum(Timeline::class)],
            'complexity' => ['nullable', 'integer', 'between:1,5'],
            'requirements' => ['required', 'string', 'min:20', 'max:5000'],
            'locale' => ['nullable', Rule::in(['ar', 'en'])],
            'consent' => ['accepted'],
            'utm' => ['nullable', 'array:source,medium,campaign'],
            'utm.*' => ['nullable', 'string', 'max:80'],
            'website' => ['nullable', 'string', 'max:255'], // honeypot — must stay empty
        ];
    }

    public function isSpam(): bool
    {
        return filled($this->input('website'));
    }

    public function toData(): ServiceRequestData
    {
        return new ServiceRequestData(
            clientName: $this->validated('client_name'),
            clientEmail: $this->validated('client_email'),
            budget: BudgetRange::from($this->validated('budget_range')),
            requirements: $this->validated('requirements'),
            source: RequestSource::WebForm,
            locale: $this->validated('locale') ?? app()->getLocale(),
            serviceSlug: $this->validated('service_slug'),
            clientPhone: $this->validated('client_phone'),
            company: $this->validated('company'),
            timeline: ($timeline = $this->validated('timeline')) ? Timeline::from($timeline) : null,
            complexity: $this->validated('complexity'),
            ipAddress: $this->ip(),
            utm: $this->validated('utm'),
        );
    }
}
