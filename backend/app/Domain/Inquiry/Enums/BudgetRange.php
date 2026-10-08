<?php

namespace App\Domain\Inquiry\Enums;

use Filament\Support\Contracts\HasLabel;

enum BudgetRange: string implements HasLabel
{
    case LessThan1k = 'lt_1k';
    case From1kTo5k = '1k_5k';
    case From5kTo15k = '5k_15k';
    case From15kTo50k = '15k_50k';
    case MoreThan50k = 'gt_50k';

    public function getLabel(): string
    {
        return match ($this) {
            self::LessThan1k => '< $1k',
            self::From1kTo5k => '$1k – $5k',
            self::From5kTo15k => '$5k – $15k',
            self::From15kTo50k => '$15k – $50k',
            self::MoreThan50k => '> $50k',
        };
    }

    /** Upper bound in USD (null = unbounded), used to flag estimates above budget. */
    public function ceiling(): ?int
    {
        return match ($this) {
            self::LessThan1k => 1000,
            self::From1kTo5k => 5000,
            self::From5kTo15k => 15000,
            self::From15kTo50k => 50000,
            self::MoreThan50k => null,
        };
    }
}
