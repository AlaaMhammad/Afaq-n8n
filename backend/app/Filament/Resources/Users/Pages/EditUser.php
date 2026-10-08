<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\UserResource;
use Filament\Actions\DeleteAction;
use Filament\Resources\Pages\EditRecord;
use Illuminate\Database\Eloquent\Model;

class EditUser extends EditRecord
{
    protected static string $resource = UserResource::class;

    protected function getHeaderActions(): array
    {
        return [
            DeleteAction::make(),
        ];
    }

    /** is_admin is deliberately not mass-assignable on the model. */
    protected function handleRecordUpdate(Model $record, array $data): Model
    {
        if (array_key_exists('is_admin', $data)) {
            $record->forceFill(['is_admin' => (bool) $data['is_admin']]);
            unset($data['is_admin']);
        }

        $record->fill($data)->save();

        return $record;
    }
}
