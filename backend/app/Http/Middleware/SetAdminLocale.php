<?php

namespace App\Http\Middleware;

use App\Filament\Support\Translatable;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applies the admin's chosen panel language (Arabic RTL by default, English LTR).
 */
class SetAdminLocale
{
    public const SESSION_KEY = 'admin_locale';

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->session()->get(self::SESSION_KEY, config('app.locale'));

        if (array_key_exists($locale, Translatable::LOCALES)) {
            App::setLocale($locale);
        }

        return $next($request);
    }
}
