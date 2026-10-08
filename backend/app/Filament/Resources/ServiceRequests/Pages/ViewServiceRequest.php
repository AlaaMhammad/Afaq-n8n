<?php

namespace App\Filament\Resources\ServiceRequests\Pages;

use App\Filament\Resources\ServiceRequests\Actions\ChangeStatusAction;
use App\Filament\Resources\ServiceRequests\Actions\ResendToN8nAction;
use App\Filament\Resources\ServiceRequests\ServiceRequestResource;
use Filament\Actions\DeleteAction;
use Filament\Actions\RestoreAction;
use Filament\Resources\Pages\ViewRecord;

class ViewServiceRequest extends ViewRecord
{
    protected static string $resource = ServiceRequestResource::class;

    protected function getHeaderActions(): array
    {
        return [
            ChangeStatusAction::make(),
            ResendToN8nAction::make(),
            DeleteAction::make(),
            RestoreAction::make(),
        ];
    }
}
