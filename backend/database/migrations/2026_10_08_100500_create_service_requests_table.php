<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_requests', function (Blueprint $table) {
            $table->id();
            $table->string('reference', 16)->unique();
            $table->string('client_name', 120);
            $table->string('client_email', 254)->index();
            $table->string('client_phone', 32)->nullable();
            $table->string('company', 160)->nullable();
            $table->foreignId('service_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignUuid('chat_session_id')->nullable()->constrained()->nullOnDelete();
            $table->string('budget_range', 32);
            $table->string('timeline', 32)->nullable();
            $table->text('requirements');
            $table->string('status', 24)->default('new')->index();
            $table->string('source', 16)->default('web_form');
            $table->jsonb('estimate')->nullable();
            $table->jsonb('metadata')->default('{}');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_requests');
    }
};
