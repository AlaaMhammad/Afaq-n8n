# System Overview

## 1. Architecture at a glance

The platform is **headless**: Laravel 12 exposes a JSON/SSE API and hosts the Filament admin; Next.js renders all public UI (including the 3D scenes) and talks to the API over HTTP. No Blade views are served to visitors.

```mermaid
flowchart LR
    subgraph Client["Browser"]
        UI["Next.js App Router<br/>React 19 + R3F"]
        ZS["Zustand bridge<br/>(scene · agent · ui)"]
        UI <--> ZS
    end

    subgraph Edge["Edge (prod)"]
        CF["Cloudflare<br/>CDN · WAF · cache"]
    end

    subgraph App["Application tier (Docker)"]
        NX["frontend<br/>Node 22 · next"]
        NG["nginx<br/>:80"]
        PHP["backend<br/>PHP 8.2-FPM · Laravel 12"]
        QW["queue worker<br/>php artisan queue:work"]
        FIL["Filament v4 admin<br/>/admin"]
        PHP --- FIL
    end

    subgraph Data["Data tier"]
        PG[("PostgreSQL 16<br/>+ pgvector")]
        RD[("Redis<br/>cache · queues · rate limits")]
        FS[("Storage<br/>public disk · CVs · avatars")]
    end

    subgraph External["External services"]
        GM["Google Gemini API<br/>chat · embeddings"]
        OL["Ollama (optional)<br/>local LLM"]
        N8N["n8n @ afaqn8n.me<br/>webhook"]
    end

    UI -->|HTML/RSC| CF --> NX
    UI -->|REST + SSE /api/v1| CF --> NG --> PHP
    PHP --> PG
    PHP --> RD
    PHP --> FS
    QW --> RD
    QW --> PG
    PHP -->|LlmDriver / EmbeddingDriver| GM
    PHP -.->|driver swap| OL
    QW -->|NotifyN8nOfInquiry| N8N
```

| Container | Image / runtime | Port (dev) | Responsibility |
|-----------|-----------------|-----------|----------------|
| `postgres` | `pgvector/pgvector:pg16` | 5432 | Relational data + vector search |
| `redis` | `redis:alpine` | 6379 | Cache, queues, throttle buckets, chat session TTL |
| `backend` | `php:8.2-fpm-alpine` (custom) | 9000 (internal) | Laravel API, Filament, artisan |
| `nginx` | `nginx:alpine` | 8000 → 80 | HTTP front for FPM, static `public/` |
| `frontend` | `node:22-alpine` | 3000 | Next.js dev server / SSR |
| `queue` *(Phase 3)* | same as `backend` | — | `queue:work redis` for webhook + indexing jobs |

## 2. Core interaction flows

### 2.1 Content page render

```mermaid
sequenceDiagram
    autonumber
    participant B as Browser
    participant N as Next.js (RSC)
    participant L as Laravel API
    participant C as Redis cache
    participant P as Postgres

    B->>N: GET /ar
    N->>L: GET /api/v1/services?locale=ar (fetch, revalidate 300s)
    L->>C: remember("services:ar")
    alt cache miss
        C-->>L: null
        L->>P: SELECT services ORDER BY "order"
        L->>C: put(ttl=600)
    end
    L-->>N: 200 JSON (ServiceResource[])
    N-->>B: streamed HTML + client islands (3D canvas hydrates lazily)
```

### 2.2 AI chat with tool calling (SSE)

```mermaid
sequenceDiagram
    autonumber
    participant W as Copilot widget
    participant A as AiChatController
    participant G as PromptGuard
    participant R as Retriever
    participant E as EmbeddingDriver
    participant P as pgvector
    participant M as LlmDriver
    participant T as ToolRegistry

    W->>A: POST /api/v1/ai/chat {session_id, message, locale}
    A->>G: inspect(message)
    G-->>A: ok | blocked
    A->>E: embed(message)
    E-->>A: float[768]
    A->>R: topK(vector, k=5, minScore=0.60)
    R->>P: ORDER BY embedding <=> :q LIMIT 5
    P-->>R: chunks
    A-->>W: event: sources
    A->>M: stream(system+context+history, tools)
    loop token stream
        M-->>A: delta text
        A-->>W: event: token
    end
    opt model calls a tool
        M-->>A: functionCall(name, args)
        A-->>W: event: tool_call
        A->>T: execute(name, args)
        alt UI tool (navigate_to / trigger_3d_workflow)
            T-->>A: ClientAction
            A-->>W: event: action {type, payload}
        else server tool (submit_service_inquiry)
            T-->>A: ServiceRequest #id
        end
        A->>M: functionResponse(result) → continue stream
    end
    A-->>W: event: done {message_id, usage}
```

