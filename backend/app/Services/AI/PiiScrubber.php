<?php

namespace App\Services\AI;

/**
 * Masks personal data before anything is persisted, logged or embedded.
 * The model still sees the raw current message (it needs the email to file an inquiry);
 * transcripts and logs only ever store the scrubbed form.
 * Spec: docs/05_security/prompt_guard.md §7
 */
final class PiiScrubber
{
    private const ARABIC_INDIC_DIGITS = ['٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4', '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9'];

    public const EMAIL = '/[\p{L}\p{N}._%+\-]+@[\p{L}\p{N}\-]+(?:\.[\p{L}\p{N}\-]+)+/u';

    public function scrub(string $text): string
    {
        $text = strtr($text, self::ARABIC_INDIC_DIGITS);

        $text = preg_replace(self::EMAIL, '[email]', $text);
        $text = preg_replace('/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/', '[iban]', $text);
        $text = preg_replace_callback('/\b(?:\d[ -]?){13,19}\b/', fn ($m) => $this->luhn($m[0]) ? '[card]' : $m[0], $text);
        $text = preg_replace('/\b[12]\d{9}\b/', '[id]', $text);                       // Saudi national ID / iqama
        $text = preg_replace_callback('/(?<![\w\[])\+?\d[\d\s\-()]{7,16}\d(?![\w\]])/u', fn ($m) => preg_match_all('/\d/', $m[0]) >= 9 ? '[phone]' : $m[0], $text);

        return $text;
    }

    /** @return list<string> lower-cased email addresses found in the text */
    public function emails(string $text): array
    {
        preg_match_all(self::EMAIL, $text, $matches);

        return array_values(array_unique(array_map('mb_strtolower', $matches[0])));
    }

    private function luhn(string $number): bool
    {
        $digits = preg_replace('/\D/', '', $number);
        $sum = 0;
        $alternate = false;

        for ($i = strlen($digits) - 1; $i >= 0; $i--) {
            $n = (int) $digits[$i];
            if ($alternate && ($n *= 2) > 9) {
                $n -= 9;
            }
            $sum += $n;
            $alternate = ! $alternate;
        }

        return $sum % 10 === 0;
    }
}
