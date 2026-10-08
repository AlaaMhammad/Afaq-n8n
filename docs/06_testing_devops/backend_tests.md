# Backend Tests — Pest

## 1. Setup

- Framework: **Pest 3** (`pestphp/pest`, `pestphp/pest-plugin-laravel`, `pestphp/pest-plugin-livewire` for Filament).
- Database: **PostgreSQL** test database `afaq_testing` (same `pgvector/pgvector:pg16` container) — **not SQLite**, because vector columns, `jsonb` operators and `<=>` must behave exactly as in prod.
- `phpunit.xml` env overrides:

```xml
<env name="APP_ENV" value="testing"/>
<env name="DB_CONNECTION" value="pgsql"/>
<env name="DB_DATABASE" value="afaq_testing"/>
<env name="CACHE_STORE" value="array"/>
<env name="QUEUE_CONNECTION" value="sync"/>
<env name="SESSION_DRIVER" value="array"/>
<env name="LLM_DRIVER" value="fake"/>
<env name="EMBEDDING_DRIVER" value="fake"/>
<env name="N8N_WEBHOOK_URL" value="https://n8n.test/webhook/afaq"/>
<env name="N8N_WEBHOOK_SECRET" value="test-secret-32-bytes-xxxxxxxxxxxxxx"/>
```

- `tests/Pest.php`: `uses(Tests\TestCase::class, RefreshDatabase::class)->in('Feature');` plus helpers `admin()`, `fakeAi()`, `vectorFor(string)`.
- Run: `docker compose exec backend php artisan test --parallel` (or `./vendor/bin/pest`).
- Coverage target: **≥ 80%** lines on `app/Domain`, `app/Services/AI`, `app/Http`.

## 2. Suite matrix

| Suite | File(s) | Covers |
|-------|---------|--------|
| **Unit / Domain** | `tests/Unit/EstimateCalculatorTest.php` | Table-driven estimates, rounding, weeks |
| | `tests/Unit/ChunkerTest.php` | Heading-aware split, overlap, FAQ one-per-chunk, Arabic sentence boundaries |
| | `tests/Unit/ArabicNormalizerTest.php` | Tatweel/diacritics/alef unification |
| | `tests/Unit/ReferenceGeneratorTest.php` | Format, alphabet, collision retry |
| | `tests/Unit/PiiScrubberTest.php` | Emails, phones (incl. Arabic-Indic), IDs, IBAN, Luhn cards |
| | `tests/Unit/PromptGuardTest.php` | Injection dataset (block/flag), benign dataset (no FP), delimiter escaping |
| **Unit / AI drivers** | `tests/Unit/Ai/GeminiLlmDriverTest.php` | Request body mapping (roles, tools, systemInstruction); SSE frame parsing → `TextDelta`/`ToolCallEvt`/`TurnEnd` using `Http::fake` with recorded fixtures |
| | `tests/Unit/Ai/GeminiEmbeddingDriverTest.php` | `embedContent` / `batchEmbedContents` payloads, task types, 429 retry with `Retry-After`, dimension assertion |
| | `tests/Unit/Ai/OllamaDriversTest.php` | NDJSON parsing, tool_calls mapping, `search_query:` prefixes |
| | `tests/Unit/Ai/AiManagerTest.php` | Driver resolution from config; dimension mismatch throws on boot |
| **Feature / Public API** | `tests/Feature/Api/ServicesTest.php` | List/show, locale resolution (`?locale`, `Accept-Language`, fallback `ar`), ETag/Cache-Control |
| | `tests/Feature/Api/ProjectsTest.php` | Slug routing, localized `workflow` labels, 404 problem+json |
| | `tests/Feature/Api/TeamTest.php` | Active only, ordering, CV inline/attachment/redirect/404 |
| | `tests/Feature/Api/ServiceRequestTest.php` | 201 + reference, validation matrix (dataset), honeypot, duplicate 409, estimate persisted, job dispatched afterCommit |
| | `tests/Feature/Api/RateLimitTest.php` | 61st request → 429 with `retry_after`; AI 11th → 429; inquiry 6th → 429 |
| | `tests/Feature/Api/ProblemDetailsTest.php` | Every catalogue code renders RFC 7807 shape + `application/problem+json` |
| **Feature / AI** | `tests/Feature/Ai/RetrieverTest.php` | Insert chunks with fixed vectors → nearest-neighbour order, `min_score` filter, same-locale boost, HNSW index exists |
| | `tests/Feature/Ai/ChatStreamTest.php` | SSE event order (`session → sources → token* → done`), headers, persisted messages scrubbed |
| | `tests/Feature/Ai/ToolCallingTest.php` | Scripted `trigger_3d_workflow` → `action` event; unknown slug → `ok=false`; `submit_service_inquiry` creates row with `source=ai_agent`; email-not-from-user rejected; max 4 iterations |
| | `tests/Feature/Ai/IndexKnowledgeCommandTest.php` | Chunks created, embeddings 768-d, unchanged docs skipped, `--force` re-embeds, model change marks stale |
| | `tests/Feature/Ai/RetrievalQualityTest.php` | `@group live` — real Gemini, golden set hit@3 ≥ 85% (excluded by default) |
| **Feature / Jobs** | `tests/Feature/Jobs/NotifyN8nOfInquiryTest.php` | Payload shape, HMAC header, retries/backoff on 500, metadata updated |
| **Feature / Seeders** | `tests/Feature/SeederTest.php` | `db:seed` twice is idempotent; counts (5 services, 3 projects, 4 team, ≥ 30 knowledge sources); every project `workflow_metadata` validates against JSON schema; all translatable fields have `ar` and `en` |
| **Feature / Migrations** | `tests/Feature/SchemaTest.php` | `vector` extension present; `knowledge_documents.embedding` is `vector(768)` |
| **Feature / Admin** | `tests/Feature/Admin/AccessTest.php` | Guest → login redirect, non-admin 403, admin 200 |
| | `tests/Feature/Admin/ResourcesTest.php` | Livewire: list/create/edit per resource; both locales required; CV must be PDF |
| | `tests/Feature/Admin/ReindexActionTest.php` | Dashboard + resource action dispatch `IndexKnowledgeJob` |
| | `tests/Feature/Admin/ServiceRequestStatusTest.php` | Status change writes history; "Resend to n8n" dispatches job |
| **Arch** | `tests/ArchTest.php` | `arch()->preset()->laravel()`; `App\Domain` doesn't use `App\Http`; controllers are invokable or resource-shaped; no `dd/dump/ray` |

