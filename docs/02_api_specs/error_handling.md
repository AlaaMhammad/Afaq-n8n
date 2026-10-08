# Error Handling — RFC 7807 Problem Details

Every non-2xx response from `/api/*` uses `Content-Type: application/problem+json` and the structure defined by [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) (compatible with its successor RFC 9457).

## 1. Shape

```ts
interface ProblemDetails {
  type: string;        // URI identifying the problem type, e.g. "https://afaqn8n.me/problems/validation-error"
  title: string;       // short, human-readable, localized
  status: number;      // HTTP status code
  detail?: string;     // human-readable explanation for this occurrence, localized
  instance?: string;   // request path, e.g. "/api/v1/service-requests"
  // extension members
  code: string;        // stable machine code, e.g. "VALIDATION_FAILED"
  request_id: string;  // mirrors X-Request-Id
  errors?: Record<string, string[]>;   // validation only
  retry_after?: number;                // throttling only (seconds)
}
```

Example — validation:

```json
{
  "type": "https://afaqn8n.me/problems/validation-error",
  "title": "البيانات المدخلة غير صالحة",
  "status": 422,
  "detail": "حقلان يحتاجان إلى تصحيح.",
  "instance": "/api/v1/service-requests",
  "code": "VALIDATION_FAILED",
  "request_id": "01J9Z6Q4X8R2...",
  "errors": {
    "client_email": ["صيغة البريد الإلكتروني غير صحيحة."],
    "requirements": ["يجب ألا يقل الوصف عن 20 حرفاً."]
  }
}
```

## 2. Error catalogue

| HTTP | `code` | `type` suffix | Trigger |
|------|--------|---------------|---------|
| 400 | `BAD_REQUEST` | `bad-request` | Malformed JSON, wrong content type |
| 401 | `UNAUTHENTICATED` | `unauthenticated` | Missing/invalid Sanctum token |
| 403 | `FORBIDDEN` | `forbidden` | Policy / ability denied |
| 404 | `NOT_FOUND` | `not-found` | `ModelNotFoundException`, unknown route |
| 405 | `METHOD_NOT_ALLOWED` | `method-not-allowed` | |
| 409 | `CONFLICT` | `conflict` | Duplicate inquiry within 10 min (same email + service) |
| 413 | `PAYLOAD_TOO_LARGE` | `payload-too-large` | Upload > limit |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | `unsupported-media-type` | CV not PDF |
| 422 | `VALIDATION_FAILED` | `validation-error` | `ValidationException` |
| 422 | `PROMPT_REJECTED` | `prompt-rejected` | PromptGuard blocked the message |
| 429 | `RATE_LIMITED` | `rate-limited` | `ThrottleRequestsException` (+ `retry_after`) |
| 500 | `INTERNAL_ERROR` | `internal-error` | Unhandled — `detail` hidden unless `APP_DEBUG` |
| 502 | `AI_PROVIDER_ERROR` | `ai-provider-error` | LLM/embedding driver failed after retries |
| 503 | `SERVICE_UNAVAILABLE` | `service-unavailable` | Maintenance mode, health check failing |
| 504 | `AI_TIMEOUT` | `ai-timeout` | AI turn exceeded 60 s |

`title` and `detail` are translated via `lang/{ar,en}/problems.php`.

## 3. Implementation (Laravel 12)

Laravel 12 configures exceptions in `bootstrap/app.php`. A single renderer converts any `Throwable` to a problem for API requests:

```php
// bootstrap/app.php
->withExceptions(function (Exceptions $exceptions) {
    $exceptions->shouldRenderJsonWhen(fn (Request $r) => $r->is('api/*') || $r->expectsJson());

    $exceptions->render(function (Throwable $e, Request $request) {
        if (! $request->is('api/*')) {
            return null; // fall back to default (Filament / web)
        }
        return app(\App\Http\Problems\ProblemRenderer::class)->render($e, $request);
    });
})
```

```php
// app/Http/Problems/ProblemRenderer.php
final class ProblemRenderer
{
    /** @var array<class-string<Throwable>, ProblemType> */
    private const MAP = [
        ValidationException::class            => ProblemType::Validation,
        AuthenticationException::class        => ProblemType::Unauthenticated,
        AuthorizationException::class         => ProblemType::Forbidden,
        AccessDeniedHttpException::class      => ProblemType::Forbidden,
        ModelNotFoundException::class         => ProblemType::NotFound,
        NotFoundHttpException::class          => ProblemType::NotFound,
        MethodNotAllowedHttpException::class  => ProblemType::MethodNotAllowed,
        ThrottleRequestsException::class      => ProblemType::RateLimited,
        PromptRejectedException::class        => ProblemType::PromptRejected,
        AiProviderException::class            => ProblemType::AiProviderError,
        AiTimeoutException::class             => ProblemType::AiTimeout,
    ];

    public function render(Throwable $e, Request $request): JsonResponse
    {
        $type = $this->resolve($e);
        $body = [
            'type'       => 'https://afaqn8n.me/problems/'.$type->slug(),
            'title'      => __("problems.{$type->value}.title"),
            'status'     => $type->status(),
            'detail'     => $this->detail($e, $type),
            'instance'   => '/'.$request->path(),
            'code'       => $type->code(),
            'request_id' => $request->header('X-Request-Id'),
        ];

        if ($e instanceof ValidationException) {
            $body['errors'] = $e->errors();
        }
        if ($e instanceof ThrottleRequestsException) {
            $body['retry_after'] = (int) ($e->getHeaders()['Retry-After'] ?? 60);
        }

        return response()->json($body, $type->status(), $this->headers($e), JSON_UNESCAPED_UNICODE)
            ->header('Content-Type', 'application/problem+json');
    }
}
```

`ProblemType` is a backed enum carrying `status()`, `code()` and `slug()`. Unknown exceptions map to `InternalError`; for `HttpExceptionInterface` the status code is preserved.

## 4. Errors inside an SSE stream

Once the `200` SSE stream has started the status code can't change, so errors are emitted as an event and the stream closes:

```
event: error
data: {"type":"https://afaqn8n.me/problems/ai-provider-error","title":"تعذر الوصول إلى مزود الذكاء الاصطناعي","status":502,"code":"AI_PROVIDER_ERROR","request_id":"01J9Z..."}
```

Errors detected **before** streaming begins (validation, PromptGuard, throttling) are returned as normal problem+json responses with the proper status.

## 5. Frontend handling

`src/lib/api/client.ts` exposes `ApiError extends Error { problem: ProblemDetails }`.

| `code` | UI behaviour |
|--------|--------------|
| `VALIDATION_FAILED` | Map `errors` onto form fields (react-hook-form `setError`) |
| `RATE_LIMITED` | Toast with countdown from `retry_after`; disable submit |
| `PROMPT_REJECTED` | Inline assistant bubble with a polite localized refusal |
| `AI_PROVIDER_ERROR` / `AI_TIMEOUT` | Retry button on the failed message |
| other 5xx | Generic toast + `request_id` shown for support |

## 6. Logging

All 5xx problems are logged at `error` with `request_id`, route, and exception class; 4xx are logged at `info` only for `401/403/429`. Stack traces never reach the response body outside `APP_DEBUG=true`.
