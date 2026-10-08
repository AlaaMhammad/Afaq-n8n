<?php

namespace App\Domain\Knowledge;

/**
 * Splits a Markdown knowledge document into retrieval-sized chunks.
 *
 *  - FAQ documents: exactly one Q&A (### heading + answer) per chunk, no overlap.
 *  - Other documents: sections (##/###) and paragraphs are packed greedily up to `maxTokens`;
 *    oversized paragraphs fall back to sentence splitting (Latin and Arabic punctuation);
 *    consecutive chunks of a long passage share ~`overlapTokens` of trailing context.
 *  - Every chunk is prefixed with the document title so it stays self-explanatory in isolation.
 *
 * Spec: docs/04_features/rag_and_ai_agent.md §2
 */
final class Chunker
{
    public function __construct(
        private readonly int $maxTokens = 350,
        private readonly int $overlapTokens = 50,
    ) {}

    /** @return list<string> */
    public function chunk(string $title, string $markdown, bool $isFaq = false): array
    {
        $markdown = str_replace("\r\n", "\n", trim($markdown));
        $markdown = preg_replace('/^#\s+.*\n+/', '', $markdown, 1); // the H1 duplicates the title

        $bodies = $isFaq ? $this->faqEntries($markdown) : $this->pack($this->paragraphs($markdown));

        return array_values(array_map(
            fn (string $body) => trim($title)."\n".trim($body),
            array_filter($bodies, fn (string $body) => trim($body) !== ''),
        ));
    }

    public static function estimateTokens(string $text): int
    {
        $charsPerToken = ArabicNormalizer::arabicRatio($text) > 0.5 ? 3.5 : 4.0;

        return (int) ceil(mb_strlen($text) / $charsPerToken);
    }

    /** @return list<string> */
    private function faqEntries(string $markdown): array
    {
        $entries = preg_split('/^(?=###\s)/m', $markdown) ?: [];

        // Text before the first question (an intro) is kept only if it carries content.
        return array_values(array_filter(array_map('trim', $entries), fn ($e) => $e !== '' && ! preg_match('/^#{1,2}\s[^\n]*$/', $e)));
    }

    /**
     * Paragraphs with their section heading kept attached to the first paragraph that follows it.
     *
     * @return list<string>
     */
    private function paragraphs(string $markdown): array
    {
        $paragraphs = [];
        $pendingHeading = null;

        foreach (preg_split('/\n\s*\n/', $markdown) as $block) {
            $block = trim($block);
            if ($block === '') {
                continue;
            }

            if (preg_match('/^#{2,6}\s[^\n]+$/', $block)) {
                $pendingHeading = $pendingHeading ? $pendingHeading."\n".$block : $block;

                continue;
            }

            $paragraphs[] = $pendingHeading ? $pendingHeading."\n".$block : $block;
            $pendingHeading = null;
        }

        if ($pendingHeading) {
            $paragraphs[] = $pendingHeading;
        }

        return $paragraphs;
    }

    /**
     * Greedy packing of paragraphs (or sentences of oversized paragraphs) into chunks.
     *
     * @param  list<string>  $paragraphs
     * @return list<string>
     */
    private function pack(array $paragraphs): array
    {
        $units = [];
        foreach ($paragraphs as $paragraph) {
            if (self::estimateTokens($paragraph) <= $this->maxTokens) {
                $units[] = ['text' => $paragraph, 'split' => false];
            } else {
                foreach ($this->sentences($paragraph) as $sentence) {
                    $units[] = ['text' => $sentence, 'split' => true];
                }
            }
        }

        $chunks = [];
        $current = [];
        $tokens = 0;

        foreach ($units as $unit) {
            $unitTokens = self::estimateTokens($unit['text']);

            if ($current !== [] && $tokens + $unitTokens > $this->maxTokens) {
                $chunks[] = implode($this->joiner($current), array_column($current, 'text'));
                // Overlap only inside a long passage that had to be split into sentences.
                $current = $unit['split'] ? $this->tail($current) : [];
                $tokens = array_sum(array_map(fn ($u) => self::estimateTokens($u['text']), $current));
            }

            $current[] = $unit;
            $tokens += $unitTokens;
        }

        if ($current !== []) {
            $chunks[] = implode($this->joiner($current), array_column($current, 'text'));
        }

        return $chunks;
    }

    /** @return list<string> */
    private function sentences(string $text): array
    {
        $parts = preg_split('/(?<=[.!?؟۔])\s+|\n+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: [$text];

        // A single "sentence" can still be huge (no punctuation): hard-wrap it.
        $limit = $this->maxTokens * 3;

        return array_merge(...array_map(
            fn (string $s) => mb_strlen($s) > $limit ? mb_str_split($s, $limit) : [trim($s)],
            $parts,
        ));
    }

    /**
     * @param  list<array{text: string, split: bool}>  $units
     * @return list<array{text: string, split: bool}>
     */
    private function tail(array $units): array
    {
        $tail = [];
        $tokens = 0;

        foreach (array_reverse($units) as $unit) {
            $unitTokens = self::estimateTokens($unit['text']);
            if (! $unit['split'] || $tokens + $unitTokens > $this->overlapTokens) {
                break;
            }
            array_unshift($tail, $unit);
            $tokens += $unitTokens;
        }

        return $tail;
    }

    /** @param list<array{text: string, split: bool}> $units */
    private function joiner(array $units): string
    {
        return collect($units)->every(fn ($u) => $u['split']) ? ' ' : "\n\n";
    }
}
