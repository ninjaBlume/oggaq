<?php

namespace App\Modules\Jobs\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaginationRequest;
use App\Modules\Jobs\Actions\ReviewJobApplication;
use App\Modules\Jobs\Actions\SaveJobPosting;
use App\Modules\Jobs\Http\Requests\ReviewJobApplicationRequest;
use App\Modules\Jobs\Http\Requests\SaveJobPostingRequest;
use App\Modules\Jobs\Http\Resources\JobApplicationResource;
use App\Modules\Jobs\Http\Resources\JobPostingResource;
use App\Modules\Jobs\Models\JobApplication;
use App\Modules\Jobs\Models\JobPosting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AdminJobController extends Controller
{
    public function index(PaginationRequest $r): AnonymousResourceCollection
    {
        Gate::authorize('manage', JobPosting::class);

        return JobPostingResource::collection(JobPosting::withCount('applications')->orderByDesc('created_at')->orderByDesc('id')->cursorPaginate($r->integer('per_page', 20))->withQueryString());
    }

    public function show(Request $r, string $job): JobPostingResource
    {
        Gate::authorize('manage', JobPosting::class);

        return new JobPostingResource(JobPosting::withCount('applications')->findOrFail($job));
    }

    public function store(SaveJobPostingRequest $r, SaveJobPosting $action): JobPostingResource
    {
        return new JobPostingResource($action->execute($r->user(), $r->validated()));
    }

    public function update(SaveJobPostingRequest $r, string $job, SaveJobPosting $action): JobPostingResource
    {
        return new JobPostingResource($action->execute($r->user(), $r->validated(), $job));
    }

    public function applications(PaginationRequest $r, string $job): AnonymousResourceCollection
    {
        Gate::authorize('manage', JobPosting::class);
        JobPosting::findOrFail($job);

        return JobApplicationResource::collection(JobApplication::where('job_posting_id', $job)->orderByDesc('created_at')->orderByDesc('id')->cursorPaginate($r->integer('per_page', 20))->withQueryString());
    }

    public function review(ReviewJobApplicationRequest $r, string $application, ReviewJobApplication $action): JobApplicationResource
    {
        return new JobApplicationResource($action->execute($r->user(), $application, $r->validated()));
    }
}
