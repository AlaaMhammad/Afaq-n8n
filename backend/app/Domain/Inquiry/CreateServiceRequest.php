<?php

namespace App\Domain\Inquiry;

use App\Jobs\NotifyN8nOfInquiry;
use App\Models\Service;
use App\Models\ServiceRequest;
use Illuminate\Support\Facades\DB;

/**
 * The single way a lead enters the system (web form, AI agent): dedupe, normalise contact
 * details, attach an indicative estimate and a reference, persist, then notify n8n after commit.
 * Spec: docs/04_features/service_request.md §4
 */
final class CreateServiceRequest
{
    public function __construct(
        private readonly EstimateCalculator $estimates,
        private readonly ReferenceGenerator $references,
    ) {}

    /** @throws DuplicateInquiryException */
    public function __invoke(ServiceRequestData $data): ServiceRequest
    {
        $email = mb_strtolower(trim($data->clientEmail));
        $service = $data->serviceSlug ? Service::firstWhere('slug', $data->serviceSlug) : null;

        $duplicate = ServiceRequest::where('client_email', $email)
            ->where('service_id', $service?->id)
            ->where('created_at', '>=', now()->subMinutes((int) config('ai.agent.inquiry_dedupe_minutes', 10)))
            ->latest()
            ->first();

        if ($duplicate) {
            throw new DuplicateInquiryException($duplicate);
        }

        $request = DB::transaction(fn () => ServiceRequest::create([
            'reference' => $this->references->generate(),
            'client_name' => trim($data->clientName),
            'client_email' => $email,
            'client_phone' => self::normalizePhone($data->clientPhone),
            'company' => $data->company ? trim($data->company) : null,
            'service_id' => $service?->id,
            'chat_session_id' => $data->chatSessionId,
            'budget_range' => $data->budget,
            'timeline' => $data->timeline,
            'requirements' => trim($data->requirements),
            'status' => 'new',
            'source' => $data->source,
            'estimate' => $this->estimates->estimate($service, $data->timeline, $data->complexity),
            'metadata' => array_filter([
                'locale' => $data->locale,
                'complexity' => $data->complexity,
                'utm' => $data->utm,
                'ip_hash' => $data->ipAddress ? hash('sha256', $data->ipAddress.config('app.key')) : null,
                'n8n' => ['notified_at' => null, 'attempts' => 0],
            ], fn ($v) => $v !== null),
        ]));

        NotifyN8nOfInquiry::dispatch($request->id)->afterCommit();

        return $request;
    }

    /** E.164-ish: Arabic-Indic digits → Latin, strip formatting, 00 → +, Saudi 05x → +9665x. */
    public static function normalizePhone(?string $phone): ?string
    {
        if (blank($phone)) {
            return null;
        }

        $phone = strtr($phone, ['٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9']);
        $digits = preg_replace('/[^\d+]/', '', $phone);

        return match (true) {
            str_starts_with($digits, '+') => '+'.ltrim($digits, '+'),
            str_starts_with($digits, '00') => '+'.substr($digits, 2),
            (bool) preg_match('/^05\d{8}$/', $digits) => '+966'.substr($digits, 1),
            default => '+'.$digits,
        };
    }
}
