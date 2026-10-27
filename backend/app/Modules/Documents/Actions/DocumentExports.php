<?php

namespace App\Modules\Documents\Actions;

use App\Models\User;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Laravel\Sanctum\PersonalAccessToken;

class DocumentExports
{
    public function __construct(private DocumentTemplates $templates) {}

    public function create(User $user, array $input): array
    {
        $template = $this->templates->find($input['template_id']);
        $blank = $input['mode'] === 'blank';
        if ($blank) {
            $input = [
                'template_id' => $template['id'], 'mode' => 'blank', 'title' => $template['title'],
                'recipient' => $template['kind'] === 'petition' ? '................................................................................' : null,
                'body' => $this->templates->draft($template, [], true),
                'signers' => array_map(fn ($role) => ['role' => $role, 'name' => null], $template['signer_roles']),
                'address' => $template['kind'] === 'petition' ? "................................................................................\n................................................................................" : null,
                'contact' => $template['kind'] === 'petition' ? '................................................................................' : null,
            ];
        }
        $token = bin2hex(random_bytes(32));
        $expires = now()->addMinutes(5);
        $accessToken = $user->currentAccessToken();
        $payload = ['user_id' => $user->id, 'token_id' => $accessToken instanceof PersonalAccessToken ? $accessToken->id : null,
            'expires_at' => $expires->timestamp, 'template_version' => $template['version'], 'document' => $input];
        Cache::put($this->key($token), Crypt::encryptString(json_encode($payload, JSON_THROW_ON_ERROR)), $expires);

        return ['viewer_url' => url('/api/v1/document-exports/viewer').'#'.$token, 'expires_at' => $expires->toIso8601String()];
    }

    public function redeem(string $token): ?array
    {
        if (! preg_match('/\A[a-f0-9]{64}\z/', $token)) {
            return null;
        }
        $key = $this->key($token);
        // Cache::pull is not atomic on every supported driver.
        $encrypted = Cache::lock($key.':lock', 10)->get(fn () => Cache::pull($key));
        if (! is_string($encrypted)) {
            return null;
        }
        $payload = json_decode(Crypt::decryptString($encrypted), true, flags: JSON_THROW_ON_ERROR);
        if ($payload['expires_at'] <= now()->timestamp || ! User::whereKey($payload['user_id'])->where('status', 'active')->exists()) {
            return null;
        }
        if ($payload['token_id'] !== null) {
            $session = PersonalAccessToken::find($payload['token_id']);
            if (! $session || $session->tokenable_id !== $payload['user_id'] || ($session->expires_at && $session->expires_at->isPast())) {
                return null;
            }
        }

        return $payload['document'];
    }

    public function pdf(array $document): string
    {
        $options = new Options;
        $options->setDefaultFont('DejaVu Sans');
        $options->setIsRemoteEnabled(false);
        $options->setIsPhpEnabled(false);
        $options->setIsJavascriptEnabled(false);
        $options->setChroot(base_path('vendor/dompdf/dompdf/lib/fonts'));
        $options->setFontCache(storage_path('framework/cache'));
        $pdf = new Dompdf($options);
        $pdf->setPaper('A4');
        $pdf->loadHtml(view('documents.pdf', ['document' => $document])->render(), 'UTF-8');
        $pdf->render();
        $pdf->getCanvas()->page_text(500, 805, '{PAGE_NUM} / {PAGE_COUNT}', null, 8, [0.4, 0.4, 0.4]);

        return $pdf->output();
    }

    private function key(string $token): string
    {
        return 'document-export:'.hash('sha256', $token);
    }
}
