<?php

namespace App\Providers;

use App\Modules\Tenancy\Models\StudyContext;
use App\Modules\Tenancy\Models\Tenant;
use App\Modules\Tenancy\Policies\StudyContextPolicy;
use App\Modules\Tenancy\Policies\TenantPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Actions are resolved by the framework container.
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Tenant::class, TenantPolicy::class);
        Gate::policy(StudyContext::class, StudyContextPolicy::class);
        URL::forceRootUrl(config('app.url'));
        if ($this->app->environment('production')) {
            config(['session.secure' => true]);
            URL::forceScheme('https');
        }
        RateLimiter::for('registration', fn (Request $request) => Limit::perMinute(5)->by('register:'.$request->ip()));
        $identityKey = fn (Request $request) => hash('sha256', mb_strtolower(trim(is_string($request->input('email')) ? $request->input('email') : '')).':'.$request->ip());
        RateLimiter::for('login', fn (Request $request) => [
            Limit::perMinute(5)->by('login:'.$identityKey($request)),
            Limit::perMinute(30)->by('login-ip:'.$request->ip()),
        ]);
        RateLimiter::for('password', fn (Request $request) => [
            Limit::perMinute(5)->by('password:'.$identityKey($request)),
            Limit::perMinute(15)->by('password-ip:'.$request->ip()),
        ]);
        RateLimiter::for('verification', fn (Request $request) => Limit::perMinute(6)->by('verify:'.$request->user()?->id));
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by('api:'.($request->user()?->id ?? $request->ip())));
    }
}
