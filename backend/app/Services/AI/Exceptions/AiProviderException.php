<?php

namespace App\Services\AI\Exceptions;

use RuntimeException;

/** The LLM / embedding provider failed after retries (maps to 502 AI_PROVIDER_ERROR). */
class AiProviderException extends RuntimeException
{
    public static function fromResponse(string $provider, int $status, ?string $message): self
    {
        return new self(sprintf('%s request failed (HTTP %d): %s', $provider, $status, $message ?? 'no details'), $status);
    }

    /** Rate limits and overload/5xx are worth retrying; auth and validation errors are not. */
    public function isRetryable(): bool
    {
        return in_array($this->getCode(), [408, 429, 500, 502, 503, 504], true);
    }
}
