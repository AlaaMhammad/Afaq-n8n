<?php

use Illuminate\Support\Facades\DB;

it('has the pgvector extension enabled', function () {
    expect(DB::scalar("SELECT count(*) FROM pg_extension WHERE extname = 'vector'"))->toBe(1);
});

it('stores knowledge embeddings as vector(768)', function () {
    $type = DB::scalar(<<<'SQL'
        SELECT format_type(atttypid, atttypmod) FROM pg_attribute
        WHERE attrelid = 'knowledge_documents'::regclass AND attname = 'embedding'
    SQL);

    expect($type)->toBe('vector(768)');
});

it('indexes embeddings with HNSW for cosine distance', function () {
    $definition = DB::scalar("SELECT indexdef FROM pg_indexes WHERE indexname = 'knowledge_documents_embedding_hnsw'");

    expect($definition)->toContain('USING hnsw')->toContain('vector_cosine_ops');
});

it('orders chunks by cosine similarity using the HNSW-backed operator', function () {
    $parent = DB::table('knowledge_documents')->insertGetId([
        'title' => 'Parent', 'content' => 'x', 'category' => 'faq', 'locale' => 'en', 'metadata' => '{}',
        'created_at' => now(), 'updated_at' => now(),
    ]);
    $vector = fn (int $hot) => '['.implode(',', array_map(fn ($i) => $i === $hot ? 1 : 0, range(0, 767))).']';

    foreach (['near' => 0, 'far' => 500] as $title => $hot) {
        DB::table('knowledge_documents')->insert([
            'parent_id' => $parent, 'title' => $title, 'content' => $title, 'category' => 'faq', 'locale' => 'en',
            'embedding' => $vector($hot), 'metadata' => '{}', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    $rows = DB::select(
        'SELECT title, 1 - (embedding <=> ?::vector) AS score FROM knowledge_documents
         WHERE embedding IS NOT NULL ORDER BY embedding <=> ?::vector LIMIT 2',
        [$vector(0), $vector(0)],
    );

    expect($rows[0]->title)->toBe('near')
        ->and((float) $rows[0]->score)->toEqualWithDelta(1.0, 1e-6)
        ->and((float) $rows[1]->score)->toEqualWithDelta(0.0, 1e-6);
});
