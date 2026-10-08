<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

/**
 * Day-one demo content. Every seeder is idempotent, so `db:seed` can be re-run safely.
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
            ServiceRequestSeeder::class,
        ]);
    }
}
