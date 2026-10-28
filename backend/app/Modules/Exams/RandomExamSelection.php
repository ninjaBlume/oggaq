<?php

namespace App\Modules\Exams;

use Illuminate\Support\Collection;

final readonly class RandomExamSelection
{
    public function __construct(public Collection $questions, public array $attributes) {}
}
