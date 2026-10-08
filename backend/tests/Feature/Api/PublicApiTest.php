<?php

use App\Domain\Inquiry\Enums\RequestSource;
use App\Jobs\NotifyN8nOfInquiry;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\TeamMember;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    $this->seed();
});

describe('content endpoints', function () {
    it('lists services resolved to the requested locale', function () {
        $this->getJson('/api/v1/services?locale=ar')
            ->assertOk()
            ->assertHeader('Content-Language', 'ar')
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('data.0.slug', 'custom-n8n-nodes')
            ->assertJsonPath('data.0.title', 'تطوير عُقد n8n مخصصة')
            ->assertJsonPath('data.0.features.0', 'عُقد TypeScript مع بيانات اعتماد آمنة');

        $this->getJson('/api/v1/services', ['Accept-Language' => 'en-US,en;q=0.9'])
            ->assertJsonPath('data.0.title', 'Custom n8n Nodes');
    });

    it('returns every translation on request', function () {
        $this->getJson('/api/v1/services/crm-sync?translations=all')
            ->assertOk()
            ->assertJsonPath('data.title.ar', 'مزامنة أنظمة CRM (HubSpot / Salesforce)')
            ->assertJsonPath('data.title.en', 'CRM Sync (HubSpot / Salesforce)')
            ->assertJsonPath('data.features.0.en', 'Real-time bi-directional sync');
    });

    it('sends cache headers with an ETag that varies by language', function () {
        $response = $this->getJson('/api/v1/services?locale=en')->assertOk();

        expect($response->headers->get('Cache-Control'))->toContain('public')->toContain('max-age=60')
            ->and($response->headers->get('ETag'))->not->toBeEmpty()
            ->and($response->headers->get('Vary'))->toContain('Accept-Language');

        $this->getJson('/api/v1/services?locale=en', ['If-None-Match' => $response->headers->get('ETag')])->assertStatus(304);
    });

    it('serves projects with the localized 3D workflow specification', function () {
        $this->getJson('/api/v1/projects/autonomous-invoice-extractor?locale=en')
            ->assertOk()
            ->assertJsonPath('data.workflow.version', 1)
            ->assertJsonCount(4, 'data.workflow.nodes')
            ->assertJsonPath('data.workflow.nodes.0.label', 'Email Trigger')
            ->assertJsonPath('data.workflow.nodes.0.kind', 'trigger')
            ->assertJsonPath('data.workflow.nodes.0.exploded', [-1.4, -1.3, 0.9])
            ->assertJsonPath('data.workflow.edges.2.label', 'over threshold')
            ->assertJsonPath('data.metrics.failureRate', 0)
            ->assertJsonStructure(['data' => ['services' => [['slug', 'title']], 'workflow' => ['camera' => ['position', 'target']]]]);

        $this->getJson('/api/v1/projects?locale=ar')->assertJsonCount(3, 'data')->assertJsonPath('data.0.workflow.nodes.0.label', 'استقبال Webhook');
    });

    it('returns 404 problem details for unknown slugs', function () {
        $this->getJson('/api/v1/projects/nope')
            ->assertNotFound()
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonPath('code', 'NOT_FOUND');
    });

    it('lists active team members with avatar and CV links', function () {
        TeamMember::orderBy('order')->first()->update(['is_active' => false]);

        $response = $this->getJson('/api/v1/team?locale=en')->assertOk()->assertJsonCount(3, 'data');
        $member = $response->json('data.0');

        expect($member['name'])->toBe('Layla Mansour')
            ->and($member['avatar_url'])->toContain('/storage/team/avatars/')
            ->and($member['cv']['preview_url'])->toEndWith("/api/v1/team/{$member['id']}/cv")
            ->and($member['cv']['download_url'])->toEndWith('cv?download=1');
    });

    it('streams CVs inline or as a download, and hides inactive members', function () {
        $member = TeamMember::orderBy('order')->first();

        $inline = $this->get("/api/v1/team/{$member->id}/cv")->assertOk()->assertHeader('Content-Type', 'application/pdf');
        expect($inline->headers->get('Content-Disposition'))->toStartWith('inline')->toContain('omar-al-harbi-cv.pdf');

        $download = $this->get("/api/v1/team/{$member->id}/cv?download=1")->assertOk();
        expect($download->headers->get('Content-Disposition'))->toStartWith('attachment');

        $member->update(['is_active' => false]);
        $this->getJson("/api/v1/team/{$member->id}/cv")->assertNotFound();
    });

    it('reflects admin edits immediately (cache is flushed on save)', function () {
        $this->getJson('/api/v1/services/crm-sync?locale=en')->assertJsonPath('data.starting_price', 2000);

        Service::firstWhere('slug', 'crm-sync')->update(['starting_price' => 2400]);

        $this->getJson('/api/v1/services/crm-sync?locale=en')->assertJsonPath('data.starting_price', 2400);
    });

    it('allows the frontend origin via CORS', function () {
        $this->getJson('/api/v1/services', ['Origin' => 'http://localhost:3000'])
            ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

        // A foreign origin is never echoed back, so browsers block cross-site reads.
        $response = $this->getJson('/api/v1/services', ['Origin' => 'https://evil.example']);
        expect($response->headers->get('Access-Control-Allow-Origin'))->not->toBe('https://evil.example');
    });
});

