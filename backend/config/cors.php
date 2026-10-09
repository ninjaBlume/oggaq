<?php

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    'allowed_origins' => array_filter([env('FRONTEND_URL', 'http://127.0.0.1:5173'), env('ADMIN_URL', 'http://127.0.0.1:5174'),
        in_array(env('APP_ENV'), ['local', 'testing'], true) ? env('MOBILE_WEB_PREVIEW_URL') : null]),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['Accept', 'Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'X-CSRF-TOKEN'],
    'exposed_headers' => ['X-Request-Id', 'Retry-After'],
    'max_age' => 600,
    'supports_credentials' => true,
];
