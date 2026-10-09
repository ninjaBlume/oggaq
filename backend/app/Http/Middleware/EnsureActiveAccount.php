<?php

namespace App\Http\Middleware;

use App\Support\ApiProblem;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->status !== 'active') {
            throw new ApiProblem(403, 'account_inactive', 'Hesabınız bu işlem için aktif değil.');
        }

        return $next($request);
    }
}
