<?php

namespace App\Filament\Resources\ServiceRequests\Actions;

use App\Domain\Inquiry\Enums\RequestStatus;
use App\Models\ServiceRequest;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Notifications\Notification;

/**
 * Status transition with an optional note, recorded in metadata.history.
 */
class ChangeStatusAction
{
    public static function make(): Action
    {
        return Action::make('changeStatus')
            ->label(__('Change status'))
            ->icon('heroicon-o-arrow-path-rounded-square')
            ->color('primary')
            ->fillForm(fn (ServiceRequest $record) => ['status' => $record->status])
            ->schema([
                Select::make('status')
                    ->options(RequestStatus::class)
                    ->required(),
                Textarea::make('note')
                    ->label(__('Note'))
                    ->rows(3)
                    ->maxLength(1000),
            ])
            ->action(function (ServiceRequest $record, array $data) {
                $status = $data['status'] instanceof RequestStatus ? $data['status'] : RequestStatus::from($data['status']);

                if ($status === $record->status && blank($data['note'] ?? null)) {
                    return;
                }

                $record->transitionTo($status, auth()->user(), $data['note'] ?? null);

                Notification::make()
                    ->success()
                    ->title(__('Status updated to :status', ['status' => $status->getLabel()]))
                    ->send();
            });
    }
}