**Key rule:** UI tools never touch the server state; they produce a `ClientAction` that the frontend executes through the Zustand bridge (see [state_management.md](state_management.md)). Server tools (`submit_service_inquiry`) are validated with the same `FormRequest` rules as the public booking endpoint.

### 2.3 Inquiry → n8n notification

```mermaid
sequenceDiagram
    participant API as ServiceRequestController / AI tool
    participant DB as Postgres
    participant Q as Redis queue
    participant J as NotifyN8nOfInquiry job
    participant N as n8n webhook

    API->>DB: INSERT service_requests (status=new)
    API->>Q: dispatch(NotifyN8nOfInquiry) afterCommit
    Q->>J: handle()
    J->>N: POST N8N_WEBHOOK_URL (HMAC-SHA256 signed)
    alt 2xx
        J->>DB: metadata.n8n.notified_at = now()
    else failure
        J->>Q: release with backoff [10, 60, 300]s (tries=3)
    end
```

### 2.4 Knowledge ingestion

Admin edits a knowledge document in Filament → clicks **Re-index knowledge** → `IndexKnowledgeJob` (or `php artisan rag:index-knowledge`) chunks, embeds and upserts vectors. See [rag_and_ai_agent.md](../04_features/rag_and_ai_agent.md).

## 3. Backend module boundaries

```
backend/app/
├── Console/Commands/          # rag:index-knowledge
├── Models/                    # Eloquent models (Laravel convention; Filament discovers them here)
├── Domain/                    # Pure business logic (no HTTP)
│   ├── Catalog/               # WorkflowMetadata (3D graph normaliser/validator)
│   ├── Inquiry/               # Enums, EstimateCalculator, ReferenceGenerator, CreateServiceRequest (Phase 3)
│   └── Knowledge/             # KnowledgeCategory enum, Chunker (Phase 3)
├── Services/AI/
│   ├── Contracts/             # LlmDriver, EmbeddingDriver, Tool
│   ├── Drivers/Llm/           # GeminiLlmDriver, OllamaLlmDriver, FakeLlmDriver
│   ├── Drivers/Embedding/     # GeminiEmbeddingDriver, OllamaEmbeddingDriver, FakeEmbeddingDriver
│   ├── Tools/                 # NavigateTo, Trigger3dWorkflow, SubmitServiceInquiry
│   ├── LlmManager.php / EmbeddingManager.php  # Laravel Managers resolving drivers from config/ai.php
│   ├── Retriever.php          # pgvector similarity search
│   ├── PromptGuard.php        # injection + PII scrubbing
│   └── ChatOrchestrator.php   # RAG + tool loop, emits SSE events
├── Http/
│   ├── Controllers/Api/V1/    # thin controllers
│   ├── Requests/              # FormRequests (validation)
│   └── Resources/             # JsonResource transformers (locale-aware)
├── Jobs/                      # NotifyN8nOfInquiry, IndexKnowledgeJob
├── Filament/                  # Resources, Pages, Widgets (admin)
└── Policies/
```

Rules:
- Controllers are thin: validate (FormRequest) → call a Domain action → return a Resource.
- Domain code never imports from `Http/`.
- `Services/AI` depends only on contracts; concrete drivers are bound in `AiServiceProvider`.

## 4. Frontend module boundaries

```
frontend/src/
├── app/[locale]/              # layout.tsx (dir/lang), page.tsx (sections)
├── components/
│   ├── three/                 # Canvas wrapper, nodes, edges, particles, scenes
│   ├── sections/              # Hero, Services, Portfolio, Team, Booking
│   ├── assistant/             # Copilot widget, message list, action bubbles
│   └── ui/                    # shadcn/ui primitives
├── stores/                    # Zustand: scene, agent, ui
├── lib/api/                   # typed fetch client + SSE parser
├── i18n/                      # next-intl routing + request config
└── messages/{ar,en}.json      # UI copy
```

## 5. Cross-cutting concerns

| Concern | Approach |
|---------|----------|
| Localization | `?locale=` or `Accept-Language` → `SetLocale` middleware; Resources output the requested locale with `ar` fallback. |
| Caching | Redis `Cache::remember` per locale for read endpoints; busted by model observers. Next.js `fetch` revalidation 300s. |
| Errors | RFC 7807 everywhere ([error_handling.md](../02_api_specs/error_handling.md)). |
| Observability | Structured JSON logs (`stack` → `stderr` in Docker); `X-Request-Id` propagated from nginx. |
| Security | Sanctum, CORS allow-list, throttles, PromptGuard ([05_security](../05_security/api_security.md)). |
