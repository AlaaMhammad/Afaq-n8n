<?php

namespace App\Domain\Inquiry;

use App\Models\ServiceRequest;
use RuntimeException;

/** Same email + service submitted again within the dedupe window (maps to 409 CONFLICT). */
class DuplicateInquiryException extends RuntimeException
{
    public function __construct(public readonly ServiceRequest $existing)
    {
        parent::__construct("A matching request ({$existing->reference}) was submitted moments ago.");
    }
}
