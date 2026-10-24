<?php

namespace App\Modules\Jobs\Actions;

use App\Models\User;
use App\Modules\Jobs\Models\JobApplication;
use App\Modules\Jobs\Models\JobPosting;
use App\Support\ApiProblem;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApplyForJob
{
    public function __construct(private JobsAccess $access) {}

    public function execute(User $actor, string $id, array $input): array
    {
        return DB::transaction(function () use ($actor, $id, $input) {
            $user = $this->access->lockActor($actor);
            $job = JobPosting::whereKey($id)->lockForUpdate()->firstOrFail();
            $existing = JobApplication::where('job_posting_id', $id)->where('user_id', $user->id)->first();
            if ($existing) {
                foreach (['contact_name', 'contact_email', 'phone', 'cover_letter'] as $field) {
                    if (($existing->$field ?? '') !== ($input[$field] ?? '')) {
                        throw new ApiProblem(409, 'already_applied', 'Bu ilana zaten başvurdun. Başvurularım bölümünden takip edebilirsin.');
                    }
                }

                return [$existing, false];
            }
            if (! $job->isOpen()) {
                throw ValidationException::withMessages(['job_posting_id' => ['Bu ilan artık başvuru almıyor.']]);
            }
            $application = new JobApplication(collect($input)->only(['contact_name', 'contact_email', 'phone', 'cover_letter'])->all());
            $application->user_id = $user->id;
            $application->job_posting_id = $job->id;
            $application->job_snapshot = $job->only(['id', 'title', 'company_name', 'city', 'description', 'weapon_requirement']);
            $application->status = 'submitted';
            $application->revision = 1;
            $application->save();

            return [$application, true];
        });
    }
}
