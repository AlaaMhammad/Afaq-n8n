<?php

namespace App\Jobs;

use App\Filament\Resources\ServiceRequests\ServiceRequestResource;
use App\Models\ServiceRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use RuntimeException;
use Throwable;

/**
 * POSTs a new lead to the agency's n8n webhook, signed with HMAC-SHA256 so the
 * workflow can verify it came from us. Delivery state is recorded in metadata.n8n.
 * Spec: docs/04_features/service_request.md §5 · docs/05_security/api_security.md §9
 */
class NotifyN8nOfInquiry implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public const EVENT = 'service_request.created';

    public int $tries = 3;

    public int $timeout = 30;

    public function __construct(public int $serviceRequestId) {}

    /** @return list<int> seconds between attempts */
    public function backoff(): array
    {
        return [10, 60, 300];
    }

    public function handle(): void
    {
        $request = ServiceRequest::withTrashed()->with('service')->find($this->serviceRequestId);
        $url = config('ai.n8n.webhook_url');
        $secret = config('ai.n8n.webhook_secret');

        if (! $request) {
            return;
        }
        if (blank($url) || blank($secret)) {
            Log::info('n8n webhook not configured; skipping inquiry notification.', ['reference' => $request->reference]);

            return;
        }

        $body = json_encode(self::payload($request), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $delivery = (string) Str::uuid();

        $this->record($request, ['attempts' => (int) data_get($request->metadata, 'n8n.attempts', 0) + 1, 'delivery' => $delivery]);

        $response = Http::timeout((int) config('ai.n8n.timeout', 15))
            ->withHeaders(self::headers($body, $secret, $delivery))
            ->withBody($body, 'application/json')
            ->post($url);

        if ($response->failed()) {
            $error = 'HTTP '.$response->status().': '.Str::limit(trim($response->body()), 200);
            $this->record($request, ['last_error' => $error]);

            throw new RuntimeException("n8n webhook rejected {$request->reference} ({$error})");
        }

        $this->record($request, ['notified_at' => now()->toIso8601String(), 'last_error' => null]);
    }

    public function failed(Throwable $e): void
    {
        if ($request = ServiceRequest::withTrashed()->find($this->serviceRequestId)) {
            $this->record($request, ['last_error' => Str::limit($e->getMessage(), 250)]);
        }
    }

    /** @return array<string, string> */
    public static function headers(string $body, string $secret, string $delivery): array
    {
        return [
            'X-Afaq-Event' => self::EVENT,
            'X-Afaq-Delivery' => $delivery,
            'X-Afaq-Signature' => 'sha256='.hash_hmac('sha256', $body, $secret),
            'User-Agent' => 'AfaqPlatform-Webhook/1.0',
        ];
    }

    /** @return array<string, mixed> */
    public static function payload(ServiceRequest $request): array
    {
        $locale = data_get($request->metadata, 'locale', 'ar');

        return [
            'event' => self::EVENT,
            'id' => $request->id,
            'reference' => $request->reference,
            'created_at' => $request->created_at->toIso8601String(),
            'source' => $request->source->value,
            'locale' => $locale,
            'client' => [
                'name' => $request->client_name,
                'email' => $request->client_email,
                'phone' => $request->client_phone,
                'company' => $request->company,
            ],
            'service' => $request->service ? [
                'slug' => $request->service->slug,
                'title' => $request->service->getTranslation('title', $locale),
            ] : null,
            'budget_range' => $request->budget_range->value,
            'timeline' => $request->timeline?->value,
            'requirements' => $request->requirements,
            'estimate' => $request->estimate,
            'admin_url' => ServiceRequestResource::getUrl('view', ['record' => $request], panel: 'admin'),
        ];
    }

    /** @param array<string, mixed> $changes merged into metadata.n8n without touching updated_at */
    private function record(ServiceRequest $request, array $changes): void
    {
        $metadata = $request->metadata ?? [];
        $metadata['n8n'] = array_merge($metadata['n8n'] ?? [], $changes);
        $request->forceFill(['metadata' => $metadata])->saveQuietly();
    }
}
