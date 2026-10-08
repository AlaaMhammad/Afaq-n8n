# Theme & Internationalization

## 1. Color tokens

Dark is the default and primary identity ("Industrial Cyber / Carbon Dark"). Light mode keeps the same accents, darkened to pass WCAG AA on white.

| Token | Dark (default) | Light | Usage |
|-------|----------------|-------|-------|
| `--background` | `#0A0A0C` obsidian | `#F7F7F9` | Page ground |
| `--surface` | `#141419` carbon card | `#FFFFFF` | Cards, widget, modals |
| `--surface-2` | `#1C1C23` | `#EEEEF2` | Inputs, hover rows |
| `--border` | `#26262E` | `#DCDCE3` | Hairlines |
| `--foreground` | `#EDEDF0` | `#111114` | Body text |
| `--muted` | `#8A8A96` | `#5C5C68` | Secondary text |
| `--accent` | `#FF6B00` neon orange | `#E05500` | Primary CTAs, triggers, highlights |
| `--accent-hover` | `#FF5500` | `#C24A00` | |
| `--pulse` | `#00E5FF` cyan | `#0090A8` | Data flow, links, focus rings |
| `--success` | `#22C55E` | `#15803D` | |
| `--danger` | `#F43F5E` | `#BE123C` | |
| `--glow-accent` | `0 0 24px rgb(255 107 0 / .45)` | `0 0 0 transparent` | Neon glow (dark only) |

Contrast checks: `#FF6B00` on `#0A0A0C` = 7.0:1 ✓; `#E05500` on `#FFFFFF` = 3.6:1 → used for large text/UI only; body links in light mode use `--pulse` `#0090A8` (4.6:1 ✓).

3D materials read the same palette from a TS mirror (`src/lib/theme/palette.ts`) because Three.js cannot read CSS variables; the scene re-themes on `theme` change via `useUiStore`.

## 2. Tailwind CSS v4 setup

Tailwind v4 is CSS-first (no `tailwind.config.js`). `src/app/globals.css`:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

:root {            /* light */
  --background: #F7F7F9;
  --surface: #FFFFFF;
  --foreground: #111114;
  --accent: #E05500;
  --pulse: #0090A8;
  /* … */
}
.dark {            /* dark (default — set on <html> by server) */
  --background: #0A0A0C;
  --surface: #141419;
  --foreground: #EDEDF0;
  --accent: #FF6B00;
  --pulse: #00E5FF;
  /* … */
}

@theme inline {
  --color-background: var(--background);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-border: var(--border);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-accent: var(--accent);
  --color-pulse: var(--pulse);
  --font-sans: var(--font-inter), var(--font-plex-arabic), ui-sans-serif, system-ui, sans-serif;
  --font-arabic: var(--font-plex-arabic), var(--font-inter), sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
}
```

Usage: `bg-background text-foreground`, `bg-surface border-border`, `text-accent`, `ring-pulse`.

shadcn/ui is initialized against these tokens (`components.json` → `cssVariables: true`), mapping `--primary` → `--accent`, `--ring` → `--pulse`.

## 3. Theme switching

- Theme persisted in a cookie `afaq-theme` (`dark` | `light`), **read on the server** in the root layout so `<html class="dark">` is correct on first byte (no flash). Default when absent: `dark`.
- `ThemeToggle` (client) updates `useUiStore.theme`, flips the class on `document.documentElement`, and writes the cookie.
- `prefers-color-scheme` is **not** auto-applied — the brand is dark-first; users opt into light.

## 4. Localization with `next-intl`

| Setting | Value |
|---------|-------|
| Locales | `['ar', 'en']` |
| Default | `ar` |
| Prefix | `always` → `/ar/...`, `/en/...`; `/` redirects by `Accept-Language` → `ar` fallback |
| Messages | `frontend/messages/{ar,en}.json` (namespaced: `nav`, `hero`, `services`, `portfolio`, `team`, `booking`, `copilot`, `errors`) |

Files:

```
src/i18n/routing.ts      # defineRouting({ locales, defaultLocale: 'ar', localePrefix: 'always' })
src/i18n/request.ts      # getRequestConfig → loads messages/${locale}.json
src/i18n/navigation.ts   # createNavigation(routing) → Link, redirect, usePathname, useRouter
src/proxy.ts             # next-intl locale negotiation (Next 16 renamed middleware.ts → proxy.ts)
src/app/[locale]/layout.tsx
```

> **Next.js 16 note:** the scaffold ships Next 16.4 with `cacheComponents` enabled. Before implementing Phase 4, verify the routing/proxy and caching APIs against `frontend/node_modules/next/dist/docs/` and the installed `next-intl` version's App Router guide.

Root layout:

```tsx
export default async function LocaleLayout({ children, params }: LayoutProps<'/[locale]'>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const theme = (await cookies()).get('afaq-theme')?.value === 'light' ? '' : 'dark';

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={cn(theme, fontVars)}>
      <body className="bg-background text-foreground antialiased">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

## 5. RTL/LTR rules

1. **Logical properties only**: `ms-*`/`me-*`, `ps-*`/`pe-*`, `start-*`/`end-*`, `text-start`, `border-s`. Lint rule (custom ESLint `no-restricted-syntax` on className strings) flags `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`, `text-left`, `text-right`.
2. **Directional icons** (arrows, chevrons) use `rtl:-scale-x-100`.
3. **Numbers**: display with `Intl.NumberFormat(locale)`; Arabic uses Arabic-Indic digits only in prose — metrics/prices use Latin digits (`numberingSystem: 'latn'`) for scanability.
4. **Fonts**: `IBM Plex Sans Arabic` (400/500/700) for `ar`, `Inter` for `en`, `JetBrains Mono` for code/metrics — loaded with `next/font/google`, `display: 'swap'`, subsets `arabic` / `latin`.
5. **Mixed text**: brand terms ("n8n", "HubSpot") wrapped in `<bdi>` inside Arabic sentences.
6. **Carousels / sliders** read `dir` and reverse swipe direction.
7. **3D**: camera framing is mirrored in RTL so the workflow reads right → left (scene group `scale.x = -1` is **not** used — it would mirror text; instead node X positions are negated in `useLocalizedWorkflow()`).

## 6. Translatable API content

The API resolves translatable fields per `?locale=`; the frontend always passes the current locale in `lib/api/client.ts`. Admin forms (Filament) edit both locales side by side (see [admin_dashboard.md](../04_features/admin_dashboard.md)).

## 7. QA checklist

- [ ] `/ar` renders `dir="rtl"`, nav order mirrored, no horizontal scroll at 375 px.
- [ ] Switching locale preserves the path (`/ar#team` → `/en#team`) and section.
- [ ] Theme toggle has no flash on reload in both themes.
- [ ] All accent text passes AA in both themes (axe in Playwright).
- [ ] Arabic 3D labels shaped correctly (connected letters), no tofu glyphs.
