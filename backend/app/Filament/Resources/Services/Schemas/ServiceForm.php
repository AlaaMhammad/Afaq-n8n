<?php

namespace App\Filament\Resources\Services\Schemas;

use App\Filament\Support\Translatable;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Components\Utilities\Set;
use Filament\Schemas\Schema;
use Illuminate\Support\Str;

class ServiceForm
{
    /** Curated Lucide icon names (rendered by the Next.js frontend). */
    public const ICONS = [
        'workflow' => 'workflow', 'bot' => 'bot', 'refresh-cw' => 'refresh-cw', 'message-circle' => 'message-circle',
        'truck' => 'truck', 'database' => 'database', 'cpu' => 'cpu', 'zap' => 'zap', 'plug' => 'plug',
        'shopping-cart' => 'shopping-cart', 'mail' => 'mail', 'phone' => 'phone', 'brain-circuit' => 'brain-circuit',
        // Official integration marks, rendered by the frontend from simple-icons.
        'brand:n8n' => 'n8n', 'brand:whatsapp' => 'WhatsApp', 'brand:hubspot' => 'HubSpot', 'brand:googlegemini' => 'Google Gemini',
        'brand:shopify' => 'Shopify', 'brand:gmail' => 'Gmail', 'brand:googlesheets' => 'Google Sheets', 'brand:googlecalendar' => 'Google Calendar',
        'brand:postgresql' => 'PostgreSQL', 'brand:zendesk' => 'Zendesk', 'brand:telegram' => 'Telegram',
    ];

    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('Content'))
                ->schema([
                    Translatable::tabs(fn (string $locale) => [
                        TextInput::make("title.{$locale}")
                            ->label(Translatable::label('Title', $locale))
                            ->required()
                            ->maxLength(160)
                            ->live(onBlur: true)
                            ->afterStateUpdated(function (?string $state, Get $get, Set $set, string $operation) use ($locale) {
                                if ($locale === 'en' && $operation === 'create' && blank($get('slug'))) {
                                    $set('slug', Str::slug((string) $state));
                                }
                            }),
                        Textarea::make("description.{$locale}")
                            ->label(Translatable::label('Description', $locale))
                            ->required()
                            ->rows(4)
                            ->maxLength(2000),
                    ]),
                ])
                ->columnSpanFull(),

            Section::make(__('Features'))
                ->description(__('Bullet points shown on the service card, in both languages.'))
                ->schema([
                    Repeater::make('features')
                        ->hiddenLabel()
                        ->schema([
                            TextInput::make('ar')->label(Translatable::label('Feature', 'ar'))->required()->extraInputAttributes(['dir' => 'rtl']),
                            TextInput::make('en')->label(Translatable::label('Feature', 'en'))->required(),
                        ])
                        ->columns(2)
                        ->reorderable()
                        ->defaultItems(1)
                        ->maxItems(8)
                        ->addActionLabel(__('Add feature')),
                ])
                ->columnSpanFull(),

            Section::make(__('Settings'))
                ->schema([
                    Grid::make(4)->schema([
                        TextInput::make('slug')
                            ->required()
                            ->maxLength(160)
                            ->alphaDash()
                            ->unique(ignoreRecord: true),
                        Select::make('icon')
                            ->options(self::ICONS)
                            ->searchable()
                            ->helperText(__('Integration logo or Lucide icon')),
                        TextInput::make('starting_price')
                            ->label(__('Starting price'))
                            ->numeric()
                            ->minValue(0)
                            ->prefix('$')
                            ->helperText(__('Used by the instant estimate')),
                        TextInput::make('order')
                            ->numeric()
                            ->default(0),
                    ]),
                ])
                ->columnSpanFull(),
        ]);
    }
}
