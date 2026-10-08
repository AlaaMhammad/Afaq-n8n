<?php

namespace App\Support;

use Closure;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Short-lived cache for public read endpoints, keyed per locale and translation mode.
 * Content models flush it on every change (after the surrounding transaction commits,
 * so relationship syncs done by the admin panel are included).
 */
final class PublicApiCache
{
    private const TAG = 'public-api';

    private const TTL_SECONDS = 600;

    /**
     * @template T
     *
     * @param  Closure(): T  $resolve
     * @return T
     */
    public static function remember(string $key, bool $allTranslations, Closure $resolve): mixed
    {
        $variant = $allTranslations ? 'all' : App::getLocale();

        return Cache::tags([self::TAG])->remember("{$key}:{$variant}", self::TTL_SECONDS, $resolve);
    }

    public static function flush(): void
    {
        DB::afterCommit(fn () => Cache::tags([self::TAG])->flush());
    }
}
