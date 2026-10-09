<?php

namespace App\Providers;

use Illuminate\Http\Request;
use Laravel\Horizon\Horizon;
use Laravel\Horizon\HorizonApplicationServiceProvider;

class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    protected function authorization(): void
    {
        Horizon::auth(fn (Request $request) => $request->user()?->isPlatformAdmin()
            && $request->user()->hasVerifiedEmail());
    }
}
