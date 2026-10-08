<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_admin;
    }

    public function view(User $user, User $model): bool
    {
        return $user->is_admin;
    }

    public function create(User $user): bool
    {
        return $user->is_admin;
    }

    public function update(User $user, User $model): bool
    {
        return $user->is_admin;
    }

    /** Admins cannot delete themselves or the last remaining admin. */
    public function delete(User $user, User $model): bool
    {
        return $user->is_admin
            && ! $user->is($model)
            && ! ($model->is_admin && User::where('is_admin', true)->count() <= 1);
    }

    public function deleteAny(User $user): bool
    {
        return false;
    }
}
