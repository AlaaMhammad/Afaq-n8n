<?php

namespace Database\Seeders\Support;

/**
 * Generates seed-only binary assets without external dependencies:
 * branded avatar images (GD) and simple one-page PDF CVs (hand-built PDF 1.4).
 */
final class DemoAssets
{
    private const SIZE = 512;

    /**
     * Square avatar: obsidian ground, orange→cyan diagonal glow, node-graph motif, pixel initials.
     * Returns WebP bytes (PNG if WebP is unavailable) and the matching extension.
     *
     * @return array{bytes: string, extension: string}
     */
    public static function avatar(string $initials, int $seed): array
    {
        $size = self::SIZE;
        $img = imagecreatetruecolor($size, $size);
        imagealphablending($img, true);

        // Diagonal gradient: #0A0A0C → tinted toward orange / cyan depending on seed
        $from = [10, 10, 12];
        $to = $seed % 2 === 0 ? [255, 107, 0] : [0, 229, 255];
        for ($y = 0; $y < $size; $y++) {
            for ($x = 0; $x < $size; $x += 4) {
                $t = min(1, (($x + $y) / (2 * $size)) ** 2.2 * 0.55);
                $c = imagecolorallocate(
                    $img,
                    (int) ($from[0] + ($to[0] - $from[0]) * $t),
                    (int) ($from[1] + ($to[1] - $from[1]) * $t),
                    (int) ($from[2] + ($to[2] - $from[2]) * $t),
                );
                imagefilledrectangle($img, $x, $y, $x + 3, $y, $c);
            }
        }

        // Node-graph motif: deterministic nodes connected by thin "data" lines
        mt_srand($seed * 7919);
        $orange = imagecolorallocatealpha($img, 255, 107, 0, 70);
        $cyan = imagecolorallocatealpha($img, 0, 229, 255, 80);
        $nodes = [];
        for ($i = 0; $i < 9; $i++) {
            $nodes[] = [mt_rand(40, $size - 40), mt_rand(40, $size - 40)];
        }
        imagesetthickness($img, 2);
        foreach ($nodes as $i => [$x, $y]) {
            [$nx, $ny] = $nodes[($i + 1) % count($nodes)];
            imageline($img, $x, $y, $nx, $ny, $i % 2 ? $cyan : $orange);
        }
        foreach ($nodes as $i => [$x, $y]) {
            imagefilledellipse($img, $x, $y, 14, 14, $i % 2 ? $cyan : $orange);
        }

        // Ring
        imagesetthickness($img, 10);
        imageellipse($img, $size / 2, $size / 2, $size - 40, $size - 40, imagecolorallocatealpha($img, 255, 255, 255, 105));

        // Pixel initials: render with built-in font, upscale with nearest-neighbour for a crisp "terminal" look
        $font = 5;
        $w = imagefontwidth($font) * strlen($initials);
        $h = imagefontheight($font);
        $small = imagecreatetruecolor($w, $h);
        imagesavealpha($small, true);
        imagefill($small, 0, 0, imagecolorallocatealpha($small, 0, 0, 0, 127));
        imagestring($small, $font, 0, 0, $initials, imagecolorallocate($small, 237, 237, 240));
        $scale = 14;
        imagecopyresized($img, $small, (int) (($size - $w * $scale) / 2), (int) (($size - $h * $scale) / 2), 0, 0, $w * $scale, $h * $scale, $w, $h);
        imagedestroy($small);

        ob_start();
        $extension = function_exists('imagewebp') && imagewebp($img, null, 85) ? 'webp' : (imagepng($img) ? 'png' : 'png');
        $bytes = (string) ob_get_clean();
        imagedestroy($img);

        return ['bytes' => $bytes, 'extension' => $extension];
    }

    /**
     * Minimal valid one-page A4 PDF using the standard Helvetica fonts (ASCII text only).
     *
     * @param  array{summary: string, experience: list<string>, education: string}  $cv
     * @param  list<string>  $skills
     */
    public static function cvPdf(string $name, string $role, array $cv, array $skills): string
    {
        $lines = [];
        $y = 780;
        $add = function (string $font, int $size, string $text, int $gap = 0, array $rgb = [0.07, 0.07, 0.08]) use (&$lines, &$y) {
            $lines[] = sprintf('%.2F %.2F %.2F rg BT /%s %d Tf 56 %d Td (%s) Tj ET', $rgb[0], $rgb[1], $rgb[2], $font, $size, $y, self::pdfEscape($text));
            $y -= $size + 6 + $gap;
        };

        $add('F2', 24, $name);
        $add('F1', 13, $role, 4, [1, 0.42, 0]);
        $add('F1', 9, 'Afaq Automation Agency  |  afaqn8n.me  |  Sample CV for demonstration purposes', 14, [0.45, 0.45, 0.5]);

        $add('F2', 12, 'PROFILE', 2);
        foreach (self::wrap($cv['summary'], 92) as $line) {
            $add('F1', 10, $line);
        }
        $y -= 12;

        $add('F2', 12, 'EXPERIENCE', 2);
        foreach ($cv['experience'] as $item) {
            $add('F1', 10, '- '.$item);
        }
        $y -= 12;

        $add('F2', 12, 'SKILLS', 2);
        $add('F1', 10, implode('  /  ', $skills));
        $y -= 12;

        $add('F2', 12, 'EDUCATION', 2);
        $add('F1', 10, $cv['education']);

        // Accent bar
        $stream = "1 0.42 0 rg 0 812 595 30 re f\n0 0.9 1 rg 0 808 595 4 re f\n".implode("\n", $lines);

        $objects = [
            '<< /Type /Catalog /Pages 2 0 R >>',
            '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
            '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
            '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
            '<< /Length '.strlen($stream)." >>\nstream\n".$stream."\nendstream",
        ];

        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $i => $object) {
            $offsets[] = strlen($pdf);
            $pdf .= ($i + 1)." 0 obj\n".$object."\nendobj\n";
        }

        $xref = strlen($pdf);
        $pdf .= 'xref'."\n".'0 '.(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($offsets as $offset) {
            $pdf .= sprintf("%010d 00000 n \n", $offset);
        }
        $pdf .= 'trailer << /Size '.(count($objects) + 1).' /Root 1 0 R >>'."\nstartxref\n".$xref."\n%%EOF\n";

        return $pdf;
    }

    private static function pdfEscape(string $text): string
    {
        return str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $text);
    }

    /** @return list<string> */
    private static function wrap(string $text, int $width): array
    {
        return explode("\n", wordwrap($text, $width));
    }
}
