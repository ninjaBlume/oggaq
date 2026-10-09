<?php

return [
    'mobile_token_minutes' => (int) env('MOBILE_TOKEN_MINUTES', 10080),
    'frontend_url' => env('FRONTEND_URL', 'http://127.0.0.1:5173'),
    'admin_url' => env('ADMIN_URL', 'http://127.0.0.1:5174'),
];
