<?php

use App\Http\Middleware\EnsureActiveAccount;
use App\Http\Middleware\EnsureVerifiedEmail;
use App\Http\Middleware\RequestContext;
use App\Support\ProblemRenderer;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->statefulApi();
        $middleware->redirectGuestsTo(fn (Request $request) => rtrim(config('security.frontend_url'), '/').'/login');
        $middleware->prepend(RequestContext::class);
        $middleware->alias(['account.active' => EnsureActiveAccount::class, 'email.verified' => EnsureVerifiedEmail::class, 'abilities' => CheckAbilities::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
        $exceptions->render(fn (Throwable $exception, Request $request) => ProblemRenderer::render($exception, $request));
    })->create();
