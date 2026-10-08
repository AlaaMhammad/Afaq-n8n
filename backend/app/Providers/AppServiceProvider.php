<?php

namespace App\Providers;

use Filament\Forms\Components\Field;
use Filament\Infolists\Components\Entry;
use Filament\Tables\Columns\Column;
use Filament\Tables\Filters\BaseFilter;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Absolute URLs (CV links, media) must be browser-facing even when the request
        // arrives over the internal Docker network (e.g. Next.js server → http://nginx).
        if (filled(config('app.url')) && ! app()->runningUnitTests()) {
            URL::forceRootUrl(config('app.url'));
            if (str_starts_with(config('app.url'), 'https://')) {
                URL::forceScheme('https');
            }
        }

        $this->configureRateLimiting();

        // Run Filament's auto-generated labels ("Reference", "Created at", …) through the
        // translator so the Arabic admin panel (lang/ar.json) has no English leftovers.
        foreach ([Field::class, Entry::class, Column::class, BaseFilter::class] as $component) {
            $component::configureUsing(fn ($instance) => $instance->translateLabel());
        }
    }

    /** Limits from docs/05_security/api_security.md §4 (stored in Redis via CACHE_STORE). */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)->by($request->user()?->id ?: $request->ip()));

        RateLimiter::for('ai', fn (Request $request) => [
            Limit::perMinute(10)->by('ai-ip:'.$request->ip()),
            Limit::perMinute(10)->by('ai-session:'.($request->input('session_id') ?: $request->ip())),
            Limit::perDay(200)->by('ai-day:'.$request->ip()),
        ]);

        RateLimiter::for('inquiry', fn (Request $request) => [
            Limit::perMinute(5)->by($request->ip()),
            Limit::perDay(20)->by('inquiry-day:'.$request->ip()),
        ]);
    }
}
