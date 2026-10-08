# Frontend Tests

## 1. Tooling

| Layer | Tool | Location |
|-------|------|----------|
| Unit & component | **Vitest** + `@testing-library/react` + `jsdom` | `src/**/*.test.ts(x)` |
| 3D components | Vitest + `@react-three/test-renderer` | `src/components/three/**/*.test.tsx` |
| API mocking | **MSW** (`msw/node` in Vitest, `msw/browser` optional in dev) | `src/test/msw/` |
| End-to-end | **Playwright** (Chromium, Firefox, WebKit) | `e2e/*.spec.ts` |
| Accessibility | `@axe-core/playwright` | inside E2E specs |
| Visual (RTL/LTR) | Playwright `toHaveScreenshot` | `e2e/visual/*.spec.ts` |
| Types & lint | `tsc --noEmit`, `eslint` | CI |

Scripts (`package.json`): `test`, `test:watch`, `test:e2e`, `test:e2e:ui`, `typecheck`, `lint`.

## 2. Unit / component matrix

| Target | Cases |
|--------|-------|
| `stores/scene-store` | `setActiveProject` resets mode/selection; `toggleMode`; quality step-down/up bounds |
| `stores/agent-store` | send → status transitions; abort keeps partial message; action queue FIFO; persist partialize (only sessionId + last 30 msgs) |
| `lib/api/sse-client` | Parses multi-event chunks split across reads; applies `reset` (replaces partial text); invalid JSON → `onError`; unknown event ignored |
| `lib/api/client` | problem+json → `ApiError` with `problem.code`; locale query param appended |
| `useLocalizedWorkflow` | X mirrored for `ar`, untouched for `en`, labels resolved |
| `AgentActionRunner` | `navigate_to` calls scroll helper; `trigger_3d_workflow` sets project then mode (fake timers); invalid payload dropped; sequential execution |
| `BookingForm` | step gating with invalid data; back keeps values; server 422 maps to fields and jumps to step; prefill jumps to step 2 |
| `CopilotPanel` | renders streamed tokens; stop button aborts; action bubble re-run enqueues action; mic hidden when unsupported |
| `TeamCard` | CV buttons hidden without CV; preview opens dialog with iframe src; tilt disabled under reduced motion |
| `ThemeToggle` | toggles `.dark` on `<html>` and writes cookie |
| `WorkflowNode` (test-renderer) | position interpolates with `explodeProgress` 0 → 1; click calls `selectNode` |
| `SceneCanvas` | renders `fallback` when WebGL unavailable (mock `isWebGL2Available` → false) |

## 3. E2E matrix (Playwright)

Projects in `playwright.config.ts`:

| Project | Device | Locale | Theme |
|---------|--------|--------|-------|
| `desktop-ar-dark` | Desktop Chrome 1440×900 | ar | dark |
| `desktop-en-light` | Desktop Firefox 1440×900 | en | light |
| `tablet-ar` | iPad (gen 7) | ar | dark |
| `mobile-ar` | Pixel 7 | ar | dark |
| `mobile-en` | iPhone 14 (WebKit) | en | dark |

Specs:

| Spec | Scenarios |
|------|-----------|
| `home.spec.ts` | All sections render; nav anchors scroll; no horizontal overflow at any viewport (`document.scrollingElement.scrollWidth <= innerWidth`) |
| `rtl.spec.ts` | `/ar` has `dir=rtl`, `lang=ar`; nav order mirrored; directional icons flipped; locale switch preserves hash |
| `theme.spec.ts` | No theme flash on reload (screenshot at DOMContentLoaded); toggle persists |
| `portfolio.spec.ts` | Tab switch updates `data-active-project`; Explode → `data-mode=exploded`; node inspector shows type; WebGL disabled (`--disable-webgl` / WebKit flag) → SVG fallback with nodes |
| `team.spec.ts` | 4 cards; CV preview dialog opens/closes with focus return; download link has `?download=1` |
| `booking.spec.ts` | Complete 5 steps (ar & en) → reference shown; invalid email returns to step 4 (API mocked via `page.route` for determinism, plus one live-backend smoke run) |
| `copilot.spec.ts` | Open with Ctrl+K; mocked SSE stream (route fulfilling `text/event-stream`) renders tokens; `trigger_3d_workflow` action scrolls to portfolio and explodes; rate-limit problem shows countdown |
| `a11y.spec.ts` | axe: no serious/critical violations on home in each project |

Visual snapshots (`e2e/visual`): hero, services grid, team grid, booking step 1 — for `desktop-ar-dark`, `desktop-en-light`, `mobile-ar`. 3D canvases are masked (`mask: [page.locator('canvas')]`) to avoid GPU nondeterminism.

## 4. Mocking strategy

- Unit tests never hit the network — MSW handlers in `src/test/msw/handlers.ts` return fixtures that mirror the backend seeders (`src/test/fixtures/*.json`).
- E2E runs against the Docker stack (`docker compose up`) with `LLM_DRIVER=fake` on the backend for deterministic AI streams, or with `page.route` stubs for the SSE endpoint.

## 5. Performance checks

- Lighthouse CI (`@lhci/cli`) on `/ar` and `/en` mobile: Performance ≥ 85, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 95.
- Bundle budget: `next build` output parsed; 3D chunk ≤ 250 KB gzip (fails CI if exceeded).

## 6. CI

GitHub Actions job `frontend`:
1. `actions/setup-node@v4` (Node 22), `npm ci`.
2. `npm run lint && npm run typecheck && npm run test -- --coverage`.
3. `npx playwright install --with-deps` → `npm run test:e2e` against `docker compose up -d` (backend seeded, fake AI drivers).
4. Upload Playwright report + traces on failure.
