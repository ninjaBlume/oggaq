<?php

namespace App\Http\Controllers;

use App\Support\Readiness;
use Illuminate\Http\JsonResponse;

class ReadinessController extends Controller
{
    public function __invoke(Readiness $readiness): JsonResponse
    {
        $checks = $readiness->checks();
        $status = $readiness->status($checks);

        return response()->json(['data' => ['status' => $status, 'checks' => $checks]], $status === 'unavailable' ? 503 : 200)
            ->header('Cache-Control', 'no-store');
    }
}
