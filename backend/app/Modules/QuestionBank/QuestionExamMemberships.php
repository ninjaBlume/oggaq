<?php

namespace App\Modules\QuestionBank;

use Illuminate\Support\Facades\DB;

// Which past exams contain a question. Exam membership is separate from the subject (ders) of the question:
// one question has one subject and may belong to many exams (and sits at a position in each).
class QuestionExamMemberships
{
    public const RELATION = 'exam_memberships';

    /** @return array<string, list<array<string, mixed>>> question id => memberships, newest exam first */
    public static function for(array $questionIds, bool $publishedOnly = true): array
    {
        if ($questionIds === []) {
            return [];
        }
        $rows = DB::table('official_exam_questions as q')
            ->join('official_exams as e', 'e.id', '=', 'q.official_exam_id')
            ->join('exam_types as t', 't.id', '=', 'e.exam_type_id')
            ->leftJoin('subjects as s', 's.id', '=', 'e.subject_id')
            ->whereIn('q.question_id', $questionIds)
            ->when($publishedOnly, fn ($query) => $query->whereNotNull('e.published_at'))
            ->orderByDesc('e.year')->orderByDesc('e.exam_number')->orderBy('t.name')
            ->get(['q.question_id', 'q.position', 'e.id', 'e.title', 'e.exam_number', 'e.year', 'e.term', 'e.published_at', 'e.weapon_status', 't.name as exam_type_name', 's.name as subject_name']);
        $result = [];
        foreach ($rows as $row) {
            $result[$row->question_id][] = [
                'id' => $row->id, 'title' => $row->title, 'exam_number' => $row->exam_number, 'year' => (int) $row->year, 'term' => $row->term,
                'exam_type_name' => $row->exam_type_name, 'subject_name' => $row->subject_name, 'weapon_status' => $row->weapon_status, 'position' => (int) $row->position, 'status' => $row->published_at === null ? 'draft' : 'published',
            ];
        }

        return $result;
    }

    /** Preloads memberships for a page of models with one query so list responses never query per row. */
    public static function attach(iterable $models, string $questionKey = 'id', bool $publishedOnly = true): void
    {
        $models = collect($models);
        $found = self::for($models->pluck($questionKey)->unique()->values()->all(), $publishedOnly);
        foreach ($models as $model) {
            $model->setRelation(self::RELATION, $found[$model->{$questionKey}] ?? []);
        }
    }

    /** Preloaded memberships, or one lookup for single-record responses. */
    public static function of($model, string $questionKey = 'id', bool $publishedOnly = true): array
    {
        return $model->relationLoaded(self::RELATION)
            ? $model->getRelation(self::RELATION)
            : (self::for([$model->{$questionKey}], $publishedOnly)[$model->{$questionKey}] ?? []);
    }
}
