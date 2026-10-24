<?php

namespace App\Modules\Jobs\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JobApplicationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'job_posting_id' => $this->job_posting_id, 'job' => $this->job_snapshot, 'contact_name' => $this->contact_name, 'contact_email' => $this->contact_email, 'phone' => $this->phone, 'cover_letter' => $this->cover_letter, 'status' => $this->status, 'revision' => $this->revision, 'created_at' => $this->created_at->toISOString(), 'updated_at' => $this->updated_at->toISOString()];
    }
}
