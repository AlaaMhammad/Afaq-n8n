<?php

namespace App\Services\AI;

/**
 * Writes Server-Sent Events frames and flushes them immediately
 * (nginx buffering is disabled for this route; PHP output_buffering is Off).
 * Event catalogue: docs/02_api_specs/endpoints.md §4
 */
class SseEmitter
{
    /** @var list<array{event: string, data: mixed}> */
    private array $sent = [];

    public function emit(string $event, mixed $data): void
    {
        $this->sent[] = ['event' => $event, 'data' => $data];

        echo 'event: '.$event."\n";
        echo 'data: '.json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n\n";

        $this->flush();
    }

    public function comment(string $text): void
    {
        echo ': '.$text."\n\n";
        $this->flush();
    }

    /** @return list<array{event: string, data: mixed}> */
    public function sent(): array
    {
        return $this->sent;
    }

    private function flush(): void
    {
        if (ob_get_level() > 0) {
            ob_flush();
        }
        flush();
    }
}
