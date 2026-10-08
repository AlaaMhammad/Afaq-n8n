<?php

use App\Domain\Inquiry\CreateServiceRequest;
use App\Domain\Inquiry\DuplicateInquiryException;
use App\Domain\Inquiry\Enums\BudgetRange;
use App\Domain\Inquiry\Enums\RequestSource;
use App\Domain\Inquiry\ServiceRequestData;
use App\Jobs\NotifyN8nOfInquiry;
use App\Models\ServiceRequest;
use Database\Seeders\ServiceSeeder;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;

beforeEach(fn () => $this->seed(ServiceSeeder::class));

function inquiry(array $overrides = []): ServiceRequestData
{
    return new ServiceRequestData(...[
        'clientName' => 'Omar Farouk',
        'clientEmail' => 'Omar@Example.COM',
        'budget' => BudgetRange::From1kTo5k,
        'requirements' => 'Sync HubSpot contacts with Zoho Books invoices.',
        'source' => RequestSource::WebForm,
        'locale' => 'en',
        'serviceSlug' => 'crm-sync',
        'clientPhone' => '٠٥٥١٢٣٤٥٦٧',
        ...$overrides,
    ]);
}

it('creates a normalised lead with estimate and reference, then queues the n8n notification after commit', function () {
    Queue::fake();

    $request = app(CreateServiceRequest::class)(inquiry());

    expect($request->reference)->toMatch('/^AFQ-[0-9A-HJKMNP-TV-Z]{6}$/')
        ->and($request->client_email)->toBe('omar@example.com')
        ->and($request->client_phone)->toBe('+966551234567')
        ->and($request->estimate)->toMatchArray(['min' => 2400, 'max' => 3650, 'currency' => 'USD'])
        ->and($request->metadata['n8n'])->toBe(['notified_at' => null, 'attempts' => 0]);
    Queue::assertPushed(NotifyN8nOfInquiry::class);
});

it('rejects a duplicate within the dedupe window', function () {
    Queue::fake();
    $first = app(CreateServiceRequest::class)(inquiry());

    expect(fn () => app(CreateServiceRequest::class)(inquiry()))
        ->toThrow(fn (DuplicateInquiryException $e) => expect($e->existing->is($first))->toBeTrue());

    $this->travel(11)->minutes();
    app(CreateServiceRequest::class)(inquiry());
    expect(ServiceRequest::count())->toBe(2);
});

it('normalises phone formats', function (?string $input, ?string $expected) {
    expect(CreateServiceRequest::normalizePhone($input))->toBe($expected);
})->with([
    ['+966 50-123 4567', '+966501234567'],
    ['00966501234567', '+966501234567'],
    ['0501234567', '+966501234567'],
    ['(202) 555-0147', '+2025550147'],
    [null, null],
]);

describe('NotifyN8nOfInquiry', function () {
    beforeEach(function () {
        config(['ai.n8n.webhook_url' => 'https://n8n.test/webhook/afaq', 'ai.n8n.webhook_secret' => 'top-secret']);
        Queue::fake();
        $this->lead = app(CreateServiceRequest::class)(inquiry());
    });

    it('posts a signed payload and records the delivery', function () {
        Http::fake(['n8n.test/*' => Http::response(['ok' => true])]);

        (new NotifyN8nOfInquiry($this->lead->id))->handle();

        Http::assertSent(function (Request $r) {
            return $r->url() === 'https://n8n.test/webhook/afaq'
                && $r->header('X-Afaq-Event')[0] === 'service_request.created'
                && $r->header('X-Afaq-Signature')[0] === 'sha256='.hash_hmac('sha256', $r->body(), 'top-secret')
                && $r['reference'] === $this->lead->reference
                && $r['client']['email'] === 'omar@example.com'
                && $r['service']['slug'] === 'crm-sync'
                && str_contains($r['admin_url'], '/admin/service-requests/'.$this->lead->id);
        });

        expect($this->lead->fresh()->metadata['n8n'])->toMatchArray(['attempts' => 1, 'last_error' => null])
            ->and($this->lead->fresh()->wasNotifiedToN8n())->toBeTrue();
    });

    it('records failures and throws so the queue retries with backoff', function () {
        Http::fake(['n8n.test/*' => Http::response('workflow inactive', 404)]);

        expect(fn () => (new NotifyN8nOfInquiry($this->lead->id))->handle())->toThrow(RuntimeException::class);
        expect($this->lead->fresh()->metadata['n8n'])->toMatchArray(['attempts' => 1, 'last_error' => 'HTTP 404: workflow inactive'])
            ->and((new NotifyN8nOfInquiry(1))->backoff())->toBe([10, 60, 300]);
    });

    it('skips quietly when the webhook is not configured', function () {
        config(['ai.n8n.webhook_url' => null]);
        Http::fake();

        (new NotifyN8nOfInquiry($this->lead->id))->handle();

        Http::assertNothingSent();
    });
});
