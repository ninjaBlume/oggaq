<?php

namespace App\Modules\Tenancy\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Modules\Tenancy\Actions\ProvisionMembership;
use App\Modules\Tenancy\Actions\RevokeMembership;
use App\Modules\Tenancy\Http\Requests\CreateMembershipRequest;
use App\Modules\Tenancy\Http\Resources\MembershipResource;
use App\Modules\Tenancy\Models\Membership;
use App\Modules\Tenancy\Models\Tenant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class MembershipController extends Controller
{
    public function index(PaginationRequest $request, Tenant $tenant): AnonymousResourceCollection
    {
        Gate::authorize('view', $tenant);

        return MembershipResource::collection($tenant->memberships()->with('user')->orderBy('id')->cursorPaginate($request->integer('per_page', 20)));
    }

    public function show(Tenant $tenant, string $membership): MembershipResource
    {
        Gate::authorize('view', $tenant);
        $member = Membership::where('tenant_id', $tenant->id)->whereKey($membership)->with('user')->firstOrFail();

        return new MembershipResource($member);
    }

    public function store(CreateMembershipRequest $request, Tenant $tenant, ProvisionMembership $action): JsonResponse
    {
        $membership = $action->execute($request->user(), $tenant, $request->safe()->only(['user_id', 'role']));

        return (new MembershipResource($membership->load('user')))->response()->setStatusCode(201);
    }

    public function destroy(Request $request, Tenant $tenant, string $membership, RevokeMembership $action): JsonResponse
    {
        $action->execute($request->user(), $tenant, $membership);

        return response()->json(['data' => ['message' => 'Kurum üyeliği iptal edildi.']]);
    }
}
