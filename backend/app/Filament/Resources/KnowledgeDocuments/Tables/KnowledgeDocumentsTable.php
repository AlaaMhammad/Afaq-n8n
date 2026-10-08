<?php

namespace App\Filament\Resources\KnowledgeDocuments\Tables;

use App\Domain\Knowledge\Enums\KnowledgeCategory;
use App\Filament\Support\Translatable;
use App\Jobs\IndexKnowledgeJob;
use App\Models\KnowledgeDocument;
use Filament\Actions\Action;
use Filament\Actions\BulkAction;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Notifications\Notification;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;

class KnowledgeDocumentsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->withCount('chunks'))
            ->defaultSort('updated_at', 'desc')
            ->columns([
                TextColumn::make('title')
                    ->searchable()
                    ->weight('medium')
                    ->extraAttributes(['dir' => 'auto'])
                    ->limit(60),
                TextColumn::make('locale')->label(__('Lang'))->badge()->color('gray'),
                TextColumn::make('category')->badge(),
                TextColumn::make('chunks_count')->label(__('Chunks'))->alignCenter()->sortable(),
                TextColumn::make('index_status')
                    ->label(__('Index'))
                    ->state(fn (KnowledgeDocument $record) => $record->indexStatus())
                    ->badge()
                    ->formatStateUsing(fn (string $state) => __(ucfirst($state)))
                    ->color(fn (string $state) => match ($state) {
                        KnowledgeDocument::STATUS_INDEXED => 'success',
                        KnowledgeDocument::STATUS_STALE => 'warning',
                        default => 'gray',
                    }),
                TextColumn::make('indexed_at')->label(__('Indexed'))->since()->placeholder(__('Never'))->sortable(),
                TextColumn::make('updated_at')->since()->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                SelectFilter::make('locale')->label(__('Language'))->options(Translatable::LOCALES),
                SelectFilter::make('category')->options(KnowledgeCategory::class),
            ])
            ->recordActions([
                Action::make('reindex')
                    ->label(__('Re-index'))
                    ->icon('heroicon-o-arrow-path')
                    ->color('info')
                    ->action(function (KnowledgeDocument $record) {
                        IndexKnowledgeJob::dispatch(documentIds: [$record->id], force: true, notifyUserId: auth()->id());
                        Notification::make()->title(__('Re-indexing queued'))->success()->send();
                    }),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    BulkAction::make('reindexSelected')
                        ->label(__('Re-index selected'))
                        ->icon('heroicon-o-arrow-path')
                        ->action(function (Collection $records) {
                            IndexKnowledgeJob::dispatch(documentIds: $records->modelKeys(), force: true, notifyUserId: auth()->id());
                            Notification::make()->title(__('Re-indexing queued'))->success()->send();
                        })
                        ->deselectRecordsAfterCompletion(),
                    DeleteBulkAction::make()->label(__('Delete with chunks')),
                ]),
            ]);
    }
}
