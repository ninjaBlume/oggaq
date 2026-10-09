<?php

namespace App\Modules\QuestionBank\Actions;

use App\Models\User;
use App\Modules\QuestionBank\Catalog;
use App\Modules\QuestionBank\Models\Question;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;

class CreateCatalogEntry
{
    public function execute(User $actor, string $catalog, array $attributes): Model
    {
        return DB::transaction(function () use ($actor, $catalog, $attributes) {
            $actor = User::whereKey($actor->id)->lockForUpdate()->firstOrFail();
            Gate::forUser($actor)->authorize('manage', Question::class);
            $model = Catalog::MODELS[$catalog];
            $entry = $model::create(array_intersect_key($attributes, array_flip(Catalog::FIELDS[$catalog])));
            DB::table('audit_events')->insert([
                'id' => Str::uuid(), 'actor_id' => $actor->id, 'tenant_id' => null,
                'target_id' => $entry->id, 'action' => 'catalog.'.$catalog.'.created', 'created_at' => now(),
            ]);

            return $entry;
        });
    }
}
