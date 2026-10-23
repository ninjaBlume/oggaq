<?php

namespace App\Modules\Identity\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

class PasswordChangedNotification extends AccountNotification
{
    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)->subject('Parolanız değiştirildi')->greeting('Merhaba!')
            ->line('Hesabınızın parolası az önce değiştirildi ve diğer cihazlardaki oturumlar kapatıldı.')
            ->line('Bu işlemi siz yapmadıysanız hemen parolanızı sıfırlayın.');
    }
}
