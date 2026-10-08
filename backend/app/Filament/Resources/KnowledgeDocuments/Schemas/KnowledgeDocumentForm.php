<?php

namespace App\Filament\Resources\KnowledgeDocuments\Schemas;

use App\Domain\Knowledge\Enums\KnowledgeCategory;
use App\Filament\Support\Translatable;
use App\Models\Service;
use Filament\Forms\Components\MarkdownEditor;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\TagsInput;
use Filament\Forms\Components\TextInput;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;

class KnowledgeDocumentForm
{
    public static function configure(Schema $schema): Schema
    {
        return $schema->components([
            Section::make(__('Document'))
                ->description(__('Saved changes mark the document as stale; re-index to refresh the AI assistant.'))
                ->schema([
                    Grid::make(4)->schema([
                        TextInput::make('title')->required()->maxLength(255)->columnSpan(2)->extraInputAttributes(['dir' => 'auto']),
                        Select::make('category')->options(KnowledgeCategory::class)->required(),
                        Select::make('locale')->label(__('Language'))->options(Translatable::LOCALES)->required()->default('ar'),
                    ]),
                    MarkdownEditor::make('content')
                        ->required()
                        ->minLength(50)
                        ->maxLength(30000)
                        ->helperText(__('Use ## headings — the chunker splits on them. In FAQs, use one ### heading per question.'))
                        ->extraAttributes(['dir' => 'auto'])
                        ->columnSpanFull(),
                ])
                ->columnSpanFull(),

            Section::make(__('Metadata'))
                ->schema([
                    Grid::make(2)->schema([
                        Select::make('metadata.service_slug')
                            ->label(__('Related service'))
                            ->options(fn () => Service::orderBy('order')->get()->mapWithKeys(fn ($s) => [$s->slug => $s->title]))
                            ->searchable(),
                        TagsInput::make('metadata.tags')->label(__('Tags')),
                    ]),
                ])
                ->collapsible()
                ->columnSpanFull(),
        ]);
    }
}
