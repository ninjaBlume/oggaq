<?php

namespace Tests\Support;

use App\Models\User;
use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use App\Modules\QuestionBank\Models\Topic;
use Illuminate\Support\Str;

class RandomExamPool
{
    public static function create(User $admin, string $education = 'basic', int $number = 122): array
    {
        $source = QuestionSource::create(['title' => 'Yalnız sentetik dağılım kaynağı']);
        $subjects = [];
        $topics = [];
        for ($i = 0; $i < 3; $i++) {
            $subjects[] = Subject::create(['name' => 'Sentetik ders '.$i, 'code' => (string) Str::uuid()]);
            $topics[] = Topic::create(['subject_id' => $subjects[$i]->id, 'name' => 'Sentetik konu '.$i, 'code' => (string) Str::uuid()]);
        }
        $versions = [];
        for ($i = 0; $i < 125; $i++) {
            $group = $i < 60 ? 0 : ($i < 100 ? 1 : 2);
            $q = app(SaveQuestion::class)->execute($admin, ['subject_id' => $subjects[$group]->id, 'topic_id' => $topics[$group]->id,
                'source_id' => $source->id, 'stem' => 'Sentetik '.$education.' '.$i, 'options' => ['A', 'B'], 'correct_option_position' => 1]);
            $q = app(PublishQuestion::class)->execute($admin, $q, $q->revision);
            $versions[] = $q->published_version_id;
        }
        $type = ExamType::create(['name' => 'Sentetik tam sınav', 'code' => (string) Str::uuid()]);
        $reference = app(SaveOfficialExam::class)->execute($admin, ['exam_type_id' => $type->id, 'title' => 'Sentetik referans', 'year' => 2026,
            'education_type' => $education, 'weapon_status' => 'armed', 'exam_number' => (string) $number, 'question_version_ids' => $versions]);
        app(PublishOfficialExam::class)->execute($admin, $reference);

        return compact('admin', 'reference', 'versions', 'subjects', 'topics');
    }
}
