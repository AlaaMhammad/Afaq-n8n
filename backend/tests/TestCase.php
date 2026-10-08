<?php

namespace Tests;

use App\Services\AI\Drivers\Embedding\FakeEmbeddingDriver;
use App\Services\AI\Drivers\Llm\FakeLlmDriver;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Testing\TestResponse;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        FakeLlmDriver::reset();
        FakeEmbeddingDriver::reset();
    }

    /**
     * Parse a Server-Sent Events response into [event, data] pairs.
     *
     * @return list<array{event: string, data: mixed}>
     */
    protected function sseEvents(TestResponse $response): array
    {
        $events = [];

        foreach (preg_split('/\n\n/', trim($response->streamedContent())) as $frame) {
            if (preg_match("/^event: (\S+)\ndata: (.*)$/s", $frame, $m)) {
                $events[] = ['event' => $m[1], 'data' => json_decode($m[2], true)];
            }
        }

        return $events;
    }
}
