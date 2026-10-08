# API Endpoints — `/api/v1`

Base URL (dev): `http://localhost:8000/api/v1` · Content type: `application/json; charset=utf-8` · Errors: RFC 7807 ([error_handling.md](error_handling.md)).

## 1. Common behaviour

| Aspect | Rule |
|--------|------|
| Locale | `?locale=ar|en` query param, else `Accept-Language`, else `ar`. Applied by `SetLocale` middleware; translatable fields are returned **resolved** to that locale unless `?translations=all`. |
| Envelope | Collections: `{ "data": [...], "meta": {...}, "links": {...} }` (Laravel `JsonResource`). Single items: `{ "data": {...} }`. |
| Pagination | `?page=` / `?per_page=` (max 50) on admin lists; public lists are small and unpaginated. |
| Caching | Public `GET`s send `Cache-Control: public, max-age=60, stale-while-revalidate=300` and `ETag`. |
| Request ID | `X-Request-Id` echoed back (generated if absent). |
| Throttling | `api` limiter = **60/min per IP**; `ai` limiter = **10/min per IP + session**; `inquiry` limiter = **5/min per IP**. Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`. |

## 2. Route table

| Method | Path | Auth | Throttle | Controller@action |
|--------|------|------|----------|-------------------|
| GET | `/services` | public | api | `ServiceController@index` |
| GET | `/services/{slug}` | public | api | `ServiceController@show` |
| GET | `/projects` | public | api | `ProjectController@index` |
| GET | `/projects/{slug}` | public | api | `ProjectController@show` |
| GET | `/team` | public | api | `TeamMemberController@index` |
| GET | `/team/{id}/cv` | public | api | `TeamMemberController@cv` (streams PDF) |
| POST | `/service-requests` | public | inquiry | `ServiceRequestController@store` |
| POST | `/service-requests/estimate` | public | api | `ServiceRequestController@estimate` |
| POST | `/ai/chat` | public | ai | `AiChatController` (SSE) |
| GET | `/ai/sessions/{uuid}/messages` | public (session-bound) | api | `AiSessionController@messages` |
| GET | `/health` | public | — | `HealthController` (db + redis + vector ext) |
| POST | `/auth/token` | public | 5/min | `AuthTokenController@store` (admin API tokens) |
| DELETE | `/auth/token` | sanctum | api | `AuthTokenController@destroy` |
| GET/POST/PUT/DELETE | `/admin/{services,projects,team-members,service-requests,knowledge-documents}` | sanctum + `ability:admin` | api | `Admin\*Controller` (apiResource) |
| POST | `/admin/knowledge-documents/reindex` | sanctum + `ability:admin` | 2/min | `Admin\KnowledgeReindexController` |

> The Filament panel at `/admin` (web guard, session auth) is the primary admin UI. The `/api/v1/admin/*` endpoints exist for automation (e.g. n8n pushing new knowledge docs).

Route file sketch (`routes/api.php`):

```php
Route::prefix('v1')->middleware(['set-locale', 'throttle:api'])->group(function () {
    Route::apiResource('services', ServiceController::class)->only(['index', 'show'])->scoped(['service' => 'slug']);
    Route::apiResource('projects', ProjectController::class)->only(['index', 'show'])->scoped(['project' => 'slug']);
    Route::get('team', [TeamMemberController::class, 'index']);
    Route::get('team/{teamMember}/cv', [TeamMemberController::class, 'cv'])->name('team.cv');

    Route::post('service-requests', [ServiceRequestController::class, 'store'])->middleware('throttle:inquiry');
    Route::post('service-requests/estimate', [ServiceRequestController::class, 'estimate']);

    Route::post('ai/chat', AiChatController::class)->middleware('throttle:ai')->withoutMiddleware('throttle:api');
    Route::get('ai/sessions/{chatSession}/messages', [AiSessionController::class, 'messages']);

    Route::get('health', HealthController::class);

    Route::middleware(['auth:sanctum', 'abilities:admin'])->prefix('admin')->name('admin.')->group(function () {
        // apiResources ...
    });
});
```

## 3. Resource shapes

### 3.1 Service

```http
GET /api/v1/services?locale=en
```

```json
{
  "data": [
    {
      "id": 1,
      "slug": "custom-n8n-nodes",
      "title": "Custom n8n Nodes",
      "description": "Purpose-built TypeScript nodes ...",
      "icon": "workflow",
      "features": ["Custom TypeScript n8n nodes", "Automated tests & CI publishing"],
      "starting_price": 1500,
      "order": 1
    }
  ]
}
```

### 3.2 Project

```http
GET /api/v1/projects/omnichannel-support-sync?locale=ar
```

```json
{
  "data": {
    "id": 1,
    "slug": "omnichannel-support-sync",
    "title": "مزامنة الدعم متعدد القنوات",
    "client": "Nahdi Retail",
    "summary": "...",
    "metrics": { "avgExecutionMs": 840, "failureRate": 0, "nodesCount": 4, "monthlyRuns": 120000, "hoursSavedPerMonth": 310 },
    "workflow": { "version": 1, "camera": {...}, "nodes": [ { "id": "webhook", "kind": "trigger", "label": "استقبال Webhook", "...": "..." } ], "edges": [...] },
    "services": [ { "slug": "ai-voice-chat-agents", "title": "..." } ],
    "live_url": null,
    "cover_url": "http://localhost:8000/storage/projects/omni.webp",
    "is_featured": true
  }
}
```

`workflow` is `workflow_metadata` with node/edge labels resolved to the requested locale.

### 3.3 Team member

```json
{
  "id": 1,
  "name": "عمر الحربي",
  "role": "المؤسس ومهندس الأتمتة",
  "bio": "...",
  "avatar_url": "http://localhost:8000/storage/team/avatars/....webp",
  "cv": { "preview_url": "http://localhost:8000/api/v1/team/1/cv", "download_url": "http://localhost:8000/api/v1/team/1/cv?download=1" },
  "skills": ["n8n", "Laravel", "PostgreSQL"],
  "social_links": { "linkedin": "https://linkedin.com/in/..." },
  "order": 1
}
```

`GET /team/{id}/cv` returns `application/pdf` with `Content-Disposition: inline` (or `attachment` when `?download=1`). If `cv_url` is an absolute external URL, responds `302` to it.

### 3.4 Create service request

```http
POST /api/v1/service-requests
Content-Type: application/json
```

```json
{
  "client_name": "Sara Al-Qahtani",
  "client_email": "sara@example.com",
  "client_phone": "+966500000000",
  "company": "Qimma Logistics",
  "service_slug": "whatsapp-business-automation",
  "budget_range": "5k_15k",
  "timeline": "1_3_months",
  "requirements": "Automate order status notifications via WhatsApp for 3 warehouses...",
  "locale": "ar",
  "consent": true,
  "website": ""
}
```

Validation (`StoreServiceRequestRequest`):

| Field | Rules |
|-------|-------|
| `client_name` | required, string, 2–120 |
| `client_email` | required, `email:rfc,dns` (dns skipped in testing), max 254 |
| `client_phone` | nullable, string, regex E.164 `^\+?[1-9]\d{7,14}$` |
| `company` | nullable, string, max 160 |
| `service_slug` | nullable, `exists:services,slug` |
| `budget_range` | required, `Rule::enum(BudgetRange::class)` |
| `timeline` | nullable, `Rule::enum(Timeline::class)` |
| `requirements` | required, string, 20–5000 |
| `consent` | `accepted` |
| `website` | honeypot — must be empty (`prohibited` if filled → silently 201 with fake ref) |

`201 Created`:

```json
{ "data": { "reference": "AFQ-7K2M9P", "status": "new", "estimate": { "min": 2500, "max": 4000, "currency": "USD" } } }
```

Side effects: `NotifyN8nOfInquiry` job dispatched `afterCommit`.

### 3.5 Estimate (no persistence)

`POST /service-requests/estimate` with `{ service_slug, budget_range, timeline, complexity: 1..5 }` → `{ "data": { "min": 2500, "max": 4000, "currency": "USD", "weeks": [3, 5] } }`. Rules in [service_request.md](../04_features/service_request.md).

## 4. AI chat — Server-Sent Events

```http
POST /api/v1/ai/chat
Content-Type: application/json
Accept: text/event-stream
```

```json
{ "session_id": "b3f0c2a4-...-uuid or null", "message": "اعرض لي مشروع استخراج الفواتير مفككاً", "locale": "ar", "context": { "active_section": "services" } }
```

| Field | Rules |
|-------|-------|
| `session_id` | nullable uuid; if null or unknown, a new session is created |
| `message` | required, string, 1–2000 chars |
| `locale` | required, `in:ar,en` |
| `context.active_section` | nullable, `in:hero,services,portfolio,team,order` |

Response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `X-Accel-Buffering: no`, `Connection: keep-alive`. Implemented with `response()->eventStream()` (Laravel 12) or `StreamedResponse` + `ob_flush()/flush()`.

### Event catalogue

| `event:` | `data:` payload | When |
|----------|-----------------|------|
| `session` | `{ "session_id": "uuid" }` | first event, always |
| `sources` | `[{ "document_id": 12, "title": "...", "score": 0.82 }]` | after retrieval (may be `[]`) |
| `token` | `{ "delta": "..." }` | each text chunk from the LLM |
| `tool_call` | `{ "id": "call_1", "name": "trigger_3d_workflow", "args": {...} }` | model requested a tool |
| `action` | `{ "id": "act_1", "type": "trigger_3d_workflow", "payload": { "projectSlug": "autonomous-invoice-extractor", "mode": "exploded" } }` | client-side action to execute |
| `tool_result` | `{ "id": "call_1", "ok": true, "summary": "Inquiry AFQ-7K2M9P created" }` | after server tool executes |
| `error` | RFC 7807 object | recoverable or fatal error; stream closes after fatal |
| `done` | `{ "message_id": 431, "usage": { "input": 812, "output": 164 } }` | end of turn |
| `reset` | `{ "text": "…" }` | provider failed mid-answer: replace the current assistant text with `text`, more tokens follow (one retry per round) |

Example stream:

```
event: session
data: {"session_id":"b3f0c2a4-7d1e-4b8a-9b55-0d0f5b3d2c11"}

event: sources
data: [{"document_id":44,"title":"Invoice extractor case study","score":0.84}]

event: token
data: {"delta":"بالتأكيد! "}

event: tool_call
data: {"id":"call_1","name":"trigger_3d_workflow","args":{"project_slug":"autonomous-invoice-extractor","mode":"exploded"}}

event: action
data: {"id":"act_1","type":"trigger_3d_workflow","payload":{"projectSlug":"autonomous-invoice-extractor","mode":"exploded"}}

event: token
data: {"delta":"هذا هو سير العمل مفككاً: ..."}

event: done
data: {"message_id":431,"usage":{"input":812,"output":164}}
```

Server limits: max **4 tool iterations** per turn, max **60 s** wall time, history window = last **12** messages.

### 4.1 Session history

`GET /ai/sessions/{uuid}/messages` → last 50 messages (role, content, actions, created_at). The session UUID acts as a bearer capability; it is unguessable (v4) and never listed.

## 5. Health

`GET /api/v1/health` → `200 {"status":"ok","checks":{"database":"ok","redis":"ok","pgvector":"0.8.0"}}` or `503` with failing checks. Laravel's built-in `/up` remains for container healthchecks.
