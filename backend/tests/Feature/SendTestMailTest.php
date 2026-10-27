<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class SendTestMailTest extends TestCase
{
    public function test_command_sends_one_plain_mail_and_never_prints_the_password(): void
    {
        config(['mail.default' => 'array', 'mail.mailers.array.password' => 'cok-gizli-parola']);
        Mail::purge('array');

        $this->artisan('mail:test', ['to' => 'deneme@example.test'])
            ->doesntExpectOutputToContain('cok-gizli-parola')
            ->assertSuccessful();

        $messages = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(1, $messages);
        $this->assertSame('deneme@example.test', $messages[0]->getEnvelope()->getRecipients()[0]->getAddress());
        $mail = $messages[0]->getOriginalMessage();
        $this->assertSame(config('brand.supportEmail'), $mail->getReplyTo()[0]->getAddress());
        $this->assertSame(config('brand.displayName'), $mail->getReplyTo()[0]->getName());
        $this->assertSame(config('mail.from.address'), $mail->getFrom()[0]->getAddress());
    }

    public function test_command_rejects_an_invalid_address(): void
    {
        config(['mail.default' => 'array']);
        Mail::purge('array');

        $this->artisan('mail:test', ['to' => 'adres-degil'])->assertExitCode(2);

        $this->assertCount(0, Mail::mailer('array')->getSymfonyTransport()->messages());
    }
}
