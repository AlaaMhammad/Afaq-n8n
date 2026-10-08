<?php

namespace App\Filament\Resources\KnowledgeDocuments\Pages;

use App\Filament\Resources\KnowledgeDocuments\KnowledgeDocumentResource;
use App\Jobs\IndexKnowledgeJob;
use Filament\Actions\Action;
use Filament\Actions\DeleteAction;
use Filament\Notifications\Notification;
use Filament\Resources\Pages\EditRecord;

class EditKnowledgeDocument extends EditRecord
{
    protected static string $resource = KnowledgeDocumentResource::class;

    protected function getHeaderActions(): array
    {
        return [
            Action::make('reindex')
                ->label(__('Re-index'))
                ->icon('heroicon-o-arrow-path')
                ->color('info')
                ->action(function () {
                    IndexKnowledgeJob::dispatch(documentIds: [$this->record->id], force: true, notifyUserId: auth()->id());
                    Notification::make()->title(__('Re-indexing queued'))->success()->send();
                }),
            DeleteAction::make(),
        ];
    }
}
