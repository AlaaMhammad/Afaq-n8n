<?php

namespace App\Filament\Resources\Projects\Schemas;

use App\Domain\Catalog\WorkflowMetadata;
use App\Filament\Support\Translatable;
use Filament\Forms\Components\ColorPicker;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Fieldset;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Components\Tabs;
use Filament\Schemas\Components\Tabs\Tab;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Illuminate\Support\Str;

class ProjectForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Tabs::make('Project')
                ->tabs([
                    Tab::make(__('Content'))->icon('heroicon-o-document-text')->schema(self::contentTab()),
                    Tab::make(__('Metrics'))->icon('heroicon-o-chart-bar')->schema(self::metricsTab()),
                    Tab::make(__('3D Workflow'))->icon('heroicon-o-cube-transparent')->schema(self::workflowTab()),
                ])
                ->persistTabInQueryString()
                ->columnSpanFull(),
        ]);
    }

    /** @return array<int, mixed> */
    private static function contentTab(): array
    {
        return [
            Translatable::tabs(fn (string $locale) => [
                TextInput::make("title.{$locale}")
                    ->label(Translatable::label('Title', $locale))
                    ->required()
                    ->maxLength(160),
                Textarea::make("summary.{$locale}")
                    ->label(Translatable::label('Summary', $locale))
                    ->required()
                    ->rows(5)
                    ->maxLength(3000),
            ]),
            Grid::make(3)->schema([
                TextInput::make('slug')
                    ->required()
                    ->alphaDash()
                    ->maxLength(160)
                    ->unique(ignoreRecord: true)
                    ->helperText(__('Used by the AI agent: trigger_3d_workflow(project_slug)')),
                TextInput::make('client')->required()->maxLength(160),
                TextInput::make('live_url')->label(__('Live URL'))->url()->maxLength(2048),
            ]),
            Grid::make(3)->schema([
                Select::make('services')
                    ->relationship('services', 'slug')
                    ->getOptionLabelFromRecordUsing(fn ($record) => $record->title)
                    ->multiple()
                    ->preload()
                    ->columnSpan(2),
                Grid::make(2)->schema([
                    Toggle::make('is_featured')->label(__('Featured'))->inline(false),
                    TextInput::make('order')->numeric()->default(0),
                ])->columnSpan(1),
            ]),
            FileUpload::make('cover_path')
                ->label(__('Cover image'))
                ->image()
                ->disk(config('afaq.media.disk'))
                ->directory(config('afaq.media.project_covers'))
                ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                ->maxSize(4096)
                ->getUploadedFileNameForStorageUsing(fn ($file) => Str::uuid().'.'.$file->guessExtension()),
        ];
    }

    /** @return array<int, mixed> */
    private static function metricsTab(): array
    {
        $metric = fn (string $key, string $label, ?string $suffix = null) => TextInput::make("metrics.{$key}")
            ->label(__($label))
            ->numeric()
            ->minValue(0)
            ->required()
            ->suffix($suffix);

        return [
            Grid::make(3)->schema([
                $metric('avgExecutionMs', 'Average execution time', 'ms'),
                $metric('failureRate', 'Failure rate', '%')->maxValue(100),
                $metric('monthlyRuns', 'Monthly runs'),
                $metric('hoursSavedPerMonth', 'Hours saved per month', 'h'),
                TextInput::make('metrics.nodesCount')
                    ->label(__('Nodes count'))
                    ->disabled()
                    ->dehydrated()
                    ->helperText(__('Calculated from the workflow on save')),
            ]),
        ];
    }

    /** @return array<int, mixed> */
    private static function workflowTab(): array
    {
        $xyz = fn (string $base, string $label) => Fieldset::make(__($label))
            ->schema([
                TextInput::make("{$base}.0")->label('x')->numeric()->default(0)->required(),
                TextInput::make("{$base}.1")->label('y')->numeric()->default(0)->required(),
                TextInput::make("{$base}.2")->label('z')->numeric()->default(0)->required(),
            ])
            ->columns(3);

        return [
            Section::make(__('Nodes'))
                ->description(__('Position = assembled coordinates. Exploded = offset added when the workflow is exploded.'))
                ->schema([
                    Repeater::make('workflow_metadata.nodes')
                        ->hiddenLabel()
                        ->schema([
                            Grid::make(4)->schema([
                                TextInput::make('id')
                                    ->required()
                                    ->regex('/^[a-z0-9][a-z0-9_-]*$/')
                                    ->live(onBlur: true)
                                    ->helperText('e.g. webhook'),
                                Select::make('kind')
                                    ->options(array_combine(WorkflowMetadata::NODE_KINDS, array_map('ucfirst', WorkflowMetadata::NODE_KINDS)))
                                    ->required()
                                    ->default('action'),
                                TextInput::make('n8nType')->label(__('n8n type'))->required()->placeholder('n8n-nodes-base.webhook')->columnSpan(2),
                            ]),
                            Grid::make(2)->schema([
                                TextInput::make('label.ar')->label(Translatable::label('Label', 'ar'))->required()->live(onBlur: true)->extraInputAttributes(['dir' => 'rtl']),
                                TextInput::make('label.en')->label(Translatable::label('Label', 'en'))->required()->live(onBlur: true),
                            ]),
                            Grid::make(2)->schema([
                                $xyz('position', 'Position'),
                                $xyz('exploded', 'Exploded offset'),
                            ]),
                            Grid::make(3)->schema([
                                TextInput::make('stats.avgMs')->label(__('Avg ms'))->numeric()->minValue(0),
                                TextInput::make('stats.executions')->label(__('Executions'))->numeric()->minValue(0),
                                ColorPicker::make('color')->label(__('Accent override')),
                            ]),
                        ])
                        ->itemLabel(fn (array $state): ?string => trim(($state['id'] ?? '').' · '.($state['label']['en'] ?? ''), ' ·') ?: null)
                        ->collapsible()
                        ->collapsed()
                        ->reorderable()
                        ->minItems(1)
                        ->maxItems(24)
                        ->addActionLabel(__('Add node')),
                ]),

            Section::make(__('Edges'))
                ->description(__('Connections that carry animated data packets between nodes.'))
                ->schema([
                    Repeater::make('workflow_metadata.edges')
                        ->hiddenLabel()
                        ->schema([
                            Grid::make(5)->schema([
                                Select::make('from')->options(self::nodeOptions(...))->required(),
                                Select::make('to')->options(self::nodeOptions(...))->required(),
                                TextInput::make('fromPort')->label(__('Output port'))->placeholder('main'),
                                Select::make('type')
                                    ->label(__('Connection'))
                                    ->options(['main' => __('Data'), 'ai' => __('AI sub-node')])
                                    ->default('main')
                                    ->helperText(__('AI sub-node: a model, memory or tool attached to its agent')),
                                Toggle::make('animated')->label(__('Animated packets'))->default(true)->inline(false),
                            ]),
                            Grid::make(2)->schema([
                                TextInput::make('label.ar')->label(Translatable::label('Label', 'ar'))->extraInputAttributes(['dir' => 'rtl']),
                                TextInput::make('label.en')->label(Translatable::label('Label', 'en')),
                            ]),
                        ])
                        ->itemLabel(fn (array $state): ?string => ($state['from'] ?? '?').' → '.($state['to'] ?? '?'))
                        ->collapsible()
                        ->reorderable()
                        ->addActionLabel(__('Add edge')),
                ]),

            Section::make(__('Camera'))
                ->schema([
                    Grid::make(2)->schema([
                        $xyz('workflow_metadata.camera.position', 'Camera position'),
                        $xyz('workflow_metadata.camera.target', 'Camera target'),
                    ]),
                ])
                ->collapsible()
                ->collapsed(),
        ];
    }

    /** @return array<string, string> node id => label, read from the sibling nodes repeater */
    private static function nodeOptions(Get $get): array
    {
        return collect($get('../../nodes') ?? [])
            ->filter(fn ($node) => filled($node['id'] ?? null))
            ->mapWithKeys(fn ($node) => [$node['id'] => $node['id'].' — '.($node['label']['en'] ?? '')])
            ->all();
    }
}
