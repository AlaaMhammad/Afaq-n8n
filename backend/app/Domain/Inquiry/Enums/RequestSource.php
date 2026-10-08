<?php

namespace App\Domain\Inquiry\Enums;

use Filament\Support\Contracts\HasColor;
use Filament\Support\Contracts\HasLabel;

enum RequestSource: string implements HasColor, HasLabel
{
    case WebForm = 'web_form';
    case AiAgent = 'ai_agent';
    case Admin = 'admin';

    public function getLabel(): string
    {
        return match ($this) {
            self::WebForm => __('Web form'),
            self::AiAgent => __('AI agent'),
            self::Admin => __('Admin'),
        };
    }

    public function getColor(): string
    {
        return match ($this) {
            self::WebForm => 'gray',
            self::AiAgent => 'info',
            self::Admin => 'primary',
        };
    }
}
