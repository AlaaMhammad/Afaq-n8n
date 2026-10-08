# Feature: Admin Dashboard (Filament v4)

## 1. Overview

The admin panel is a **Filament v4** panel mounted at `/admin` on the Laravel app (served via nginx on `:8000` in dev). It uses the `web` guard with session auth — separate from the public stateless API. Only users with `is_admin = true` may access it.

```php
// app/Providers/Filament/AdminPanelProvider.php
return $panel
    ->default()
    ->id('admin')
    ->path('admin')
    ->login()
    ->passwordReset()
    ->brandName('Afaq Admin')
    ->colors(['primary' => Color::hex('#FF6B00'), 'info' => Color::hex('#00E5FF')])
    ->darkMode(true)
    ->defaultThemeMode(ThemeMode::Dark)
    ->discoverResources(in: app_path('Filament/Resources'), for: 'App\\Filament\\Resources')
    ->discoverWidgets(in: app_path('Filament/Widgets'), for: 'App\\Filament\\Widgets')
    ->databaseNotifications()
    ->authMiddleware([Authenticate::class]);
```

Access control: `User implements FilamentUser` with `canAccessPanel(Panel $panel): bool { return $this->is_admin; }`.

Translatable fields: v1 uses explicit `ar`/`en` inputs inside locale `Tabs` bound to `title.ar` / `title.en` (dot-notation on the JSON cast) — no third-party translatable plugin required, which keeps us independent of plugin v4 compatibility.

## 2. Navigation

| Group | Resource / Page | Icon |
|-------|-----------------|------|
| — | Dashboard | `heroicon-o-home` |
| Content | Services | `heroicon-o-squares-2x2` |
| Content | Projects | `heroicon-o-cube-transparent` |
| Content | Team Members | `heroicon-o-user-group` |
| Leads | Service Requests (badge: count of `new`) | `heroicon-o-inbox-arrow-down` |
| AI | Knowledge Documents | `heroicon-o-book-open` |
| AI | Chat Sessions (read-only) | `heroicon-o-chat-bubble-left-right` |
| System | Users | `heroicon-o-shield-check` |

## 3. Resources

### ServiceResource
- Form: locale tabs (title, description, features `Repeater` of `{ar,en}`), slug (auto from `title.en`, unique), icon (`Select` of curated Lucide names with preview), starting price, order.
- Table: title (current locale), slug, starting price, requests count, order — reorderable.

### ProjectResource
- Form sections: *Content* (title/summary ar+en, client, slug, live URL, cover upload, featured toggle, services `Select::multiple` relationship), *Metrics* (5 numeric inputs), *3D Workflow* — a `CodeEditor`/JSON field for `workflow_metadata` validated against the JSON schema in [database_schema.md §4.1](../01_architecture/database_schema.md) plus a `Repeater`-based node editor for the common case (id, kind, labels, position xyz, exploded xyz).
- Header action **Preview 3D** → opens the frontend `/{locale}?project={slug}#portfolio` in a new tab.

### TeamMemberResource
See [team_management.md §4](team_management.md).

### ServiceRequestResource
- Table: reference, client name, email, service, budget, source badge (`web_form` / `ai_agent`), status badge (colored), n8n notified ✓/✗, created at. Filters: status, source, service, date range. Default sort newest.
- View page: infolist with all fields, estimate, metadata, history, linked chat transcript (if `chat_session_id`).
- Actions: **Change status** (with note → `metadata.history`), **Resend to n8n** (dispatches job), **Email client** (`mailto:` link), bulk **Export CSV**.
- No create form (requests come from the site/agent); edit limited to status/notes.

### KnowledgeDocumentResource
- Shows **source documents only** (`parent_id IS NULL`); chunk count + index status column (`Indexed` / `Stale` / `Pending` computed from `content_hash`, `embedding_model`, `indexed_at`).
- Form: title, category select, locale select, content (`MarkdownEditor`), metadata (tags, service slug).
- Row action **Re-index** (single doc), header action **Re-index knowledge** (all stale) — both dispatch `IndexKnowledgeJob` and send a database notification on completion with counts and duration.
- Bulk action **Delete with chunks**.

### ChatSessionResource (read-only)
- Table: session id (short), locale, messages count, flagged count, last activity, led-to-request ✓.
- View: transcript with roles, tool calls, sources, PromptGuard flags.

## 4. Dashboard widgets

| Widget | Type | Data |
|--------|------|------|
| Leads overview | `StatsOverviewWidget` | New requests (7d, with sparkline), conversion rate (won / total), AI-sourced share |
| Requests by status | `ChartWidget` doughnut | `service_requests` grouped by status |
| Requests over time | `ChartWidget` line | last 30 days, split web vs AI |
| Knowledge health | stats | docs, chunks, % indexed, last index run |
| Latest requests | `TableWidget` | 5 newest with quick status action |

Dashboard header action: **Re-index knowledge** (same as on the resource) — satisfies the plan's "action button in Dashboard to trigger `rag:index-knowledge`".

```php
Action::make('reindexKnowledge')
    ->label(__('admin.reindex_knowledge'))
    ->icon('heroicon-o-arrow-path')
    ->requiresConfirmation()
    ->action(function () {
        IndexKnowledgeJob::dispatch(onlyStale: true, notifyUserId: auth()->id());
        Notification::make()->title(__('admin.reindex_queued'))->success()->send();
    });
```

## 5. File storage

- Disk `public` (`storage/app/public`, symlinked by `php artisan storage:link`) for avatars, CVs, project covers.
- Directories: `team/avatars`, `team/cvs`, `projects/covers`.
- Prod: swap to S3-compatible (Cloudflare R2) by setting `FILESYSTEM_DISK=r2` — all code uses `Storage::disk(config('filesystems.media_disk'))`.
- Upload limits enforced in Filament **and** PHP (`upload_max_filesize=10M`, `post_max_size=12M`) **and** nginx (`client_max_body_size 12m`).

## 6. Authentication & seeding

- `AdminUserSeeder` creates `admin@afaqn8n.me` with password from `ADMIN_SEED_PASSWORD` (seeder refuses to run in production if unset or weak).
- Password reset via Laravel mail (Mailpit in dev, optional).
- Session lifetime 120 min; `SESSION_SECURE_COOKIE=true` in prod.

## 7. Localization of the panel

Panel UI follows the admin user's locale (`ar` / `en` switcher via `->userMenuItems`), Filament ships Arabic translations and RTL support out of the box.

## 8. Tests

- Pest + Livewire: non-admin gets 403 on `/admin`; admin can list each resource.
- Livewire: create/edit Service with both locales; validation requires both.
- Livewire: Re-index action dispatches `IndexKnowledgeJob` (`Queue::fake()`).
- Livewire: Change status writes history entry.
