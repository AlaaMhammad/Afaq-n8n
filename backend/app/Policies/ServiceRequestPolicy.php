<?php

namespace App\Policies;

use App\Models\ServiceRequest;
use App\Models\User;

/**
 * Leads come from the website or AI agent; admins triage them but never author them.
 */
class ServiceRequestPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_admin;
    }

    public function view(User $user, ServiceRequest $request): bool
    {
        return $user->is_admin;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, ServiceRequest $request): bool
    {
        return $user->is_admin;
    }

    public function delete(User $user, ServiceRequest $request): bool
    {
        return $user->is_admin;
    }

    public function deleteAny(User $user): bool
    {
        return $user->is_admin;
    }

    public function restore(User $user, ServiceRequest $request): bool
    {
        return $user->is_admin;
    }

    public function restoreAny(User $user): bool
    {
        return $user->is_admin;
    }

    public function forceDelete(User $user, ServiceRequest $request): bool
    {
        return false;
    }

    public function forceDeleteAny(User $user): bool
    {
        return false;
    }
}
