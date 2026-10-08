<?php

namespace App\Domain\Knowledge\Enums;

use Filament\Support\Contracts\HasLabel;

enum KnowledgeCategory: string implements HasLabel
{
    case Company = 'company';
    case Service = 'service';
    case Pricing = 'pricing';
    case Process = 'process';
    case Faq = 'faq';
    case CaseStudy = 'case_study';

    public function getLabel(): string
    {
        return match ($this) {
            self::CaseStudy => __('Case study'),
            self::Faq => __('FAQ'),
            default => __(ucfirst($this->value)),
        };
    }
}
