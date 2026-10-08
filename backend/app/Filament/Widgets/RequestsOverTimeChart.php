<?php

namespace App\Filament\Widgets;

use App\Domain\Inquiry\Enums\RequestSource;
use App\Models\ServiceRequest;
use Filament\Widgets\ChartWidget;
use Illuminate\Support\Carbon;

class RequestsOverTimeChart extends ChartWidget
{
    private const DAYS = 30;

    protected static ?int $sort = 2;

    protected int|string|array $columnSpan = ['md' => 2];

    protected ?string $maxHeight = '280px';

    protected ?string $pollingInterval = null;

    public function getHeading(): string
    {
        return __('Requests in the last 30 days');
    }

    protected function getType(): string
    {
        return 'line';
    }

    protected function getData(): array
    {
        $rows = ServiceRequest::where('created_at', '>=', now()->subDays(self::DAYS - 1)->startOfDay())
            ->selectRaw('DATE(created_at) as day, source, COUNT(*) as total')
            ->groupBy('day', 'source')
            ->get()
            ->groupBy(fn ($row) => $row->getRawOriginal('source'));

        $days = collect(range(self::DAYS - 1, 0))->map(fn (int $ago) => Carbon::today()->subDays($ago));
        $series = fn (RequestSource $source) => $days
            ->map(fn (Carbon $day) => (int) ($rows->get($source->value)?->first(fn ($row) => $row->day === $day->toDateString())?->total ?? 0))
            ->all();

        return [
            'datasets' => [
                [
                    'label' => RequestSource::WebForm->getLabel(),
                    'data' => $series(RequestSource::WebForm),
                    'borderColor' => '#FF6B00',
                    'backgroundColor' => 'rgba(255, 107, 0, 0.15)',
                    'fill' => true,
                    'tension' => 0.35,
                ],
                [
                    'label' => RequestSource::AiAgent->getLabel(),
                    'data' => $series(RequestSource::AiAgent),
                    'borderColor' => '#00B8D4',
                    'backgroundColor' => 'rgba(0, 229, 255, 0.12)',
                    'fill' => true,
                    'tension' => 0.35,
                ],
            ],
            'labels' => $days->map(fn (Carbon $day) => $day->translatedFormat('M j'))->all(),
        ];
    }

    protected function getOptions(): array
    {
        return [
            'plugins' => ['legend' => ['position' => 'bottom']],
            'scales' => ['y' => ['beginAtZero' => true, 'ticks' => ['precision' => 0]]],
        ];
    }
}
