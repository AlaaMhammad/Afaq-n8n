<?php

namespace App\Domain\Knowledge;

/**
 * Orthographic normalisation applied to text *before embedding* (stored content keeps its
 * original spelling). Reduces spurious distance between variants such as أ/إ/آ/ا or ى/ي.
 */
final class ArabicNormalizer
{
    private const DIACRITICS = '/[\x{064B}-\x{0652}\x{0670}]/u';   // tanween, harakat, shadda, sukun, superscript alef

    private const TATWEEL = '/\x{0640}/u';

    public static function normalize(string $text): string
    {
        $text = preg_replace(self::DIACRITICS, '', $text);
        $text = preg_replace(self::TATWEEL, '', $text);
        $text = strtr($text, ['أ' => 'ا', 'إ' => 'ا', 'آ' => 'ا', 'ٱ' => 'ا']);
        $text = preg_replace('/ى(?=\s|$|[[:punct:]])/u', 'ي', $text);      // alef maqsura at word end
        $text = strtr($text, ['٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4', '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9']);

        return preg_replace('/[ \t]+/u', ' ', $text);
    }

    /** Share of letters that are Arabic script (0..1). */
    public static function arabicRatio(string $text): float
    {
        $letters = preg_match_all('/\p{L}/u', $text);
        if ($letters === 0) {
            return 0.0;
        }

        return preg_match_all('/\p{Arabic}/u', $text) / $letters;
    }
}
