<?php

namespace App\Domain\Inquiry\Enums;

use Filament\Support\Contracts\HasLabel;

enum Timeline: string implements HasLabel
{
    case Asap = 'asap';
    case OneMonth = '1_month';
    case OneToThreeMonths = '1_3_months';
    case Flexible = 'flexible';

    public function getLabel(): string
    {
        return match ($this) {
            self::Asap => __('ASAP'),
            self::OneMonth => __('Within 1 month'),
            self::OneToThreeMonths => __('1–3 months'),
            self::Flexible => __('Flexible'),
        };
    }

    public function factor(): float
    {
        return match ($this) {
            self::Asap => 1.25,
            self::OneMonth => 1.10,
            self::OneToThreeMonths => 1.00,
            self::Flexible => 0.95,
        };
    }
}
