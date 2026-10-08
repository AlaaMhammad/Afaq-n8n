<?php

namespace App\Filament\Resources\ServiceRequests\Tables;

use App\Domain\Inquiry\Enums\BudgetRange;
use App\Domain\Inquiry\Enums\RequestSource;
use App\Domain\Inquiry\Enums\RequestStatus;
use App\Filament\Resources\ServiceRequests\Actions\ChangeStatusAction;
use App\Filament\Resources\ServiceRequests\Actions\ResendToN8nAction;
use App\Models\ServiceRequest;
use Filament\Actions\BulkAction;
use Filament\Actions\BulkActionGroup;
use Filament\Actions\DeleteBulkAction;
use Filament\Actions\RestoreBulkAction;
use Filament\Actions\ViewAction;
use Filament\Forms\Components\DatePicker;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ServiceRequestsTable
{
    public static function configure(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query->with('service'))
            ->defaultSort('created_at', 'desc')
            ->columns([
                TextColumn::make('reference')
                    ->searchable()
                    ->copyable()
                    ->fontFamily('mono')
                    ->weight('medium'),
                TextColumn::make('client_name')
                    ->label(__('Client'))
                    ->searchable(['client_name', 'client_email', 'company'])
                    ->description(fn (ServiceRequest $record) => $record->client_email),
                TextColumn::make('service.title')
                    ->label(__('Service'))
                    ->placeholder(__('Not sure yet'))
                    ->limit(28),
                TextColumn::make('budget_range')->label(__('Budget'))->badge()->color('gray'),
                TextColumn::make('source')->badge(),
                TextColumn::make('status')->badge()->sortable(),
                IconColumn::make('n8n_notified')
                    ->label('n8n')
                    ->state(fn (ServiceRequest $record) => $record->wasNotifiedToN8n())
                    ->boolean()
                    ->tooltip(fn (ServiceRequest $record) => data_get($record->metadata, 'n8n.last_error')),
                TextColumn::make('created_at')
                    ->label(__('Received'))
                    ->since()
                    ->dateTimeTooltip()
                    ->sortable(),
            ])
            ->filters([
                SelectFilter::make('status')->options(RequestStatus::class)->multiple(),
                SelectFilter::make('source')->options(RequestSource::class),
                SelectFilter::make('budget_range')->label(__('Budget'))->options(BudgetRange::class),
                SelectFilter::make('service')->relationship('service', 'slug')
                    ->getOptionLabelFromRecordUsing(fn ($record) => $record->title),
                Filter::make('created_at')
                    ->schema([
                        DatePicker::make('from')->label(__('Received from')),
                        DatePicker::make('until')->label(__('Received until')),
                    ])
                    ->query(fn (Builder $query, array $data) => $query
                        ->when($data['from'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '>=', $date))
                        ->when($data['until'] ?? null, fn ($q, $date) => $q->whereDate('created_at', '<=', $date))),
                TrashedFilter::make(),
            ])
            ->recordActions([
                ViewAction::make(),
                ChangeStatusAction::make(),
                ResendToN8nAction::make()
                    ->visible(fn (ServiceRequest $record) => ! $record->wasNotifiedToN8n()),
            ])
            ->toolbarActions([
                BulkActionGroup::make([
                    BulkAction::make('exportCsv')
                        ->label(__('Export CSV'))
                        ->icon('heroicon-o-arrow-down-tray')
                        ->action(fn (Collection $records) => self::csv($records))
                        ->deselectRecordsAfterCompletion(),
                    DeleteBulkAction::make(),
                    RestoreBulkAction::make(),
                ]),
            ]);
    }

    /** @param Collection<int, ServiceRequest> $records */
    private static function csv(Collection $records): StreamedResponse
    {
        $records->loadMissing('service');

        return response()->streamDownload(function () use ($records) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // UTF-8 BOM so Excel renders Arabic correctly
            fputcsv($out, ['reference', 'received_at', 'status', 'source', 'client_name', 'client_email', 'client_phone', 'company', 'service', 'budget_range', 'timeline', 'estimate_min', 'estimate_max', 'requirements']);

            foreach ($records as $r) {
                fputcsv($out, [
                    $r->reference,
                    $r->created_at?->toIso8601String(),
                    $r->status?->value,
                    $r->source?->value,
                    $r->client_name,
                    $r->client_email,
                    $r->client_phone,
                    $r->company,
                    $r->service?->slug,
                    $r->budget_range?->value,
                    $r->timeline?->value,
                    data_get($r->estimate, 'min'),
                    data_get($r->estimate, 'max'),
                    $r->requirements,
                ]);
            }

            fclose($out);
        }, 'service-requests-'.now()->format('Y-m-d-His').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
    }
}
