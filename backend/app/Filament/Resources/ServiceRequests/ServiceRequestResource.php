<?php

namespace App\Filament\Resources\ServiceRequests;

use App\Domain\Inquiry\Enums\RequestStatus;
use App\Filament\Resources\ServiceRequests\Pages\ListServiceRequests;
use App\Filament\Resources\ServiceRequests\Pages\ViewServiceRequest;
use App\Filament\Resources\ServiceRequests\Schemas\ServiceRequestInfolist;
use App\Filament\Resources\ServiceRequests\Tables\ServiceRequestsTable;
use App\Filament\Support\ValidatesRecordKey;
use App\Models\ServiceRequest;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

class ServiceRequestResource extends Resource
{
    use ValidatesRecordKey;

    protected static ?string $model = ServiceRequest::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedInboxArrowDown;

    protected static ?int $navigationSort = 40;

    protected static ?string $recordTitleAttribute = 'reference';

    public static function getModelLabel(): string
    {
        return __('Service request');
    }

    public static function getPluralModelLabel(): string
    {
        return __('Service requests');
    }

    public static function getNavigationGroup(): ?string
    {
        return __('Leads');
    }

    public static function getNavigationBadge(): ?string
    {
        $count = ServiceRequest::where('status', RequestStatus::New)->count();

        return $count > 0 ? (string) $count : null;
    }

    public static function getNavigationBadgeColor(): ?string
    {
        return 'warning';
    }

    /** Requests arrive from the website or the AI agent — never created by hand. */
    public static function canCreate(): bool
    {
        return false;
    }

    public static function infolist(Schema $schema): Schema
    {
        return ServiceRequestInfolist::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return ServiceRequestsTable::configure($table);
    }

    public static function getRecordRouteBindingEloquentQuery(): Builder
    {
        return parent::getRecordRouteBindingEloquentQuery()->withoutGlobalScopes([SoftDeletingScope::class]);
    }

    public static function getGloballySearchableAttributes(): array
    {
        return ['reference', 'client_name', 'client_email', 'company'];
    }

    public static function getPages(): array
    {
        return [
            'index' => ListServiceRequests::route('/'),
            'view' => ViewServiceRequest::route('/{record}'),
        ];
    }
}
