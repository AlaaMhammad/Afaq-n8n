<?php

namespace App\Services\AI\Tools;

use App\Domain\Inquiry\CreateServiceRequest;
use App\Domain\Inquiry\DuplicateInquiryException;
use App\Domain\Inquiry\Enums\BudgetRange;
use App\Domain\Inquiry\Enums\RequestSource;
use App\Domain\Inquiry\ServiceRequestData;
use App\Models\Service;
use App\Services\AI\Contracts\Tool;
use Closure;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rule;

/**
 * Files a service request on the visitor's behalf — the only tool with a server-side effect,
 * so it carries the strictest gate (docs/05_security/prompt_guard.md §5):
 *  - the email must be one the user actually typed in this conversation;
 *  - the user's latest message must be an explicit confirmation;
 *  - 3 inquiries per IP per day; a repeat within 10 minutes returns the existing reference.
 */
final class SubmitServiceInquiryTool implements Tool
{
    private const CONFIRMATION = '/\b(yes|yeah|yep|yup|confirm(ed)?|correct|go ahead|submit( it)?|sure|ok(ay)?|please do|that\'s right)\b|نعم|أكد|اكد|أؤكد|اؤكد|تمام|موافق|صحيح|أرسل|ارسل|اعتمد|ايوه|أيوه|إيه|اكيد|أكيد|تفضل/iu';

    public function __construct(private readonly CreateServiceRequest $createRequest) {}

    public function name(): string
    {
        return 'submit_service_inquiry';
    }

    public function description(): string
    {
        return 'Create a service request for the Afaq team. Call ONLY after you collected the user\'s name, email, the service they need and their budget range, showed them a summary, and they explicitly confirmed it.';
    }

    public function parameters(): array
    {
        return [
            'type' => 'object',
            'properties' => [
                'name' => ['type' => 'string', 'description' => 'Client full name.'],
                'email' => ['type' => 'string', 'description' => 'Client email address exactly as the user wrote it.'],
                'service_type' => ['type' => 'string', 'enum' => [...$this->serviceSlugs(), 'other'], 'description' => 'Service slug, or "other" if unsure.'],
                'budget' => ['type' => 'string', 'enum' => array_column(BudgetRange::cases(), 'value'), 'description' => 'Budget range in USD: lt_1k (<1k), 1k_5k, 5k_15k, 15k_50k, gt_50k (>50k).'],
                'notes' => ['type' => 'string', 'description' => 'Short summary of the user\'s requirements in their own words.'],
                'phone' => ['type' => 'string', 'description' => 'Optional phone number in international format.'],
                'company' => ['type' => 'string', 'description' => 'Optional company name.'],
            ],
            'required' => ['name', 'email', 'service_type', 'budget', 'notes'],
        ];
    }

    public function rules(ToolContext $context): array
    {
        return [
            'name' => ['required', 'string', 'min:2', 'max:120'],
            'email' => [
                'required', 'string', 'max:254', 'email:rfc',
                function (string $attribute, mixed $value, Closure $fail) use ($context) {
                    if (! in_array(mb_strtolower(trim((string) $value)), $context->userEmails, true)) {
                        $fail('The email must be one the user typed in this conversation. Ask the user for their email address.');
                    }
                },
            ],
            'service_type' => ['required', 'string', Rule::in([...$this->serviceSlugs(), 'other'])],
            'budget' => ['required', Rule::enum(BudgetRange::class)],
            'notes' => ['required', 'string', 'min:10', 'max:5000'],
            'phone' => ['nullable', 'string', 'regex:/^\+?[0-9٠-٩\s\-()]{8,20}$/u'],
            'company' => ['nullable', 'string', 'max:160'],
        ];
    }

    public function execute(array $args, ToolContext $context): ToolResult
    {
        if (! preg_match(self::CONFIRMATION, $context->latestUserMessage)) {
            return ToolResult::error('Not submitted: the user has not confirmed yet. Show them a summary (name, email, service, budget, notes) and ask them to confirm.');
        }

        $limiterKey = 'ai-inquiry:'.($context->ipAddress ?? $context->session->id);
        if (RateLimiter::tooManyAttempts($limiterKey, (int) config('ai.agent.inquiries_per_ip_per_day', 3))) {
            return ToolResult::error('Not submitted: daily request limit reached. Ask the user to use the booking form or email info@afaqn8n.me.');
        }

        try {
            $request = ($this->createRequest)(new ServiceRequestData(
                clientName: $args['name'],
                clientEmail: $args['email'],
                budget: BudgetRange::from($args['budget']),
                requirements: $args['notes'],
                source: RequestSource::AiAgent,
                locale: $context->locale,
                serviceSlug: $args['service_type'] === 'other' ? null : $args['service_type'],
                clientPhone: $args['phone'] ?? null,
                company: $args['company'] ?? null,
                chatSessionId: $context->session->id,
                ipAddress: $context->ipAddress,
            ));
        } catch (DuplicateInquiryException $e) {
            return new ToolResult(
                ok: true,
                forModel: ['ok' => true, 'already_submitted' => true, 'reference' => $e->existing->reference],
                summary: "Duplicate of {$e->existing->reference}",
            );
        }

        RateLimiter::hit($limiterKey, 86400);

        return new ToolResult(
            ok: true,
            forModel: ['ok' => true, 'reference' => $request->reference, 'estimate_usd' => $request->estimate, 'next_step' => 'The team replies within one business day.'],
            summary: "Inquiry {$request->reference} created",
            clientActions: [['type' => 'service_inquiry_submitted', 'payload' => ['reference' => $request->reference, 'serviceType' => $args['service_type']]]],
        );
    }

    /** @return list<string> */
    private function serviceSlugs(): array
    {
        return Service::orderBy('order')->pluck('slug')->all();
    }
}
