<?php

namespace App\Filament\Resources\ServiceRequests\Schemas;

use App\Filament\Resources\ChatSessions\ChatSessionResource;
use App\Models\ServiceRequest;
use Filament\Infolists\Components\RepeatableEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class ServiceRequestInfolist
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Grid::make(3)
                ->schema([
                    Section::make(__('Request'))
                        ->schema([
                            Grid::make(3)->schema([
                                TextEntry::make('reference')->copyable()->fontFamily('mono'),
                                TextEntry::make('status')->badge(),
                                TextEntry::make('source')->badge(),
                                TextEntry::make('service.title')->label(__('Service'))->placeholder(__('Not sure yet')),
                                TextEntry::make('budget_range')->label(__('Budget'))->badge()->color('gray'),
                                TextEntry::make('timeline')->placeholder('—'),
                            ]),
                            TextEntry::make('requirements')
                                ->prose()
                                ->extraAttributes(['dir' => 'auto'])
                                ->columnSpanFull(),
                        ])
                        ->columnSpan(2),

                    Section::make(__('Client'))
                        ->schema([
                            TextEntry::make('client_name')->label(__('Name')),
                            TextEntry::make('client_email')->label(__('Email'))->copyable()
                                ->url(fn (ServiceRequest $record) => 'mailto:'.$record->client_email),
                            TextEntry::make('client_phone')->label(__('Phone'))->copyable()->placeholder('—'),
                            TextEntry::make('company')->placeholder('—'),
                            TextEntry::make('metadata.locale')->label(__('Language'))->badge()->color('gray'),
                        ])
                        ->columnSpan(1),
                ])
                ->columnSpanFull(),

            Grid::make(3)
                ->schema([
                    Section::make(__('Estimate'))
                        ->schema([
                            TextEntry::make('estimate_range')
                                ->label(__('Indicative range'))
                                ->state(fn (ServiceRequest $record) => $record->estimate
                                    ? '$'.number_format($record->estimate['min']).' – $'.number_format($record->estimate['max'])
                                    : null)
                                ->placeholder('—'),
                            TextEntry::make('estimate_weeks')
                                ->label(__('Duration'))
                                ->state(fn (ServiceRequest $record) => isset($record->estimate['weeks'])
                                    ? __(':from–:to weeks', ['from' => $record->estimate['weeks'][0], 'to' => $record->estimate['weeks'][1]])
                                    : null)
                                ->placeholder('—'),
                        ]),

                    Section::make(__('n8n notification'))
                        ->schema([
                            TextEntry::make('metadata.n8n.notified_at')->label(__('Notified at'))->dateTime()->placeholder(__('Not delivered')),
                            TextEntry::make('metadata.n8n.attempts')->label(__('Attempts'))->placeholder('0'),
                            TextEntry::make('metadata.n8n.last_error')->label(__('Last error'))->color('danger')->placeholder('—'),
                        ]),

                    Section::make(__('Origin'))
                        ->schema([
                            TextEntry::make('created_at')->label(__('Received'))->dateTime(),
                            TextEntry::make('metadata.utm.source')->label(__('UTM source'))->placeholder('—'),
                            TextEntry::make('chat_session_id')
                                ->label(__('AI conversation'))
                                ->formatStateUsing(fn (?string $state) => $state ? __('Open transcript') : null)
                                ->url(fn (ServiceRequest $record) => $record->chat_session_id
                                    ? ChatSessionResource::getUrl('view', ['record' => $record->chat_session_id])
                                    : null)
                                ->placeholder('—'),
                        ]),
                ])
                ->columnSpanFull(),

            Section::make(__('Status history'))
                ->schema([
                    RepeatableEntry::make('metadata.history')
                        ->hiddenLabel()
                        ->schema([
                            TextEntry::make('to')->label(__('Status'))->badge(),
                            TextEntry::make('by')->label(__('By'))->placeholder('—'),
                            TextEntry::make('at')->label(__('When'))->dateTime(),
                            TextEntry::make('note')->label(__('Note'))->placeholder('—'),
                        ])
                        ->columns(4)
                        ->placeholder(__('No changes yet')),
                ])
                ->collapsible()
                ->columnSpanFull(),
        ]);
    }
}
