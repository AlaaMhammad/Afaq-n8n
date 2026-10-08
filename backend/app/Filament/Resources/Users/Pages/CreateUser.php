<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\UserResource;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

class CreateUser extends CreateRecord
{
    protected static string $resource = UserResource::class;

    /** is_admin is deliberately not mass-assignable on the model. */
    protected function handleRecordCreation(array $data): Model
    {
        $isAdmin = (bool) ($data['is_admin'] ?? false);
        unset($data['is_admin']);

        $user = new (static::getModel())($data);
        $user->forceFill(['is_admin' => $isAdmin])->save();

        return $user;
    }
}
