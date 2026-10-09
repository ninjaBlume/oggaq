<?php

namespace App\Modules\Tenancy\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Modules\Tenancy\Actions\CreateTenant;
use App\Modules\Tenancy\Http\Requests\CreateTenantRequest;
use App\Modules\Tenancy\Http\Resources\TenantResource;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class TenantController extends Controller
{
    public function index(PaginationRequest $request): AnonymousResourceCollection
    {
        Gate::authorize('create', Tenant::class);

        return TenantResource::collection(Tenant::orderBy('id')->cursorPaginate($request->integer('per_page', 20)));
    }

    public function store(CreateTenantRequest $request, CreateTenant $action): JsonResponse
    {
        try {
            $tenant = $action->execute($request->user(), $request->safe()->only(['name', 'slug']));
        } catch (UniqueConstraintViolationException $exception) {
            throw ValidationException::withMessages(['slug' => ['Bu kurum adresi zaten kullanılıyor.']]);
        }

        return (new TenantResource($tenant))->response()->setStatusCode(201);
    }

    public function show(Tenant $tenant): TenantResource
    {
        Gate::authorize('view', $tenant);

        return new TenantResource($tenant);
    }
}
