<?php

use App\Domain\Inquiry\Enums\RequestStatus;
use App\Filament\Pages\Dashboard;
use App\Filament\Resources\KnowledgeDocuments\Pages\ListKnowledgeDocuments;
use App\Filament\Resources\Projects\Pages\EditProject;
use App\Filament\Resources\ServiceRequests\Pages\ListServiceRequests;
use App\Filament\Resources\Services\Pages\CreateService;
use App\Filament\Resources\TeamMembers\Pages\CreateTeamMember;
use App\Filament\Resources\Users\Pages\EditUser;
use App\Jobs\IndexKnowledgeJob;
use App\Models\Project;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\TeamMember;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;

use function Pest\Livewire\livewire;

beforeEach(function () {
    Storage::fake('public');
    $this->seed();
    $this->actingAs($this->admin = admin());
});

it('creates a bilingual service', function () {
    livewire(CreateService::class)
        ->fillForm([
            'title' => ['ar' => 'أتمتة الموارد البشرية', 'en' => 'HR Automation'],
            'description' => ['ar' => 'وصف الخدمة بالعربية', 'en' => 'Service description in English'],
            'slug' => 'hr-automation',
            'icon' => 'workflow',
            'starting_price' => 1200,
            'features' => [['ar' => 'ميزة', 'en' => 'Feature']],
        ])
        ->call('create')
        ->assertHasNoFormErrors();

    $service = Service::firstWhere('slug', 'hr-automation');
    expect($service->getTranslations('title'))->toBe(['ar' => 'أتمتة الموارد البشرية', 'en' => 'HR Automation'])
        ->and($service->features)->toBe([['ar' => 'ميزة', 'en' => 'Feature']]);
});

it('requires both languages for a service', function () {
    livewire(CreateService::class)
        ->fillForm([
            'title' => ['ar' => '', 'en' => 'Only English'],
            'description' => ['ar' => 'وصف', 'en' => 'Description'],
            'slug' => 'only-english',
        ])
        ->call('create')
        ->assertHasFormErrors(['title.ar' => 'required']);
});

it('saves an edited 3D workflow and recomputes the node count', function () {
    $project = Project::firstWhere('slug', 'lead-enrichment-engine');

    livewire(EditProject::class, ['record' => $project->getRouteKey()])
        ->assertSchemaStateSet(['title' => $project->getTranslations('title')])
        ->fillForm(['metrics.avgExecutionMs' => 700])
        ->call('save')
        ->assertHasNoFormErrors();

    $project->refresh();
    expect($project->metrics['avgExecutionMs'])->toBe(700)
        ->and($project->metrics['nodesCount'])->toBe(4)
        ->and($project->workflow_metadata['nodes'][0]['position'])->each->toBeNumeric()->not->toBeString()
        ->and($project->workflow_metadata['camera'])->toHaveKeys(['position', 'target']);
});

it('refuses to save a workflow whose edge points to a missing node', function () {
    $project = Project::firstWhere('slug', 'lead-enrichment-engine');
    $before = $project->workflow_metadata;

    $component = livewire(EditProject::class, ['record' => $project->getRouteKey()]);
    $edges = $component->get('data.workflow_metadata.edges');
    $edges[array_key_first($edges)]['to'] = 'ghost-node';

    $component->set('data.workflow_metadata.edges', $edges)->call('save');

    expect($project->fresh()->workflow_metadata)->toEqual($before);
});

it('uploads a PDF CV and rejects other file types', function () {
    $base = [
        'name' => ['ar' => 'سارة', 'en' => 'Sara'],
        'role' => ['ar' => 'مهندسة', 'en' => 'Engineer'],
        'bio' => ['ar' => 'نبذة', 'en' => 'Bio'],
    ];

    livewire(CreateTeamMember::class)
        ->fillForm([...$base, 'cv_url' => UploadedFile::fake()->create('cv.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')])
        ->call('create')
        ->assertHasFormErrors(['cv_url']);

    livewire(CreateTeamMember::class)
        ->fillForm([...$base, 'cv_url' => UploadedFile::fake()->create('cv.pdf', 200, 'application/pdf')])
        ->call('create')
        ->assertHasNoFormErrors();

    $member = TeamMember::where('name->en', 'Sara')->sole();
    Storage::disk('public')->assertExists($member->cv_url);
    expect($member->cv_url)->toStartWith('team/cvs/')->toEndWith('.pdf');
});

it('changes a request status and records the history', function () {
    $request = ServiceRequest::where('status', RequestStatus::New)->first();

    livewire(ListServiceRequests::class)
        ->callTableAction('changeStatus', $request, data: ['status' => RequestStatus::Contacted->value, 'note' => 'Called the client'])
        ->assertHasNoTableActionErrors();

    $request->refresh();
    expect($request->status)->toBe(RequestStatus::Contacted)
        ->and(collect($request->metadata['history'])->last())->toMatchArray([
            'from' => 'new', 'to' => 'contacted', 'by' => $this->admin->email, 'note' => 'Called the client',
        ]);
});

it('queues knowledge re-indexing from the dashboard and the knowledge list', function () {
    Queue::fake();

    livewire(Dashboard::class)->callAction('reindexKnowledge', data: ['force' => false]);
    livewire(ListKnowledgeDocuments::class)->callAction('reindexKnowledge', data: ['force' => true]);

    Queue::assertPushed(IndexKnowledgeJob::class, 2);
    Queue::assertPushed(IndexKnowledgeJob::class, fn (IndexKnowledgeJob $job) => $job->force && $job->notifyUserId === $this->admin->id);
});

it('prevents admins from revoking their own admin flag', function () {
    livewire(EditUser::class, ['record' => $this->admin->getRouteKey()])
        ->fillForm(['is_admin' => false])
        ->call('save');

    expect($this->admin->fresh()->is_admin)->toBeTrue();
});
