<?php

namespace App\Modules\Study\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Study\Actions\BuildStudyStats;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StatsController extends Controller
{
    public function show(Request $request, string $context, BuildStudyStats $action): JsonResponse
    {
        return response()->json(['data' => $action->execute($request->user(), $context)]);
    }
}
