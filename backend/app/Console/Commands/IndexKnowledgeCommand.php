<?php

namespace App\Console\Commands;

use App\Models\KnowledgeDocument;
use App\Services\AI\Contracts\EmbeddingDriver;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;

/**
 * Chunk + embed knowledge source documents into pgvector.
 * Spec: docs/04_features/rag_and_ai_agent.md §2
 *
 * Phase 2 ships source selection (pending / stale / forced) and the admin trigger chain.
 * Phase 3 binds an EmbeddingDriver and adds the chunk → embed → upsert pipeline.
 */
class IndexKnowledgeCommand extends Command
{
    protected $signature = 'rag:index-knowledge
        {--force : Re-embed every source document, even if unchanged}
        {--id=* : Only index these source document ids}
        {--dry-run : List what would be indexed without calling the embedding provider}';

    protected $description = 'Chunk and embed knowledge documents for RAG retrieval';

    public function handle(): int
    {
        $sources = $this->selectSources();

        if ($sources->isEmpty()) {
            $this->components->info('Knowledge base is up to date — nothing to index.');

            return self::SUCCESS;
        }

        $this->table(
            ['ID', 'Locale', 'Category', 'Status', 'Title'],
            $sources->map(fn (KnowledgeDocument $doc) => [
                $doc->id,
                $doc->locale,
                $doc->category->value,
                $doc->indexStatus(),
                mb_strimwidth($doc->title, 0, 60, '…'),
            ]),
        );
        $this->components->info("{$sources->count()} source document(s) need indexing with ".KnowledgeDocument::configuredEmbeddingModel().'.');

        if ($this->option('dry-run')) {
            return self::SUCCESS;
        }

        if (! app()->bound(EmbeddingDriver::class)) {
            $this->components->error('No embedding driver is bound yet. The Gemini/Ollama drivers ship in Phase 3 — run with --dry-run until then.');

            return self::FAILURE;
        }

        // Phase 3: chunk → embedMany → upsert chunks (see rag_and_ai_agent.md §2).
        $this->components->error('Embedding pipeline not implemented yet (Phase 3).');

        return self::FAILURE;
    }

    /** @return Collection<int, KnowledgeDocument> */
    private function selectSources(): Collection
    {
        $query = KnowledgeDocument::sources()->orderBy('id');

        if ($ids = array_filter((array) $this->option('id'))) {
            $query->whereIn('id', $ids);
        }

        $sources = $query->get();

        return $this->option('force')
            ? $sources
            : $sources->reject(fn (KnowledgeDocument $doc) => $doc->indexStatus() === KnowledgeDocument::STATUS_INDEXED)->values();
    }
}
