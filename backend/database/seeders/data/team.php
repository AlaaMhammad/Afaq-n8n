<?php

/*
 * "The Minds Behind the Magic" — fictional demo profiles.
 * `cv` drives the generated sample PDF (English, one page).
 */

return [
    [
        'key' => 'omar-alharbi',
        'initials' => 'OH',
        'order' => 1,
        'name' => ['ar' => 'عمر الحربي', 'en' => 'Omar Al-Harbi'],
        'role' => ['ar' => 'المؤسس ومهندس الأتمتة', 'en' => 'Founder & Automation Architect'],
        'bio' => [
            'ar' => 'يقود عمر أفق منذ تأسيسها، بخبرة تتجاوز 11 عاماً في تصميم الأنظمة وتكامل المؤسسات. صمّم أكثر من 300 مسار أتمتة لشركات التجزئة واللوجستيات والتقنية المالية في الخليج، ويؤمن بأن أفضل أتمتة هي التي لا يلاحظها أحد لأنها لا تتعطل.',
            'en' => 'Omar has led Afaq since day one, bringing 11+ years of systems design and enterprise integration. He has architected 300+ automation pipelines for retail, logistics and fintech companies across the Gulf, and believes the best automation is the one nobody notices because it never breaks.',
        ],
        'skills' => ['n8n', 'System Design', 'PostgreSQL', 'Integration Strategy', 'Team Leadership'],
        'social_links' => ['linkedin' => 'https://www.linkedin.com/', 'github' => 'https://github.com/', 'website' => 'https://afaqn8n.me'],
        'cv' => [
            'summary' => 'Automation architect with 11+ years designing integration platforms and event-driven systems for Gulf enterprises.',
            'experience' => [
                'Founder & Automation Architect, Afaq Automation Agency (2021 - present)',
                'Lead Integration Engineer, regional logistics group (2017 - 2021)',
                'Backend Engineer, e-commerce platform (2014 - 2017)',
            ],
            'education' => 'B.Sc. Computer Engineering',
        ],
    ],
    [
        'key' => 'layla-mansour',
        'initials' => 'LM',
        'order' => 2,
        'name' => ['ar' => 'ليلى منصور', 'en' => 'Layla Mansour'],
        'role' => ['ar' => 'أخصائية n8n أولى', 'en' => 'Senior n8n Specialist'],
        'bio' => [
            'ar' => 'ليلى مساهمة في مجتمع n8n ومطوّرة لعدد من العُقد المجتمعية. تتخصص في بناء عُقد TypeScript مخصصة ومسارات عالية الحجم تعالج ملايين التنفيذات شهرياً مع مراقبة دقيقة وإعادة محاولة ذكية.',
            'en' => 'Layla is an n8n community contributor and author of several community nodes. She specialises in custom TypeScript nodes and high-volume workflows that process millions of executions a month with precise monitoring and smart retries.',
        ],
        'skills' => ['n8n', 'Custom Nodes', 'TypeScript', 'Webhooks', 'Queue Mode'],
        'social_links' => ['linkedin' => 'https://www.linkedin.com/', 'github' => 'https://github.com/'],
        'cv' => [
            'summary' => 'n8n specialist focused on custom nodes, queue-mode scaling and production-grade workflow reliability.',
            'experience' => [
                'Senior n8n Specialist, Afaq Automation Agency (2022 - present)',
                'Automation Engineer, SaaS scale-up (2019 - 2022)',
                'Open-source contributor, n8n community nodes (2020 - present)',
            ],
            'education' => 'B.Sc. Software Engineering',
        ],
    ],
    [
        'key' => 'yousef-alqasem',
        'initials' => 'YQ',
        'order' => 3,
        'name' => ['ar' => 'يوسف القاسم', 'en' => 'Yousef Al-Qasem'],
        'role' => ['ar' => 'مهندس برمجيات متكامل', 'en' => 'Full-Stack Engineer'],
        'bio' => [
            'ar' => 'يبني يوسف الواجهات ولوحات التحكم والبوابات التي تجعل الأتمتة مرئية وقابلة للإدارة. يعمل مع Laravel وNext.js وThree.js، وهو المسؤول عن التجارب ثلاثية الأبعاد التفاعلية في منصتنا.',
            'en' => 'Yousef builds the interfaces, dashboards and portals that make automation visible and manageable. He works across Laravel, Next.js and Three.js, and is behind the interactive 3D experiences on our platform.',
        ],
        'skills' => ['Laravel', 'Next.js', 'Three.js', 'Docker', 'TypeScript'],
        'social_links' => ['linkedin' => 'https://www.linkedin.com/', 'github' => 'https://github.com/'],
        'cv' => [
            'summary' => 'Full-stack engineer shipping Laravel APIs, React/Next.js front-ends and WebGL visualisations.',
            'experience' => [
                'Full-Stack Engineer, Afaq Automation Agency (2023 - present)',
                'Frontend Engineer, digital agency (2020 - 2023)',
                'PHP Developer, fintech start-up (2018 - 2020)',
            ],
            'education' => 'B.Sc. Information Systems',
        ],
    ],
    [
        'key' => 'noura-alsubaie',
        'initials' => 'NS',
        'order' => 4,
        'name' => ['ar' => 'نورة السبيعي', 'en' => 'Noura Al-Subaie'],
        'role' => ['ar' => 'مهندسة ذكاء اصطناعي', 'en' => 'AI Engineer'],
        'bio' => [
            'ar' => 'تصمم نورة وكلاء الذكاء الاصطناعي وأنظمة الاسترجاع المعزز (RAG) التي تفهم العربية بعمق. تركز على تقييم الجودة وأمان المطالبات وتقليل الهلوسة في البيئات الإنتاجية.',
            'en' => 'Noura designs AI agents and retrieval-augmented (RAG) systems with deep Arabic understanding. Her focus is evaluation, prompt security and minimising hallucinations in production environments.',
        ],
        'skills' => ['LLMs', 'RAG', 'pgvector', 'Python', 'Prompt Security'],
        'social_links' => ['linkedin' => 'https://www.linkedin.com/', 'github' => 'https://github.com/'],
        'cv' => [
            'summary' => 'AI engineer building Arabic-first RAG systems and tool-using agents with rigorous evaluation.',
            'experience' => [
                'AI Engineer, Afaq Automation Agency (2023 - present)',
                'Machine Learning Engineer, conversational AI company (2020 - 2023)',
                'Research Assistant, Arabic NLP lab (2018 - 2020)',
            ],
            'education' => 'M.Sc. Artificial Intelligence',
        ],
    ],
];
