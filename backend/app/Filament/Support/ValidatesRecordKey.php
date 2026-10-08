<?php

namespace App\Filament\Support;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * PostgreSQL rejects malformed keys with a query error (500) — e.g. /service-requests/create
 * hitting the {record} route, or a non-UUID chat session id. Resolve those to a clean 404.
 */
trait ValidatesRecordKey
{
    public static function resolveRecordRouteBinding(int|string $key, ?Closure $modifyQuery = null): ?Model
    {
        $model = app(static::getModel());

        $valid = $model->getKeyType() === 'int'
            ? ctype_digit((string) $key) && strlen((string) $key) <= 18
            : Str::isUuid((string) $key);

        return $valid ? parent::resolveRecordRouteBinding($key, $modifyQuery) : null;
    }
}
