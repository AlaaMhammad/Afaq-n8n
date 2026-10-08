<?php

namespace App\Filament\Resources\TeamMembers\Tables;

use App\Filament\Support\Translatable;
use Filament\Actions\Action;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteAction;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\EditAction;
use Filament\Tables\Columns\ImageColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Columns\ToggleColumn;
use Filament\Tables\Table;
use Illuminate\Support\Facades\Storage;

class TeamMembersTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->defaultSort('order')
            ->reorderable('order')
            ->columns([
                TextColumn::make('order')->label('#')->sortable()->width('3rem'),
                ImageColumn::make('avatar_path')->label('')->disk(config('afaq.media.disk'))->circular()->imageSize(40),
                TextColumn::make('name')
                    ->searchable(query: Translatable::search('name'))
                    ->description(fn ($record) => $record->role)
                    ->weight('medium'),
                TextColumn::make('skills')->badge()->color('gray')->limitList(3),
                TextColumn::make('cv_url')
                    ->label(__('CV'))
                    ->formatStateUsing(fn ($state) => $state ? 'PDF' : '—')
                    ->badge()
                    ->color(fn ($state) => $state ? 'success' : 'gray'),
                ToggleColumn::make('is_active')->label(__('Visible')),
            ])
            ->recordActions([
                Action::make('cv')
                    ->label(__('Open CV'))
                    ->icon('heroicon-o-document-arrow-down')
                    ->color('gray')
                    ->visible(fn ($record) => filled($record->cv_url))
                    ->url(fn ($record) => str_starts_with($record->cv_url, 'http')
                        ? $record->cv_url
                        : Storage::disk(config('afaq.media.disk'))->url($record->cv_url), shouldOpenInNewTab: true),
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
