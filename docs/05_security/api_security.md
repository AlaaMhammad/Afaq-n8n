# API Security

## 1. Threat model (summary)

| Asset | Threats | Primary controls |
|-------|---------|------------------|
| Lead data (`service_requests`) | Spam, scraping, PII leakage | Throttling, honeypot, no public read endpoint, admin-only access |
| AI budget (Gemini quota) | Abuse / cost exhaustion, prompt injection | `throttle:10,1`, message length caps, PromptGuard, max tool iterations |
| Admin panel | Credential stuffing, privilege escalation | Session auth, `is_admin` gate, login throttle, policies |
| File storage (CVs, avatars) | Malicious uploads, path traversal | MIME + extension + size checks, random filenames, no execution in `storage/` |
| n8n webhook | Spoofed calls into n8n | HMAC-SHA256 signature, secret rotation |

## 2. Authentication

| Surface | Mechanism |
|---------|-----------|
| Public API (`/api/v1/*` GET, booking, AI chat) | Anonymous; protected by throttling and validation |
| Admin REST (`/api/v1/admin/*`) | **Sanctum personal access tokens** with ability `admin`, issued via `POST /auth/token` (email + password + `device_name`) to `is_admin` users only. Token expiry: `SANCTUM_EXPIRATION=43200` (30 days). |
| Filament panel (`/admin`) | `web` guard session auth (cookie), CSRF protected, `canAccessPanel()` requires `is_admin` |

The Next.js frontend does **not** authenticate visitors, so Sanctum's SPA cookie mode is not needed for the public site. `statefulApi()` is therefore **not** enabled; the API is stateless.

## 3. CORS (`config/cors.php`)

```php
return [
    'paths' => ['api/*'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_filter(explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000'))),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Content-Type', 'Accept', 'Accept-Language', 'Authorization', 'X-Request-Id'],
    'exposed_headers' => ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After'],
    'max_age' => 3600,
    'supports_credentials' => false,
];
```

Prod: `CORS_ALLOWED_ORIGINS=https://afaqn8n.me,https://www.afaqn8n.me`.

## 4. Rate limiting

Defined in `AppServiceProvider::boot()`:

```php
RateLimiter::for('api', fn (Request $r) => Limit::perMinute(60)->by($r->user()?->id ?: $r->ip()));

RateLimiter::for('ai', fn (Request $r) => [
    Limit::perMinute(10)->by('ai-ip:'.$r->ip()),
    Limit::perMinute(10)->by('ai-session:'.$r->input('session_id', $r->ip())),
    Limit::perDay(200)->by('ai-day:'.$r->ip()),
]);

RateLimiter::for('inquiry', fn (Request $r) => [
    Limit::perMinute(5)->by($r->ip()),
    Limit::perDay(20)->by($r->ip()),
]);

RateLimiter::for('login', fn (Request $r) => Limit::perMinute(5)->by(Str::lower($r->input('email')).'|'.$r->ip()));
```

| Limiter | Plan requirement | Applies to |
|---------|------------------|-----------|
| `api` | `throttle:60,1` | all `/api/v1` routes by default |
| `ai` | `throttle:10,1` | `POST /ai/chat` (+ daily cap) |
| `inquiry` | — | `POST /service-requests` |
| `login` | — | `POST /auth/token`, Filament login (Filament has its own throttling too) |

Limiter store: Redis (`CACHE_STORE=redis`). Behind Cloudflare/nginx, real client IPs come from `CF-Connecting-IP` / `X-Forwarded-For` via `TrustProxies` configured with the Docker network + Cloudflare ranges only.

## 5. Authorization (policies)

| Policy | Rule |
|--------|------|
| `ServicePolicy`, `ProjectPolicy`, `TeamMemberPolicy`, `KnowledgeDocumentPolicy` | all abilities → `$user->is_admin` |
| `ServiceRequestPolicy` | `viewAny/view/update` → admin; `create` → false (admin UI), `delete` → admin (soft) |
| `ChatSessionPolicy` | `viewAny/view` → admin; everything else false |
| `UserPolicy` | admin; cannot delete self; cannot demote last admin |

Filament resources automatically use the registered policies.

## 6. Input validation & output encoding

- Every write endpoint uses a `FormRequest`; unknown fields are dropped (`$request->validated()` only).
- JSON responses use `JsonResource`; Markdown in descriptions is rendered client-side via `react-markdown` **without** raw HTML.
- SQL: Eloquent / bound parameters only; the only raw SQL (vector search) uses bindings.
- Mass assignment: models declare `$fillable` explicitly.

## 7. File uploads

| Rule | Avatars | CVs | Project covers |
|------|---------|-----|----------------|
| MIME (content sniffed) | image/jpeg, png, webp | application/pdf | image/jpeg, png, webp |
| Max size | 2 MB | 5 MB | 4 MB |
| Filename | random UUID (`->getUploadedFileNameForStorageUsing` not trusted) | UUID | UUID |
| Post-processing | re-encode to WebP (strips EXIF/payloads) | — | re-encode to WebP |
| Served with | `Cache-Control: public` | `Content-Type: application/pdf`, `X-Content-Type-Options: nosniff`, `Content-Disposition` | |

nginx denies execution under `/storage` (`location ~* ^/storage/.*\.php$ { deny all; }`).

## 8. Transport & headers

- Prod: HTTPS only (Cloudflare Full-Strict), HSTS `max-age=31536000; includeSubDomains`.
- API response headers (middleware `SecurityHeaders`): `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY` (API), `Permissions-Policy: camera=(), geolocation=()`.
- Frontend (Next.js `headers()`): CSP

```
default-src 'self';
script-src 'self' 'unsafe-inline';            # tighten with nonces once stable
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob: https://api.afaqn8n.me;
font-src 'self';
connect-src 'self' https://api.afaqn8n.me;
frame-src https://api.afaqn8n.me;             # CV preview iframe
worker-src 'self' blob:;                       # troika text workers
```

## 9. Webhook signing (outbound to n8n)

`X-Afaq-Signature: sha256=hash_hmac('sha256', $rawBody, N8N_WEBHOOK_SECRET)`. The n8n workflow verifies with a Crypto node before processing. Secret ≥ 32 random bytes, rotated by deploying a new value (n8n accepts old+new during rotation window).

## 10. Secrets management

- `.env` never committed; `.env.example` holds keys with empty values.
- `GEMINI_API_KEY`, `N8N_WEBHOOK_SECRET`, `APP_KEY`, DB passwords supplied via Docker secrets / host env in prod.
- Logs never include request bodies of `/ai/chat` or `/service-requests` (only IDs).

## 11. Privacy

- Raw IPs are not stored — `ip_hash = sha256(ip . APP_KEY)`.
- Chat messages are PII-scrubbed before persistence ([prompt_guard.md](prompt_guard.md)).
- Chat sessions pruned after 30 days of inactivity; lost/won service requests anonymizable from admin (bulk action).

## 12. Checklist (pre-launch)

- [ ] `APP_DEBUG=false`, `APP_ENV=production`
- [ ] CORS origins = production domains only
- [ ] Admin password rotated from seed value; seed user email changed
- [ ] `php artisan config:cache route:cache` in image build
- [ ] Cloudflare WAF managed rules on; rate-limit rule for `/api/v1/ai/chat` (20/min/IP) as an outer layer
- [ ] `composer audit` and `npm audit --omit=dev` clean (or triaged)
