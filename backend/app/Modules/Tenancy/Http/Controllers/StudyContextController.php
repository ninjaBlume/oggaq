<?php

namespace App\Modules\Tenancy\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tenancy\Http\Resources\StudyContextResource;
use App\Modules\Tenancy\Models\StudyContext;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class StudyContextController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $contexts = $request->user()->studyContexts()->with(['tenant', 'membership'])
            ->where(fn ($query) => $query->whereNull('tenant_id')->orWhere(fn ($tenantQuery) => $tenantQuery
                ->whereHas('membership', fn ($membership) => $membership->where('status', 'active'))
                ->whereHas('tenant', fn ($tenant) => $tenant->where('status', 'active'))))
            ->orderBy('id')->get();

        return StudyContextResource::collection($contexts);
    }

    public function show(Request $request, string $context): StudyContextResource
    {
        $context = StudyContext::where('user_id', $request->user()->id)->whereKey($context)->with(['tenant', 'membership'])->firstOrFail();
        Gate::authorize('view', $context);

        return new StudyContextResource($context);
    }
}
