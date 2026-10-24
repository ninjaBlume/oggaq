<?php

namespace App\Modules\Jobs\Actions;

use App\Models\User;
use App\Modules\Jobs\Models\JobApplication;
use App\Modules\Jobs\Models\JobPosting;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ReviewJobApplication
{
    public function __construct(private JobsAccess $access) {}

    public function execute(User $actor, string $id, array $input): JobApplication
    {
        return DB::transaction(function () use ($actor, $id, $input) {
            $user = $this->access->lockActor($actor);
            Gate::forUser($user)->authorize('manage', JobPosting::class);
            $application = JobApplication::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($application->revision !== (int) $input['base_version']) {
                throw new ApiProblem(409, 'version_conflict', 'Başvuru başka bir işlemde güncellendi. Güncel kaydı yükleyin.');
            }
            $application->forceFill(['status' => $input['status'], 'revision' => $application->revision + 1])->save();

            return $application;
        });
    }
}
