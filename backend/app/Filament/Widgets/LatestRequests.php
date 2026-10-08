<?php

namespace App\Filament\Widgets;

use App\Filament\Resources\ServiceRequests\Actions\ChangeStatusAction;
use App\Filament\Resources\ServiceRequests\ServiceRequestResource;
use App\Models\ServiceRequest;
use Filament\Actions\Action;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Filament\Widgets\TableWidget;

class LatestRequests extends TableWidget
{
    protected static ?int $sort = 5;

    protected int|string|array $columnSpan = 'full';

    protected function getTableHeading(): string
    {
        return __('Latest requests');
    }

    public function table(Table $table): Table
    {
        return $table
            ->query(fn () => ServiceRequest::query()
                ->with('service')
                ->whereIn('id', ServiceRequest::query()->latest()->limit(5)->select('id')))
            ->defaultSort('created_at', 'desc')
            ->paginated(false)
            ->columns([
                TextColumn::make('reference')->fontFamily('mono'),
                TextColumn::make('client_name')->label(__('Client'))->description(fn (ServiceRequest $r) => $r->company),
                TextColumn::make('service.title')->label(__('Service'))->placeholder(__('Not sure yet'))->limit(30),
                TextColumn::make('source')->badge(),
                TextColumn::make('status')->badge(),
                TextColumn::make('created_at')->label(__('Received'))->since(),
            ])
            ->recordActions([
                ChangeStatusAction::make(),
                Action::make('open')
                    ->label(__('Open'))
                    ->icon('heroicon-o-arrow-top-right-on-square')
                    ->url(fn (ServiceRequest $record) => ServiceRequestResource::getUrl('view', ['record' => $record])),
            ]);
    }
}
