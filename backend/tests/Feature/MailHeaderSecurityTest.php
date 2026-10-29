<?php

namespace Tests\Feature;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Mime\Email;
use Symfony\Component\Mime\Exception\RfcComplianceException;
use Symfony\Component\Mime\Header\ParameterizedHeader;

final class MailHeaderSecurityTest extends TestCase
{
    public static function invalidParameterNames(): array
    {
        return [
            'injected header' => ["filename\r\nBcc: injected@example.test"],
            'newline' => ["file\nname"],
            'whitespace' => ['file name'],
            'colon' => ['file:name'],
            'separator' => ['file;name'],
            'quote' => ['file"name'],
        ];
    }

    #[DataProvider('invalidParameterNames')]
    public function test_constructor_rejects_header_injection_in_parameter_names(string $name): void
    {
        $this->expectException(RfcComplianceException::class);

        new ParameterizedHeader('Content-Disposition', 'attachment', [$name => 'report.pdf']);
    }

    #[DataProvider('invalidParameterNames')]
    public function test_single_parameter_changes_cannot_inject_a_header(string $name): void
    {
        $header = new ParameterizedHeader('Content-Disposition', 'attachment');
        $this->expectException(RfcComplianceException::class);

        $header->setParameter($name, 'report.pdf');
    }

    #[DataProvider('invalidParameterNames')]
    public function test_bulk_parameter_changes_cannot_inject_a_header(string $name): void
    {
        $header = new ParameterizedHeader('Content-Disposition', 'attachment');
        $this->expectException(RfcComplianceException::class);

        $header->setParameters(['filename' => 'report.pdf', $name => 'injected']);
    }

    public function test_legitimate_turkish_mail_and_attachment_still_serialize(): void
    {
        $email = (new Email)
            ->from('sender@example.test')
            ->to('student@example.test')
            ->subject('ÖGGSor hesap bildirimi')
            ->text('Hesap işlemin tamamlandı.')
            ->attach('synthetic document', 'çalışma-özeti.pdf', 'application/pdf');

        $serialized = $email->toString();

        $this->assertStringContainsString('To: student@example.test', $serialized);
        $this->assertStringContainsString('Content-Type: application/pdf', $serialized);
        $this->assertStringContainsString('filename*=', $serialized);
        $this->assertStringNotContainsString("\r\nBcc:", $serialized);
    }
}
