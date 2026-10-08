<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('services', function (Blueprint $table) {
            $table->id();
            $table->jsonb('title');
            $table->string('slug', 160)->unique();
            $table->jsonb('description');
            $table->string('icon', 64)->nullable();
            $table->jsonb('features')->default('[]');
            $table->unsignedInteger('starting_price')->nullable();
            $table->integer('order')->default(0)->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('services');
    }
};
