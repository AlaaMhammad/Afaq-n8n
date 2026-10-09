# Feature: The Team — «العقول خلف العمل / The Minds Behind the Magic»

## 1. Goal

Present the people behind Afaq with credibility: bilingual profiles, skills, socials, and a one-click CV **preview** (in-page modal) and **download**. Fully managed from the admin panel.

## 2. Public UI

- Section heading: **العقول خلف العمل** (ar) / **The Minds Behind the Magic** (en).
- Grid: 4 cards (1 col mobile, 2 tablet, 4 desktop), ordered by `order`.
- **3D tilt card** (CSS 3D, not WebGL — cheap and crisp):
  - `transform: perspective(900px) rotateX(var(--ry)) rotateY(var(--rx))` driven by pointer position (max ±8°), glare highlight following the cursor, spring back on leave (Framer Motion `useSpring`).
  - Disabled on touch devices and with reduced motion.
- Card content: avatar (`next/image`, 1:1, circular with orange→cyan conic border), name, role, 2-line bio excerpt, skill chips (max 5), social icons, actions **Preview CV** / **Download CV**.
- Card back/expanded state (click "More"): full bio.

## 3. CV preview & download

| Action | Behaviour |
|--------|-----------|
| Preview | Opens `<CvPreviewModal>` (shadcn `Dialog`) with `<iframe src="{api}/team/{id}/cv" title=…>`; browsers render PDF natively. On mobile Safari (no inline PDF scrolling) the modal shows the first page as an image via `<object>` fallback + "Open in new tab". |
| Download | `<a href="{api}/team/{id}/cv?download=1" download>` → API responds `Content-Disposition: attachment; filename="{slug-name}-cv.pdf"` |
| No CV | Buttons hidden |

Backend `TeamMemberController@cv`:

```php
public function cv(Request $request, TeamMember $teamMember)
{
    abort_unless($teamMember->is_active && $teamMember->cv_url, 404);

    if (Str::startsWith($teamMember->cv_url, ['http://', 'https://'])) {
        return redirect()->away($teamMember->cv_url);
    }

    $disposition = $request->boolean('download') ? 'attachment' : 'inline';
    return Storage::disk('public')->response(
        $teamMember->cv_url,
        Str::slug($teamMember->getTranslation('name', 'en')).'-cv.pdf',
        ['Content-Type' => 'application/pdf', 'X-Content-Type-Options' => 'nosniff', 'Cache-Control' => 'public, max-age=3600'],
        $disposition,
    );
}
```

## 4. Admin management (Filament)

`TeamMemberResource` form:

| Field | Component | Validation |
|-------|-----------|------------|
| Name (ar / en) | `TextInput` ×2 in locale tabs | required both, max 120 |
| Role (ar / en) | `TextInput` ×2 | required both |
| Bio (ar / en) | `Textarea` ×2 (rows 5) | required both, max 1200 |
| Avatar | `FileUpload::make('avatar_path')->image()->imageEditor()->imageCropAspectRatio('1:1')->disk('public')->directory('team/avatars')->maxSize(2048)` | jpg/png/webp, ≤ 2 MB |
| CV | `FileUpload::make('cv_url')->acceptedFileTypes(['application/pdf'])->disk('public')->directory('team/cvs')->maxSize(5120)->downloadable()->openable()` | PDF only, ≤ 5 MB |
| Skills | `TagsInput` | max 12 |
| Social links | `KeyValue` restricted to `linkedin, github, x, website` | each `url` |
| Active | `Toggle` | |
| Order | table drag-reorder (`->reorderable('order')`) | |

On update/delete, model events on `TeamMember` delete replaced or orphaned files from storage (absolute CV URLs are left alone). Uploads are stored under random UUID filenames. *Planned:* re-encode uploaded avatars to WebP (512×512) with a queued job (`intervention/image`) to strip metadata.

## 5. Seeded profiles

| Order | Name (ar / en) | Role (ar / en) | Skills |
|-------|----------------|----------------|--------|
| 1 | عمر الحربي / Omar Al-Harbi | المؤسس ومهندس الأتمتة / Founder & Automation Architect | n8n, System Design, PostgreSQL, Strategy |
| 2 | ليلى منصور / Layla Mansour | أخصائية n8n أولى / Senior n8n Specialist | n8n, Custom Nodes, TypeScript, Webhooks |
| 3 | يوسف القاسم / Yousef Al-Qasem | مهندس برمجيات متكامل / Full-Stack Engineer | Laravel, Next.js, Three.js, Docker |
| 4 | نورة السبيعي / Noura Al-Subaie | مهندسة ذكاء اصطناعي / AI Engineer | LLMs, RAG, pgvector, Python |

`TeamMemberSeeder` generates the demo assets at seed time with no external dependencies (`database/seeders/Support/DemoAssets.php`): branded 512×512 WebP avatars (obsidian→orange/cyan gradient, node-graph motif, pixel initials, via GD) at `team/avatars/{key}.webp`, and one-page A4 PDF CVs (hand-built PDF 1.4, Helvetica) at `team/cvs/{key}-cv.pdf` on the public disk. Profile data lives in `database/seeders/data/team.php`. Profiles are fictional demo data.

## 6. API

See [endpoints.md §3.3](../02_api_specs/endpoints.md). Only `is_active = true` members are returned.

## 7. Tests

- Pest: `GET /team` returns active members ordered, locale-resolved.
- Pest: `GET /team/{id}/cv` inline vs `?download=1` disposition; 404 when missing; redirect when absolute URL.
- Pest: Filament upload rejects non-PDF CV (Livewire test).
- Playwright: Preview modal opens with iframe pointing at the CV URL; Esc closes and returns focus.

## As built (Phase 6)

- **Team cards** tilt toward the pointer with a glare (`TiltCard`, CSS variables, no React render per move). They are flat on touch devices and with reduced motion.
- **Bilingual bios:** the page loads the team in both locales (`getTeam(otherLocale)`, cached), so each card can switch its role and bio to the other language with the right `lang`/`dir`.
- **CV dialog:** the PDF is shown inline on desktop (fine pointer, ≥ 768 px). On phones the dialog offers **Open** / **Download** instead of an empty frame.
