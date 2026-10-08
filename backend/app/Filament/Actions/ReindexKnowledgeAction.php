<?php

namespace App\Filament\Actions;

use App\Jobs\IndexKnowledgeJob;
use App\Models\KnowledgeDocument;
use Filament\Actions\Action;
use Filament\Forms\Components\Toggle;
use Filament\Notifications\Notification;

/**
 * "Re-index knowledge" — queues `rag:index-knowledge` for every stale/pending source document.
 * Used on the dashboard and on the Knowledge Documents list.
 */
class ReindexKnowledgeAction
{
    public static function make(string $name = 'reindexKnowledge'): Action
    {
        return Action::make($name)
            ->label(__('Re-index knowledge'))
            ->icon('heroicon-o-arrow-path')
            ->color('info')
            ->requiresConfirmation()
            ->modalHeading(__('Re-index the knowledge base?'))
            ->modalDescription(fn () => __(':count source document(s) are pending or stale. Indexing runs in the background and you will be notified when it finishes.', [
                'count' => KnowledgeDocument::sources()->get()
                    ->reject(fn (KnowledgeDocument $doc) => $doc->indexStatus() === KnowledgeDocument::STATUS_INDEXED)
                    ->count(),
            ]))
            ->schema([
                Toggle::make('force')
                    ->label(__('Re-embed everything (ignore unchanged documents)'))
                    ->default(false),
            ])
            ->action(function (array $data) {
                IndexKnowledgeJob::dispatch(force: (bool) ($data['force'] ?? false), notifyUserId: auth()->id());

                Notification::make()
                    ->title(__('Re-indexing queued'))
                    ->body(__('You will get a notification when it completes.'))
                    ->success()
                    ->send();
            });
    }
}
