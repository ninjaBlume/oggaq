<?php

namespace App\Modules\Jobs\Actions;

use App\Models\User;
use App\Modules\Jobs\Models\JobPosting;
use App\Support\ApiProblem;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class SaveJobPosting
{
    public function __construct(private JobsAccess $access) {}

    public function execute(User $actor, array $input, ?string $id = null): JobPosting
    {
        return DB::transaction(function () use ($actor, $input, $id) {
            $user = $this->access->lockActor($actor);
            Gate::forUser($user)->authorize('manage', JobPosting::class);
            $job = $id === null ? new JobPosting : JobPosting::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($id !== null && $job->revision !== (int) $input['base_version']) {
                throw new ApiProblem(409, 'version_conflict', 'İlan başka bir işlemde güncellendi. Güncel kaydı yükleyin.');
            }
            if ($input['status'] === 'published' && ! empty($input['expires_at']) && Carbon::parse($input['expires_at'])->lessThanOrEqualTo(now())) {
                throw ValidationException::withMessages(['expires_at' => ['Yayımlanacak ilanın son başvuru tarihi gelecekte olmalı.']]);
            }
            $job->fill(collect($input)->only(['title', 'company_name', 'city', 'description', 'weapon_requirement', 'status', 'expires_at'])->all());
            $job->revision = $id === null ? 1 : $job->revision + 1;
            if ($id === null) {
                $job->created_by = $user->id;
            }
            $job->save();

            return $job->loadCount('applications');
        });
    }
}
