<?php

namespace Database\Seeders;

use App\Models\Service;
use Illuminate\Database\Seeder;

class ServiceSeeder extends Seeder
{
    public function run(): void
    {
        foreach (require __DIR__.'/data/services.php' as $order => $service) {
            Service::updateOrCreate(
                ['slug' => $service['slug']],
                [...$service, 'order' => $order + 1],
            );
        }
    }
}
