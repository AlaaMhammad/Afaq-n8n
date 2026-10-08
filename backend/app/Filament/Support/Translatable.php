<?php

namespace App\Filament\Support;

use Closure;
use Filament\Forms\Components\Field;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Illuminate\Database\Eloquent\Builder;

/**
 * Helpers for {ar, en} JSON columns (spatie/laravel-translatable).
 *
 * Translatable v6 serialises all translations in toArray() and accepts an
 * associative array in setAttribute(), so `title.ar` / `title.en` state paths
 * round-trip without a plugin.
 */
final class Translatable
{
    public const LOCALES = ['ar' => 'العربية', 'en' => 'English'];

    /**
     * Locale tabs. $fields receives the locale and returns the components for that tab;
     * Arabic inputs are rendered right-to-left.
     *
     * @param  Closure(string $locale): array<Field>  $fields
     */
    public static function tabs(Closure $fields, string $label = 'Translations'): Tabs
    {
        return Tabs::make($label)
            ->tabs(collect(self::LOCALES)->map(
                fn (string $name, string $locale) => Tab::make($name)
                    ->schema(collect($fields($locale))
                        ->each(fn ($field) => $locale === 'ar' && method_exists($field, 'extraInputAttributes')
                            ? $field->extraInputAttributes(['dir' => 'rtl'], merge: true)
                            : null)
                        ->all()),
            )->values()->all())
            ->columnSpanFull();
    }

    /**
     * Case-insensitive search across every locale of a jsonb column.
     *
     * @return Closure(Builder, string): Builder
     */
    public static function search(string $column): Closure
    {
        return fn (Builder $query, string $search): Builder => $query->where(function (Builder $query) use ($column, $search) {
            foreach (array_keys(self::LOCALES) as $locale) {
                $query->orWhereRaw("{$column}->>'{$locale}' ILIKE ?", ['%'.$search.'%']);
            }
        });
    }

    /** Field label with a locale suffix, e.g. "Title (AR)". */
    public static function label(string $label, string $locale): string
    {
        return __($label).' ('.strtoupper($locale).')';
    }
}
