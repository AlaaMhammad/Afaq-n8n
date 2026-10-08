<?php

namespace App\Filament\Resources\TeamMembers\Schemas;

use App\Filament\Support\Translatable;
use Filament\Forms\Components\FileUpload;
use Filament\Forms\Components\KeyValue;
use Filament\Forms\Components\TagsInput;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Forms\Components\Toggle;
use Filament\Schemas\Components\Grid;
use Filament\Schemas\Components\Section;
use Filament\Schemas\Schema;
use Illuminate\Support\Str;

class TeamMemberForm
{
    public const SOCIAL_NETWORKS = ['linkedin', 'github', 'x', 'website'];

    public static function configure(Schema $schema): Schema
    {
        $disk = config('afaq.media.disk');

        return $schema->components([
            Section::make(__('Profile'))
                ->schema([
                    Translatable::tabs(fn (string $locale) => [
                        Grid::make(2)->schema([
                            TextInput::make("name.{$locale}")->label(Translatable::label('Name', $locale))->required()->maxLength(120),
                            TextInput::make("role.{$locale}")->label(Translatable::label('Role', $locale))->required()->maxLength(120),
                        ]),
                        Textarea::make("bio.{$locale}")->label(Translatable::label('Bio', $locale))->required()->rows(5)->maxLength(1200),
                    ]),
                ])
                ->columnSpanFull(),

            Section::make(__('Media'))
                ->schema([
                    Grid::make(2)->schema([
                        FileUpload::make('avatar_path')
                            ->label(__('Avatar'))
                            ->image()
                            ->avatar()
                            ->imageEditor()
                            ->imageCropAspectRatio('1:1')
                            ->disk($disk)
                            ->directory(config('afaq.media.avatars'))
                            ->acceptedFileTypes(['image/jpeg', 'image/png', 'image/webp'])
                            ->maxSize(2048)
                            ->getUploadedFileNameForStorageUsing(fn ($file) => Str::uuid().'.'.$file->guessExtension()),
                        FileUpload::make('cv_url')
                            ->label(__('CV (PDF)'))
                            ->disk($disk)
                            ->directory(config('afaq.media.cvs'))
                            ->acceptedFileTypes(['application/pdf'])
                            ->maxSize(5120)
                            ->downloadable()
                            ->openable()
                            ->getUploadedFileNameForStorageUsing(fn () => Str::uuid().'.pdf')
                            ->helperText(__('PDF only, up to 5 MB. Visitors can preview and download it.')),
                    ]),
                ])
                ->columnSpanFull(),

            Section::make(__('Details'))
                ->schema([
                    Grid::make(2)->schema([
                        TagsInput::make('skills')
                            ->placeholder(__('Add a skill'))
                            ->splitKeys(['Tab', ','])
                            ->rules(['array', 'max:12']),
                        KeyValue::make('social_links')
                            ->label(__('Social links'))
                            ->keyLabel(__('Network'))
                            ->valueLabel(__('URL'))
                            ->helperText(__('Allowed keys: :keys', ['keys' => implode(', ', self::SOCIAL_NETWORKS)]))
                            ->rules([
                                fn () => function (string $attribute, mixed $value, \Closure $fail) {
                                    foreach ((array) $value as $network => $url) {
                                        if (! in_array($network, self::SOCIAL_NETWORKS, true)) {
                                            $fail(__('Unknown network ":network".', ['network' => $network]));
                                        } elseif (! filter_var($url, FILTER_VALIDATE_URL)) {
                                            $fail(__('":network" must be a valid URL.', ['network' => $network]));
                                        }
                                    }
                                },
                            ]),
                    ]),
                    Grid::make(2)->schema([
                        Toggle::make('is_active')->label(__('Visible on website'))->default(true)->inline(false),
                        TextInput::make('order')->numeric()->default(0),
                    ]),
                ])
                ->columnSpanFull(),
        ]);
    }
}
