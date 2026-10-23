<?php

namespace App\Modules\Identity\Notifications;

use Illuminate\Notifications\Messages\MailMessage;

// Sent to the CURRENT address: someone asked to move the account to another address (masked), and later that it moved.
class EmailChangeNoticeNotification extends AccountNotification
{
    public function __construct(private readonly string $maskedAddress, private readonly bool $completed)
    {
        parent::__construct();
    }

    public function toMail($notifiable): MailMessage
    {
        $mail = (new MailMessage)->greeting('Merhaba!');
        if ($this->completed) {
            return $mail->subject('E-posta adresiniz değiştirildi')
                ->line("Hesabınızın e-posta adresi {$this->maskedAddress} olarak değiştirildi. Bu adrese artık bildirim gönderilmeyecek.")
                ->line('Bu işlemi siz yapmadıysanız hemen destek ekibiyle iletişime geçin.');
        }

        return $mail->subject('E-posta adresi değiştirme talebi')
            ->line("Hesabınızın e-posta adresini {$this->maskedAddress} olarak değiştirmek için bir talep alındı. Yeni adres doğrulanmadıkça değişiklik yapılmaz.")
            ->line('Bu talep size ait değilse parolanızı değiştirin.');
    }
}
