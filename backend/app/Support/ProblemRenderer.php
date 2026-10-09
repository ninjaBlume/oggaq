<?php

namespace App\Support;

use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

class ProblemRenderer
{
    public static function render(Throwable $exception, Request $request): ?JsonResponse
    {
        if (! $request->is('api/*', 'sanctum/*') && ! $request->expectsJson()) {
            return null;
        }

        $status = match (true) {
            $exception instanceof ValidationException => 422,
            $exception instanceof AuthenticationException => 401,
            $exception instanceof TokenMismatchException => 403,
            $exception instanceof HttpExceptionInterface => $exception->getStatusCode(),
            default => 500,
        };
        if ($status === 419) {
            $status = 403;
        }
        [$title, $code] = match ($status) {
            401 => ['Oturum açmanız gerekiyor.', 'unauthenticated'],
            403 => ['Bu işlem için yetkiniz yok.', 'forbidden'],
            404 => ['Kayıt bulunamadı.', 'not_found'],
            409 => ['İşlem mevcut kayıtla çakışıyor.', 'conflict'],
            422 => ['Gönderilen bilgileri kontrol edin.', 'validation_failed'],
            429 => ['Çok fazla istek gönderdiniz. Lütfen bekleyin.', 'rate_limited'],
            default => [$status >= 500 ? 'İşlem tamamlanamadı.' : 'İstek işlenemedi.', 'request_failed'],
        };
        if ($exception instanceof ApiProblem) {
            $title = $exception->getMessage();
            $code = $exception->problemCode;
        }
        if ($exception instanceof TokenMismatchException || ($exception instanceof HttpExceptionInterface && $exception->getStatusCode() === 419)) {
            $code = 'csrf_failed';
            $title = 'Oturum güvenlik doğrulaması başarısız oldu.';
        }
        $body = ['type' => 'about:blank', 'title' => $title, 'status' => $status,
            'detail' => $title, 'code' => $code,
            'request_id' => $request->attributes->get('request_id', (string) Str::uuid())];
        if ($exception instanceof ValidationException) {
            $body['errors'] = $exception->errors();
        }
        $headers = $exception instanceof HttpExceptionInterface ? $exception->getHeaders() : [];

        return response()->json($body, $status, array_merge($headers, [
            'Content-Type' => 'application/problem+json', 'Cache-Control' => 'no-store',
            'X-Request-Id' => $body['request_id'],
        ]));
    }
}
