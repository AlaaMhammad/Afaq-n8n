<?php

namespace App\Http\Resources\Concerns;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;

/**
 * Translatable fields are returned resolved to the request locale (set by SetApiLocale),
 * or as the full {ar, en} map when the client asks for `?translations=all`.
 */
trait ResolvesTranslations
{
    protected function wantsAllTranslations(Request $request): bool
    {
        return $request->query('translations') === 'all';
    }

    /** @return string|array<string, string> */
    protected function translated(Request $request, string $attribute): string|array
    {
        return $this->wantsAllTranslations($request)
            ? $this->resource->getTranslations($attribute)
            : $this->resource->getTranslation($attribute, App::getLocale());
    }

    /**
     * Resolve a plain `{ar, en}` array (e.g. a feature bullet or a 3D node label).
     *
     * @param  array<string, string>|null  $value
     * @return string|array<string, string>|null
     */
    protected function localize(Request $request, ?array $value): string|array|null
    {
        if ($value === null || $this->wantsAllTranslations($request)) {
            return $value;
        }

        return $value[App::getLocale()] ?? $value['ar'] ?? reset($value) ?: null;
    }
}
