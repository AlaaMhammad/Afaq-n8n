<?php

namespace App\Filament\Resources\ChatSessions;

use App\Filament\Resources\ChatSessions\Pages\ListChatSessions;
use App\Filament\Resources\ChatSessions\Pages\ViewChatSession;
use App\Filament\Support\ValidatesRecordKey;
use App\Models\ChatSession;
use BackedEnum;
use Filament\Actions\ViewAction;
use Filament\Infolists\Components\IconEntry;
use Filament\Infolists\Components\RepeatableEntry;
use Filament\Infolists\Components\TextEntry;
use Filament\Resources\Resource;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\IconColumn;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\Filter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

/**
 * Read-only audit view of Afaq Copilot conversations.
 */
class ChatSessionResource extends Resource
{
    use ValidatesRecordKey;

    protected static ?string $model = ChatSession::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedChatBubbleLeftRight;

    protected static ?int $navigationSort = 60;

    public static function getModelLabel(): string
    {
        return __('Chat session');
    }

    public static function getPluralModelLabel(): string
    {
        return __('Chat sessions');
    }

    public static function getNavigationGroup(): ?string
    {
        return __('AI');
    }

    public static function canCreate(): bool
    {
        return false;
    }

    public static function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query
                ->withCount(['messages', 'messages as flagged_count' => fn ($q) => $q->where('flagged', true)])
                ->withExists('serviceRequests'))
            ->defaultSort('last_activity_at', 'desc')
            ->columns([
                TextColumn::make('id')->label(__('Session'))->formatStateUsing(fn (string $state) => substr($state, 0, 8))->fontFamily('mono')->copyable()->copyableState(fn ($record) => $record->id),
                TextColumn::make('locale')->label(__('Lang'))->badge()->color('gray'),
                TextColumn::make('messages_count')->label(__('Messages'))->alignCenter()->sortable(),
                TextColumn::make('flagged_count')
                    ->label(__('Flagged'))
                    ->badge()
                    ->color(fn (int $state) => $state > 0 ? 'danger' : 'gray')
                    ->alignCenter(),
                IconColumn::make('service_requests_exists')->label(__('Lead'))->boolean(),
                TextColumn::make('last_activity_at')->label(__('Last activity'))->since()->dateTimeTooltip()->sortable(),
            ])
            ->filters([
                Filter::make('flagged')->label(__('Has flagged messages'))
                    ->query(fn (Builder $query) => $query->whereHas('messages', fn ($q) => $q->where('flagged', true))),
                Filter::make('lead')->label(__('Led to a request'))
                    ->query(fn (Builder $query) => $query->has('serviceRequests')),
            ])
            ->recordActions([
                ViewAction::make(),
            ]);
    }

    public static function infolist(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('Session'))
                ->schema([
                    Grid::make(4)->schema([
                        TextEntry::make('id')->label(__('Session'))->fontFamily('mono')->copyable(),
                        TextEntry::make('locale')->label(__('Language'))->badge(),
                        TextEntry::make('created_at')->label(__('Started'))->dateTime(),
                        TextEntry::make('last_activity_at')->label(__('Last activity'))->dateTime(),
                    ]),
                ])
                ->columnSpanFull(),

            Section::make(__('Transcript'))
                ->schema([
                    RepeatableEntry::make('messages')
                        ->hiddenLabel()
                        ->schema([
                            Grid::make(12)->schema([
                                TextEntry::make('role')
                                    ->hiddenLabel()
                                    ->badge()
                                    ->color(fn (string $state) => match ($state) {
                                        'user' => 'gray',
                                        'assistant' => 'primary',
                                        default => 'info',
                                    })
                                    ->columnSpan(1),
                                TextEntry::make('content')
                                    ->hiddenLabel()
                                    ->extraAttributes(['dir' => 'auto'])
                                    ->columnSpan(8),
                                IconEntry::make('flagged')
                                    ->hiddenLabel()
                                    ->boolean()
                                    ->trueIcon('heroicon-o-shield-exclamation')
                                    ->trueColor('danger')
                                    ->falseIcon('heroicon-o-minus')
                                    ->falseColor('gray')
                                    ->columnSpan(1),
                                TextEntry::make('created_at')->hiddenLabel()->time()->color('gray')->columnSpan(2),
                            ]),
                            TextEntry::make('tool_calls')
                                ->label(__('Tool calls'))
                                ->state(fn ($record) => collect($record->tool_calls ?? [])
                                    ->map(fn ($call) => $call['name'].'('.json_encode($call['args'] ?? [], JSON_UNESCAPED_UNICODE).')')
                                    ->implode(' · ') ?: null)
                                ->fontFamily('mono')
                                ->color('info')
                                ->visible(fn ($record) => filled($record->tool_calls)),
                        ]),
                ])
                ->columnSpanFull(),
        ]);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListChatSessions::route('/'),
            'view' => ViewChatSession::route('/{record}'),
        ];
    }
}
