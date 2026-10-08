<?php

namespace App\Policies;

use App\Models\ChatSession;
use App\Models\User;

/**
 * Transcripts are an audit trail: readable by admins, never edited.
 */
class ChatSessionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->is_admin;
    }

    public function view(User $user, ChatSession $session): bool
    {
        return $user->is_admin;
    }

    public function create(User $user): bool
    {
        return false;
    }

    public function update(User $user, ChatSession $session): bool
    {
        return false;
    }

    public function delete(User $user, ChatSession $session): bool
    {
        return false;
    }

    public function deleteAny(User $user): bool
    {
        return false;
    }
}
