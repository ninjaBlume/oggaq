<?php

namespace Tests\Feature;

use App\Modules\QuestionBank\Actions\PublishOfficialExam;
use App\Modules\QuestionBank\Actions\PublishQuestion;
use App\Modules\QuestionBank\Actions\SaveOfficialExam;
use App\Modules\QuestionBank\Actions\SaveQuestion;
use App\Modules\QuestionBank\Models\ExamType;
use App\Modules\QuestionBank\Models\QuestionSource;
use App\Modules\QuestionBank\Models\Subject;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

// A question has one subject (ders) and any number of exams; both are reported separately.
class QuestionExamMembershipTest extends TestCase
{
    use RefreshDatabase;

    private $admin;

    private array $questions = [];

    private array $exams = [];

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = $this->createUser(['platform_role' => 'platform_admin']);
        $law = Subject::create(['name' => 'Sentetik hukuk', 'code' => 'law']);
        $aid = Subject::create(['name' => 'Sentetik ilk yardım', 'code' => 'aid']);
        $source = QuestionSource::create(['title' => 'Sentetik kaynak']);
        $type = ExamType::create(['name' => 'Sentetik temel sınav', 'code' => 'basic']);
        foreach ([[$law, 'Birinci'], [$law, 'İkinci'], [$aid, 'Üçüncü']] as [$subject, $stem]) {
            $q = app(SaveQuestion::class)->execute($this->admin, ['subject_id' => $subject->id, 'source_id' => $source->id, 'stem' => $stem, 'options' => ['A', 'B'], 'correct_option_position' => 1]);
            $this->questions[$stem] = app(PublishQuestion::class)->execute($this->admin, $q, $q->revision);
        }
        $make = function (string $number, int $year, array $stems, bool $publish) use ($type) {
            $exam = app(SaveOfficialExam::class)->execute($this->admin, [
                'exam_type_id' => $type->id, 'weapon_status' => 'armed', 'title' => "Sınav {$number}", 'year' => $year, 'term' => 'Şubat', 'exam_number' => $number,
                'question_version_ids' => array_map(fn ($stem) => $this->questions[$stem]->published_version_id, $stems),
            ]);

            return $publish ? app(PublishOfficialExam::class)->execute($this->admin, $exam) : $exam;
        };
        $this->exams['old'] = $make('100', 2022, ['Birinci', 'İkinci'], true);
        $this->exams['new'] = $make('101', 2023, ['İkinci'], true);
        $this->exams['draft'] = $make('102', 2023, ['Üçüncü'], false);
    }

    private function byStem(array $items): array
    {
        $result = [];
        foreach ($items as $item) {
            $result[$item['version']['stem']] = $item;
        }

        return $result;
    }

    public function test_student_questions_report_subject_and_published_exams_separately(): void
    {
        $this->asToken($this->createUser());
        $items = $this->byStem($this->getJson('/api/v1/questions')->assertOk()->json('data'));
        $this->assertSame($this->questions['Birinci']->publishedVersion->subject_id, $items['Birinci']['version']['subject_id']);
        $this->assertNotSame($items['Birinci']['version']['subject_id'], $items['Üçüncü']['version']['subject_id']);
        $this->assertSame(['Sınav 100'], array_column($items['Birinci']['exams'], 'title'));
        // Newest exam first; the same question is in two exams.
        $this->assertSame(['Sınav 101', 'Sınav 100'], array_column($items['İkinci']['exams'], 'title'));
        $this->assertSame(['101', '100'], array_column($items['İkinci']['exams'], 'exam_number'));
        // The position is the question's place inside each exam.
        $this->assertSame([1, 2], array_column($items['İkinci']['exams'], 'position'));
        $this->assertSame('Sentetik temel sınav', $items['İkinci']['exams'][0]['exam_type_name']);
        $this->assertSame('armed', $items['İkinci']['exams'][0]['weapon_status']);
        // A draft exam is never visible to students.
        $this->assertSame([], $items['Üçüncü']['exams']);
        $this->getJson('/api/v1/questions/'.$this->questions['İkinci']->id)->assertOk()->assertJsonCount(2, 'data.exams');
    }

    public function test_questions_can_be_filtered_by_exam_and_by_subject_independently(): void
    {
        $this->asToken($this->createUser());
        $stems = fn (string $query) => array_keys($this->byStem($this->getJson('/api/v1/questions'.$query)->assertOk()->json('data')));
        $old = $this->exams['old']->id;
        $this->assertEqualsCanonicalizing(['Birinci', 'İkinci'], $stems('?official_exam_id='.$old));
        $this->assertSame(['İkinci'], $stems('?official_exam_id='.$this->exams['new']->id));
        $this->assertSame([], $stems('?official_exam_id='.$this->exams['draft']->id));
        $this->assertSame([], $stems('?official_exam_id='.Str::uuid()));
        $law = $this->questions['Birinci']->publishedVersion->subject_id;
        $this->assertEqualsCanonicalizing(['Birinci', 'İkinci'], $stems('?subject_id='.$law));
        $this->assertSame(['İkinci'], $stems('?subject_id='.$law.'&official_exam_id='.$this->exams['new']->id));
        $this->getJson('/api/v1/questions?official_exam_id=not-a-uuid')->assertUnprocessable();
    }

    public function test_practice_attempts_and_review_lists_carry_the_exam_memberships(): void
    {
        $student = $this->createUser();
        $this->asToken($student);
        $context = $student->studyContexts()->firstOrFail()->id;
        $question = $this->questions['İkinci'];
        $attempt = $this->postJson('/api/v1/contexts/'.$context.'/practice-attempts', ['id' => (string) Str::uuid(), 'question_id' => $question->id, 'question_version_id' => $question->published_version_id])->assertOk()->json('data');
        $this->assertSame(['Sınav 101', 'Sınav 100'], array_column($attempt['exams'], 'title'));
        $this->postJson('/api/v1/contexts/'.$context.'/practice-attempts/'.$attempt['id'].'/answer', ['selected_option_id' => $attempt['question']['options'][1]['id']])->assertOk();
        $this->getJson('/api/v1/contexts/'.$context.'/practice-attempts')->assertOk()->assertJsonPath('data.0.exams.1.title', 'Sınav 100');
        $this->getJson('/api/v1/contexts/'.$context.'/review-questions?kind=incorrect')->assertOk()->assertJsonCount(2, 'data.0.exams');
    }

    public function test_admin_sees_every_exam_including_drafts_and_can_filter_by_exam(): void
    {
        $this->asToken($this->admin);
        $items = $this->getJson('/api/v1/admin/questions')->assertOk()->json('data');
        $byStem = [];
        foreach ($items as $item) {
            $byStem[$item['latest_version']['stem']] = $item;
        }
        $this->assertSame([['Sınav 102', 'draft']], array_map(fn ($e) => [$e['title'], $e['status']], $byStem['Üçüncü']['exams']));
        $this->assertSame(2, count($byStem['İkinci']['exams']));
        $filtered = $this->getJson('/api/v1/admin/questions?official_exam_id='.$this->exams['draft']->id)->assertOk()->assertJsonCount(1, 'data')->json('data');
        $this->assertSame('Üçüncü', $filtered[0]['latest_version']['stem']);
        $this->getJson('/api/v1/admin/questions/'.$this->questions['İkinci']->id)->assertOk()->assertJsonCount(2, 'data.exams');
    }
}
