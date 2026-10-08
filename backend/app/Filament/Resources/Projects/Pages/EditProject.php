<?php

namespace App\Filament\Resources\Projects\Pages;

use App\Filament\Resources\Projects\Pages\Concerns\ValidatesWorkflowMetadata;
use App\Filament\Resources\Projects\ProjectResource;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;

class EditProject extends EditRecord
{
    use ValidatesWorkflowMetadata;

    protected static string $resource = ProjectResource::class;

    protected function mutateFormDataBeforeSave(array $data): array
    {
        return $this->prepareWorkflowData($data);
    }

    protected function getHeaderActions(): array
    {
        return [
            Action::make('preview3d')
                ->label(__('Preview 3D'))
                ->icon('heroicon-o-cube-transparent')
                ->color('info')
                ->url(fn () => rtrim(config('afaq.frontend_url'), '/').'/'.app()->getLocale().'?project='.$this->record->slug.'#portfolio', shouldOpenInNewTab: true),
            DeleteAction::make(),
        ];
    }
}
