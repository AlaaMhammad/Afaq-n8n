<?php

namespace App\Http\Problems;

use App\Domain\Inquiry\DuplicateInquiryException;
use App\Services\AI\Exceptions\AiProviderException;
use App\Services\AI\Exceptions\AiTimeoutException;
use App\Services\AI\Exceptions\PromptRejectedException;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Http\Exceptions\ThrottleRequestsException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Turns any exception into an RFC 7807 `application/problem+json` body.
 * Used by the exception handler for /api/* and by the SSE stream's `error` event.
 * Spec: docs/02_api_specs/error_handling.md
 */
final class ProblemRenderer
{
    public function render(Throwable $e, Request $request): JsonResponse
    {
        $problem = $this->toArray($e, $request);
        $headers = $e instanceof HttpExceptionInterface ? $e->getHeaders() : [];

        return response()
            ->json($problem, $problem['status'], $headers, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
            ->header('Content-Type', 'application/problem+json');
    }

    /** @return array<string, mixed> */
    public function toArray(Throwable $e, Request $request): array
    {
        $type = $this->typeFor($e);

        $problem = [
            'type' => $type->uri(),
            'title' => $type->title(),
            'status' => $type->status(),
            'detail' => $this->detail($e, $type),
            'instance' => '/'.ltrim($request->path(), '/'),
            'code' => $type->code(),
            'request_id' => $request->headers->get('X-Request-Id'),
        ];

        if ($e instanceof ValidationException) {
            $problem['errors'] = $e->errors();
        }
        if ($e instanceof ThrottleRequestsException) {
            $problem['retry_after'] = (int) ($e->getHeaders()['Retry-After'] ?? 60);
        }
        if ($e instanceof DuplicateInquiryException) {
            $problem['reference'] = $e->existing->reference;
        }

        return array_filter($problem, fn ($v) => $v !== null);
    }

    private function typeFor(Throwable $e): ProblemType
    {
        return match (true) {
            $e instanceof ValidationException => ProblemType::Validation,
            $e instanceof PromptRejectedException => ProblemType::PromptRejected,
            $e instanceof AiTimeoutException => ProblemType::AiTimeout,
            $e instanceof AiProviderException => ProblemType::AiProviderError,
            $e instanceof DuplicateInquiryException => ProblemType::Conflict,
            $e instanceof AuthenticationException => ProblemType::Unauthenticated,
            $e instanceof AuthorizationException => ProblemType::Forbidden,
            $e instanceof ModelNotFoundException => ProblemType::NotFound,
            $e instanceof ThrottleRequestsException => ProblemType::RateLimited,
            $e instanceof HttpExceptionInterface => ProblemType::fromStatus($e->getStatusCode()),
            default => ProblemType::Internal,
        };
    }

    private function detail(Throwable $e, ProblemType $type): ?string
    {
        return match ($type) {
            ProblemType::Validation => trans_choice(':count field needs attention.|:count fields need attention.', count($e->errors()), ['count' => count($e->errors())]),
            ProblemType::Internal, ProblemType::AiProviderError => config('app.debug') ? $e->getMessage() : null,
            ProblemType::PromptRejected => __('Please rephrase your question about our automation services.'),
            ProblemType::RateLimited => __('Please wait a moment before trying again.'),
            default => $e->getMessage() !== '' && ! $e instanceof HttpExceptionInterface ? $e->getMessage() : null,
        };
    }
}
