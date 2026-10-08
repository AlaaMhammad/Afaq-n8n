# Master Execution Plan: Afaq Automation Agency Platform

**Interactive 3D Experience, Headless Laravel 12 API, Next.js, Autonomous RAG AI Agent & Admin Dashboard**

## 1. Project Overview & Vision

* **Brand & Client:** Afaq Automation Agency (`afaqn8n.me`).
* **Domain Specialization:** High-performance automation engineering, custom n8n nodes & pipelines, AI agent workflows, and enterprise system integrations.
* **Visual Identity:**
  * **Dominant Theme:** Industrial Cyber / Carbon Dark (`#0A0A0C` background, `#141419` surface cards).
  * **Accent Identity:** Neon Automation Orange (`#FF6B00` / `#FF5500`) with Cyan/Teal data pulses (`#00E5FF`).
  * **Mode Support:** Dark mode (default) and crisp, accessible Light mode.
  * **Localization:** Arabic (RTL, primary default) and English (LTR) across all content and 3D UI viewports.
* **Core Pillars:**
  1. **3D Interactive Workflows:** Dynamic 3D assembly and disassembly (Exploded View) of n8n automation pipelines and triggers.
  2. **The Team Section:** "العقول خلف العمل / The Minds Behind the Magic" with 3D tilt cards, dual-language profiles, and CV download/preview.
  3. **Autonomous RAG AI Concierge:** Floating assistant with semantic retrieval on agency data, capable of triggering on-screen UI actions (page navigation, 3D workflow explosion) and directly booking custom service orders via API.
  4. **Dynamic Data & Control:** Comprehensive mock database seeders for day-one readiness, paired with an integrated Admin Dashboard (Laravel Filament / Sanctum API) to manage content, CVs, and inquiries.

## 2. Technology Stack & Prerequisites

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Backend API & Admin** | PHP 8.2+, Laravel 12, Laravel Sanctum, Laravel Filament v3 / Custom Admin API, Spatie Translatable |
| **Database & Vector** | PostgreSQL 16+ with `pgvector` extension (for RAG embeddings & core relational data), Redis (Queues & Cache) |
| **AI & Automation** | OpenAI / Claude API (Tool Calling / Function Calling), n8n Webhook Triggers |
| **Frontend Framework** | Next.js 15+ (App Router), React 19, TypeScript |
| **Styling & Components** | Tailwind CSS v4 / v3.4, Shadcn/UI, Lucide Icons |
| **3D & Animation** | Three.js, `@react-three/fiber` (R3F), `@react-three/drei`, GSAP, Framer Motion |
| **State & Localization** | Zustand (UI & Agent actions), `next-intl` (Bi-directional RTL/LTR) |
| **DevOps & Testing** | Docker & Docker Compose, Pest PHP (Backend testing), Vitest / Playwright |

## 3. Directory Structure Initialization

When starting in an empty directory, Claude Code must bootstrap the workspace as follows:

```
├── docs/                                  # Complete Engineering & Architecture Specs
│   ├── 01_architecture/
│   │   ├── system_overview.md             # Headless architecture & interaction flow
│   │   ├── database_schema.md             # Migrations, relations & pgvector design
│   │   └── state_management.md            # Zustand stores & 3D scene bridge
│   ├── 02_api_specs/
│   │   ├── endpoints.md                   # Full REST API & SSE Streaming routes
│   │   └── error_handling.md              # RFC 7807 standard error payloads
│   ├── 03_frontend_3d/
│   │   ├── r3f_components.md              # 3D canvas, nodes, wireframes & exploded views
│   │   ├── theme_and_i18n.md              # RTL/LTR switching & dual color tokens
│   │   └── ai_assistant_ui.md             # Floating agent widget & interactive triggers
│   ├── 04_features/
│   │   ├── portfolio_showcase.md          # 3D interactive workflows gallery
│   │   ├── team_management.md             # Dynamic team roster, credentials & CV handling
│   │   ├── service_request.md             # Multi-step booking engine & estimates
│   │   ├── admin_dashboard.md             # Filament CRUD & knowledge ingestion
│   │   └── rag_and_ai_agent.md            # Chunking, vector search & Tool Calling definitions
│   ├── 05_security/
│   │   ├── api_security.md                # Rate limiting, CORS, Sanctum policies
│   │   └── prompt_guard.md                # Anti-injection guards & PII scrubbing
│   └── 06_testing_devops/
│       ├── backend_tests.md               # Pest unit/feature suites
│       ├── frontend_tests.md              # Component & integration test matrix
│       └── deployment_docker.md           # Production Dockerfile & Cloudflare setups
├── backend/                               # Laravel 12 Application
├── frontend/                              # Next.js Application
└── docker-compose.yml                     # Unified dev environment (PostgreSQL + pgvector + Redis)
```

