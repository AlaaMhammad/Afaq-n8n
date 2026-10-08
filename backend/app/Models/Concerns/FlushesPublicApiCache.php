<?php

namespace App\Models\Concerns;

use App\Support\PublicApiCache;

/** Content edited in the admin panel is visible on the website immediately. */
trait FlushesPublicApiCache
{
    protected static function bootFlushesPublicApiCache(): void
    {
        static::saved(fn () => PublicApiCache::flush());
        static::deleted(fn () => PublicApiCache::flush());
    }
}
