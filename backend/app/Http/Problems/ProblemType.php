<?php

namespace App\Http\Problems;

/**
 * Error catalogue — docs/02_api_specs/error_handling.md §2
 */
enum ProblemType: string
{
    case BadRequest = 'bad-request';
    case Unauthenticated = 'unauthenticated';
    case Forbidden = 'forbidden';
    case NotFound = 'not-found';
    case MethodNotAllowed = 'method-not-allowed';
    case Conflict = 'conflict';
    case Validation = 'validation-error';
    case PromptRejected = 'prompt-rejected';
    case RateLimited = 'rate-limited';
    case Internal = 'internal-error';
    case AiProviderError = 'ai-provider-error';
    case ServiceUnavailable = 'service-unavailable';
    case AiTimeout = 'ai-timeout';

    public function status(): int
    {
        return match ($this) {
            self::BadRequest => 400,
            self::Unauthenticated => 401,
            self::Forbidden => 403,
            self::NotFound => 404,
            self::MethodNotAllowed => 405,
            self::Conflict => 409,
            self::Validation, self::PromptRejected => 422,
            self::RateLimited => 429,
            self::Internal => 500,
            self::AiProviderError => 502,
            self::ServiceUnavailable => 503,
            self::AiTimeout => 504,
        };
    }

    public function code(): string
    {
        return match ($this) {
            self::Validation => 'VALIDATION_FAILED',
            self::RateLimited => 'RATE_LIMITED',
            self::Internal => 'INTERNAL_ERROR',
            default => strtoupper(str_replace('-', '_', $this->value)),
        };
    }

    public function uri(): string
    {
        return 'https://afaqn8n.me/problems/'.$this->value;
    }

    public function title(): string
    {
        return match ($this) {
            self::BadRequest => __('The request is malformed'),
            self::Unauthenticated => __('Authentication required'),
            self::Forbidden => __('You are not allowed to do this'),
            self::NotFound => __('Resource not found'),
            self::MethodNotAllowed => __('Method not allowed'),
            self::Conflict => __('This request conflicts with an existing one'),
            self::Validation => __('The submitted data is invalid'),
            self::PromptRejected => __('This message cannot be processed'),
            self::RateLimited => __('Too many requests'),
            self::Internal => __('Something went wrong'),
            self::AiProviderError => __('The AI provider is unavailable'),
            self::ServiceUnavailable => __('Service temporarily unavailable'),
            self::AiTimeout => __('The assistant took too long to respond'),
        };
    }

    public static function fromStatus(int $status): self
    {
        foreach (self::cases() as $case) {
            if ($case->status() === $status && $case !== self::PromptRejected) {
                return $case;
            }
        }

        return $status >= 500 ? self::Internal : self::BadRequest;
    }
}
