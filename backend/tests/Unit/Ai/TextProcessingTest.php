<?php

use App\Domain\Knowledge\ArabicNormalizer;
use App\Domain\Knowledge\Chunker;
use App\Services\AI\PiiScrubber;
use App\Services\AI\Support\Vectors;

describe('ArabicNormalizer', function () {
    it('unifies alef forms, strips diacritics and tatweel, maps Arabic-Indic digits', function () {
        expect(ArabicNormalizer::normalize('أَهْلاً بِكُمْ فـــي إدارة آلية ٢٠٢٦'))->toBe('اهلا بكم في ادارة الية 2026')
            ->and(ArabicNormalizer::normalize('على مستوى'))->toBe('علي مستوي');
    });

    it('measures the share of Arabic letters', function () {
        expect(ArabicNormalizer::arabicRatio('مرحبا'))->toBe(1.0)
            ->and(ArabicNormalizer::arabicRatio('hello'))->toBe(0.0)
            ->and(ArabicNormalizer::arabicRatio('123'))->toBe(0.0);
    });
});

describe('Chunker', function () {
    it('keeps one Q&A per chunk for FAQs, prefixed with the title', function () {
        $chunks = (new Chunker)->chunk('FAQ', "# FAQ\n\n### Q1?\nA1.\n\n### Q2?\nA2.", isFaq: true);

        expect($chunks)->toBe(["FAQ\n### Q1?\nA1.", "FAQ\n### Q2?\nA2."]);
    });

    it('packs short sections together and keeps headings attached', function () {
        $chunks = (new Chunker(350, 50))->chunk('Service', "# Service\n\nIntro text.\n\n## Timeline\n\n2–4 weeks.\n\n## Price\n\nFrom 1,500 USD.");

        expect($chunks)->toHaveCount(1)
            ->and($chunks[0])->toStartWith("Service\nIntro text.")
            ->toContain("## Timeline\n2–4 weeks.")
            ->toContain("## Price\nFrom 1,500 USD.");
    });

    it('splits long passages into bounded chunks with sentence overlap (Arabic punctuation too)', function () {
        $sentence = 'هذه جملة عربية طويلة نسبياً تشرح خطوات الأتمتة بالتفصيل للعميل؟ ';
        $chunks = (new Chunker(60, 20))->chunk('Doc', str_repeat($sentence, 30));

        expect(count($chunks))->toBeGreaterThan(3);
        foreach ($chunks as $chunk) {
            expect(Chunker::estimateTokens($chunk))->toBeLessThanOrEqual(60 + 20);
        }
        // overlap: the next chunk starts with text that ended the previous one
        $tail = mb_substr(trim($chunks[0]), -20);
        expect($chunks[1])->toContain($tail);
    });
});

describe('PiiScrubber', function () {
    it('masks emails, phones, IDs, IBANs and card numbers', function (string $input, string $expected) {
        expect((new PiiScrubber)->scrub($input))->toBe($expected);
    })->with([
        'email' => ['mail me at sara.q@clinic.example please', 'mail me at [email] please'],
        'phone' => ['call +966 50 123 4567', 'call [phone]'],
        'arabic-indic phone' => ['رقمي ٠٥٥١٢٣٤٥٦٧', 'رقمي [phone]'],
        'national id' => ['هويتي 1012345678', 'هويتي [id]'],
        'iban' => ['IBAN SA0380000000608010167519', 'IBAN [iban]'],
        'card (luhn)' => ['card 4111 1111 1111 1111', 'card [card]'],
        'year range kept' => ['from 2021 - 2023', 'from 2021 - 2023'],
        'price kept' => ['From 1,500 USD', 'From 1,500 USD'],
    ]);

    it('extracts lower-cased emails', function () {
        expect((new PiiScrubber)->emails('Sara@Clinic.example and sara@clinic.example'))->toBe(['sara@clinic.example']);
    });
});

describe('Vectors', function () {
    it('normalises to unit length and renders pgvector literals', function () {
        $v = Vectors::normalize([3, 4]);

        expect($v)->toBe([0.6, 0.8])
            ->and(Vectors::literal([0.5, -0.25, 0.0, 1.0]))->toBe('[0.5,-0.25,0,1]');
    });
});
