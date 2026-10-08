<?php

namespace App\Domain\Inquiry;

use App\Models\ServiceRequest;
use RuntimeException;

/**
 * Human-friendly, unambiguous request references: AFQ-7K2M9P (Crockford base32 alphabet).
 */
final class ReferenceGenerator
{
    private const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

    private const LENGTH = 6;

    public function generate(): string
    {
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $reference = 'AFQ-'.$this->randomCode();

            if (! ServiceRequest::withTrashed()->where('reference', $reference)->exists()) {
                return $reference;
            }
        }

        throw new RuntimeException('Unable to generate a unique service request reference.');
    }

    private function randomCode(): string
    {
        $code = '';
        $max = strlen(self::ALPHABET) - 1;

        for ($i = 0; $i < self::LENGTH; $i++) {
            $code .= self::ALPHABET[random_int(0, $max)];
        }

        return $code;
    }
}
