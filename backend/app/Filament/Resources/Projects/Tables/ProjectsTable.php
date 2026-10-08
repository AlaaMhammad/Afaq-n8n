<?php

namespace App\Filament\Resources\Projects\Tables;

use App\Filament\Support\Translatable;
use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\TernaryFilter;
use Filament\Tables\Table;

class ProjectsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('order')
            ->reorderable('order')
            ->columns([
                TextColumn::make('order')->label('#')->sortable()->width('3rem'),
                TextColumn::make('title')
                    ->searchable(query: Translatable::search('title'))
                    ->description(fn ($record) => $record->slug)
                    ->weight('medium'),
                TextColumn::make('client')->searchable()->sortable(),
                TextColumn::make('metrics.nodesCount')->label(__('Nodes'))->alignCenter(),
                TextColumn::make('metrics.avgExecutionMs')->label(__('Avg ms'))->numeric()->alignEnd(),
                TextColumn::make('metrics.monthlyRuns')->label(__('Runs / mo'))->numeric()->alignEnd(),
                IconColumn::make('is_featured')->label(__('Featured'))->boolean(),
                TextColumn::make('updated_at')->since()->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->filters([
                TernaryFilter::make('is_featured')->label(__('Featured')),
            ])
            ->recordActions([
                Action::make('preview3d')
                    ->label(__('Preview 3D'))
                    ->icon('heroicon-o-cube-transparent')
                    ->color('info')
                    ->url(fn ($record) => rtrim(config('afaq.frontend_url'), '/').'/'.app()->getLocale().'?project='.$record->slug.'#portfolio', shouldOpenInNewTab: true),
                EditAction::make(),
                DeleteAction::make(),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    DeleteBulkAction::make(),
                ]),
            ]);
    }
}
