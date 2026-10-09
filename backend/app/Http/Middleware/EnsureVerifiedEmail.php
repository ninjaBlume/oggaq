<?php

namespace App\Http\Middleware;

use App\Support\ApiProblem;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureVerifiedEmail
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->hasVerifiedEmail()) {
            throw new ApiProblem(403, 'email_unverified', 'Önce e-posta adresinizi doğrulayın.');
        }

        return $next($request);
    }
}
