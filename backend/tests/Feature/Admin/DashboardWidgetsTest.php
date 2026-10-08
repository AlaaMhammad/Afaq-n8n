<?php

use App\Filament\Widgets\KnowledgeHealth;
use App\Filament\Widgets\LatestRequests;
use App\Filament\Widgets\LeadsOverview;
use App\Filament\Widgets\RequestsByStatusChart;
use App\Filament\Widgets\RequestsOverTimeChart;
use App\Models\ServiceRequest;
use Illuminate\Support\Facades\Storage;

use function Pest\Livewire\livewire;

beforeEach(function () {
    Storage::fake('public');
    $this->seed();
    $this->actingAs(admin());
});

// Widgets are lazy-loaded, so a plain GET of /admin never executes them — render each one.
it('renders every dashboard widget', function (string $widget) {
    livewire($widget)->assertOk();
})->with([
    LeadsOverview::class,
    RequestsOverTimeChart::class,
    RequestsByStatusChart::class,
    KnowledgeHealth::class,
    LatestRequests::class,
]);

it('shows the five newest requests', function () {
    livewire(LatestRequests::class)
        ->assertCanSeeTableRecords(ServiceRequest::latest()->limit(5)->get())
        ->assertCountTableRecords(5);
});

it('reports knowledge base coverage', function () {
    livewire(KnowledgeHealth::class)
        ->assertSee('34')   // source documents
        ->assertSee('0%');  // nothing embedded until Phase 3
});
