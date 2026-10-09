<?php

namespace App\Modules\QuestionBank;

use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\QuestionBank\Models\Topic;

class Catalog
{
    public const MODELS = [
        'subjects' => Subject::class, 'topics' => Topic::class,
        'exam-types' => ExamType::class, 'question-sources' => QuestionSource::class,
    ];

    public const FIELDS = [
        'subjects' => ['name', 'code'], 'topics' => ['name', 'code', 'subject_id', 'parent_id'],
        'exam-types' => ['name', 'code'], 'question-sources' => ['title', 'url', 'citation'],
    ];
}
