<?php

/*
|--------------------------------------------------------------------------
| Prompt-injection heuristics (docs/05_security/prompt_guard.md §3)
|--------------------------------------------------------------------------
| Each rule adds its score when it matches the raw or Arabic-normalised message.
| total >= block_score  → rejected (422 PROMPT_REJECTED)
| total >= flag_score   → allowed, but stored as flagged with an extra system reminder
*/

return [

    'block_score' => 3,
    'flag_score' => 1,

    'rules' => [
        // "ignore previous instructions"
        ['score' => 3, 'pattern' => '/\b(ignore|disregard|forget|override)\b.{0,30}\b(all\s+)?(previous|prior|above|earlier|your|system)\b.{0,20}\b(instructions?|rules?|prompts?|directives?)\b/iu'],
        ['score' => 3, 'pattern' => '/(تجاهل|انس|انسى|تخط)\S*.{0,25}(التعليمات|الاوامر|الأوامر|القواعد|التوجيهات)/u'],

        // "reveal your system prompt"
        ['score' => 3, 'pattern' => '/\b(reveal|print|show|repeat|output|display|leak|tell me)\b.{0,30}\b(system\s*prompt|hidden\s*prompt|initial\s*prompt|your\s+(instructions|prompt|rules))\b/iu'],
        ['score' => 3, 'pattern' => '/(اكشف|اعرض|اطبع|اظهر|أظهر|كرر)\S*.{0,25}(التعليمات|البرومبت|الموجه|القواعد)\S*.{0,20}(النظام|الخاصة|الداخلية|المخفية)/u'],

        // role-play / jailbreak framing
        ['score' => 2, 'pattern' => '/\b(you\s+are\s+now|act\s+as|pretend\s+(to\s+be|you\s+are)|developer\s+mode|jailbreak|DAN\b|do\s+anything\s+now)/iu'],
        ['score' => 2, 'pattern' => '/(أنت\s+الآن|انت\s+الان|تصرف\s+ك|تظاهر\s+بأنك|وضع\s+المطور)/u'],

        // fake role / delimiter tags
        ['score' => 2, 'pattern' => '/<\/?\s*(system|assistant|context|user_message|instructions?)\s*>|\[\/?INST\]|#{2,}\s*system\b|<\|im_(start|end)\|>/iu'],

        // tool coercion
        ['score' => 2, 'pattern' => '/\b(call|invoke|run|execute)\b.{0,15}\b(submit_service_inquiry|navigate_to|trigger_3d_workflow)\b/iu'],

        // obfuscated payloads
        ['score' => 1, 'pattern' => '/[A-Za-z0-9+\/]{200,}={0,2}/'],
        ['score' => 1, 'pattern' => '/(\\\\u[0-9a-fA-F]{4}.*){20,}/s'],
    ],

    // Messages where one token makes up most of the text (spam / token flooding)
    'repetition_ratio' => 0.6,
    'repetition_min_tokens' => 20,

    // Output filter: n-gram overlap with the system prompt that counts as a leak
    'leak_ngram' => 8,
    'leak_max_matches' => 2,

];
