<?php

namespace App\Filament\Widgets;

use App\Models\KnowledgeDocument;
use Filament\Widgets\StatsOverviewWidget;
use Filament\Widgets\StatsOverviewWidget\Stat;

class KnowledgeHealth extends StatsOverviewWidget
{
    protected static ?int $sort = 4;

    protected ?string $pollingInterval = null;

    protected function getHeading(): ?string
    {
        return __('AI knowledge base');
    }

    protected function getStats(): array
    {
        $sources = KnowledgeDocument::sources()->get();
        $byStatus = $sources->countBy(fn (KnowledgeDocument $doc) => $doc->indexStatus());
        $indexed = $byStatus[KnowledgeDocument::STATUS_INDEXED] ?? 0;
        $chunks = KnowledgeDocument::onlyChunks()->whereNotNull('embedding')->count();
        $lastRun = $sources->max('indexed_at');

        return [
            Stat::make(__('Source documents'), $sources->count())
                ->description(__(':ar Arabic · :en English', [
                    'ar' => $sources->where('locale', 'ar')->count(),
                    'en' => $sources->where('locale', 'en')->count(),
                ]))
                ->descriptionIcon('heroicon-m-language'),
            Stat::make(__('Indexed'), $sources->count() ? round($indexed / $sources->count() * 100).'%' : '—')
                ->description(__(':pending pending · :stale stale', [
                    'pending' => $byStatus[KnowledgeDocument::STATUS_PENDING] ?? 0,
                    'stale' => $byStatus[KnowledgeDocument::STATUS_STALE] ?? 0,
                ]))
                ->descriptionIcon('heroicon-m-cpu-chip')
                ->color($indexed === $sources->count() ? 'success' : 'warning'),
            Stat::make(__('Embedded chunks'), $chunks)
                ->description($lastRun ? __('Last indexed :time', ['time' => $lastRun->diffForHumans()]) : __('Never indexed'))
                ->descriptionIcon('heroicon-m-squares-plus')
                ->color('info'),
        ];
    }
}
