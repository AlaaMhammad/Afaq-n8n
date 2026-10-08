<?php

use App\Domain\Inquiry\Enums\Timeline;
use App\Domain\Inquiry\EstimateCalculator;
use App\Models\Service;

it('computes indicative ranges from base price, complexity and timeline', function (?int $price, ?Timeline $timeline, ?int $complexity, int $min, int $max, array $weeks) {
    $service = $price === null ? null : new Service(['starting_price' => $price]);

    $estimate = (new EstimateCalculator)->estimate($service, $timeline, $complexity);

    expect($estimate)->toBe(['min' => $min, 'max' => $max, 'currency' => 'USD', 'weeks' => $weeks]);
})->with([
    'defaults (no service)' => [null, null, null, 1800, 2750, [3, 5]],
    'simple, flexible' => [2000, Timeline::Flexible, 1, 1300, 2000, [2, 3]],
    'medium, 1–3 months' => [3000, Timeline::OneToThreeMonths, 3, 3550, 5450, [3, 5]],
    'complex, asap' => [2500, Timeline::Asap, 5, 7950, 12200, [6, 11]],
]);

it('falls back to medium complexity for out-of-range input', function () {
    $calc = new EstimateCalculator;

    expect($calc->estimate(null, null, 9))->toBe($calc->estimate(null, null, 3));
});
