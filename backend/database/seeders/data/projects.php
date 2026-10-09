<?php

/*
 * Portfolio case studies with 3D workflow data.
 * workflow_metadata schema: docs/01_architecture/database_schema.md §4.1
 *   position  = assembled coordinates (scene units)
 *   exploded  = offset added in exploded mode (hand-tuned so nodes never overlap)
 * Client names are fictional demo data.
 */

$camera = ['position' => [0, 2.5, 9], 'target' => [0, 0, 0]];

return [
    [
        'slug' => 'omnichannel-support-sync',
        'client' => 'Rawaj Retail Group',
        'is_featured' => true,
        'live_url' => null,
        'services' => ['ai-voice-chat-agents', 'crm-sync'],
        'title' => [
            'ar' => 'مزامنة الدعم متعدد القنوات',
            'en' => 'Omnichannel Support Sync',
        ],
        'summary' => [
            'ar' => 'يستقبل رسائل العملاء من واتساب والبريد والدردشة عبر Webhook موحّد، ويحلل نبرة الرسالة بالذكاء الاصطناعي، ثم يوجّه الحالات السلبية فوراً إلى فريق التصعيد ويُغلق الاستفسارات البسيطة تلقائياً. خفّض زمن الاستجابة الأول من 4 ساعات إلى 6 دقائق.',
            'en' => 'Ingests customer messages from WhatsApp, email and live chat through a single webhook, scores sentiment with AI, routes negative cases straight to the escalation team and auto-resolves simple enquiries. Cut first-response time from 4 hours to 6 minutes.',
        ],
        'metrics' => [
            'avgExecutionMs' => 840,
            'failureRate' => 0,
            'nodesCount' => 4,
            'monthlyRuns' => 120000,
            'hoursSavedPerMonth' => 310,
        ],
        'workflow_metadata' => [
            'version' => 1,
            'camera' => $camera,
            'nodes' => [
                ['id' => 'webhook', 'kind' => 'trigger', 'label' => ['ar' => 'استقبال Webhook', 'en' => 'Webhook'], 'n8nType' => 'n8n-nodes-base.webhook', 'position' => [-4.5, 0, -0.6], 'exploded' => [-1.5, 1.2, 0.8], 'stats' => ['avgMs' => 40, 'executions' => 120000]],
                ['id' => 'sentiment', 'kind' => 'ai', 'label' => ['ar' => 'تحليل المشاعر', 'en' => 'Sentiment AI'], 'n8nType' => '@n8n/n8n-nodes-langchain.sentimentAnalysis', 'position' => [-1.5, 0, 0], 'exploded' => [-0.5, -1.4, 1.1], 'stats' => ['avgMs' => 610, 'executions' => 120000]],
                ['id' => 'router', 'kind' => 'router', 'label' => ['ar' => 'الموجّه', 'en' => 'Router'], 'n8nType' => 'n8n-nodes-base.switch', 'position' => [1.5, 0, 0], 'exploded' => [0.6, 1.5, -0.9], 'stats' => ['avgMs' => 12, 'executions' => 120000]],
                ['id' => 'ticket', 'kind' => 'action', 'label' => ['ar' => 'حل التذكرة', 'en' => 'Ticket Resolution'], 'n8nType' => 'n8n-nodes-base.zendesk', 'position' => [4.5, 0, -0.6], 'exploded' => [1.6, -1.0, 0.7], 'stats' => ['avgMs' => 178, 'executions' => 118400]],
            ],
            'edges' => [
                ['from' => 'webhook', 'to' => 'sentiment', 'animated' => true],
                ['from' => 'sentiment', 'to' => 'router', 'animated' => true],
                ['from' => 'router', 'to' => 'ticket', 'fromPort' => 'negative', 'label' => ['ar' => 'سلبي', 'en' => 'negative'], 'animated' => true],
            ],
        ],
    ],
    [
        'slug' => 'autonomous-invoice-extractor',
        'client' => 'Qimma Logistics',
        'is_featured' => true,
        'live_url' => null,
        'services' => ['whatsapp-business-automation', 'custom-n8n-nodes'],
        'title' => [
            'ar' => 'مستخرج الفواتير الذاتي',
            'en' => 'Autonomous Invoice Extractor',
        ],
        'summary' => [
            'ar' => 'يراقب صندوق بريد الحسابات، ويستخرج بيانات الفواتير (المورد، الرقم الضريبي، المبالغ، ضريبة القيمة المضافة) من ملفات PDF والصور عبر OCR مدعوم بالذكاء الاصطناعي، ويحفظها في PostgreSQL، ثم يرسل تنبيه واتساب للمدير المالي عند تجاوز الحد. يعالج 18 ألف فاتورة شهرياً دون إدخال يدوي.',
            'en' => 'Watches the accounts-payable inbox, extracts invoice data (supplier, VAT number, totals, VAT) from PDFs and photos with AI-powered OCR, stores it in PostgreSQL and pings the finance manager on WhatsApp when thresholds are exceeded. Processes 18k invoices a month with zero manual entry.',
        ],
        'metrics' => [
            'avgExecutionMs' => 2100,
            'failureRate' => 0,
            'nodesCount' => 4,
            'monthlyRuns' => 18000,
            'hoursSavedPerMonth' => 220,
        ],
        'workflow_metadata' => [
            'version' => 1,
            'camera' => $camera,
            'nodes' => [
                ['id' => 'email', 'kind' => 'trigger', 'label' => ['ar' => 'مشغّل البريد', 'en' => 'Email Trigger'], 'n8nType' => 'n8n-nodes-base.emailReadImap', 'position' => [-4.5, 0, -0.6], 'exploded' => [-1.4, -1.3, 0.9], 'stats' => ['avgMs' => 90, 'executions' => 18000]],
                ['id' => 'ocr', 'kind' => 'ai', 'label' => ['ar' => 'عقدة OCR', 'en' => 'OCR Node'], 'n8nType' => '@n8n/n8n-nodes-langchain.informationExtractor', 'position' => [-1.5, 0, 0], 'exploded' => [-0.6, 1.5, 1.0], 'stats' => ['avgMs' => 1720, 'executions' => 18000]],
                ['id' => 'postgres', 'kind' => 'storage', 'label' => ['ar' => 'حفظ في Postgres', 'en' => 'Postgres Save'], 'n8nType' => 'n8n-nodes-base.postgres', 'position' => [1.5, 0, 0], 'exploded' => [0.5, -1.5, -1.0], 'stats' => ['avgMs' => 35, 'executions' => 18000]],
                ['id' => 'whatsapp', 'kind' => 'action', 'label' => ['ar' => 'تنبيه واتساب', 'en' => 'WhatsApp Alert'], 'n8nType' => 'n8n-nodes-base.whatsApp', 'position' => [4.5, 0, -0.6], 'exploded' => [1.5, 1.1, 0.8], 'stats' => ['avgMs' => 255, 'executions' => 2300]],
            ],
            'edges' => [
                ['from' => 'email', 'to' => 'ocr', 'animated' => true],
                ['from' => 'ocr', 'to' => 'postgres', 'animated' => true],
                ['from' => 'postgres', 'to' => 'whatsapp', 'label' => ['ar' => 'فوق الحد', 'en' => 'over threshold'], 'animated' => true],
            ],
        ],
    ],
    [
        'slug' => 'lead-enrichment-engine',
        'client' => 'Sahm Fintech',
        'is_featured' => true,
        'live_url' => null,
        'services' => ['crm-sync', 'custom-n8n-nodes'],
        'title' => [
            'ar' => 'محرك إثراء العملاء المحتملين',
            'en' => 'Lead Enrichment Engine',
        ],
        'summary' => [
            'ar' => 'يلتقط كل نموذج تسجيل من الموقع، ويثري بيانات الشركة (الحجم، القطاع، التقنيات) عبر Clearbit، ويحسب درجة التأهيل وفق قواعد فريق المبيعات، ثم ينشئ جهة الاتصال والصفقة في HubSpot مع إسنادها للمندوب المناسب. رفع معدل التحويل من عميل محتمل إلى اجتماع بنسبة 38%.',
            'en' => 'Captures every sign-up form on the website, enriches company data (size, industry, tech stack) via Clearbit, scores the lead against the sales team’s rules, then creates the contact and deal in HubSpot assigned to the right rep. Lifted lead-to-meeting conversion by 38%.',
        ],
        'metrics' => [
            'avgExecutionMs' => 620,
            'failureRate' => 0,
            'nodesCount' => 4,
            'monthlyRuns' => 45000,
            'hoursSavedPerMonth' => 160,
        ],
        'workflow_metadata' => [
            'version' => 1,
            'camera' => $camera,
            'nodes' => [
                ['id' => 'form', 'kind' => 'trigger', 'label' => ['ar' => 'مشغّل النموذج', 'en' => 'Form Trigger'], 'n8nType' => 'n8n-nodes-base.formTrigger', 'position' => [-4.5, 0, -0.6], 'exploded' => [-1.6, 1.1, -0.8], 'stats' => ['avgMs' => 25, 'executions' => 45000]],
                ['id' => 'clearbit', 'kind' => 'action', 'label' => ['ar' => 'واجهة Clearbit', 'en' => 'Clearbit API'], 'n8nType' => 'n8n-nodes-base.clearbit', 'position' => [-1.5, 0, 0], 'exploded' => [-0.5, -1.5, 1.1], 'stats' => ['avgMs' => 410, 'executions' => 45000]],
                ['id' => 'scoring', 'kind' => 'router', 'label' => ['ar' => 'فلتر التقييم', 'en' => 'Scoring Filter'], 'n8nType' => 'n8n-nodes-base.filter', 'position' => [1.5, 0, 0], 'exploded' => [0.6, 1.4, 1.0], 'stats' => ['avgMs' => 8, 'executions' => 45000]],
                ['id' => 'hubspot', 'kind' => 'action', 'label' => ['ar' => 'HubSpot CRM', 'en' => 'HubSpot CRM'], 'n8nType' => 'n8n-nodes-base.hubspot', 'position' => [4.5, 0, -0.6], 'exploded' => [1.5, -1.2, -0.7], 'stats' => ['avgMs' => 177, 'executions' => 12600]],
            ],
            'edges' => [
                ['from' => 'form', 'to' => 'clearbit', 'animated' => true],
                ['from' => 'clearbit', 'to' => 'scoring', 'animated' => true],
                ['from' => 'scoring', 'to' => 'hubspot', 'fromPort' => 'true', 'label' => ['ar' => 'مؤهَّل', 'en' => 'qualified'], 'animated' => true],
            ],
        ],
    ],
    [
        'slug' => 'ai-recruitment-pipeline',
        'client' => 'Nama Talent Partners',
        'is_featured' => true,
        'live_url' => null,
        'services' => ['ai-voice-chat-agents', 'custom-n8n-nodes'],
        'title' => [
            'ar' => 'مسار التوظيف بالذكاء الاصطناعي',
            'en' => 'AI Recruitment Pipeline',
        ],
        'summary' => [
            'ar' => 'يستقبل السير الذاتية عبر نموذج n8n، ويستخرج نص ملف PDF ويتحقق من عدم تكرار المتقدم في Google Sheets، ثم يقيّم Gemini السيرة مقابل متطلبات الوظيفة. المرشحون بدرجة 70 فأكثر ينتقلون إلى وكيل توظيف ذكي بذاكرة يفحص Google Calendar ويحجز مقابلة Google Meet ويرسل خطاب القبول عبر Gmail، والبقية يُسجَّلون ويتلقون اعتذاراً لبقاً. اختصر زمن الفرز من 3 أيام إلى 4 دقائق.',
            'en' => 'Takes CVs through an n8n form, extracts the PDF text, checks Google Sheets for duplicate applicants, then has Gemini score each CV against the role. Candidates scoring 70+ go to an AI recruiter agent with memory that checks Google Calendar, books a Google Meet interview and sends the acceptance via Gmail; everyone else is logged and receives a courteous rejection. Cut screening time from 3 days to 4 minutes.',
        ],
        'metrics' => [
            'avgExecutionMs' => 6400,
            'failureRate' => 0,
            'nodesCount' => 16,
            'monthlyRuns' => 2400,
            'hoursSavedPerMonth' => 140,
        ],
        'workflow_metadata' => [
            'version' => 1,
            'camera' => $camera,
            'nodes' => [
                ['id' => 'form', 'kind' => 'trigger', 'label' => ['ar' => 'نموذج التقديم', 'en' => 'n8n Form Trigger'], 'n8nType' => 'n8n-nodes-base.formTrigger', 'position' => [-9.0, 0, 0], 'exploded' => [-0.6, 0.5, 0.8], 'stats' => ['avgMs' => 30, 'executions' => 2400]],
                ['id' => 'extract', 'kind' => 'action', 'label' => ['ar' => 'استخراج نص PDF', 'en' => 'Extract PDF Text'], 'n8nType' => 'n8n-nodes-base.extractFromFile', 'position' => [-7.1, 0, 0], 'exploded' => [-0.4, -0.5, -0.7], 'stats' => ['avgMs' => 420, 'executions' => 2400]],
                ['id' => 'find', 'kind' => 'storage', 'label' => ['ar' => 'البحث عن المرشح', 'en' => 'Sheets: Find Candidate'], 'n8nType' => 'n8n-nodes-base.googleSheets', 'position' => [-5.2, 0, 0], 'exploded' => [-0.3, 0.5, 0.7], 'stats' => ['avgMs' => 380, 'executions' => 2400]],
                ['id' => 'applied', 'kind' => 'router', 'label' => ['ar' => 'تقدّم سابقاً؟', 'en' => 'Already Applied?'], 'n8nType' => 'n8n-nodes-base.if', 'position' => [-3.3, 0, 0], 'exploded' => [-0.2, -0.5, -0.8], 'stats' => ['avgMs' => 4, 'executions' => 2400]],
                ['id' => 'duplicate', 'kind' => 'action', 'label' => ['ar' => 'إشعار: تقدّم سابقاً', 'en' => 'Form: Already Applied'], 'n8nType' => 'n8n-nodes-base.form', 'position' => [-1.4, -2.5, 0], 'exploded' => [0, -0.6, 0.6], 'stats' => ['avgMs' => 25, 'executions' => 190]],
                ['id' => 'score', 'kind' => 'ai', 'label' => ['ar' => 'تقييم السيرة', 'en' => 'Basic LLM Chain'], 'n8nType' => '@n8n/n8n-nodes-langchain.chainLlm', 'position' => [-1.4, 0, 0], 'exploded' => [0, 0.6, 0.9], 'stats' => ['avgMs' => 2900, 'executions' => 2210]],
                ['id' => 'score-model', 'kind' => 'ai', 'label' => ['ar' => 'نموذج Gemini', 'en' => 'Google Gemini'], 'n8nType' => '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', 'position' => [-1.4, -1.3, 0], 'exploded' => [0, -0.4, 1.0]],
                ['id' => 'threshold', 'kind' => 'router', 'label' => ['ar' => 'الدرجة ≥ 70؟', 'en' => 'Score ≥ 70?'], 'n8nType' => 'n8n-nodes-base.if', 'position' => [0.5, 0, 0], 'exploded' => [0.1, -0.5, -0.8], 'stats' => ['avgMs' => 3, 'executions' => 2210]],
                ['id' => 'agent', 'kind' => 'ai', 'label' => ['ar' => 'وكيل التوظيف', 'en' => 'AI Agent (Recruiter)'], 'n8nType' => '@n8n/n8n-nodes-langchain.agent', 'position' => [2.4, 1.0, 0], 'exploded' => [0.2, 0.7, 0.9], 'stats' => ['avgMs' => 3100, 'executions' => 640]],
                ['id' => 'agent-model', 'kind' => 'ai', 'label' => ['ar' => 'نموذج Gemini', 'en' => 'Google Gemini'], 'n8nType' => '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', 'position' => [1.8, -0.4, 0], 'exploded' => [-0.3, -0.3, 1.1]],
                ['id' => 'memory', 'kind' => 'storage', 'label' => ['ar' => 'ذاكرة المحادثة', 'en' => 'Window Buffer Memory'], 'n8nType' => '@n8n/n8n-nodes-langchain.memoryBufferWindow', 'position' => [3.0, -0.4, 0], 'exploded' => [0.3, -0.3, 1.1]],
                ['id' => 'calendar', 'kind' => 'action', 'label' => ['ar' => 'فحص التقويم', 'en' => 'Check Calendar'], 'n8nType' => 'n8n-nodes-base.googleCalendar', 'position' => [4.3, 1.0, 0], 'exploded' => [0.3, 0.5, -0.7], 'stats' => ['avgMs' => 510, 'executions' => 640]],
                ['id' => 'book', 'kind' => 'action', 'label' => ['ar' => 'حجز مقابلة Meet', 'en' => 'Create Meet & Event'], 'n8nType' => 'n8n-nodes-base.googleCalendar', 'position' => [6.2, 1.0, 0], 'exploded' => [0.4, -0.4, 0.8], 'stats' => ['avgMs' => 690, 'executions' => 610]],
                ['id' => 'accept', 'kind' => 'action', 'label' => ['ar' => 'إرسال القبول', 'en' => 'Send Acceptance'], 'n8nType' => 'n8n-nodes-base.gmail', 'position' => [8.1, 1.0, 0], 'exploded' => [0.6, 0.5, -0.6], 'stats' => ['avgMs' => 340, 'executions' => 610]],
                ['id' => 'reject-log', 'kind' => 'storage', 'label' => ['ar' => 'تسجيل الرفض', 'en' => 'Sheets: Rejected'], 'n8nType' => 'n8n-nodes-base.googleSheets', 'position' => [4.3, -1.6, 0], 'exploded' => [0.3, -0.5, 0.7], 'stats' => ['avgMs' => 360, 'executions' => 1570]],
                ['id' => 'reject', 'kind' => 'action', 'label' => ['ar' => 'إرسال الاعتذار', 'en' => 'Send Rejection'], 'n8nType' => 'n8n-nodes-base.gmail', 'position' => [6.2, -1.6, 0], 'exploded' => [0.5, -0.4, -0.7], 'stats' => ['avgMs' => 330, 'executions' => 1570]],
            ],
            'edges' => [
                ['from' => 'form', 'to' => 'extract', 'animated' => true],
                ['from' => 'extract', 'to' => 'find', 'animated' => true],
                ['from' => 'find', 'to' => 'applied', 'animated' => true],
                ['from' => 'applied', 'to' => 'duplicate', 'fromPort' => 'true', 'label' => ['ar' => 'نعم', 'en' => 'true'], 'animated' => true],
                ['from' => 'applied', 'to' => 'score', 'fromPort' => 'false', 'label' => ['ar' => 'لا', 'en' => 'false'], 'animated' => true],
                ['from' => 'score-model', 'to' => 'score', 'type' => 'ai', 'animated' => false],
                ['from' => 'score', 'to' => 'threshold', 'animated' => true],
                ['from' => 'threshold', 'to' => 'agent', 'fromPort' => 'true', 'label' => ['ar' => 'نعم', 'en' => 'true'], 'animated' => true],
                ['from' => 'threshold', 'to' => 'reject-log', 'fromPort' => 'false', 'label' => ['ar' => 'لا', 'en' => 'false'], 'animated' => true],
                ['from' => 'agent-model', 'to' => 'agent', 'type' => 'ai', 'animated' => false],
                ['from' => 'memory', 'to' => 'agent', 'type' => 'ai', 'animated' => false],
                ['from' => 'agent', 'to' => 'calendar', 'animated' => true],
                ['from' => 'calendar', 'to' => 'book', 'animated' => true],
                ['from' => 'book', 'to' => 'accept', 'animated' => true],
                ['from' => 'reject-log', 'to' => 'reject', 'animated' => true],
            ],
        ],
    ],
];