## 4. Detailed Step-by-Step Execution Phases

### Phase 1: Documentation Scaffold & Environment Setup
1. **Initialize `docs/`:** Generate all 15 markdown files within `docs/` with complete technical content (models, types, schemas, and flowcharts).
2. **Docker Orchestration:** Create `docker-compose.yml` defining:
   * `postgres` (image: `pgvector/pgvector:pg16`) with persistent volume.
   * `redis` (image: `redis:alpine`) for queue management and caching.
   * `backend` (PHP 8.2-FPM / Laravel workspace with extensions: `pdo_pgsql`, `redis`, `bcmath`).
   * `frontend` (Node 20+ / Next.js).
3. **Skeleton Creation:**
   * Initialize Laravel 12 inside `backend/`.
   * Initialize Next.js with TypeScript and Tailwind CSS inside `frontend/`.

### Phase 2: Laravel 12 Database, Seeders & Admin Setup
1. **Database Schema & Migrations:**
   * Enable `pgvector` extension in a dedicated migration.
   * Tables:
     * `services`: `id`, `title` (JSON), `slug`, `description` (JSON), `icon`, `features` (JSON), `order`, `timestamps`.
     * `projects`: `id`, `title` (JSON), `client`, `summary` (JSON), `workflow_metadata` (JSON for 3D node coordinates & exploded state), `metrics` (JSON), `live_url`, `timestamps`.
     * `team_members`: `id`, `name` (JSON), `role` (JSON), `bio` (JSON), `avatar_path`, `cv_url`, `social_links` (JSON), `order`, `timestamps`.
     * `service_requests`: `id`, `client_name`, `client_email`, `client_phone`, `service_id` (nullable), `budget_range`, `requirements`, `status`, `metadata` (JSON), `timestamps`.
     * `knowledge_documents`: `id`, `title`, `content`, `category`, `embedding` (vector 1536), `metadata` (JSON), `timestamps`.
     * `chat_sessions` & `chat_messages`: Context logs for AI assistant.
2. **Comprehensive Realistic Mock Seeders (`DatabaseSeeder`):**
   * **Services:** Custom n8n Nodes, AI Voice & Chat Agents, CRM Sync (HubSpot/Salesforce), WhatsApp Business Automation, E-commerce Logistics Routing.
   * **Projects (with 3D Node Data):**
     * *Omnichannel Support Sync:* Webhook -> Sentiment AI -> Router -> Ticket Resolution.
     * *Autonomous Invoice Extractor:* Email Trigger -> OCR Node -> Postgres Save -> WhatsApp Alert.
     * *Lead Enrichment Engine:* Form Trigger -> Clearbit API -> Scoring Filter -> HubSpot CRM.
   * **The Team:** 4 realistic tech profiles (Founder & Automation Architect, Senior n8n Specialist, Full-Stack Engineer, AI Engineer) complete with bios, sample CV links, and avatar placeholders.
   * **Knowledge Documents:** Rich Arabic & English FAQ and service documentation pre-seeded for RAG search.
3. **Admin Dashboard (Filament v3 / Admin Panel):**
   * CRUD panels for `Services`, `Projects`, `Team Members`, and `Service Requests`.
   * Action button in Dashboard to trigger `rag:index-knowledge` whenever documents are updated.
   * File upload support for team member CVs (PDF) and avatars.

