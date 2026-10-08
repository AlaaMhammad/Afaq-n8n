<?php

namespace App\Filament\Resources\ServiceRequests\Actions;

use App\Jobs\NotifyN8nOfInquiry;
use App\Models\ServiceRequest;
use Filament\Actions\Action;
use Filament\Notifications\Notification;

/**
 * Re-queues the signed n8n webhook for a lead (e.g. after the n8n instance was down).
 */
class ResendToN8nAction
{
    public static function make(): Action
    {
        return Action::make('resendToN8n')
            ->label(__('Resend to n8n'))
            ->icon('heroicon-o-paper-airplane')
            ->color('gray')
            ->requiresConfirmation()
            ->action(function (ServiceRequest $record) {
                if (blank(config('ai.n8n.webhook_url')) || blank(config('ai.n8n.webhook_secret'))) {
                    Notification::make()
                        ->warning()
                        ->title(__('n8n webhook is not configured (N8N_WEBHOOK_URL / N8N_WEBHOOK_SECRET).'))
                        ->send();

                    return;
                }

                NotifyN8nOfInquiry::dispatch($record->id);

                Notification::make()->success()->title(__('Notification queued for n8n'))->send();
            });
    }
}
