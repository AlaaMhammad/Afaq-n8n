<?php

use App\Models\ChatSession;
use App\Models\KnowledgeDocument;
use App\Models\Project;
use App\Models\Service;
use App\Models\ServiceRequest;
use App\Models\TeamMember;
use Illuminate\Support\Facades\Storage;

beforeEach(function () {
    Storage::fake('public');
    $this->seed();
});

it('redirects guests to the login page', function () {
    $this->get('/admin')->assertRedirect('/admin/login');
});

it('forbids non-admin users', function () {
    $this->actingAs(nonAdmin())->get('/admin')->assertForbidden();
});

it('renders every admin page for administrators', function () {
    $this->actingAs(admin());

    $pages = [
        '/admin',
        '/admin/services', '/admin/services/create', '/admin/services/'.Service::first()->id.'/edit',
        '/admin/projects', '/admin/projects/create', '/admin/projects/'.Project::first()->id.'/edit',
        '/admin/team-members', '/admin/team-members/create', '/admin/team-members/'.TeamMember::first()->id.'/edit',
        '/admin/service-requests', '/admin/service-requests/'.ServiceRequest::first()->id,
        '/admin/knowledge-documents', '/admin/knowledge-documents/create', '/admin/knowledge-documents/'.KnowledgeDocument::sources()->first()->id.'/edit',
        '/admin/chat-sessions', '/admin/chat-sessions/'.ChatSession::first()->id,
        '/admin/users', '/admin/users/create',
    ];

    foreach ($pages as $page) {
        $this->get($page)->assertOk();
    }
});

it('does not expose create pages for leads or transcripts', function () {
    $this->actingAs(admin());

    $this->get('/admin/service-requests/create')->assertNotFound();
    $this->get('/admin/chat-sessions/create')->assertNotFound();
});

it('renders the panel in Arabic RTL by default and switches to English', function () {
    config(['app.locale' => 'ar']); // production default (phpunit pins APP_LOCALE=en)
    $this->actingAs(admin());

    $this->get('/admin')->assertSee('dir="rtl"', escape: false);

    $this->get('/admin/locale/en')->assertRedirect();
    $this->get('/admin')->assertSee('dir="ltr"', escape: false);

    $this->get('/admin/locale/fr')->assertNotFound();
});
