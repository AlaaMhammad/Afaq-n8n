<?php

use App\Domain\Catalog\WorkflowMetadata;
use App\Domain\Inquiry\Enums\RequestSource;
use App\Models\ChatSession;
use App\Models\KnowledgeDocument;
use App\Models\Project;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\TeamMember;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    $this->seed();
});

it('seeds the day-one demo content', function () {
    expect(Service::count())->toBe(5)
        ->and(Project::count())->toBe(4)
        ->and(TeamMember::count())->toBe(4)
        ->and(KnowledgeDocument::sources()->count())->toBe(36)
        ->and(ServiceRequest::count())->toBe(25)
        ->and(User::where('is_admin', true)->count())->toBe(1);
});

it('is idempotent', function () {
    $counts = fn () => [Service::count(), Project::count(), TeamMember::count(), KnowledgeDocument::count(), ServiceRequest::count(), ChatSession::count(), User::count()];
    $before = $counts();
    $references = ServiceRequest::orderBy('id')->pluck('reference');

    $this->seed();

    expect($counts())->toBe($before)
        ->and(ServiceRequest::orderBy('id')->pluck('reference'))->toEqual($references);
});

it('seeds valid 3D workflows for every project', function () {
    Project::all()->each(function (Project $project) {
        $workflow = $project->workflow_metadata;

        expect(WorkflowMetadata::errors(WorkflowMetadata::normalize($workflow)))->toBe([])
            ->and($project->metrics['nodesCount'])->toBe(count($workflow['nodes']));
    });

    expect(Project::pluck('slug')->sort()->values()->all())
        ->toBe(['ai-recruitment-pipeline', 'autonomous-invoice-extractor', 'lead-enrichment-engine', 'omnichannel-support-sync']);
});

it('fills every translatable field in Arabic and English', function () {
    $models = [...Service::all(), ...Project::all(), ...TeamMember::all()];

    foreach ($models as $model) {
        foreach ($model->translatable as $attribute) {
            expect($model->getTranslations($attribute))->toHaveKeys(['ar', 'en'])
                ->each->not->toBeEmpty();
        }
    }
});

it('pairs every knowledge topic in both languages', function () {
    $byKey = KnowledgeDocument::sources()->get()->groupBy(fn ($doc) => $doc->metadata['seed_key']);

    expect($byKey)->toHaveCount(18);
    $byKey->each(fn ($docs) => expect($docs->pluck('locale')->sort()->values()->all())->toBe(['ar', 'en']));
});

it('stores team avatars and PDF CVs on the public disk', function () {
    TeamMember::all()->each(function (TeamMember $member) {
        Storage::disk('public')->assertExists([$member->avatar_path, $member->cv_url]);
        expect(Storage::disk('public')->get($member->cv_url))->toStartWith('%PDF-1.4');
    });
});

it('links AI-sourced requests to a chat transcript', function () {
    $aiRequests = ServiceRequest::where('source', RequestSource::AiAgent)->get();

    expect($aiRequests)->not->toBeEmpty();
    $aiRequests->each(fn ($request) => expect($request->chatSession?->messages()->count())->toBeGreaterThan(0));
});
