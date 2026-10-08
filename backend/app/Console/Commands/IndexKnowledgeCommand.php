<?php

namespace App\Console\Commands;

use App\Domain\Knowledge\KnowledgeIndexer;
use App\Models\KnowledgeDocument;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Throwable;

/**
 * Chunk + embed knowledge source documents into pgvector.
 * Spec: docs/04_features/rag_and_ai_agent.md §2
 */
class IndexKnowledgeCommand extends Command
{
    protected $signature = 'rag:index-knowledge
        {--force : Re-embed every source document, even if unchanged}
        {--id=* : Only index these source document ids}
        {--dry-run : List what would be indexed without calling the embedding provider}';

    protected $description = 'Chunk and embed knowledge documents for RAG retrieval';

    public function handle(KnowledgeIndexer $indexer): int
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

        $totals = ['chunks' => 0, 'embedded' => 0, 'reused' => 0];
        $failures = [];
        $started = microtime(true);

        $bar = $this->output->createProgressBar($sources->count());
        $bar->start();

        foreach ($sources as $source) {
            try {
                foreach ($indexer->index($source, (bool) $this->option('force')) as $key => $count) {
                    $totals[$key] += $count;
                }
            } catch (Throwable $e) {
                $failures[] = "#{$source->id} {$source->title}: {$e->getMessage()}";
                report($e);
            }
            $bar->advance();
        }

        $bar->finish();
        $this->newLine(2);

        foreach ($failures as $failure) {
            $this->components->error($failure);
        }

        $indexed = $sources->count() - count($failures);
        $summary = sprintf(
            'Indexed %d/%d document(s) → %d chunks (%d embedded, %d reused) in %.1fs.',
            $indexed, $sources->count(), $totals['chunks'], $totals['embedded'], $totals['reused'], microtime(true) - $started,
        );

        if ($failures !== []) {
            $this->components->error($summary);

            return self::FAILURE;
        }

        $this->components->info($summary);

        return self::SUCCESS;
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
