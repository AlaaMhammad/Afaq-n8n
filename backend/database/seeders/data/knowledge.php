<?php

/*
 * RAG knowledge base — source documents (parent_id = null). Each topic exists in ar + en.
 * Embedding/chunking happens later via `php artisan rag:index-knowledge` (Phase 3).
 * Prices are indicative ranges and must match services.php starting prices.
 */

return [

    // ───────────────────────── company ─────────────────────────
    [
        'key' => 'company-about',
        'category' => 'company',
        'en' => [
            'title' => 'About Afaq Automation Agency',
            'content' => <<<'MD'
# About Afaq Automation Agency

Afaq Automation Agency (afaqn8n.me) is an automation engineering studio specialising in n8n workflows, AI agents and enterprise system integrations. "Afaq" means *horizons* in Arabic — we help businesses expand what their teams can do without expanding headcount.

## What we do
- Design and build production-grade n8n pipelines, self-hosted or on n8n Cloud.
- Develop custom n8n nodes for APIs and internal systems that n8n does not support natively.
- Build Arabic-first AI chat and voice agents grounded in company knowledge (RAG) that can take real actions.
- Connect CRMs, ERPs, e-commerce platforms, WhatsApp and accounting tools into one reliable data flow.

## Who we work with
Retail, logistics, fintech, healthcare clinics, real estate and SaaS companies across Saudi Arabia, the wider GCC and international teams serving Arabic-speaking customers.

## Why Afaq
- Engineering-first: every workflow ships with error handling, retries, monitoring and documentation.
- Bilingual by default: Arabic and English interfaces, templates and AI agents.
- Measurable outcomes: we agree on KPIs (hours saved, response time, error rate) before we build.
MD,
        ],
        'ar' => [
            'title' => 'نبذة عن وكالة أفق للأتمتة',
            'content' => <<<'MD'
# نبذة عن وكالة أفق للأتمتة

وكالة أفق للأتمتة (afaqn8n.me) استوديو هندسي متخصص في مسارات n8n ووكلاء الذكاء الاصطناعي وتكامل أنظمة المؤسسات. نساعد الشركات على توسيع آفاق ما يستطيع فريقها إنجازه دون الحاجة إلى زيادة عدد الموظفين.

## ماذا نقدم
- تصميم وبناء مسارات n8n جاهزة للإنتاج، سواء على خوادمك الخاصة أو على n8n Cloud.
- تطوير عُقد n8n مخصصة لواجهات API والأنظمة الداخلية غير المدعومة رسمياً.
- بناء وكلاء محادثة وصوت بالذكاء الاصطناعي يفهمون العربية أولاً، ويعتمدون على معرفة شركتك (RAG)، ويستطيعون تنفيذ إجراءات حقيقية.
- ربط أنظمة CRM وERP ومنصات التجارة الإلكترونية وواتساب وأنظمة المحاسبة في تدفق بيانات موثوق واحد.

## من نخدم
شركات التجزئة والخدمات اللوجستية والتقنية المالية والعيادات والعقارات وشركات SaaS في السعودية ودول الخليج، والفرق الدولية التي تخدم عملاء ناطقين بالعربية.

## لماذا أفق
- الهندسة أولاً: كل مسار يُسلَّم مع معالجة الأخطاء وإعادة المحاولة والمراقبة والتوثيق.
- ثنائي اللغة افتراضياً: واجهات وقوالب ووكلاء ذكاء اصطناعي بالعربية والإنجليزية.
- نتائج قابلة للقياس: نتفق على مؤشرات الأداء (الساعات الموفَّرة، زمن الاستجابة، نسبة الأخطاء) قبل البدء.
MD,
        ],
    ],
    [
        'key' => 'company-team',
        'category' => 'company',
        'en' => [
            'title' => 'The Afaq team and expertise',
            'content' => <<<'MD'
# The Minds Behind the Magic

Afaq is a senior, hands-on team. The people who scope your project are the people who build it.

- **Omar Al-Harbi — Founder & Automation Architect.** 11+ years in systems design and enterprise integration; architected 300+ automation pipelines.
- **Layla Mansour — Senior n8n Specialist.** n8n community contributor, custom TypeScript nodes, high-volume queue-mode deployments.
- **Yousef Al-Qasem — Full-Stack Engineer.** Laravel, Next.js and Three.js; builds dashboards, portals and the interactive 3D experiences on our site.
- **Noura Al-Subaie — AI Engineer.** Arabic-first RAG systems, tool-calling agents, evaluation and prompt security.

Every team member's CV can be previewed or downloaded from the Team section of the website.
MD,
        ],
        'ar' => [
            'title' => 'فريق أفق وخبراته',
            'content' => <<<'MD'
# العقول خلف العمل

فريق أفق فريق خبير يعمل بنفسه على المشاريع؛ من يحدد نطاق مشروعك هو من يبنيه.

- **عمر الحربي — المؤسس ومهندس الأتمتة.** أكثر من 11 عاماً في تصميم الأنظمة وتكامل المؤسسات، وصمّم أكثر من 300 مسار أتمتة.
- **ليلى منصور — أخصائية n8n أولى.** مساهمة في مجتمع n8n، تطوّر عُقد TypeScript مخصصة ونشرات عالية الحجم بوضع الطوابير.
- **يوسف القاسم — مهندس برمجيات متكامل.** يعمل بـ Laravel وNext.js وThree.js، ويبني لوحات التحكم والبوابات والتجارب ثلاثية الأبعاد في موقعنا.
- **نورة السبيعي — مهندسة ذكاء اصطناعي.** أنظمة RAG تفهم العربية أولاً، ووكلاء يستدعون الأدوات، وتقييم الجودة وأمان المطالبات.

يمكن معاينة السيرة الذاتية لكل عضو أو تنزيلها من قسم الفريق في الموقع.
MD,
        ],
    ],

    // ───────────────────────── services ─────────────────────────
    [
        'key' => 'service-custom-n8n-nodes',
        'category' => 'service',
        'service_slug' => 'custom-n8n-nodes',
        'en' => [
            'title' => 'Service: Custom n8n Nodes',
            'content' => <<<'MD'
# Custom n8n Nodes

When n8n has no built-in node for your system — a local ERP, a government portal, a niche SaaS API — we build one.

## Deliverables
- A TypeScript node package with credential types (API key, OAuth2, basic auth).
- Support for pagination, batching, rate limits and binary data (files, images).
- Optional trigger node (webhook or polling) so your system can start workflows.
- Unit tests, CI pipeline and publishing to a private registry or npm.
- README with examples and a hand-over session for your team.

## Typical timeline
2–4 weeks per node package depending on the number of operations.

## Starting price
From 1,500 USD for a node with up to 6 operations.
MD,
        ],
        'ar' => [
            'title' => 'خدمة: تطوير عُقد n8n مخصصة',
            'content' => <<<'MD'
# تطوير عُقد n8n مخصصة

عندما لا يتوفر في n8n عقدة جاهزة لنظامك — نظام ERP محلي، أو بوابة حكومية، أو واجهة SaaS متخصصة — نبنيها لك.

## المخرجات
- حزمة عقدة بلغة TypeScript مع أنواع بيانات اعتماد (مفتاح API، OAuth2، مصادقة أساسية).
- دعم الترقيم والمعالجة الدفعية وحدود المعدل والبيانات الثنائية (ملفات وصور).
- عقدة تشغيل اختيارية (Webhook أو Polling) لبدء المسارات من نظامك.
- اختبارات وحدات وخط CI ونشر على سجل خاص أو npm.
- ملف توثيق مع أمثلة وجلسة تسليم لفريقك.

## المدة المعتادة
من أسبوعين إلى 4 أسابيع لكل حزمة حسب عدد العمليات.

## السعر المبدئي
يبدأ من 1,500 دولار لعقدة تحتوي حتى 6 عمليات.
MD,
        ],
    ],
    [
        'key' => 'service-ai-agents',
        'category' => 'service',
        'service_slug' => 'ai-voice-chat-agents',
        'en' => [
            'title' => 'Service: AI Voice & Chat Agents',
            'content' => <<<'MD'
# AI Voice & Chat Agents

We build assistants that answer from your own knowledge and take actions in your systems.

## Capabilities
- Retrieval-augmented generation (RAG) over your FAQs, policies, catalogues and PDFs, with source citations.
- Tool calling: book appointments, create support tickets, look up orders, update the CRM, submit leads.
- Channels: website widget, WhatsApp, Instagram DMs and phone (voice) via telephony providers.
- Arabic (MSA and Gulf dialects) and English, with automatic language detection.
- Human hand-off with full conversation context.
- Guardrails: prompt-injection protection, PII masking in logs, restricted tool permissions.

## Models
We are model-agnostic: Google Gemini, OpenAI, Anthropic Claude, or self-hosted open models via Ollama when data must stay on-premise.

## Typical timeline
4–8 weeks including knowledge preparation and evaluation.

## Starting price
From 3,000 USD for a single-channel chat agent.
MD,
        ],
        'ar' => [
            'title' => 'خدمة: وكلاء الذكاء الاصطناعي الصوتيون والنصيون',
            'content' => <<<'MD'
# وكلاء الذكاء الاصطناعي الصوتيون والنصيون

نبني مساعدين يجيبون من معرفتك الخاصة وينفذون إجراءات داخل أنظمتك.

## القدرات
- استرجاع معزز بالمعرفة (RAG) من الأسئلة الشائعة والسياسات والكتالوجات وملفات PDF، مع ذكر المصادر.
- استدعاء الأدوات: حجز المواعيد، إنشاء تذاكر الدعم، الاستعلام عن الطلبات، تحديث CRM، تسجيل العملاء المحتملين.
- القنوات: نافذة الموقع، واتساب، رسائل إنستغرام، والهاتف (صوتي) عبر مزودي الاتصالات.
- العربية (الفصحى واللهجات الخليجية) والإنجليزية مع اكتشاف تلقائي للغة.
- تحويل إلى موظف بشري مع كامل سياق المحادثة.
- ضوابط أمان: حماية من حقن المطالبات، إخفاء البيانات الشخصية في السجلات، صلاحيات محدودة للأدوات.

## النماذج
لا نرتبط بنموذج واحد: Google Gemini أو OpenAI أو Anthropic Claude، أو نماذج مفتوحة مستضافة محلياً عبر Ollama عندما يجب أن تبقى البيانات داخل منشأتك.

## المدة المعتادة
من 4 إلى 8 أسابيع شاملة تجهيز المعرفة والتقييم.

## السعر المبدئي
يبدأ من 3,000 دولار لوكيل محادثة على قناة واحدة.
MD,
        ],
    ],
    [
        'key' => 'service-crm-sync',
        'category' => 'service',
        'service_slug' => 'crm-sync',
        'en' => [
            'title' => 'Service: CRM Sync (HubSpot / Salesforce)',
            'content' => <<<'MD'
# CRM Sync (HubSpot / Salesforce)

Keep your CRM as the single source of truth without manual copy-paste.

## What we connect
HubSpot, Salesforce, Zoho CRM and Pipedrive with accounting (Zoho Books, QuickBooks, Odoo), support desks (Zendesk, Freshdesk), marketing tools and your own databases.

## How it works
- Real-time sync via webhooks, with scheduled reconciliation jobs as a safety net.
- De-duplication by email, phone (normalised to E.164) and company domain.
- Conflict rules you choose: last-write-wins, source priority or manual review queue.
- Every change logged for auditing; failed syncs retried and alerted to Slack, email or WhatsApp.

## Typical timeline
3–5 weeks.

## Starting price
From 2,000 USD for two systems and up to 4 object types.
MD,
        ],
        'ar' => [
            'title' => 'خدمة: مزامنة أنظمة CRM (HubSpot / Salesforce)',
            'content' => <<<'MD'
# مزامنة أنظمة CRM (HubSpot / Salesforce)

اجعل نظام CRM مصدر الحقيقة الوحيد دون نسخ ولصق يدوي.

## ما الذي نربطه
HubSpot وSalesforce وZoho CRM وPipedrive مع أنظمة المحاسبة (Zoho Books وQuickBooks وOdoo)، ومنصات الدعم (Zendesk وFreshdesk)، وأدوات التسويق، وقواعد بياناتك الخاصة.

## آلية العمل
- مزامنة فورية عبر Webhooks مع مهام مطابقة مجدولة كشبكة أمان.
- إزالة التكرار حسب البريد والهاتف (بصيغة E.164 الموحدة) ونطاق الشركة.
- قواعد تعارض تختارها أنت: آخر تعديل يفوز، أو أولوية المصدر، أو قائمة مراجعة يدوية.
- تسجيل كل تغيير للتدقيق، وإعادة محاولة المزامنات الفاشلة مع تنبيه عبر Slack أو البريد أو واتساب.

## المدة المعتادة
من 3 إلى 5 أسابيع.

## السعر المبدئي
يبدأ من 2,000 دولار لنظامين وحتى 4 أنواع من الكائنات.
MD,
        ],
    ],
    [
        'key' => 'service-whatsapp',
        'category' => 'service',
        'service_slug' => 'whatsapp-business-automation',
        'en' => [
            'title' => 'Service: WhatsApp Business Automation',
            'content' => <<<'MD'
# WhatsApp Business Automation

WhatsApp is where Gulf customers expect to hear from you. We automate it properly using the official WhatsApp Business Cloud API (no unofficial gateways that risk bans).

## Use cases
- Order confirmations, shipping updates and delivery notifications.
- Appointment reminders with confirm / reschedule buttons.
- Approved template campaigns with opt-out handling.
- AI first-line replies with hand-off to agents in a shared inbox.
- Internal alerts for your team (e.g. high-value invoice detected).

## Requirements
A Meta Business account and a dedicated phone number. We handle verification, template approval and webhook setup.

## Typical timeline
2–4 weeks.

## Starting price
From 1,800 USD. Meta conversation fees are billed by Meta separately.
MD,
        ],
        'ar' => [
            'title' => 'خدمة: أتمتة واتساب للأعمال',
            'content' => <<<'MD'
# أتمتة واتساب للأعمال

واتساب هو المكان الذي يتوقع عملاء الخليج أن يتواصلوا معك من خلاله. نؤتمته بالطريقة الصحيحة عبر WhatsApp Business Cloud API الرسمي (دون بوابات غير رسمية قد تعرّض رقمك للحظر).

## حالات الاستخدام
- تأكيد الطلبات وتحديثات الشحن وإشعارات التسليم.
- تذكير بالمواعيد مع أزرار التأكيد أو إعادة الجدولة.
- حملات بقوالب معتمدة مع إدارة إلغاء الاشتراك.
- ردود أولية بالذكاء الاصطناعي مع تحويل للموظفين في صندوق وارد مشترك.
- تنبيهات داخلية لفريقك (مثل اكتشاف فاتورة عالية القيمة).

## المتطلبات
حساب Meta Business ورقم هاتف مخصص. نتولى التوثيق واعتماد القوالب وإعداد Webhooks.

## المدة المعتادة
من أسبوعين إلى 4 أسابيع.

## السعر المبدئي
يبدأ من 1,800 دولار. رسوم المحادثات تُحتسب من Meta بشكل منفصل.
MD,
        ],
    ],
    [
        'key' => 'service-logistics',
        'category' => 'service',
        'service_slug' => 'ecommerce-logistics-routing',
        'en' => [
            'title' => 'Service: E-commerce Logistics Routing',
            'content' => <<<'MD'
# E-commerce Logistics Routing

Ship every order from the right place, with the right carrier, at the right cost — automatically.

## Integrations
Stores: Shopify, Salla, Zid, WooCommerce. Carriers: Aramex, SMSA, DHL, J&T and local last-mile providers. Inventory: your WMS, ERP or Google Sheets.

## Routing logic
- Choose the warehouse by stock availability and distance to the customer's city.
- Choose the carrier by cost, SLA and cash-on-delivery support.
- Split shipments automatically when no single warehouse has all items.
- Generate airway bills, push tracking numbers back to the store and notify customers on WhatsApp.

## Typical timeline
4–6 weeks.

## Starting price
From 2,500 USD for one store and two carriers.
MD,
        ],
        'ar' => [
            'title' => 'خدمة: توجيه الخدمات اللوجستية للتجارة الإلكترونية',
            'content' => <<<'MD'
# توجيه الخدمات اللوجستية للتجارة الإلكترونية

اشحن كل طلب من المكان الصحيح، مع شركة الشحن المناسبة، وبالتكلفة الأفضل — تلقائياً.

## التكاملات
المتاجر: Shopify وسلة وزد وWooCommerce. شركات الشحن: أرامكس وSMSA وDHL وJ&T ومزودو التوصيل المحليون. المخزون: نظام إدارة المستودعات أو ERP أو Google Sheets.

## منطق التوجيه
- اختيار المستودع حسب توفر المخزون والمسافة إلى مدينة العميل.
- اختيار شركة الشحن حسب التكلفة ومستوى الخدمة ودعم الدفع عند الاستلام.
- تقسيم الشحنات تلقائياً عندما لا يتوفر كل المنتجات في مستودع واحد.
- إصدار بوالص الشحن، وإرجاع أرقام التتبع للمتجر، وإشعار العملاء عبر واتساب.

## المدة المعتادة
من 4 إلى 6 أسابيع.

## السعر المبدئي
يبدأ من 2,500 دولار لمتجر واحد وشركتي شحن.
MD,
        ],
    ],

    // ───────────────────────── pricing & process ─────────────────────────
    [
        'key' => 'pricing-overview',
        'category' => 'pricing',
        'en' => [
            'title' => 'Pricing and engagement models',
            'content' => <<<'MD'
# Pricing and engagement models

All prices are indicative and in USD. A fixed quote is provided after a free 30-minute discovery call.

## Starting prices
- Custom n8n Nodes: from 1,500
- WhatsApp Business Automation: from 1,800
- CRM Sync (HubSpot / Salesforce): from 2,000
- E-commerce Logistics Routing: from 2,500
- AI Voice & Chat Agents: from 3,000

## What changes the price
Complexity (number of systems and edge cases), urgency (ASAP projects carry a premium of about 25%), data migration needs and compliance requirements.

## Engagement models
- **Fixed-scope project** — most common; milestones with 40% upfront, 40% on delivery to staging, 20% on go-live.
- **Automation retainer** — a monthly block of engineering hours for continuous improvements.
- **Support plan** — monitoring and maintenance after go-live (see support plans).

The instant estimate on our booking form uses the same rules and is shown as a range.
MD,
        ],
        'ar' => [
            'title' => 'الأسعار ونماذج التعاقد',
            'content' => <<<'MD'
# الأسعار ونماذج التعاقد

جميع الأسعار تقديرية وبالدولار الأمريكي. نقدم عرض سعر ثابتاً بعد مكالمة استكشافية مجانية مدتها 30 دقيقة.

## الأسعار المبدئية
- تطوير عُقد n8n مخصصة: يبدأ من 1,500
- أتمتة واتساب للأعمال: يبدأ من 1,800
- مزامنة أنظمة CRM: يبدأ من 2,000
- توجيه الخدمات اللوجستية للتجارة الإلكترونية: يبدأ من 2,500
- وكلاء الذكاء الاصطناعي الصوتيون والنصيون: يبدأ من 3,000

## ما الذي يغير السعر
درجة التعقيد (عدد الأنظمة والحالات الاستثنائية)، والاستعجال (المشاريع العاجلة تزيد بنحو 25%)، واحتياجات ترحيل البيانات، ومتطلبات الامتثال.

## نماذج التعاقد
- **مشروع بنطاق ثابت** — الأكثر شيوعاً؛ دفعات مرحلية: 40% مقدماً، و40% عند التسليم على بيئة الاختبار، و20% عند الإطلاق.
- **اشتراك أتمتة شهري** — رصيد شهري من ساعات الهندسة للتحسين المستمر.
- **خطة دعم** — مراقبة وصيانة بعد الإطلاق (انظر خطط الدعم).

التقدير الفوري في نموذج الحجز يعتمد على القواعد نفسها ويُعرض كنطاق سعري.
MD,
        ],
    ],
    [
        'key' => 'process-delivery',
        'category' => 'process',
        'en' => [
            'title' => 'How we deliver a project',
            'content' => <<<'MD'
# How we deliver a project

## 1. Discovery (week 1)
A free 30-minute call, then a mapping workshop where we document current processes, systems, volumes and the KPIs we will measure.

## 2. Solution design
A written design: workflow diagrams, data mapping, error-handling strategy, hosting choice and a fixed quote with milestones.

## 3. Build & test
Iterative development in a staging environment with weekly demos. Every workflow gets error branches, retries, logging and test data.

## 4. Go-live
Production deployment with monitoring and alerts, a short hypercare period (2 weeks) and recorded training for your team.

## 5. Handover & support
Full documentation and credentials remain yours. Optional support plans keep everything updated and monitored.

We reply to every new request within one business day.
MD,
        ],
        'ar' => [
            'title' => 'كيف ننفذ المشروع',
            'content' => <<<'MD'
# كيف ننفذ المشروع

## 1. الاستكشاف (الأسبوع الأول)
مكالمة مجانية مدتها 30 دقيقة، ثم ورشة لرسم العمليات الحالية والأنظمة وأحجام البيانات ومؤشرات الأداء التي سنقيسها.

## 2. تصميم الحل
وثيقة تصميم مكتوبة: مخططات المسارات، وربط البيانات، واستراتيجية معالجة الأخطاء، وخيار الاستضافة، وعرض سعر ثابت مع مراحل الدفع.

## 3. البناء والاختبار
تطوير تكراري على بيئة اختبار مع عرض أسبوعي. كل مسار يتضمن فروع الأخطاء وإعادة المحاولة والتسجيل وبيانات الاختبار.

## 4. الإطلاق
نشر على بيئة الإنتاج مع المراقبة والتنبيهات، وفترة رعاية مكثفة لمدة أسبوعين، وتدريب مسجّل لفريقك.

## 5. التسليم والدعم
التوثيق الكامل وبيانات الاعتماد تبقى ملكك. خطط الدعم الاختيارية تُبقي كل شيء محدّثاً ومراقَباً.

نرد على كل طلب جديد خلال يوم عمل واحد.
MD,
        ],
    ],
    [
        'key' => 'process-support-plans',
        'category' => 'process',
        'en' => [
            'title' => 'Support and maintenance plans',
            'content' => <<<'MD'
# Support and maintenance plans

## Essential — 250 USD / month
Uptime and error monitoring, n8n version updates, fixes for broken integrations caused by third-party API changes, response within 2 business days.

## Growth — 600 USD / month
Everything in Essential plus 6 engineering hours per month for improvements, response within 1 business day and a monthly performance report.

## Mission-critical — custom
24/7 alerting, 4-hour response SLA, redundant n8n queue-mode deployment and quarterly architecture reviews.

Plans can be cancelled with 30 days' notice. Projects include 2 weeks of free hypercare after go-live regardless of plan.
MD,
        ],
        'ar' => [
            'title' => 'خطط الدعم والصيانة',
            'content' => <<<'MD'
# خطط الدعم والصيانة

## الأساسية — 250 دولاراً شهرياً
مراقبة التشغيل والأخطاء، وتحديثات إصدارات n8n، وإصلاح التكاملات المتعطلة بسبب تغييرات واجهات الأطراف الأخرى، والاستجابة خلال يومي عمل.

## النمو — 600 دولار شهرياً
كل ما في الأساسية بالإضافة إلى 6 ساعات هندسية شهرياً للتحسينات، والاستجابة خلال يوم عمل واحد، وتقرير أداء شهري.

## المهام الحرجة — حسب الطلب
تنبيهات على مدار الساعة، والتزام بالاستجابة خلال 4 ساعات، ونشر n8n احتياطي بوضع الطوابير، ومراجعات معمارية ربع سنوية.

يمكن إلغاء الخطط بإشعار مسبق قبل 30 يوماً. تتضمن كل المشاريع أسبوعين من الرعاية المجانية بعد الإطلاق بغض النظر عن الخطة.
MD,
        ],
    ],

    // ───────────────────────── FAQ ─────────────────────────
    [
        'key' => 'faq-general',
        'category' => 'faq',
        'en' => [
            'title' => 'Frequently asked questions — general',
            'content' => <<<'MD'
# Frequently asked questions — general

### What is n8n and why do you use it?
n8n is a workflow automation platform similar to Zapier or Make, but it can be self-hosted, has no per-task pricing and allows custom code and custom nodes. That makes it cheaper at scale and suitable for sensitive data.

### Do I need technical staff to maintain the automations?
No. We deliver documentation and training, and workflows are visual so non-developers can follow them. Many clients add a support plan so we handle updates.

### How quickly will you reply to my request?
Within one business day. Requests submitted through the website or our AI assistant receive a reference number like AFQ-XXXXXX.

### Do you work with clients outside Saudi Arabia?
Yes. We work remotely with teams across the GCC, Egypt, Jordan, Europe and North America, in Arabic or English.

### Can you improve automations someone else built?
Yes. We start with an audit of your existing n8n, Zapier or Make workflows and propose fixes or a migration plan.

### How do I get a price?
Use the booking form for an instant indicative estimate, or ask the Afaq Copilot assistant to file a request for you. A fixed quote follows the discovery call.
MD,
        ],
        'ar' => [
            'title' => 'الأسئلة الشائعة — عامة',
            'content' => <<<'MD'
# الأسئلة الشائعة — عامة

### ما هو n8n ولماذا تستخدمونه؟
n8n منصة لأتمتة سير العمل تشبه Zapier وMake، لكنها قابلة للاستضافة الذاتية، ولا تُحتسب رسومها لكل مهمة، وتسمح بكتابة الأكواد والعُقد المخصصة. لذلك هي أوفر عند التوسع ومناسبة للبيانات الحساسة.

### هل أحتاج موظفين تقنيين لصيانة الأتمتة؟
لا. نسلّم التوثيق والتدريب، والمسارات مرئية يمكن لغير المبرمجين فهمها. كثير من العملاء يضيفون خطة دعم لنتولى التحديثات.

### متى سترد على طلبي؟
خلال يوم عمل واحد. الطلبات المرسلة عبر الموقع أو مساعدنا الذكي تحصل على رقم مرجعي مثل AFQ-XXXXXX.

### هل تعملون مع عملاء خارج السعودية؟
نعم. نعمل عن بُعد مع فرق في دول الخليج ومصر والأردن وأوروبا وأمريكا الشمالية، بالعربية أو الإنجليزية.

### هل يمكنكم تحسين أتمتة بناها طرف آخر؟
نعم. نبدأ بمراجعة مساراتك الحالية في n8n أو Zapier أو Make ونقترح الإصلاحات أو خطة ترحيل.

### كيف أحصل على السعر؟
استخدم نموذج الحجز للحصول على تقدير فوري، أو اطلب من مساعد أفق الذكي تسجيل طلبك. يتبع ذلك عرض سعر ثابت بعد المكالمة الاستكشافية.
MD,
        ],
    ],
    [
        'key' => 'faq-technical',
        'category' => 'faq',
        'en' => [
            'title' => 'Frequently asked questions — hosting, security and data',
            'content' => <<<'MD'
# Frequently asked questions — hosting, security and data

### Self-hosted n8n or n8n Cloud?
Self-hosted (on your cloud account or a server in your country) is best for data residency, high volumes and cost control. n8n Cloud is best for small teams wanting zero infrastructure. We set up either.

### Where is my data stored?
In your own infrastructure or accounts whenever possible. We can deploy in Saudi-region data centres to support PDPL data-residency requirements.

### How do you protect credentials?
Credentials are stored encrypted in n8n, access is limited by role, and we never keep copies after handover. Production access uses individual accounts and is revoked when the project ends.

### Do your AI agents send our data to third parties?
Only to the model provider you approve. For strict confidentiality we deploy self-hosted open models via Ollama so no data leaves your environment. Personal data is masked in logs.

### What happens when an external API is down?
Workflows retry with exponential backoff, failed items go to an error queue, and your team gets an alert. Nothing is silently lost.

### Which languages do the AI agents support?
Arabic (Modern Standard and Gulf dialects) and English out of the box; other languages on request.
MD,
        ],
        'ar' => [
            'title' => 'الأسئلة الشائعة — الاستضافة والأمان والبيانات',
            'content' => <<<'MD'
# الأسئلة الشائعة — الاستضافة والأمان والبيانات

### استضافة ذاتية لـ n8n أم n8n Cloud؟
الاستضافة الذاتية (على حسابك السحابي أو خادم داخل بلدك) هي الأفضل لموقع البيانات والأحجام الكبيرة والتحكم في التكلفة. أما n8n Cloud فمناسب للفرق الصغيرة التي لا تريد إدارة بنية تحتية. نجهّز الخيارين.

### أين تُخزَّن بياناتي؟
في بنيتك التحتية أو حساباتك كلما أمكن. يمكننا النشر في مراكز بيانات داخل المملكة لدعم متطلبات نظام حماية البيانات الشخصية.

### كيف تحمون بيانات الاعتماد؟
تُخزَّن مشفرة داخل n8n، والوصول محدود حسب الدور، ولا نحتفظ بأي نسخة بعد التسليم. الوصول للإنتاج بحسابات فردية تُلغى عند انتهاء المشروع.

### هل يرسل وكلاء الذكاء الاصطناعي بياناتنا لأطراف أخرى؟
فقط لمزود النموذج الذي توافق عليه. وللسرية التامة ننشر نماذج مفتوحة مستضافة ذاتياً عبر Ollama فلا تغادر البيانات بيئتك. وتُخفى البيانات الشخصية في السجلات.

### ماذا يحدث عند تعطل واجهة خارجية؟
تعيد المسارات المحاولة بفواصل متزايدة، وتذهب العناصر الفاشلة إلى قائمة أخطاء، ويصل تنبيه لفريقك. لا يضيع شيء بصمت.

### ما اللغات التي يدعمها وكلاء الذكاء الاصطناعي؟
العربية (الفصحى واللهجات الخليجية) والإنجليزية بشكل افتراضي، ولغات أخرى عند الطلب.
MD,
        ],
    ],

    // ───────────────────────── case studies ─────────────────────────
    [
        'key' => 'case-omnichannel',
        'category' => 'case_study',
        'project_slug' => 'omnichannel-support-sync',
        'en' => [
            'title' => 'Case study: Omnichannel Support Sync',
            'content' => <<<'MD'
# Case study: Omnichannel Support Sync

**Client:** Rawaj Retail Group (retail, 40 stores).

**Problem:** customer messages arrived on WhatsApp, email and live chat in separate tools; angry customers waited hours while simple questions clogged the queue.

**Workflow:** Webhook → Sentiment AI → Router → Ticket Resolution. A single webhook receives every channel, an AI node scores sentiment, a router sends negative messages to the escalation team and answers simple enquiries automatically in Zendesk.

**Results:** first-response time fell from 4 hours to 6 minutes, about 120,000 runs per month, 310 hours saved monthly, 0% failure rate, average execution 840 ms.

You can explore this workflow in 3D in the portfolio section and switch it to the exploded view.
MD,
        ],
        'ar' => [
            'title' => 'دراسة حالة: مزامنة الدعم متعدد القنوات',
            'content' => <<<'MD'
# دراسة حالة: مزامنة الدعم متعدد القنوات

**العميل:** مجموعة رواج للتجزئة (40 فرعاً).

**المشكلة:** رسائل العملاء تصل عبر واتساب والبريد والدردشة في أدوات منفصلة؛ العملاء الغاضبون ينتظرون ساعات بينما تزدحم القائمة بالأسئلة البسيطة.

**المسار:** Webhook ← تحليل المشاعر بالذكاء الاصطناعي ← الموجّه ← حل التذكرة. يستقبل Webhook موحّد كل القنوات، وتقيّم عقدة الذكاء الاصطناعي نبرة الرسالة، ويرسل الموجّه الرسائل السلبية لفريق التصعيد ويجيب عن الاستفسارات البسيطة تلقائياً في Zendesk.

**النتائج:** انخفض زمن الاستجابة الأول من 4 ساعات إلى 6 دقائق، ونحو 120 ألف تنفيذ شهرياً، وتوفير 310 ساعات شهرياً، ونسبة فشل 0%، ومتوسط تنفيذ 840 مللي ثانية.

يمكنك استكشاف هذا المسار ثلاثي الأبعاد في قسم الأعمال وتحويله إلى العرض المفكك.
MD,
        ],
    ],
    [
        'key' => 'case-invoice',
        'category' => 'case_study',
        'project_slug' => 'autonomous-invoice-extractor',
        'en' => [
            'title' => 'Case study: Autonomous Invoice Extractor',
            'content' => <<<'MD'
# Case study: Autonomous Invoice Extractor

**Client:** Qimma Logistics (freight and warehousing).

**Problem:** three accountants spent most of their week typing supplier invoices from email attachments into the finance database, with frequent VAT errors.

**Workflow:** Email Trigger → OCR Node → Postgres Save → WhatsApp Alert. The trigger watches the accounts-payable inbox, an AI extraction node reads PDFs and photos (supplier, VAT number, line totals, VAT), results are validated and saved to PostgreSQL, and invoices above the approval threshold trigger a WhatsApp alert to the finance manager.

**Results:** 18,000 invoices processed monthly with zero manual entry, 220 hours saved per month, 0% failure rate, average execution 2.1 seconds.
MD,
        ],
        'ar' => [
            'title' => 'دراسة حالة: مستخرج الفواتير الذاتي',
            'content' => <<<'MD'
# دراسة حالة: مستخرج الفواتير الذاتي

**العميل:** قمة للخدمات اللوجستية (شحن وتخزين).

**المشكلة:** ثلاثة محاسبين يقضون معظم أسبوعهم في إدخال فواتير الموردين من مرفقات البريد إلى قاعدة البيانات المالية، مع أخطاء متكررة في ضريبة القيمة المضافة.

**المسار:** مشغّل البريد ← عقدة OCR ← حفظ في Postgres ← تنبيه واتساب. يراقب المشغّل صندوق بريد الحسابات، وتقرأ عقدة الاستخراج بالذكاء الاصطناعي ملفات PDF والصور (المورد، الرقم الضريبي، الإجماليات، الضريبة)، ثم يتم التحقق من النتائج وحفظها في PostgreSQL، وتُرسل الفواتير التي تتجاوز حد الاعتماد تنبيهاً عبر واتساب للمدير المالي.

**النتائج:** معالجة 18 ألف فاتورة شهرياً دون إدخال يدوي، وتوفير 220 ساعة شهرياً، ونسبة فشل 0%، ومتوسط تنفيذ 2.1 ثانية.
MD,
        ],
    ],
    [
        'key' => 'case-lead-enrichment',
        'category' => 'case_study',
        'project_slug' => 'lead-enrichment-engine',
        'en' => [
            'title' => 'Case study: Lead Enrichment Engine',
            'content' => <<<'MD'
# Case study: Lead Enrichment Engine

**Client:** Sahm Fintech (B2B payments).

**Problem:** sales reps researched every website sign-up by hand and many good leads went cold before anyone called them.

**Workflow:** Form Trigger → Clearbit API → Scoring Filter → HubSpot CRM. Each sign-up is enriched with company size, industry and tech stack, scored against the sales team's ideal-customer rules, and qualified leads are created in HubSpot as a contact plus deal assigned to the right rep.

**Results:** lead-to-meeting conversion up 38%, 45,000 leads processed monthly, 160 hours saved per month, 0% failure rate, average execution 620 ms.
MD,
        ],
        'ar' => [
            'title' => 'دراسة حالة: محرك إثراء العملاء المحتملين',
            'content' => <<<'MD'
# دراسة حالة: محرك إثراء العملاء المحتملين

**العميل:** سهم للتقنية المالية (مدفوعات الشركات).

**المشكلة:** مندوبو المبيعات يبحثون يدوياً عن كل تسجيل من الموقع، وكثير من العملاء الجيدين يفقدون اهتمامهم قبل التواصل معهم.

**المسار:** مشغّل النموذج ← واجهة Clearbit ← فلتر التقييم ← HubSpot CRM. يُثرى كل تسجيل بحجم الشركة وقطاعها وتقنياتها، ويُقيَّم وفق معايير العميل المثالي لفريق المبيعات، ثم يُنشأ العملاء المؤهلون في HubSpot كجهة اتصال وصفقة مُسندة للمندوب المناسب.

**النتائج:** ارتفاع التحويل من عميل محتمل إلى اجتماع بنسبة 38%، ومعالجة 45 ألف عميل محتمل شهرياً، وتوفير 160 ساعة شهرياً، ونسبة فشل 0%، ومتوسط تنفيذ 620 مللي ثانية.
MD,
        ],
    ],

    [
        'key' => 'case-ai-recruitment',
        'category' => 'case_study',
        'project_slug' => 'ai-recruitment-pipeline',
        'en' => [
            'title' => 'Case study: AI Recruitment Pipeline',
            'content' => <<<'MD'
# Case study: AI Recruitment Pipeline

**Client:** Nama Talent Partners (recruitment agency).

**Problem:** recruiters spent three days screening each batch of CVs by hand, duplicate applications slipped through and strong candidates waited too long for an interview.

**Workflow:** n8n Form Trigger → Extract PDF Text → Google Sheets (find candidate) → IF already applied (shows an "already applied" form page) → Basic LLM Chain with Google Gemini scores the CV against the role → IF score ≥ 70. Qualified candidates go to an AI Agent (recruiter) with Google Gemini and window-buffer memory that checks Google Calendar for a free slot, creates a Google Meet interview event and sends the acceptance email via Gmail. Others are logged in Google Sheets and receive a courteous rejection email.

**Results:** screening time cut from 3 days to 4 minutes, 2,400 applications processed monthly, 140 recruiter hours saved per month, 0% failure rate, average execution 6.4 s.
MD,
        ],
        'ar' => [
            'title' => 'دراسة حالة: مسار التوظيف بالذكاء الاصطناعي',
            'content' => <<<'MD'
# دراسة حالة: مسار التوظيف بالذكاء الاصطناعي

**العميل:** نماء لشركاء المواهب (وكالة توظيف).

**المشكلة:** كان فريق التوظيف يقضي ثلاثة أيام في فرز كل دفعة من السير الذاتية يدوياً، وتتسرب الطلبات المكررة، وينتظر المرشحون المميزون طويلاً قبل المقابلة.

**المسار:** نموذج n8n ← استخراج نص PDF ← البحث في Google Sheets ← شرط "تقدّم سابقاً؟" (يعرض صفحة "تقدّمت سابقاً") ← سلسلة LLM مع Google Gemini تقيّم السيرة مقابل الوظيفة ← شرط "الدرجة ≥ 70؟". المؤهلون ينتقلون إلى وكيل توظيف ذكي مع Google Gemini وذاكرة محادثة يفحص Google Calendar ويحجز مقابلة Google Meet ويرسل بريد القبول عبر Gmail، والبقية يُسجَّلون في Google Sheets ويتلقون بريد اعتذار لبقاً.

**النتائج:** اختصار زمن الفرز من 3 أيام إلى 4 دقائق، ومعالجة 2,400 طلب شهرياً، وتوفير 140 ساعة عمل شهرياً، ونسبة فشل 0%، ومتوسط تنفيذ 6.4 ثانية.
MD,
        ],
    ],

    // ───────────────────────── contact & assistant ─────────────────────────
    [
        'key' => 'company-contact',
        'category' => 'company',
        'en' => [
            'title' => 'Contact, working hours and next steps',
            'content' => <<<'MD'
# Contact, working hours and next steps

- **Website:** afaqn8n.me
- **Email:** info@afaqn8n.me
- **Working hours:** Sunday to Thursday, 9:00–18:00 (Riyadh time, GMT+3).
- **Response time:** within one business day for new requests.

## How to start
1. Submit the booking form on the website (about 2 minutes) or ask the Afaq Copilot assistant to file a request for you.
2. You receive a reference number (AFQ-XXXXXX) and an indicative estimate.
3. We schedule a free 30-minute discovery call.
4. You receive a written solution design and a fixed quote.
MD,
        ],
        'ar' => [
            'title' => 'التواصل وساعات العمل والخطوات التالية',
            'content' => <<<'MD'
# التواصل وساعات العمل والخطوات التالية

- **الموقع:** afaqn8n.me
- **البريد:** info@afaqn8n.me
- **ساعات العمل:** من الأحد إلى الخميس، من 9:00 إلى 18:00 (بتوقيت الرياض).
- **زمن الرد:** خلال يوم عمل واحد للطلبات الجديدة.

## كيف تبدأ
1. أرسل نموذج الحجز في الموقع (حوالي دقيقتين) أو اطلب من مساعد أفق الذكي تسجيل طلبك.
2. تحصل على رقم مرجعي (AFQ-XXXXXX) وتقدير مبدئي للتكلفة.
3. نحدد موعد مكالمة استكشافية مجانية مدتها 30 دقيقة.
4. تستلم وثيقة تصميم الحل وعرض سعر ثابت.
MD,
        ],
    ],
    [
        'key' => 'faq-copilot',
        'category' => 'faq',
        'en' => [
            'title' => 'About the Afaq Copilot assistant',
            'content' => <<<'MD'
# About the Afaq Copilot assistant

### What can Afaq Copilot do?
It answers questions about our services, pricing, process and past projects using this knowledge base, and it can act on the page: scroll to a section, show a portfolio workflow in 3D (assembled or exploded) and submit a service request on your behalf.

### How does Copilot submit a request?
It collects your name, email, the service you need, your budget range and a short description, shows you a summary, and only submits after you confirm. You then receive an AFQ reference number.

### Is my conversation stored?
Conversations are stored for up to 30 days to improve answers, with emails, phone numbers and IDs masked. Contact details you confirm for a request are stored with that request only.

### Can Copilot give me an exact price?
No. It shares indicative ranges; the fixed quote comes from our team after a discovery call.
MD,
        ],
        'ar' => [
            'title' => 'عن مساعد أفق الذكي (Afaq Copilot)',
            'content' => <<<'MD'
# عن مساعد أفق الذكي (Afaq Copilot)

### ماذا يستطيع مساعد أفق أن يفعل؟
يجيب عن الأسئلة حول خدماتنا وأسعارنا وطريقة عملنا ومشاريعنا السابقة اعتماداً على قاعدة المعرفة هذه، ويستطيع التفاعل مع الصفحة: الانتقال إلى قسم معين، وعرض مسار من أعمالنا بشكل ثلاثي الأبعاد (مجمّعاً أو مفككاً)، وتسجيل طلب خدمة نيابةً عنك.

### كيف يسجل المساعد طلباً؟
يجمع اسمك وبريدك والخدمة التي تحتاجها ونطاق ميزانيتك ووصفاً مختصراً، ثم يعرض عليك ملخصاً، ولا يرسل الطلب إلا بعد تأكيدك. بعدها تحصل على رقم مرجعي يبدأ بـ AFQ.

### هل تُحفظ محادثتي؟
تُحفظ المحادثات لمدة أقصاها 30 يوماً لتحسين الإجابات، مع إخفاء البريد وأرقام الهواتف والهويات. أما بيانات التواصل التي تؤكدها لطلب ما فتُحفظ مع ذلك الطلب فقط.

### هل يستطيع المساعد إعطائي سعراً دقيقاً؟
لا. يقدم نطاقات تقديرية فقط، والعرض الثابت يأتي من فريقنا بعد المكالمة الاستكشافية.
MD,
        ],
    ],
];
