<?php

namespace App\Filament\Widgets;

use App\Domain\Inquiry\Enums\RequestStatus;
use App\Models\ServiceRequest;
use Filament\Widgets\ChartWidget;

class RequestsByStatusChart extends ChartWidget
{
    /** Pipeline colours, new → won/lost. */
    private const COLORS = [
        'new' => '#FF6B00',
        'contacted' => '#00B8D4',
        'qualified' => '#7C83FD',
        'won' => '#22C55E',
        'lost' => '#71717A',
    ];

    protected static ?int $sort = 3;

    protected ?string $maxHeight = '280px';

    protected ?string $pollingInterval = null;

    public function getHeading(): string
    {
        return __('Pipeline by status');
    }

    protected function getType(): string
    {
        return 'doughnut';
    }

    protected function getData(): array
    {
        $counts = ServiceRequest::query()
            ->toBase()
            ->selectRaw('status, COUNT(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');
        $statuses = RequestStatus::cases();

        return [
            'datasets' => [[
                'data' => array_map(fn (RequestStatus $s) => (int) ($counts[$s->value] ?? 0), $statuses),
                'backgroundColor' => array_map(fn (RequestStatus $s) => self::COLORS[$s->value], $statuses),
                'borderWidth' => 0,
            ]],
            'labels' => array_map(fn (RequestStatus $s) => $s->getLabel(), $statuses),
        ];
    }

    protected function getOptions(): array
    {
        return [
            'cutout' => '62%',
            'plugins' => ['legend' => ['position' => 'bottom']],
            'scales' => ['x' => ['display' => false], 'y' => ['display' => false]],
        ];
    }
}
