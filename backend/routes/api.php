<?php

use App\Http\Controllers\Api\V1\AiChatController;
use App\Http\Controllers\Api\V1\AiSessionController;
use App\Http\Controllers\Api\V1\ProjectController;
use App\Http\Controllers\Api\V1\ServiceController;
use App\Http\Controllers\Api\V1\ServiceRequestController;
use App\Http\Controllers\Api\V1\TeamMemberController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1 — docs/02_api_specs/endpoints.md
|--------------------------------------------------------------------------
| Locale: ?locale=ar|en, else Accept-Language, else ar (SetApiLocale).
| Errors: RFC 7807 problem+json (ProblemRenderer).
*/

Route::prefix('v1')->name('api.v1.')->group(function () {
    // Public content — cacheable by browsers/CDN for a minute, revalidated by ETag.
    Route::middleware(['throttle:api', 'cache.headers:public;max_age=60;etag'])->group(function () {
        Route::get('services', [ServiceController::class, 'index'])->name('services.index');
        Route::get('services/{slug}', [ServiceController::class, 'show'])->name('services.show');
        Route::get('projects', [ProjectController::class, 'index'])->name('projects.index');
        Route::get('projects/{slug}', [ProjectController::class, 'show'])->name('projects.show');
        Route::get('team', [TeamMemberController::class, 'index'])->name('team.index');
    });

    Route::get('team/{teamMember}/cv', [TeamMemberController::class, 'cv'])
        ->whereNumber('teamMember')
        ->middleware('throttle:api')
        ->name('team.cv');

    // Booking form
    Route::post('service-requests', [ServiceRequestController::class, 'store'])
        ->middleware('throttle:inquiry')
        ->name('service-requests.store');
    Route::post('service-requests/estimate', [ServiceRequestController::class, 'estimate'])
        ->middleware('throttle:api')
        ->name('service-requests.estimate');

    // AI concierge
    Route::post('ai/chat', AiChatController::class)
        ->middleware('throttle:ai')
        ->name('ai.chat');
    Route::get('ai/sessions/{chatSession}/messages', [AiSessionController::class, 'messages'])
        ->whereUuid('chatSession')
        ->middleware('throttle:api')
        ->name('ai.sessions.messages');
});
