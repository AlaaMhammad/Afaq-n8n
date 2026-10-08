<?php

namespace App\Domain\Inquiry\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum RequestStatus: string implements HasColor, HasLabel
{
    case New = 'new';
    case Contacted = 'contacted';
    case Qualified = 'qualified';
    case Won = 'won';
    case Lost = 'lost';

    public function getLabel(): string
    {
        return __(ucfirst($this->value));
    }

    public function getColor(): string
    {
        return match ($this) {
            self::New => 'warning',
            self::Contacted => 'info',
            self::Qualified => 'primary',
            self::Won => 'success',
            self::Lost => 'gray',
        };
    }
}
