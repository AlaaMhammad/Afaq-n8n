<?php

use App\Http\Controllers\Api\V1\AiChatController;
use App\Http\Controllers\Api\V1\AiSessionController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1 — docs/02_api_specs/endpoints.md
|--------------------------------------------------------------------------
| Public content endpoints (services, projects, team, service-requests) arrive with the
| frontend phase; this file currently exposes the AI concierge.
*/

Route::prefix('v1')->name('api.v1.')->group(function () {
    Route::post('ai/chat', AiChatController::class)
        ->middleware('throttle:ai')
        ->name('ai.chat');

    Route::get('ai/sessions/{chatSession}/messages', [AiSessionController::class, 'messages'])
        ->whereUuid('chatSession')
        ->middleware('throttle:api')
        ->name('ai.sessions.messages');
});
