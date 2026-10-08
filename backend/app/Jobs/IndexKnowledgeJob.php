<?php

namespace App\Jobs;

use App\Models\User;
use Filament\Actions\Action;
use Filament\Notifications\Notification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeUnique;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Str;

/**
 * Runs `rag:index-knowledge` in the background (dispatched from the admin panel)
 * and reports the outcome to the admin who triggered it as a database notification.
 */
class IndexKnowledgeJob implements ShouldBeUnique, ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $timeout = 600;

    public int $tries = 1;

    /**
     * @param  list<int>  $documentIds  empty = every source document that needs it
     */
    public function __construct(
        public array $documentIds = [],
        public bool $force = false,
        public ?int $notifyUserId = null,
    ) {}

    public function uniqueId(): string
    {
        return md5(json_encode([$this->documentIds, $this->force]));
    }

    public function handle(): void
    {
        $started = microtime(true);

        $exitCode = Artisan::call('rag:index-knowledge', array_filter([
            '--force' => $this->force,
            '--id' => $this->documentIds,
        ]));

        $this->notify(
            succeeded: $exitCode === 0,
            output: trim(Artisan::output()),
            seconds: round(microtime(true) - $started, 1),
        );
    }

    private function notify(bool $succeeded, string $output, float $seconds): void
    {
        $user = $this->notifyUserId ? User::find($this->notifyUserId) : null;

        if (! $user) {
            return;
        }

        $lastLine = Str::of($output)->explode("\n")->map(fn ($l) => trim($l))->filter()->last() ?? '';
        $lastLine = preg_replace('/^(ERROR|INFO|WARN|WARNING)\s+/', '', $lastLine); // console component tag

        Notification::make()
            ->title($succeeded ? __('Knowledge re-index finished') : __('Knowledge re-index failed'))
            ->body(__(':seconds s — :message', ['seconds' => $seconds, 'message' => Str::limit($lastLine, 220)]))
            ->status($succeeded ? 'success' : 'danger')
            ->actions([
                Action::make('open')
                    ->label(__('Knowledge documents'))
                    ->url(route('filament.admin.resources.knowledge-documents.index')),
            ])
            ->sendToDatabase($user);
    }
}
