<?php

namespace App\Modules\Calendar\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Calendar\ReadCalendar;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExamCalendarController extends Controller
{
    public function __invoke(Request $request, ReadCalendar $calendar): JsonResponse
    {
        $input = $request->validate(['year' => ['sometimes', 'integer', 'between:2020,2100']]);

        return response()->json(['data' => $calendar->execute((int) ($input['year'] ?? now('Europe/Istanbul')->year))]);
    }

    public function next(ReadCalendar $calendar): JsonResponse
    {
        return response()->json(['data' => $calendar->next()]);
    }
}
