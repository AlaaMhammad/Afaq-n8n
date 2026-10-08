<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->jsonb('title');
            $table->string('slug', 160)->unique();
            $table->string('client', 160);
            $table->jsonb('summary');
            $table->jsonb('workflow_metadata');
            $table->jsonb('metrics');
            $table->string('live_url', 2048)->nullable();
            $table->string('cover_path')->nullable();
            $table->boolean('is_featured')->default(false);
            $table->integer('order')->default(0)->index();
            $table->timestamps();
        });

        Schema::create('project_service', function (Blueprint $table) {
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('service_id')->constrained()->cascadeOnDelete();
            $table->primary(['project_id', 'service_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_service');
        Schema::dropIfExists('projects');
    }
};
