<?php

use App\Models\KnowledgeDocument;
use App\Services\AI\Contracts\EmbeddingDriver;
use App\Services\AI\Contracts\EmbeddingTask;
use App\Services\AI\Drivers\Embedding\FakeEmbeddingDriver;
use App\Services\AI\Retriever;

function knowledgeSource(array $attributes = []): KnowledgeDocument
{
    return KnowledgeDocument::create([
        'title' => 'Pricing',
        'content' => "# Pricing\n\nCustom n8n nodes start from 1,500 USD.\n\n## WhatsApp\n\nWhatsApp automation starts from 1,800 USD.",
        'category' => 'pricing',
        'locale' => 'en',
        ...$attributes,
    ]);
}

it('lists pending documents on a dry run without embedding anything', function () {
    knowledgeSource();

    $this->artisan('rag:index-knowledge --dry-run')
        ->expectsOutputToContain('1 source document(s) need indexing')
        ->assertSuccessful();

    expect(KnowledgeDocument::onlyChunks()->count())->toBe(0);
});

it('chunks and embeds sources into 768-d vectors', function () {
    $doc = knowledgeSource();

    $this->artisan('rag:index-knowledge')
        ->expectsOutputToContain('Indexed 1/1 document(s) → 1 chunks (1 embedded, 0 reused)')
        ->assertSuccessful();

    $chunk = $doc->chunks()->sole();
    expect($chunk->embedding->toArray())->toHaveCount(768)
        ->and($chunk->content)->toStartWith("Pricing\nCustom n8n nodes")
        ->and($chunk->embedding_model)->toBe('fake/bag-of-words')
        ->and($chunk->locale)->toBe('en')
        ->and($doc->fresh()->indexStatus())->toBe(KnowledgeDocument::STATUS_INDEXED);
});

it('skips up-to-date documents and reuses vectors for unchanged chunks', function () {
    $faq = knowledgeSource(['title' => 'FAQ', 'category' => 'faq', 'content' => "### Q1?\nA1 text.\n\n### Q2?\nA2 text."]);
    $this->artisan('rag:index-knowledge')->assertSuccessful();

    $this->artisan('rag:index-knowledge')->expectsOutputToContain('up to date')->assertSuccessful();

    $faq->update(['content' => "### Q1?\nA1 text.\n\n### Q2?\nA2 text changed."]);
    expect($faq->fresh()->indexStatus())->toBe(KnowledgeDocument::STATUS_STALE);

    $this->artisan('rag:index-knowledge')
        ->expectsOutputToContain('2 chunks (1 embedded, 1 reused)')
        ->assertSuccessful();
});

it('re-embeds everything with --force and when the embedding model changes', function () {
    knowledgeSource();
    $this->artisan('rag:index-knowledge')->assertSuccessful();

    $this->artisan('rag:index-knowledge --force')->expectsOutputToContain('(1 embedded, 0 reused)')->assertSuccessful();

    app()->instance(EmbeddingDriver::class, new class extends stdClass implements EmbeddingDriver
    {
        public function embed(string $text, EmbeddingTask $task = EmbeddingTask::Query): array
        {
            return (new FakeEmbeddingDriver)->embed($text);
        }

        public function embedMany(array $texts, EmbeddingTask $task = EmbeddingTask::Document): array
        {
            return (new FakeEmbeddingDriver)->embedMany($texts);
        }

        public function dimensions(): int
        {
            return 768;
        }

        public function model(): string
        {
            return 'ollama/nomic-embed-text';
        }
    });

    expect(KnowledgeDocument::sources()->first()->indexStatus())->toBe(KnowledgeDocument::STATUS_STALE);
    $this->artisan('rag:index-knowledge')->expectsOutputToContain('(1 embedded, 0 reused)')->assertSuccessful();
});

it('retrieves the most similar chunks and filters weak matches', function () {
    knowledgeSource(['title' => 'WhatsApp pricing', 'content' => 'WhatsApp automation price starts from 1,800 USD.']);
    knowledgeSource(['title' => 'Team', 'content' => 'Our engineers and their CVs.']);
    $this->artisan('rag:index-knowledge')->assertSuccessful();

    $hits = app(Retriever::class)->search('WhatsApp automation price', 'en', k: 3, minScore: 0.3);

    expect($hits->pluck('title')->all())->toBe(['WhatsApp pricing'])
        ->and($hits->first()->score)->toBeGreaterThan(0.5)
        ->and($hits->first()->toSource())->toHaveKeys(['document_id', 'title', 'score']);
});

it('prefers chunks in the user language when relevance is equal', function () {
    $same = ['title' => 'Pricing', 'content' => 'WhatsApp automation price starts from 1,800 USD.'];
    knowledgeSource([...$same, 'locale' => 'en']);
    knowledgeSource([...$same, 'locale' => 'ar']);
    $this->artisan('rag:index-knowledge')->assertSuccessful();

    expect(app(Retriever::class)->search('WhatsApp price', 'ar', k: 2, minScore: 0)->first()->locale)->toBe('ar')
        ->and(app(Retriever::class)->search('WhatsApp price', 'en', k: 2, minScore: 0)->first()->locale)->toBe('en');
});
