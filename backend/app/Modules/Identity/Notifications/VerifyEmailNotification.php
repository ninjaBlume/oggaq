<?php

namespace App\Modules\Identity\Notifications;

use App\Modules\Identity\Actions\EmailVerificationCodes;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class VerifyEmailNotification extends VerifyEmail implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable;

    public $tries = 3;

    public ?string $code = null;

    public function __construct(?string $code = null)
    {
        $this->code = $code;
        $this->afterCommit();
    }

    public function shouldSend(object $notifiable, string $channel): bool
    {
        return $this->code === null || app(EmailVerificationCodes::class)->isCurrent($notifiable, $this->code);
    }

    public function toMail($notifiable): MailMessage
    {
        $signedUrl = $this->verificationUrl($notifiable);
        parse_str(parse_url($signedUrl, PHP_URL_QUERY), $query);
        $url = rtrim(config('security.frontend_url'), '/').'/verify-email?'.http_build_query([
            'id' => $notifiable->getKey(), 'hash' => sha1($notifiable->getEmailForVerification()),
            'expires' => $query['expires'], 'signature' => $query['signature'],
        ]);

        $mail = (new MailMessage)->subject(config('brand.name').' e-posta doğrulama')
            ->greeting('Merhaba!');
        if ($this->code !== null) {
            $mail->line('Uygulamadaki doğrulama alanına aşağıdaki 6 haneli kodu gir:')
                ->line('**'.$this->code.'**')
                ->line('Kod 10 dakika geçerlidir. Uygulamaya dönüp kodu girmen yeterli; yeniden giriş yapman gerekmez.')
                ->line('Tarayıcı kullanıyorsan aşağıdaki bağlantıyla da doğrulayabilirsin.');
        }

        return $mail
            ->action('E-postamı doğrula', $url)
            ->line('Bu hesabı siz oluşturmadıysanız bu e-postayı dikkate almayın.');
    }
}
