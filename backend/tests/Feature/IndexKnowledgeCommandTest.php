<?php

use App\Models\KnowledgeDocument;

function knowledgeSource(array $attributes = []): KnowledgeDocument
{
    return KnowledgeDocument::create([
        'title' => 'Pricing',
        'content' => 'Custom n8n nodes start from 1,500 USD.',
        'category' => 'pricing',
        'locale' => 'en',
        ...$attributes,
    ]);
}

it('lists pending documents on a dry run', function () {
    knowledgeSource();

    $this->artisan('rag:index-knowledge --dry-run')
        ->expectsOutputToContain('1 source document(s) need indexing')
        ->assertSuccessful();
});

it('skips documents indexed with the current model and content', function () {
    $doc = knowledgeSource();
    $doc->forceFill([
        'indexed_at' => now(),
        'content_hash' => $doc->currentContentHash(),
        'embedding_model' => KnowledgeDocument::configuredEmbeddingModel(),
    ])->save();

    expect($doc->indexStatus())->toBe(KnowledgeDocument::STATUS_INDEXED);
    $this->artisan('rag:index-knowledge')->expectsOutputToContain('up to date')->assertSuccessful();

    $doc->update(['content' => 'Updated pricing text.']);
    expect($doc->fresh()->indexStatus())->toBe(KnowledgeDocument::STATUS_STALE);
});

it('fails clearly until an embedding driver is bound (Phase 3)', function () {
    knowledgeSource();

    $this->artisan('rag:index-knowledge')
        ->expectsOutputToContain('No embedding driver is bound yet')
        ->assertFailed();
});
