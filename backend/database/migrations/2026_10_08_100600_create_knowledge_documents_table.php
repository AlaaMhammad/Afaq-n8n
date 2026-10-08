<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $dimensions = (int) config('ai.embeddings.dimensions', 768);

        Schema::create('knowledge_documents', function (Blueprint $table) use ($dimensions) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('knowledge_documents')->cascadeOnDelete();
            $table->string('title');
            $table->text('content');
            $table->string('category', 48);
            $table->string('locale', 5);
            $table->unsignedSmallInteger('chunk_index')->nullable();
            $table->vector('embedding', dimensions: $dimensions)->nullable();
            $table->char('content_hash', 64)->nullable();
            $table->string('embedding_model', 64)->nullable();
            $table->timestamp('indexed_at')->nullable();
            $table->jsonb('metadata')->default('{}');
            $table->timestamps();

            $table->index(['locale', 'category']);
        });

        // Approximate nearest-neighbour index for cosine distance (embedding <=> query)
        DB::statement(
            'CREATE INDEX knowledge_documents_embedding_hnsw
             ON knowledge_documents USING hnsw (embedding vector_cosine_ops)
             WITH (m = 16, ef_construction = 64)'
        );
    }

    public function down(): void
    {
        Schema::dropIfExists('knowledge_documents');
    }
};
