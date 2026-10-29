<?php

namespace App\Support;

use Illuminate\Log\Logger;

class PrivateLogTap
{
    public function __invoke(Logger $logger): void
    {
        $logger->pushProcessor(new PrivateLogProcessor);
    }
}
