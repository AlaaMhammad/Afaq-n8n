<?php

namespace App\Filament\Resources\KnowledgeDocuments;

use App\Filament\Resources\KnowledgeDocuments\Pages\CreateKnowledgeDocument;
use App\Filament\Resources\KnowledgeDocuments\Pages\EditKnowledgeDocument;
use App\Filament\Resources\KnowledgeDocuments\Pages\ListKnowledgeDocuments;
use App\Filament\Resources\KnowledgeDocuments\Schemas\KnowledgeDocumentForm;
use App\Filament\Resources\KnowledgeDocuments\Tables\KnowledgeDocumentsTable;
use App\Filament\Support\ValidatesRecordKey;
use App\Models\KnowledgeDocument;
use BackedEnum;
use Filament\Resources\Resource;
use Filament\Schemas\Schema;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;

/**
 * Manages source documents only; chunks are derived data owned by the indexer.
 */
class KnowledgeDocumentResource extends Resource
{
    use ValidatesRecordKey;

    protected static ?string $model = KnowledgeDocument::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedBookOpen;

    protected static ?int $navigationSort = 50;

    protected static ?string $recordTitleAttribute = 'title';

    public static function getModelLabel(): string
    {
        return __('Knowledge document');
    }

    public static function getPluralModelLabel(): string
    {
        return __('Knowledge documents');
    }

    public static function getNavigationGroup(): ?string
    {
        return __('AI');
    }

    public static function getEloquentQuery(): Builder
    {
        return parent::getEloquentQuery()->sources();
    }

    public static function form(Schema $schema): Schema
    {
        return KnowledgeDocumentForm::configure($schema);
    }

    public static function table(Table $table): Table
    {
        return KnowledgeDocumentsTable::configure($table);
    }

    public static function getPages(): array
    {
        return [
            'index' => ListKnowledgeDocuments::route('/'),
            'create' => CreateKnowledgeDocument::route('/create'),
            'edit' => EditKnowledgeDocument::route('/{record}/edit'),
        ];
    }
}
