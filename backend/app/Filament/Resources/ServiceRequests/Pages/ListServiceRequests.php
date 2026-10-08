<?php

namespace App\Filament\Resources\ServiceRequests\Pages;

use App\Domain\Inquiry\Enums\RequestStatus;
use App\Filament\Resources\ServiceRequests\ServiceRequestResource;
use App\Models\ServiceRequest;
use Filament\Resources\Pages\ListRecords;
use Filament\Schemas\Components\Tabs\Tab;
use Illuminate\Database\Eloquent\Builder;

class ListServiceRequests extends ListRecords
{
    protected static string $resource = ServiceRequestResource::class;

    public function getTabs(): array
    {
        $tabs = ['all' => Tab::make(__('All'))];

        foreach ([RequestStatus::New, RequestStatus::Contacted, RequestStatus::Qualified] as $status) {
            $tabs[$status->value] = Tab::make($status->getLabel())
                ->badge(ServiceRequest::where('status', $status)->count())
                ->badgeColor($status->getColor())
                ->modifyQueryUsing(fn (Builder $query) => $query->where('status', $status));
        }

        $tabs['closed'] = Tab::make(__('Closed'))
            ->modifyQueryUsing(fn (Builder $query) => $query->whereIn('status', [RequestStatus::Won, RequestStatus::Lost]));

        return $tabs;
    }
}
