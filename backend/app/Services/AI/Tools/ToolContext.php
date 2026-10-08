<?php

namespace App\Services\AI\Tools;

use App\Models\ChatSession;

/**
 * Everything a tool may know about the current turn.
 * `userEmails` are addresses the *user* typed in this session — the inquiry tool refuses
 * any other address, so the model can never invent or redirect a lead.
 */
final readonly class ToolContext
{
    /** @param list<string> $userEmails */
    public function __construct(
        public ChatSession $session,
        public string $locale,
        public string $latestUserMessage,
        public array $userEmails = [],
        public ?string $ipAddress = null,
    ) {}
}
