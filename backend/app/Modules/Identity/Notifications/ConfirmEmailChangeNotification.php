<?php

namespace App\Modules\Identity\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

// Sent to the NEW address with a signed link; the address only becomes the account's after the link is opened.
class ConfirmEmailChangeNotification extends AccountNotification
{
    public function __construct(private readonly string $userId, private readonly string $newEmail)
    {
        parent::__construct();
    }

    public function toMail($notifiable): MailMessage
    {
        $signed = URL::temporarySignedRoute('email-change.confirm', now()->addMinutes(60), ['id' => $this->userId, 'hash' => sha1($this->newEmail)]);
        parse_str(parse_url($signed, PHP_URL_QUERY), $query);
        $url = rtrim(config('security.frontend_url'), '/').'/confirm-email-change?'.http_build_query([
            'id' => $this->userId, 'hash' => sha1($this->newEmail), 'expires' => $query['expires'], 'signature' => $query['signature'],
        ]);

        return (new MailMessage)->subject('Yeni e-posta adresinizi doğrulayın')->greeting('Merhaba!')
            ->line('Bir hesabın e-posta adresini bu adrese taşımak için talep alındı. Onaylamak için, hesaba giriş yapmış olduğunuz tarayıcıda bağlantıyı açın.')
            ->action('Yeni adresi doğrula', $url)
            ->line('Bu bağlantı 60 dakika geçerlidir. Talep size ait değilse bu e-postayı dikkate almayın.');
    }
}
