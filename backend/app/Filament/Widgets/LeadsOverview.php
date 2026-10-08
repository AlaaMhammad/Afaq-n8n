<?php

namespace App\Filament\Widgets;

use App\Domain\Inquiry\Enums\RequestSource;
use App\Domain\Inquiry\Enums\RequestStatus;
use App\Models\ServiceRequest;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;
use Illuminate\Support\Carbon;

class LeadsOverview extends StatsOverviewWidget
{
    protected static ?int $sort = 1;

    protected ?string $pollingInterval = null;

    protected function getStats(): array
    {
        $since = now()->subDays(7)->startOfDay();
        $newThisWeek = ServiceRequest::where('created_at', '>=', $since)->count();
        $previousWeek = ServiceRequest::whereBetween('created_at', [$since->copy()->subDays(7), $since])->count();

        $closed = ServiceRequest::whereIn('status', [RequestStatus::Won, RequestStatus::Lost])->count();
        $won = ServiceRequest::where('status', RequestStatus::Won)->count();
        $total = ServiceRequest::count();
        $fromAi = ServiceRequest::where('source', RequestSource::AiAgent)->count();
        $awaiting = ServiceRequest::where('status', RequestStatus::New)->count();

        return [
            Stat::make(__('New requests (7 days)'), $newThisWeek)
                ->description($this->trend($newThisWeek, $previousWeek))
                ->descriptionIcon($newThisWeek >= $previousWeek ? 'heroicon-m-arrow-trending-up' : 'heroicon-m-arrow-trending-down')
                ->chart($this->dailyCounts(14))
                ->color($newThisWeek >= $previousWeek ? 'success' : 'warning'),
            Stat::make(__('Awaiting first contact'), $awaiting)
                ->description(__('Status "new": reply within one business day'))
                ->descriptionIcon('heroicon-m-clock')
                ->color($awaiting > 0 ? 'warning' : 'success'),
            Stat::make(__('Win rate'), $closed ? round($won / $closed * 100).'%' : '—')
                ->description(__(':won won of :closed closed', ['won' => $won, 'closed' => $closed]))
                ->descriptionIcon('heroicon-m-trophy')
                ->color('primary'),
            Stat::make(__('Booked by AI agent'), $total ? round($fromAi / $total * 100).'%' : '—')
                ->description(__(':count of :total requests', ['count' => $fromAi, 'total' => $total]))
                ->descriptionIcon('heroicon-m-sparkles')
                ->color('info'),
        ];
    }

    private function trend(int $current, int $previous): string
    {
        if ($previous === 0) {
            return $current > 0 ? __('Up from none last week') : __('No requests in the last two weeks');
        }

        $change = round(($current - $previous) / $previous * 100);

        return __(':change% vs previous 7 days', ['change' => ($change > 0 ? '+' : '').$change]);
    }

    /** @return list<int> */
    private function dailyCounts(int $days): array
    {
        $counts = ServiceRequest::where('created_at', '>=', now()->subDays($days - 1)->startOfDay())
            ->selectRaw('DATE(created_at) as day, COUNT(*) as total')
            ->groupBy('day')
            ->pluck('total', 'day');

        return collect(range($days - 1, 0))
            ->map(fn (int $ago) => (int) ($counts[Carbon::today()->subDays($ago)->toDateString()] ?? 0))
            ->all();
    }
}
