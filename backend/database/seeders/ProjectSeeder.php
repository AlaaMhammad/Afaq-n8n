<?php

namespace Database\Seeders;

use App\Models\Project;
use App\Models\Service;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;

class ProjectSeeder extends Seeder
{
    public function run(): void
    {
        foreach (require __DIR__.'/data/projects.php' as $order => $data) {
            $project = Project::updateOrCreate(
                ['slug' => $data['slug']],
                [...Arr::except($data, 'services'), 'order' => $order + 1],
            );

            $project->services()->sync(
                Service::whereIn('slug', $data['services'])->pluck('id'),
            );
        }
    }
}
