<?php

use App\Filament\Support\Translatable;
use App\Http\Middleware\SetAdminLocale;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Admin panel language switcher (used from the Filament user menu).
Route::get('/admin/locale/{locale}', function (Request $request, string $locale) {
    $request->session()->put(SetAdminLocale::SESSION_KEY, $locale);

    return redirect()->back(fallback: '/admin');
})
    ->whereIn('locale', array_keys(Translatable::LOCALES))
    ->middleware('auth')
    ->name('admin.locale');
