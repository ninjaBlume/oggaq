<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendTestMail extends Command
{
    protected $signature = 'mail:test {to : Deneme e-postasının gideceği adres}';

    protected $description = 'Ayarlı posta sunucusu üzerinden tek bir deneme e-postası gönderir (parola yazdırmaz).';

    public function handle(): int
    {
        $to = (string) $this->argument('to');
        if (! filter_var($to, FILTER_VALIDATE_EMAIL)) {
            $this->error('Geçerli bir e-posta adresi verin.');

            return self::INVALID;
        }

        $mailer = (string) config('mail.default');
        $this->line(sprintf('Gönderici: %s, sunucu: %s:%s', config('mail.from.address'), config("mail.mailers.$mailer.host", '-'), config("mail.mailers.$mailer.port", '-')));

        try {
            Mail::raw('Bu bir deneme e-postasıdır. Alıyorsanız posta ayarları çalışıyor.', fn ($message) => $message->to($to)->subject((string) config('app.name').' deneme e-postası'));
        } catch (\Throwable $error) {
            $this->error('Gönderilemedi: '.$error->getMessage());

            return self::FAILURE;
        }

        $this->info("Deneme e-postası kuyruğa değil doğrudan $to adresine gönderildi. Gelen kutusunu ve spam klasörünü kontrol edin.");

        return self::SUCCESS;
    }
}
