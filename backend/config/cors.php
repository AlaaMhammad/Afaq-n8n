<?php

/*
|--------------------------------------------------------------------------
| CORS — docs/05_security/api_security.md §3
|--------------------------------------------------------------------------
| Only the Next.js frontend origin(s) may call the API from a browser.
| Prod: CORS_ALLOWED_ORIGINS=https://afaqn8n.me,https://www.afaqn8n.me
*/

return [

    'paths' => ['api/*'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000'))))),

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['Content-Type', 'Accept', 'Accept-Language', 'Authorization', 'X-Request-Id', 'X-Requested-With'],

    'exposed_headers' => ['X-Request-Id', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Retry-After', 'ETag'],

    'max_age' => 3600,

    'supports_credentials' => false,

];
