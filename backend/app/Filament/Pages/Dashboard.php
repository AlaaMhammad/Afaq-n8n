<?php

namespace App\Filament\Pages;

use App\Filament\Actions\ReindexKnowledgeAction;
use Filament\Pages\Dashboard as BaseDashboard;

class Dashboard extends BaseDashboard
{
    public function getColumns(): int|array
    {
        return ['md' => 3];
    }

    protected function getHeaderActions(): array
    {
        return [
            ReindexKnowledgeAction::make(),
        ];
    }
}