## 3. Example tests

```php
it('streams sources, tokens and a 3D action for an explode request', function () {
    Project::factory()->create(['slug' => 'autonomous-invoice-extractor']);
    FakeLlmDriver::script([
        new TextDelta('بالتأكيد! '),
        new ToolCallEvt('call_1', 'trigger_3d_workflow', ['project_slug' => 'autonomous-invoice-extractor', 'mode' => 'exploded']),
        new TurnEnd(100, 20, 'tool_calls'),
    ], [
        new TextDelta('هذا هو سير العمل مفككاً.'),
        new TurnEnd(150, 30, 'stop'),
    ]);

    $events = sseEvents($this->postJson('/api/v1/ai/chat', [
        'message' => 'اعرض مشروع الفواتير مفككاً', 'locale' => 'ar',
    ], ['Accept' => 'text/event-stream']));

    expect(array_column($events, 'event'))
        ->toBe(['session', 'sources', 'token', 'tool_call', 'action', 'tool_result', 'token', 'done'])
        ->and($events[4]['data'])->toMatchArray([
            'type' => 'trigger_3d_workflow',
            'payload' => ['projectSlug' => 'autonomous-invoice-extractor', 'mode' => 'exploded'],
        ]);
});

it('orders knowledge chunks by cosine similarity', function () {
    $q = unitVector(seed: 1);
    $near = KnowledgeDocument::factory()->chunk()->create(['embedding' => perturb($q, 0.05), 'locale' => 'en']);
    $far  = KnowledgeDocument::factory()->chunk()->create(['embedding' => unitVector(seed: 99), 'locale' => 'en']);
    FakeEmbeddingDriver::returnFor('pricing?', $q);

    $hits = app(Retriever::class)->search('pricing?', 'en', k: 2, minScore: 0);

    expect($hits->first()->id)->toBe($near->id)
        ->and($hits->first()->score)->toBeGreaterThan($hits->last()->score);
});
```

## 4. CI

GitHub Actions job `backend`:
1. Services: `pgvector/pgvector:pg16` (creates `afaq_testing`), `redis:alpine`.
2. `shivammathur/setup-php@v2` PHP 8.2 with `pdo_pgsql, redis, bcmath, intl`.
3. `composer install --no-interaction --prefer-dist`.
4. `php artisan test --parallel --coverage --min=80`.
5. `./vendor/bin/pint --test` (code style) and `composer audit`.

## 5. Suite as built (end of Phase 3)

119 tests / 544 assertions, ~70 s in the dev container (`docker compose exec -T backend php artisan test`). File names differ slightly from the plan above:

| File | Covers |
|------|--------|
| `tests/Unit/Ai/DriversTest.php` | Gemini mapping (roles, tools, `thoughtSignature` echo), SSE parsing, retry → fallback model, no retry after output / on auth errors; Gemini embeddings (batching, `retryDelay`, dimension check, L2 normalisation); Ollama chat NDJSON + nomic prefixes; manager resolution |
| `tests/Unit/Ai/PromptGuardTest.php` | Injection block/flag datasets (ar + en), benign questions, flooding, invisible chars, delimiter escaping, leak detection, secret redaction |
| `tests/Unit/Ai/TextProcessingTest.php` | Arabic normaliser, chunker (FAQ, packing, overlap), PII scrubber, vector helpers |
| `tests/Feature/IndexKnowledgeCommandTest.php` | Dry run, 768-d indexing, reuse of unchanged chunks, `--force`, model change → stale, retrieval + same-language preference |
| `tests/Feature/Ai/ChatStreamTest.php` | SSE event order and headers, scrubbed persistence, prompt/history construction, 422 problems before streaming, provider error event, mid-answer `reset` + retry, leak withholding, session history endpoint, 10/min throttle |
| `tests/Feature/Ai/ToolCallingTest.php` | 3D action + signature round-trip, invalid/unknown tools, booking gates (confirmation, typed email, duplicates), iteration cap |
| `tests/Feature/Inquiry/InquiryPipelineTest.php` | `CreateServiceRequest` (normalisation, estimate, dedupe), signed n8n webhook (payload, HMAC, failure recording, skip when unconfigured) |

Live checks against the real Gemini API (not in CI) are described in the Phase 3 report: retrieval hit@3 12/12, Arabic/English answers, 3D and navigation tools, two-turn booking in both languages, and signed delivery to a mock n8n receiver.
