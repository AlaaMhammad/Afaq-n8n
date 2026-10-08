<?php

namespace App\Providers\Filament;

use App\Filament\Support\Translatable;
use App\Http\Middleware\SetAdminLocale;
use Filament\Actions\Action;
use Filament\Enums\ThemeMode;
use Filament\Http\Middleware\Authenticate;
use Filament\Http\Middleware\AuthenticateSession;
use Filament\Http\Middleware\DisableBladeIconComponents;
use Filament\Http\Middleware\DispatchServingFilamentEvent;
use Filament\Navigation\NavigationGroup;
use Filament\Panel;
use Filament\PanelProvider;
use Filament\Support\Colors\Color;
use Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse;
use Illuminate\Cookie\Middleware\EncryptCookies;
use Illuminate\Foundation\Http\Middleware\VerifyCsrfToken;
use Illuminate\Routing\Middleware\SubstituteBindings;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\View\Middleware\ShareErrorsFromSession;

/**
 * Afaq admin panel — spec: docs/04_features/admin_dashboard.md
 */
class AdminPanelProvider extends PanelProvider
{
    public function panel(Panel $panel): Panel
    {
        return $panel
            ->default()
            ->id('admin')
            ->path('admin')
            ->login()
            ->passwordReset()
            ->brandName('Afaq Admin')
            ->colors([
                'primary' => Color::hex('#FF6B00'),
                'info' => Color::hex('#00B8D4'),
                'gray' => Color::Zinc,
            ])
            ->defaultThemeMode(ThemeMode::Dark)
            ->font('IBM Plex Sans Arabic')
            ->sidebarCollapsibleOnDesktop()
            ->databaseNotifications()
            ->databaseNotificationsPolling('30s')
            ->globalSearchKeyBindings(['command+k', 'ctrl+k'])
            ->navigationGroups([
                NavigationGroup::make(fn () => __('Content')),
                NavigationGroup::make(fn () => __('Leads')),
                NavigationGroup::make(fn () => __('AI')),
                NavigationGroup::make(fn () => __('System')),
            ])
            ->userMenuItems(collect(Translatable::LOCALES)->map(
                fn (string $label, string $locale) => Action::make("locale-{$locale}")
                    ->label($label)
                    ->icon('heroicon-o-language')
                    ->url(fn () => route('admin.locale', $locale))
                    ->visible(fn () => app()->getLocale() !== $locale),
            )->values()->all())
            ->discoverResources(in: app_path('Filament/Resources'), for: 'App\Filament\Resources')
            ->discoverPages(in: app_path('Filament/Pages'), for: 'App\Filament\Pages')
            ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\Filament\Widgets')
            ->middleware([
                EncryptCookies::class,
                AddQueuedCookiesToResponse::class,
                StartSession::class,
                SetAdminLocale::class,
                AuthenticateSession::class,
                ShareErrorsFromSession::class,
                VerifyCsrfToken::class,
                SubstituteBindings::class,
                DisableBladeIconComponents::class,
                DispatchServingFilamentEvent::class,
            ])
            ->authMiddleware([
                Authenticate::class,
            ]);
    }
}
