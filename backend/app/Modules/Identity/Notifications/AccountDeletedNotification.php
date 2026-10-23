<?php

namespace App\Modules\Identity\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

class AccountDeletedNotification extends AccountNotification
{
    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)->subject('Hesabınız silindi')->greeting('Merhaba!')
            ->line('Hesabınız ve çalışma geçmişiniz silindi. Bu işlem geri alınamaz.')
            ->line('Bu işlemi siz yapmadıysanız hemen bizimle iletişime geçin.');
    }
}
