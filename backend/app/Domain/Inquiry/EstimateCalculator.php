<?php

namespace App\Domain\Inquiry;

use App\Domain\Inquiry\Enums\Timeline;
use App\Models\Service;

/**
 * Indicative project estimate. Rules: docs/04_features/service_request.md §3
 */
final class EstimateCalculator
{
    public const DEFAULT_BASE = 1500;

    private const COMPLEXITY_FACTORS = [1 => 0.8, 2 => 1.0, 3 => 1.4, 4 => 2.0, 5 => 3.0];

    /**
     * @return array{min: int, max: int, currency: string, weeks: array{0: int, 1: int}}
     */
    public function estimate(?Service $service, ?Timeline $timeline = null, ?int $complexity = null): array
    {
        $base = $service?->starting_price ?? self::DEFAULT_BASE;
        $cxFactor = self::COMPLEXITY_FACTORS[$complexity ?? 3] ?? self::COMPLEXITY_FACTORS[3];
        $tlFactor = ($timeline ?? Timeline::OneToThreeMonths)->factor();

        $mid = $base * $cxFactor * $tlFactor;

        return [
            'min' => $this->roundTo50($mid * 0.85),
            'max' => $this->roundTo50($mid * 1.30),
            'currency' => 'USD',
            'weeks' => [(int) ceil(2 * $cxFactor), (int) ceil(3.5 * $cxFactor)],
        ];
    }

    private function roundTo50(float $value): int
    {
        return (int) (round($value / 50) * 50);
    }
}
