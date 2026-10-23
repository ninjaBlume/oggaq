<?php

return [
    'mobile_token_minutes' => (int) env('MOBILE_TOKEN_MINUTES', 10080),
    'frontend_url' => env('FRONTEND_URL', 'http://127.0.0.1:5173'),
    'admin_url' => env('ADMIN_URL', 'http://127.0.0.1:5174'),
    // Secret of the erasure ledger (docs/PRIVACY.md): keeps the hashes of erased accounts irreversible. Required in
    // production; outside it a key is derived from APP_KEY. It must be kept apart from database backups.
    'erasure_key' => env('ERASURE_LEDGER_KEY'),
];
