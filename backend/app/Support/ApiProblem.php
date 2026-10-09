<?php

namespace App\Support;

use Symfony\Component\HttpKernel\Exception\HttpException;

class ApiProblem extends HttpException
{
    public function __construct(int $status, public readonly string $problemCode, string $message)
    {
        parent::__construct($status, $message);
    }
}
