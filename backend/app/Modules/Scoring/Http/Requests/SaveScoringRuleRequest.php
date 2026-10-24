<?php

namespace App\Modules\Scoring\Http\Requests;

use App\Modules\QuestionBank\Models\Question;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class SaveScoringRuleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return Gate::allows('manage', Question::class);
    }

    public function rules(): array
    {
        $rules = ['code' => ['required', 'regex:/^[a-z0-9_-]{1,80}$/'], 'title' => ['required', 'string', 'max:200'],
            'education_type' => ['required', Rule::in(['basic', 'renewal', 'weapon_difference'])], 'weapon_status' => ['required', Rule::in(['armed', 'unarmed'])],
            'effective_from' => ['required', 'date_format:Y-m-d'], 'effective_until' => ['present', 'nullable', 'date_format:Y-m-d'],
            'period_from' => ['required', 'integer', 'between:1,10000'], 'period_until' => ['required', 'integer', 'between:1,10000'],
            'source_urls' => ['required', 'array', 'list', 'min:1', 'max:10'], 'source_urls.*' => ['required', 'url:http,https', 'max:2000', function ($attribute, $value, $fail) {
                $host = parse_url($value, PHP_URL_HOST);
                if (! is_string($host) || ! preg_match('/\.(gov|pol)\.tr$/i', $host)) {
                    $fail('Resmî kurum kaynağı (.gov.tr veya .pol.tr) gerekli.');
                }
            }],
            'verification_note' => ['required', 'string', 'min:10', 'max:4000'],
            'configuration' => ['required', 'array:general_count,weapon_count,shooting_count,general_maximum,weapon_maximum,shooting_maximum,general_weight,weapon_weight,shooting_weight,decision_mode,requires_previous,minimums,decimals,formula'],
            'configuration.decision_mode' => ['required', Rule::in(['pass_fail', 'level', 'unverified'])],
            'configuration.requires_previous' => ['required', 'boolean'], 'configuration.decimals' => ['required', 'integer', 'between:0,4'],
            'configuration.formula' => ['required', 'string', 'max:1000'], 'configuration.minimums' => ['present', 'array:general,weapon,shooting,weapon_total,total']];
        foreach (['general', 'weapon', 'shooting'] as $section) {
            $rules['configuration.'.$section.'_count'] = ['required', 'integer', 'between:0,'.($section === 'shooting' ? 20 : 200)];
            $rules['configuration.'.$section.'_maximum'] = ['required', 'integer', 'between:0,100'];
            $rules['configuration.'.$section.'_weight'] = ['required', 'integer', 'between:0,10000'];
        }
        $rules['configuration.minimums.*'] = ['integer', 'between:0,100'];

        return $rules + array_fill_keys(['id', 'version', 'created_by', 'published_at', 'archived_at'], ['prohibited']);
    }
}
