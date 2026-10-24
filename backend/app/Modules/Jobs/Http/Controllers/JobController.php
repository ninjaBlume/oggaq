<?php

namespace App\Modules\Jobs\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Modules\Jobs\Actions\ApplyForJob;
use App\Modules\Jobs\Http\Requests\ApplyForJobRequest;
use App\Modules\Jobs\Http\Resources\JobApplicationResource;
use App\Modules\Jobs\Http\Resources\JobPostingResource;
use App\Modules\Jobs\Models\JobApplication;
use App\Modules\Jobs\Models\JobPosting;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class JobController extends Controller
{
    public function index(PaginationRequest $r): AnonymousResourceCollection
    {
        return JobPostingResource::collection(JobPosting::open()->with(['applications' => fn ($q) => $q->where('user_id', $r->user()->id)->select('id', 'job_posting_id', 'status')])->orderByDesc('created_at')->orderByDesc('id')->cursorPaginate($r->integer('per_page', 20))->withQueryString());
    }

    public function show(Request $r, string $job): JobPostingResource
    {
        return new JobPostingResource(JobPosting::open()->with(['applications' => fn ($q) => $q->where('user_id', $r->user()->id)->select('id', 'job_posting_id', 'status')])->findOrFail($job));
    }

    public function apply(ApplyForJobRequest $r, string $job, ApplyForJob $action): JsonResponse
    {
        [$application,$created] = $action->execute($r->user(), $job, $r->validated());

        return (new JobApplicationResource($application))->response()->setStatusCode($created ? 201 : 200);
    }

    public function applications(PaginationRequest $r): AnonymousResourceCollection
    {
        return JobApplicationResource::collection(JobApplication::where('user_id', $r->user()->id)->orderByDesc('created_at')->orderByDesc('id')->cursorPaginate($r->integer('per_page', 20))->withQueryString());
    }
}
