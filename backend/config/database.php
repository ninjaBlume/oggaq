<?php

return [
    'default' => 'pgsql',
    'connections' => [
        'pgsql' => [
            'driver' => 'pgsql', 'url' => env('DB_URL'), 'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '55432'), 'database' => env('DB_DATABASE', 'oggaq'),
            'username' => env('DB_USERNAME', 'oggaq'), 'password' => env('DB_PASSWORD'),
            'charset' => 'utf8', 'prefix' => '', 'prefix_indexes' => true,
            'search_path' => 'public', 'sslmode' => env('DB_SSLMODE', 'prefer'), 'timezone' => 'UTC',
        ],
    ],
    'migrations' => ['table' => 'migrations', 'update_date_on_publish' => true],
    'redis' => [
        'client' => env('REDIS_CLIENT', 'predis'),
        'options' => ['prefix' => env('REDIS_PREFIX', 'oggaq_database_')],
        'default' => [
            'url' => env('REDIS_URL'), 'host' => env('REDIS_HOST', '127.0.0.1'),
            'password' => env('REDIS_PASSWORD'), 'port' => env('REDIS_PORT', '56379'), 'database' => env('REDIS_DB', 0),
        ],
        'cache' => [
            'url' => env('REDIS_URL'), 'host' => env('REDIS_HOST', '127.0.0.1'),
            'password' => env('REDIS_PASSWORD'), 'port' => env('REDIS_PORT', '56379'), 'database' => env('REDIS_CACHE_DB', 1),
        ],
    ],
];
