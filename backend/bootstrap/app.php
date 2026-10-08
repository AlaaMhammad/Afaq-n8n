<?php

use App\Http\Middleware\AssignRequestId;
use App\Http\Middleware\SetApiLocale;
use App\Http\Problems\ProblemRenderer;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(prepend: [AssignRequestId::class, SetApiLocale::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Every /api/* error is RFC 7807 problem+json (docs/02_api_specs/error_handling.md)
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(function (Throwable $e, Request $request) {
            return $request->is('api/*') ? app(ProblemRenderer::class)->render($e, $request) : null;
        });
    })->create();
