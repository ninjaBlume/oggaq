<?php

namespace App\Modules\QuestionBank\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\QuestionBank\Actions\CreateCatalogEntry;
use App\Modules\QuestionBank\Catalog;
use App\Modules\QuestionBank\Http\Requests\CatalogListRequest;
use App\Modules\QuestionBank\Http\Requests\CreateCatalogRequest;
use App\Modules\QuestionBank\Http\Resources\CatalogResource;
use App\Modules\QuestionBank\Models\Question;
use App\Modules\QuestionBank\Models\Subject;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class CatalogController extends Controller
{
    public function index(CatalogListRequest $request): AnonymousResourceCollection
    {
        if ($request->is('api/v1/admin/*')) {
            Gate::authorize('manage', Question::class);
        }
        $catalog = $request->route('catalog');
        $model = Catalog::MODELS[$catalog];
        $query = $model::query();
        if ($catalog === 'topics') {
            if ($request->route('subject') !== null) {
                $subject = Subject::findOrFail($request->route('subject'));
                $query->where('subject_id', $subject->id);
            } elseif ($request->has('subject_id')) {
                $query->where('subject_id', $request->validated('subject_id'));
            }
        }

        return CatalogResource::collection($query->orderBy('id')->cursorPaginate($request->integer('per_page', 20))->withQueryString());
    }

    public function store(CreateCatalogRequest $request, CreateCatalogEntry $action): JsonResponse
    {
        try {
            $entry = $action->execute($request->user(), $request->route('catalog'), $request->validated());
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages(['code' => ['Bu kod zaten kullanılıyor.']]);
        }

        return (new CatalogResource($entry))->response()->setStatusCode(201);
    }
}
