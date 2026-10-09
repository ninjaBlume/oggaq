<?php

namespace App\Modules\Identity\Notifications;

use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class VerifyEmailNotification extends VerifyEmail implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable;

    public $tries = 3;

    public function __construct()
    {
        $this->afterCommit();
    }

    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)->subject('E-posta adresinizi doğrulayın')
            ->greeting('Merhaba!')->line('Hesabınızı kullanmak için e-posta adresinizi doğrulayın.')
            ->action('E-postamı doğrula', $this->verificationUrl($notifiable))
            ->line('Bu hesabı siz oluşturmadıysanız bu e-postayı dikkate almayın.');
    }
}
