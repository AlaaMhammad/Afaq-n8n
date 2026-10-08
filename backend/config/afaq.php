<?php

return [

    'frontend_url' => env('FRONTEND_URL', 'http://localhost:3000'),

    'admin_seed' => [
        'email' => env('ADMIN_SEED_EMAIL', 'admin@afaqn8n.me'),
        'password' => env('ADMIN_SEED_PASSWORD'),
    ],

    /*
     * Public disk directories for uploaded media.
     */
    'media' => [
        'disk' => env('MEDIA_DISK', 'public'),
        'avatars' => 'team/avatars',
        'cvs' => 'team/cvs',
        'project_covers' => 'projects/covers',
    ],

];
