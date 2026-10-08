<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

/** API locale: ?locale= (or JSON body "locale") → Accept-Language → ar. */
class SetApiLocale
{
    public const SUPPORTED = ['ar', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        $requested = $request->query('locale', $request->json('locale'));

        $locale = in_array($requested, self::SUPPORTED, true)
            ? $requested
            : ($request->getPreferredLanguage(self::SUPPORTED) ?? 'ar');

        App::setLocale($locale);

        return $next($request);
    }
}
