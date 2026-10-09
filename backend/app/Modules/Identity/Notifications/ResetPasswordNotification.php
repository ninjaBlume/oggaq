<?php

namespace App\Modules\Identity\Notifications;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldBeEncrypted;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends ResetPassword implements ShouldBeEncrypted, ShouldQueue
{
    use Queueable;

    public $tries = 3;

    public function __construct($token)
    {
        parent::__construct($token);
        $this->afterCommit();
    }

    public function toMail($notifiable): MailMessage
    {
        $url = rtrim(config('security.frontend_url'), '/').'/reset-password?'.http_build_query([
            'token' => $this->token, 'email' => $notifiable->getEmailForPasswordReset(),
        ]);

        return (new MailMessage)->subject('Parolanızı sıfırlayın')->greeting('Merhaba!')
            ->line('Hesabınız için bir parola sıfırlama talebi alındı.')
            ->action('Parolamı sıfırla', $url)
            ->line('Bu bağlantı 60 dakika geçerlidir. Talep size ait değilse bu e-postayı dikkate almayın.');
    }
}
