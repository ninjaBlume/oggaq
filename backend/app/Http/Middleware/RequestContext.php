<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class RequestContext
{
    public function handle(Request $request, Closure $next): Response
    {
        $id = (string) Str::uuid();
        $request->attributes->set('request_id', $id);
        Log::withContext(['request_id' => $id]);
        try {
            $response = $next($request);
        } finally {
            Log::withoutContext();
        }
        $response->headers->set('X-Request-Id', $id);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        if ($request->is('api/*', 'sanctum/*')) {
            $response->headers->set('Cache-Control', 'no-store');
        }

        return $response;
    }
}
