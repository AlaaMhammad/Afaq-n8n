<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Day-one content. Every seeder is idempotent, so `db:seed` can be re-run safely.
 * The demo leads (and their chat transcripts) are local-only: production starts with an empty inbox.
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
            ServiceSeeder::class,
            ProjectSeeder::class,
            TeamMemberSeeder::class,
            KnowledgeDocumentSeeder::class,
            ...(app()->isProduction() ? [] : [ServiceRequestSeeder::class]),
        ]);
    }
}
