<?php

namespace App\Domain\Inquiry;

use App\Domain\Inquiry\Enums\BudgetRange;
use App\Domain\Inquiry\Enums\RequestSource;
use App\Domain\Inquiry\Enums\Timeline;

/**
 * Validated input for CreateServiceRequest — built by the web form request or the AI tool.
 */
final readonly class ServiceRequestData
{
    public function __construct(
        public string $clientName,
        public string $clientEmail,
        public BudgetRange $budget,
        public string $requirements,
        public RequestSource $source,
        public string $locale = 'ar',
        public ?string $serviceSlug = null,
        public ?string $clientPhone = null,
        public ?string $company = null,
        public ?Timeline $timeline = null,
        public ?int $complexity = null,
        public ?string $chatSessionId = null,
        public ?string $ipAddress = null,
        /** @var array<string, string>|null */
        public ?array $utm = null,
    ) {}
}
