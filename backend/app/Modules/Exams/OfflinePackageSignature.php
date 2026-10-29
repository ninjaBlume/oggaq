<?php

namespace App\Modules\Exams;

use App\Support\ApiProblem;

class OfflinePackageSignature
{
    public function sign(array $claim): array
    {
        $serialized = $this->serialize($claim);

        return ['package_id' => hash('sha256', $serialized), 'signature' => hash_hmac('sha256', $serialized, config('app.key'))];
    }

    public function verify(array $claim, string $packageId, string $signature, string $userId, string $contextId): void
    {
        $expected = $this->sign($claim);
        if (($claim['version'] ?? null) !== 1 || ($claim['user_id'] ?? null) !== $userId || ($claim['context_id'] ?? null) !== $contextId
            || ! hash_equals($expected['package_id'], $packageId) || ! hash_equals($expected['signature'], $signature)) {
            throw new ApiProblem(409, 'offline_package_invalid', 'Sınav paketi doğrulanamadı; cihazdaki kayıtlar korundu.');
        }
    }

    private function serialize(array $claim): string
    {
        return json_encode($claim, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    }
}