### Phase 3: AI Engine, RAG Pipeline & Agent Tool Calling
1. **Knowledge Embedding Pipeline:**
   * Artisan command `php artisan rag:index-knowledge` parsing `knowledge_documents` and populating `embedding` columns via OpenAI / compatible embeddings.
2. **Autonomous AI Agent (`/api/v1/ai/chat`):**
   * Streaming response (Server-Sent Events - SSE).
   * Cosine distance vector retrieval via `pgvector` ($1 - (embedding \Leftrightarrow query)$).
   * Registered Tools / Function Calling:
     * `navigate_to(section_id)`: Scrolls to `hero`, `services`, `portfolio`, `team`, or `order`.
     * `trigger_3d_workflow(project_slug, mode)`: Controls `assembled` vs `exploded` visual state.
     * `submit_service_inquiry(name, email, service_type, budget, notes)`: Directly commits lead to database.
3. **Webhook Integration:**
   * Dispatch background job sending inquiry payloads to external n8n instance (`afaqn8n.me`) for instant team notification.

### Phase 4: Next.js Frontend Foundations, Theme & RTL/LTR
1. **Design System & Layout:**
   * Tailored palette: Obsidian Black (`#0A0A0C`), Card Surface (`#141419`), Neon Orange (`#FF6B00`), and Cyan Pulse (`#00E5FF`).
   * Theme toggler with default dark mode.
   * `next-intl` integration with full bidirectional support (`ar` RTL / `en` LTR).
2. **Global State Bridge (Zustand):**
   * Bridge store handling 3D camera controls, exploded states, active node selection, and AI agent execution dispatches.

### Phase 5: 3D Canvas & Interactive Exploded Workflows
1. **Three.js / React Three Fiber Canvas:**
   * Canvas wrapper with WebGL detection, performance monitors, and mobile-friendly fallbacks.
   * Procedural n8n nodes: Diamond Triggers, Cylindrical Routers, Action Cubes, and glowing particle splines.
2. **Exploded View Animation:**
   * Smooth physics-driven dispersion of nodes on user click/scroll or AI command.
   * Dynamic laser beams and packet particles tracing data flow between ports.

### Phase 6: Core Sections & Client UI
1. **Hero Section:** Ambient 3D Automation Core, glowing status badge, dual CTAs.
2. **Services Grid:** Glassmorphism tilt cards with interactive feature badges.
3. **Interactive 3D Portfolio:** Interactive workflow visualizer displaying live metrics (execution time, failure rate 0%, nodes count).
4. **The Team Section (العقول خلف العمل):**
   * High-tech cards featuring team member photo, bilingual roles, direct CV preview modal, and download button.
5. **Interactive Booking Engine:** Step-by-step form validating inputs and syncing to Laravel API.
6. **Floating AI Agent Concierge (Afaq Copilot):**
   * Collapsible cyberpunk chat widget with audio/text input, streaming text tokens, and interactive action bubbles.

### Phase 7: Verification, Hardening & Deployment
1. **Testing:**
   * Backend: Pest test cases covering API endpoints, Seeders, RAG vector similarity, and webhook dispatching.
   * Frontend: Responsive testing on mobile/desktop viewports and RTL layout verification.
2. **Performance & Security:**
   * Rate limiting (`throttle:60,1` on APIs, `throttle:10,1` on AI endpoints).
   * WebGL asset optimization and Cloudflare cache rules for static assets.

## 5. Execution Instructions for Claude Code

When this plan is initialized:
1. Start immediately at **Phase 1** by generating the full documentation tree inside `docs/` with all structural specifications.
2. Build the database migrations and the **Realistic Mock Seeders** first so the platform is visually loaded with high-quality demo data right from the start.
3. Ensure the Admin Dashboard is configured with proper authentication and file storage for managing CVs and projects.
4. Maintain strict adherence to dual language support (Arabic RTL / English LTR) in all UI components and database models.