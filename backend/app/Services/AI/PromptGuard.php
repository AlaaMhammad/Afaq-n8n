<?php

namespace App\Services\AI;

use App\Domain\Knowledge\ArabicNormalizer;
use App\Services\AI\Exceptions\PromptRejectedException;

/**
 * Layered defences around the agent (docs/05_security/prompt_guard.md):
 *  L1 sanitise input (control + bidi-override characters, token flooding)
 *  L2 score injection heuristics (config/prompt_guard.php) → block or flag
 *  L3 isolate untrusted text inside <user_message> / <context> delimiters
 *  L5 detect system-prompt leakage and secrets in model output
 * (L4 tool gate lives in ToolRegistry/tools; L6 PII scrubbing in PiiScrubber.)
 */
final class PromptGuard
{
    /** Zero-width and bidirectional-override characters used to hide instructions. */
    private const INVISIBLE = '/[\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2060}-\x{2064}\x{2066}-\x{2069}\x{FEFF}]/u';

    private const SECRET_PATTERNS = [
        '/AIza[0-9A-Za-z_\-]{35}/',
        '/\bsk-[A-Za-z0-9_\-]{20,}/',
        '/-----BEGIN [A-Z ]*PRIVATE KEY-----/',
    ];

    public function sanitize(string $text): string
    {
        $text = preg_replace(self::INVISIBLE, '', $text);
        $text = preg_replace('/[^\P{Cc}\n\t]/u', '', $text); // control chars except newline / tab

        return trim($text);
    }

    /**
     * @return array{score: int, flagged: bool}
     *
     * @throws PromptRejectedException when the message must not reach the model
     */
    public function inspect(string $text): array
    {
        if ($this->isFlooding($text)) {
            throw new PromptRejectedException('Message rejected: repetitive content.');
        }

        $normalized = ArabicNormalizer::normalize($text);
        $score = 0;

        foreach (config('prompt_guard.rules', []) as $rule) {
            if (preg_match($rule['pattern'], $text) || preg_match($rule['pattern'], $normalized)) {
                $score += $rule['score'];
            }
        }

        if ($score >= config('prompt_guard.block_score', 3)) {
            throw new PromptRejectedException('Message rejected by prompt guard.');
        }

        return ['score' => $score, 'flagged' => $score >= config('prompt_guard.flag_score', 1)];
    }

    /** Escape anything that could close our delimiters early, then wrap. */
    public function wrapUserMessage(string $text): string
    {
        return "<user_message>\n".$this->escapeDelimiters($text)."\n</user_message>";
    }

    public function escapeDelimiters(string $text): string
    {
        return preg_replace_callback(
            '/<\s*(\/?)\s*(user_message|context|system|assistant)\s*>/iu',
            fn ($m) => '‹'.$m[1].$m[2].'›',
            $text,
        );
    }

    /** True when the output reproduces enough of the system prompt to count as a leak. */
    public function leaksSystemPrompt(string $output, string $systemPrompt): bool
    {
        $n = (int) config('prompt_guard.leak_ngram', 8);
        $ngrams = fn (string $text) => collect(preg_split('/\s+/u', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY))
            ->sliding($n)
            ->map(fn ($window) => $window->implode(' '))
            ->unique();

        $overlap = $ngrams($output)->intersect($ngrams($this->confidentialPart($systemPrompt)));

        return $overlap->count() > (int) config('prompt_guard.leak_max_matches', 2);
    }

    /**
     * The part of the system prompt that must not be echoed: the RULES/TOOLS instructions.
     * The agency's identity line, page state, project/service lists and retrieved <context> are
     * public facts that answers legitimately repeat, so they are excluded to avoid false positives.
     */
    private function confidentialPart(string $systemPrompt): string
    {
        $start = strpos($systemPrompt, 'RULES');
        $end = strpos($systemPrompt, 'PAGE STATE:');

        if ($start !== false && $end !== false && $end > $start) {
            return substr($systemPrompt, $start, $end - $start);
        }

        // Unknown layout: everything before the retrieved data block (the rules mention "<context>" too).
        $cut = strrpos($systemPrompt, '<context>');

        return $cut === false ? $systemPrompt : substr($systemPrompt, 0, $cut);
    }

    public function redactSecrets(string $text): string
    {
        return preg_replace(self::SECRET_PATTERNS, '[redacted]', $text);
    }

    private function isFlooding(string $text): bool
    {
        $tokens = preg_split('/\s+/u', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY);

        if (count($tokens) < config('prompt_guard.repetition_min_tokens', 20)) {
            return false;
        }

        return max(array_count_values($tokens)) / count($tokens) > config('prompt_guard.repetition_ratio', 0.6);
    }
}
