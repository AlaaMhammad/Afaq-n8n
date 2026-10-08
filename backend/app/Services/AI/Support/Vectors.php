<?php

namespace App\Services\AI\Support;

final class Vectors
{
    /**
     * L2-normalise so cosine distance (`<=>`) behaves consistently across providers.
     *
     * @param  array<int, float|int>  $vector
     * @return list<float>
     */
    public static function normalize(array $vector): array
    {
        $norm = sqrt(array_sum(array_map(fn ($x) => $x * $x, $vector)));

        return $norm > 0
            ? array_map(fn ($x) => (float) $x / $norm, array_values($vector))
            : array_map('floatval', array_values($vector));
    }

    /** pgvector text literal, e.g. "[0.1,0.2]". */
    public static function literal(array $vector): string
    {
        return '['.implode(',', array_map(fn ($x) => rtrim(rtrim(sprintf('%.8F', $x), '0'), '.') ?: '0', $vector)).']';
    }
}
