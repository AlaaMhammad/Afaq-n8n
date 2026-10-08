<?php

namespace App\Services\AI\Support;

use Generator;
use Illuminate\Http\Client\Response;

/**
 * Yields complete lines from a streamed HTTP response body as they arrive
 * (SSE `data:` frames from Gemini, NDJSON from Ollama).
 */
final class StreamLines
{
    /** @return Generator<int, string> */
    public static function of(Response $response, int $chunkSize = 1024): Generator
    {
        $body = $response->toPsrResponse()->getBody();
        $buffer = '';

        while (! $body->eof()) {
            $buffer .= $body->read($chunkSize);

            while (($pos = strpos($buffer, "\n")) !== false) {
                yield rtrim(substr($buffer, 0, $pos), "\r");
                $buffer = substr($buffer, $pos + 1);
            }
        }

        if (trim($buffer) !== '') {
            yield rtrim($buffer, "\r");
        }
    }
}
