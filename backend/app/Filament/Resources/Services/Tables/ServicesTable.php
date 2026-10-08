<?php

namespace App\Filament\Resources\Services\Tables;

use App\Filament\Support\Translatable;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;

class ServicesTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn ($query) => $query->withCount(['serviceRequests', 'projects']))
            ->defaultSort('order')
            ->reorderable('order')
            ->columns([
                TextColumn::make('order')->label('#')->sortable()->width('3rem'),
                TextColumn::make('title')
                    ->searchable(query: Translatable::search('title'))
                    ->description(fn ($record) => $record->slug)
                    ->weight('medium'),
                TextColumn::make('icon')->badge()->color('gray'),
                TextColumn::make('starting_price')->label(__('Starting price'))->money('USD')->sortable(),
                TextColumn::make('projects_count')->label(__('Projects'))->sortable()->alignCenter(),
                TextColumn::make('service_requests_count')->label(__('Requests'))->sortable()->alignCenter(),
                TextColumn::make('updated_at')->dateTime()->since()->sortable()->toggleable(isToggledHiddenByDefault: true),
            ])
            ->recordActions([
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
