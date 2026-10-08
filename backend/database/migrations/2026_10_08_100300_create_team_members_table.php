<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('team_members', function (Blueprint $table) {
            $table->id();
            $table->jsonb('name');
            $table->jsonb('role');
            $table->jsonb('bio');
            $table->string('avatar_path')->nullable();
            $table->string('cv_url')->nullable();
            $table->jsonb('skills')->default('[]');
            $table->jsonb('social_links')->default('{}');
            $table->boolean('is_active')->default(true);
            $table->integer('order')->default(0)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_members');
    }
};
