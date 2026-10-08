<?php

namespace Database\Seeders;

use App\Models\TeamMember;
use Database\Seeders\Support\DemoAssets;
use Illuminate\Database\Seeder;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;

class TeamMemberSeeder extends Seeder
{
    public function run(): void
    {
        $disk = Storage::disk(config('afaq.media.disk'));

        foreach (require __DIR__.'/data/team.php' as $member) {
            $avatar = DemoAssets::avatar($member['initials'], $member['order']);
            $avatarPath = config('afaq.media.avatars')."/{$member['key']}.{$avatar['extension']}";
            $disk->put($avatarPath, $avatar['bytes']);

            $cvPath = config('afaq.media.cvs')."/{$member['key']}-cv.pdf";
            $disk->put($cvPath, DemoAssets::cvPdf(
                $member['name']['en'],
                $member['role']['en'],
                $member['cv'],
                $member['skills'],
            ));

            // Matched on the English name so admin edits to other fields survive re-seeding.
            $existing = TeamMember::where('name->en', $member['name']['en'])->first();

            ($existing ?? new TeamMember)->fill([
                ...Arr::only($member, ['name', 'role', 'bio', 'skills', 'social_links', 'order']),
                'avatar_path' => $avatarPath,
                'cv_url' => $cvPath,
                'is_active' => true,
            ])->save();
        }
    }
}