describe('booking endpoint', function () {
    $valid = fn (array $overrides = []) => [
        'client_name' => 'Huda Al-Zahrani',
        'client_email' => 'huda@waha.example',
        'client_phone' => '0551234567',
        'company' => 'Waha Foods',
        'service_slug' => 'whatsapp-business-automation',
        'budget_range' => '5k_15k',
        'timeline' => 'asap',
        'complexity' => 4,
        'requirements' => 'Order status updates over WhatsApp for three branches.',
        'locale' => 'ar',
        'consent' => true,
        'utm' => ['source' => 'linkedin'],
        ...$overrides,
    ];

    it('creates a web-form lead with an estimate and queues the n8n notification', function () use ($valid) {
        Queue::fake();
        $before = ServiceRequest::count();

        $response = $this->postJson('/api/v1/service-requests', $valid())->assertCreated();

        $lead = ServiceRequest::latest('id')->first();
        expect(ServiceRequest::count())->toBe($before + 1)
            ->and($response->json('data.reference'))->toBe($lead->reference)
            ->and($response->json('data.estimate'))->toMatchArray(['min' => 3850, 'max' => 5850, 'currency' => 'USD'])
            ->and($lead->source)->toBe(RequestSource::WebForm)
            ->and($lead->client_phone)->toBe('+966551234567')
            ->and($lead->metadata['utm'])->toBe(['source' => 'linkedin']);
        Queue::assertPushed(NotifyN8nOfInquiry::class);
    });

    it('validates the form with problem details', function () use ($valid) {
        $this->postJson('/api/v1/service-requests', $valid(['client_email' => 'not-an-email', 'requirements' => 'short', 'consent' => false, 'budget_range' => 'lots']))
            ->assertStatus(422)
            ->assertHeader('Content-Type', 'application/problem+json')
            ->assertJsonPath('code', 'VALIDATION_FAILED')
            ->assertJsonValidationErrors(['client_email', 'requirements', 'consent', 'budget_range']);
    });

    it('rejects a duplicate within ten minutes with 409', function () use ($valid) {
        Queue::fake();
        $first = $this->postJson('/api/v1/service-requests', $valid())->json('data.reference');

        $this->postJson('/api/v1/service-requests', $valid())
            ->assertStatus(409)
            ->assertJsonPath('code', 'CONFLICT')
            ->assertJsonPath('reference', $first);
    });

    it('silently accepts honeypot submissions without storing them', function () use ($valid) {
        $before = ServiceRequest::count();

        $this->postJson('/api/v1/service-requests', $valid(['website' => 'http://spam.example']))
            ->assertCreated()
            ->assertJsonStructure(['data' => ['reference']]);

        expect(ServiceRequest::count())->toBe($before);
    });

    it('throttles bookings to 5 per minute', function () use ($valid) {
        Queue::fake();
        foreach (range(1, 5) as $i) {
            $this->postJson('/api/v1/service-requests', $valid(['client_email' => "lead{$i}@waha.example"]))->assertCreated();
        }

        $this->postJson('/api/v1/service-requests', $valid(['client_email' => 'lead6@waha.example']))
            ->assertStatus(429)
            ->assertJsonPath('code', 'RATE_LIMITED');
    });

    it('computes a live estimate and flags budgets that are too small', function () {
        $this->postJson('/api/v1/service-requests/estimate', ['service_slug' => 'ai-voice-chat-agents', 'complexity' => 5, 'timeline' => 'asap', 'budget_range' => '1k_5k'])
            ->assertOk()
            ->assertJsonPath('data.min', 9550)
            ->assertJsonPath('data.exceeds_budget', true);

        $this->postJson('/api/v1/service-requests/estimate', ['complexity' => 9])->assertStatus(422);
    });
});
