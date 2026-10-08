<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $email = config('afaq.admin_seed.email');
        $password = config('afaq.admin_seed.password');

        if (User::where('email', $email)->exists()) {
            // Never overwrite a password that may have been changed after the first seed.
            User::where('email', $email)->update(['is_admin' => true]);
            $this->command?->info("Admin user {$email} already exists — left unchanged.");

            return;
        }

        if (blank($password) || strlen($password) < 12) {
            if (app()->isProduction()) {
                $this->command?->error('ADMIN_SEED_PASSWORD must be set (min 12 chars) to seed an admin in production. Skipped.');

                return;
            }

            $password = Str::password(16, symbols: false);
            $this->command?->warn("ADMIN_SEED_PASSWORD not set (or < 12 chars). Generated a local password for {$email}: {$password}");
        }

        $user = new User([
            'name' => 'Afaq Admin',
            'email' => $email,
            'password' => $password,
        ]);
        $user->forceFill(['is_admin' => true, 'email_verified_at' => now()])->save();

        $this->command?->info("Admin user {$email} created.");
    }
}
