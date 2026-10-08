<?php

namespace Database\Seeders;

use App\Models\KnowledgeDocument;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;

/**
 * Seeds source documents only. Chunks + embeddings are produced by
 * `php artisan rag:index-knowledge` (Phase 3) or the admin "Re-index knowledge" action.
 */
class KnowledgeDocumentSeeder extends Seeder
{
    public function run(): void
    {
        foreach (require __DIR__.'/data/knowledge.php' as $topic) {
            foreach (['ar', 'en'] as $locale) {
                $document = KnowledgeDocument::sources()
                    ->where('metadata->seed_key', $topic['key'])
                    ->where('locale', $locale)
                    ->first() ?? new KnowledgeDocument;

                $document->fill([
                    'title' => $topic[$locale]['title'],
                    'content' => trim($topic[$locale]['content']),
                    'category' => $topic['category'],
                    'locale' => $locale,
                    'metadata' => array_filter([
                        'seed_key' => $topic['key'],
                        'service_slug' => $topic['service_slug'] ?? null,
                        'project_slug' => $topic['project_slug'] ?? null,
                        'tags' => array_values(array_filter([$topic['category'], ...Arr::wrap($topic['service_slug'] ?? null)])),
                    ]),
                ])->save();
            }
        }
    }
}
