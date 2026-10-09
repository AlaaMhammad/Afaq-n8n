<?php

/*
 * Afaq service catalogue. Translatable fields are {ar, en}.
 * starting_price (USD) feeds App\Domain\Inquiry\EstimateCalculator.
 */

return [
    [
        'slug' => 'custom-n8n-nodes',
        'icon' => 'brand:n8n',
        'starting_price' => 1500,
        'title' => [
            'ar' => 'تطوير عُقد n8n مخصصة',
            'en' => 'Custom n8n Nodes',
        ],
        'description' => [
            'ar' => 'نبني عُقد n8n مخصصة بلغة TypeScript تربط أنظمتك الداخلية وواجهات API غير المدعومة رسمياً، مع اختبارات آلية وتوثيق كامل ونشرها كحزمة خاصة أو عامة.',
            'en' => 'We build purpose-made TypeScript n8n nodes that connect your internal systems and APIs that n8n does not support out of the box — fully tested, documented and published as private or public packages.',
        ],
        'features' => [
            ['ar' => 'عُقد TypeScript مع بيانات اعتماد آمنة', 'en' => 'TypeScript nodes with secure credential types'],
            ['ar' => 'دعم الترقيم والمعالجة الدفعية وحدود المعدل', 'en' => 'Pagination, batching and rate-limit handling'],
            ['ar' => 'اختبارات آلية ونشر عبر CI', 'en' => 'Automated tests & CI publishing'],
            ['ar' => 'عُقد Trigger مخصصة عبر Webhook أو Polling', 'en' => 'Custom webhook or polling trigger nodes'],
            ['ar' => 'توثيق وتدريب لفريقك', 'en' => 'Documentation and team hand-over'],
        ],
    ],
    [
        'slug' => 'ai-voice-chat-agents',
        'icon' => 'brand:googlegemini',
        'starting_price' => 3000,
        'title' => [
            'ar' => 'وكلاء الذكاء الاصطناعي الصوتيون والنصيون',
            'en' => 'AI Voice & Chat Agents',
        ],
        'description' => [
            'ar' => 'وكلاء محادثة يفهمون العربية واللهجات الخليجية والإنجليزية، مدعومون بقاعدة معرفتك (RAG)، ويستطيعون تنفيذ إجراءات حقيقية مثل الحجز وإنشاء التذاكر وتحديث CRM.',
            'en' => 'Conversational agents fluent in Arabic (including Gulf dialects) and English, grounded in your knowledge base (RAG) and able to take real actions — booking, ticket creation, CRM updates.',
        ],
        'features' => [
            ['ar' => 'استرجاع معزز بالمعرفة (RAG) من مستنداتك', 'en' => 'Retrieval-augmented answers from your documents'],
            ['ar' => 'استدعاء الأدوات لتنفيذ الإجراءات', 'en' => 'Tool calling to execute real actions'],
            ['ar' => 'قنوات الويب وواتساب والهاتف', 'en' => 'Web, WhatsApp and phone channels'],
            ['ar' => 'تحويل سلس إلى موظف بشري', 'en' => 'Seamless human hand-off'],
            ['ar' => 'لوحة مراقبة للمحادثات والجودة', 'en' => 'Conversation & quality monitoring dashboard'],
        ],
    ],
    [
        'slug' => 'crm-sync',
        'icon' => 'brand:hubspot',
        'starting_price' => 2000,
        'title' => [
            'ar' => 'مزامنة أنظمة CRM (HubSpot / Salesforce)',
            'en' => 'CRM Sync (HubSpot / Salesforce)',
        ],
        'description' => [
            'ar' => 'مزامنة ثنائية الاتجاه وفورية بين HubSpot أو Salesforce وأنظمة المحاسبة والدعم والتسويق، مع إزالة التكرار وحل التعارضات وسجل تدقيق كامل.',
            'en' => 'Real-time, bi-directional sync between HubSpot or Salesforce and your accounting, support and marketing tools — with de-duplication, conflict resolution and a full audit trail.',
        ],
        'features' => [
            ['ar' => 'مزامنة ثنائية الاتجاه في الوقت الفعلي', 'en' => 'Real-time bi-directional sync'],
            ['ar' => 'إزالة التكرار وتوحيد السجلات', 'en' => 'De-duplication and record merging'],
            ['ar' => 'ربط الحقول المخصصة', 'en' => 'Custom field mapping'],
            ['ar' => 'إعادة المحاولة التلقائية وتنبيهات الأخطاء', 'en' => 'Automatic retries and error alerts'],
        ],
    ],
    [
        'slug' => 'whatsapp-business-automation',
        'icon' => 'brand:whatsapp',
        'starting_price' => 1800,
        'title' => [
            'ar' => 'أتمتة واتساب للأعمال',
            'en' => 'WhatsApp Business Automation',
        ],
        'description' => [
            'ar' => 'إشعارات الطلبات والتذكير بالمواعيد وحملات القوالب المعتمدة وردود الذكاء الاصطناعي عبر WhatsApp Business Cloud API، متكاملة مع أنظمتك.',
            'en' => 'Order notifications, appointment reminders, approved template campaigns and AI replies over the WhatsApp Business Cloud API — wired into your existing systems.',
        ],
        'features' => [
            ['ar' => 'تكامل رسمي مع WhatsApp Cloud API', 'en' => 'Official WhatsApp Cloud API integration'],
            ['ar' => 'قوالب رسائل معتمدة بالعربية والإنجليزية', 'en' => 'Approved Arabic & English message templates'],
            ['ar' => 'تذكيرات ومتابعات آلية', 'en' => 'Automated reminders and follow-ups'],
            ['ar' => 'صندوق وارد مشترك للفريق', 'en' => 'Shared team inbox routing'],
        ],
    ],
    [
        'slug' => 'ecommerce-logistics-routing',
        'icon' => 'brand:shopify',
        'starting_price' => 2500,
        'title' => [
            'ar' => 'توجيه الخدمات اللوجستية للتجارة الإلكترونية',
            'en' => 'E-commerce Logistics Routing',
        ],
        'description' => [
            'ar' => 'توجيه الطلبات تلقائياً من Shopify وسلة وزد إلى المستودع أو شركة الشحن الأنسب حسب الموقع والمخزون والتكلفة، مع تتبع الشحنات وإشعار العملاء.',
            'en' => 'Automatically route orders from Shopify, Salla and Zid to the best warehouse or carrier by location, stock and cost — with shipment tracking and customer notifications.',
        ],
        'features' => [
            ['ar' => 'تكامل مع Shopify وسلة وزد', 'en' => 'Shopify, Salla and Zid integrations'],
            ['ar' => 'قواعد توجيه حسب المخزون والتكلفة', 'en' => 'Stock- and cost-aware routing rules'],
            ['ar' => 'ربط مع أرامكس وSMSA وDHL', 'en' => 'Aramex, SMSA and DHL connectors'],
            ['ar' => 'تتبع الشحنات وإشعارات العملاء', 'en' => 'Shipment tracking & customer updates'],
        ],
    ],
];
