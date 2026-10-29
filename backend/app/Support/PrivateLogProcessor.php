<?php

namespace App\Support;

use Monolog\LogRecord;
use Throwable;

// Exception messages can contain SQL bindings, mail bodies or document text.
// Retain diagnostic type/location, never arbitrary message/context/trace arguments.
class PrivateLogProcessor
{
    public function __invoke(LogRecord $record): LogRecord
    {
        $context = [];
        $requestId = $record->context['request_id'] ?? null;
        if (is_string($requestId) && preg_match('/\A[0-9a-f-]{36}\z/i', $requestId)) {
            $context['request_id'] = $requestId;
        }
        $error = $record->context['exception'] ?? null;
        if ($error instanceof Throwable) {
            $context['exception_type'] = $this->type($error::class);
            $context['location'] = $this->location($error->getFile(), $error->getLine());
            $context['trace'] = array_map(fn ($frame) => [
                'location' => $this->location($frame['file'] ?? '', $frame['line'] ?? 0),
                'class' => $this->type($frame['class'] ?? ''),
                'function' => preg_match('/\A[a-zA-Z_][a-zA-Z_0-9]*\z/', $frame['function'] ?? '') ? $frame['function'] : 'closure',
            ], array_slice($error->getTrace(), 0, 30));
        }

        return $record->with(message: $error instanceof Throwable ? 'application.exception' : 'application.event', context: $context, extra: []);
    }

    private function type(string $value): string
    {
        return preg_match('/\A[a-zA-Z_\\\\][a-zA-Z_0-9\\\\]*\z/', $value) ? $value : 'anonymous';
    }

    private function location(string $file, int $line): string
    {
        $root = base_path().DIRECTORY_SEPARATOR;
        $path = str_starts_with($file, $root) ? substr($file, strlen($root)) : 'external';

        return $path.':'.$line;
    }
}
