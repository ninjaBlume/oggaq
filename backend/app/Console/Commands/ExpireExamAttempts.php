<?php

namespace App\Console\Commands;

use App\Modules\Exams\Actions\FinalizeExam;
use App\Modules\Exams\Models\ExamAttempt;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExpireExamAttempts extends Command
{
    protected $signature = 'exams:expire';

    protected $description = 'Süresi dolan denemeleri sabit cevaplarıyla bir kez tamamlar.';

    public function handle(): int
    {
        $count = 0;
        ExamAttempt::whereNull('finished_at')->where('deadline_at', '<=', now())->chunkById(100, function ($attempts) use (&$count) {
            foreach ($attempts as $attempt) {
                $count += DB::transaction(function () use ($attempt) {
                    $locked = ExamAttempt::whereKey($attempt->id)->lockForUpdate()->first();
                    if (! $locked || $locked->finished_at !== null || now()->lessThan($locked->deadline_at)) {
                        return 0;
                    }
                    app(FinalizeExam::class)->execute($locked);

                    return 1;
                });
            }
        });
        $this->info("Tamamlanan süresi dolmuş deneme: {$count}");

        return self::SUCCESS;
    }
}
