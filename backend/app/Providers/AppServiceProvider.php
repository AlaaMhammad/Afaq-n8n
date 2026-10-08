<?php

namespace App\Providers;

use Filament\Forms\Components\Field;
use Filament\Infolists\Components\Entry;
use Filament\Tables\Columns\Column;
use Filament\Tables\Filters\BaseFilter;
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
        // Run Filament's auto-generated labels ("Reference", "Created at", …) through the
        // translator so the Arabic admin panel (lang/ar.json) has no English leftovers.
        foreach ([Field::class, Entry::class, Column::class, BaseFilter::class] as $component) {
            $component::configureUsing(fn ($instance) => $instance->translateLabel());
        }
    }
}
