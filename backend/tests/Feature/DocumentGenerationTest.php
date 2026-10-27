<?php

namespace Tests\Feature;

use App\Modules\Documents\Actions\DocumentDates;
use App\Modules\Documents\Actions\DocumentExports;
use App\Modules\Documents\Actions\DocumentTemplates;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class DocumentGenerationTest extends TestCase
{
    use RefreshDatabase;

    private function input(array $overrides = []): array
    {
        return array_replace([
            'template_id' => 'petition-general', 'mode' => 'free', 'title' => 'Görev yeri talebi',
            'recipient' => 'Örnek Güvenlik Birimine', 'body' => 'Şüpheli eşyanın güvenli biçimde incelenmesini talep ediyorum.\nİşlem sonucu hakkında bilgi rica ederim.',
            'document_date' => '2026-10-28', 'signers' => [['role' => 'Başvuran', 'name' => 'Örnek Öğrenci']],
        ], $overrides);
    }

    private function ticket(array $input = []): string
    {
        $result = $this->postJson('/api/v1/document-exports', $this->input($input))->assertCreated()->json('data');
        $this->assertSame('http://localhost/api/v1/document-exports/viewer', explode('#', $result['viewer_url'])[0]);

        return explode('#', $result['viewer_url'])[1];
    }

    public function test_catalog_requires_active_account_but_not_verified_email(): void
    {
        $this->getJson('/api/v1/document-templates')->assertUnauthorized();
        $user = $this->createUser(['email_verified_at' => null]);
        $this->asToken($user)->getJson('/api/v1/document-templates')->assertOk()->assertJsonCount(14, 'data');
        $user->forceFill(['status' => 'suspended'])->save();
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/v1/document-templates')->assertForbidden();
    }

    public function test_drafts_validate_template_fields_and_never_invent_missing_events(): void
    {
        $this->asToken($this->createUser());
        $this->postJson('/api/v1/documents/prepare', ['template_id' => 'report-incident', 'fields' => ['place' => 'Sentetik kapı']])->assertUnprocessable();
        $this->postJson('/api/v1/documents/prepare', ['template_id' => 'petition-general', 'fields' => ['request' => 'Talep', 'reason' => 'Gerekçe', 'unexpected' => 'veri']])->assertUnprocessable();
        $this->postJson('/api/v1/documents/prepare', ['template_id' => ['invalid'], 'fields' => []])->assertUnprocessable();
        $this->postJson('/api/v1/documents/prepare', ['template_id' => 'petition-shift', 'fields' => array_fill_keys(['current', 'requested', 'reason'], str_repeat('a', 6000))])->assertUnprocessable();
        $this->postJson('/api/v1/documents/prepare', ['template_id' => 'petition-general', 'fields' => ['request' => 'Vardiya kaydımı talep ediyorum.', 'reason' => 'Kayıt kontrolü']])
            ->assertOk()->assertJsonPath('data.title', 'Genel talep / bildirim')->assertJsonFragment(['body' => "Başvuru konusu: Vardiya kaydımı talep ediyorum.\n\nBaşvuruma ilişkin açıklama ve gerekçem:\nKayıt kontrolü\n\nBelirttiğim talebin değerlendirilmesini ve sonucuyla ilgili tarafıma bilgi verilmesini arz ederim."]);
    }

    public function test_export_is_encrypted_short_lived_and_one_use(): void
    {
        $this->asToken($this->createUser(['email_verified_at' => null]));
        $ticket = $this->ticket();
        $stored = Cache::get('document-export:'.hash('sha256', $ticket));
        $this->assertIsString($stored);
        $this->assertStringNotContainsString('Örnek Öğrenci', $stored);
        $this->assertStringNotContainsString('Şüpheli', $stored);
        $pdf = $this->post('/api/v1/document-exports/open', ['ticket' => $ticket])->assertOk()->assertHeader('Content-Type', 'application/pdf')->assertHeader('Cache-Control', 'no-store, private')->getContent();
        $this->assertStringStartsWith('%PDF-', $pdf);
        $this->assertStringNotContainsString('/JavaScript', $pdf);
        $this->post('/api/v1/document-exports/open', ['ticket' => $ticket])->assertGone();
    }

    public function test_expired_or_invalid_capabilities_cannot_be_used(): void
    {
        $this->asToken($this->createUser());
        $ticket = $this->ticket();
        $this->travel(6)->minutes();
        $this->post('/api/v1/document-exports/open', ['ticket' => $ticket])->assertGone();
        foreach (['', str_repeat('a', 64), '../.env'] as $invalid) {
            $this->post('/api/v1/document-exports/open', ['ticket' => $invalid])->assertGone();
        }
        $this->post('/api/v1/document-exports/open', ['ticket' => ['array']])->assertGone();
    }

    public function test_revoked_session_invalidates_existing_document_ticket(): void
    {
        $user = $this->createUser();
        $this->asToken($user);
        $ticket = $this->ticket();
        $user->tokens()->delete();
        $this->post('/api/v1/document-exports/open', ['ticket' => $ticket])->assertGone();
    }

    public function test_disabled_or_deleted_owner_invalidates_document(): void
    {
        $user = $this->createUser();
        $this->asToken($user);
        $ticket = $this->ticket();
        $user->forceFill(['status' => 'suspended'])->save();
        $this->post('/api/v1/document-exports/open', ['ticket' => $ticket])->assertGone();
        $user->forceFill(['status' => 'active'])->save();
        $ticket = $this->ticket();
        $user->studyContexts()->delete();
        $user->delete();
        $this->post('/api/v1/document-exports/open', ['ticket' => $ticket])->assertGone();
    }

    public function test_blank_mode_does_not_copy_personal_input_and_uses_template_roles(): void
    {
        $this->asToken($this->createUser());
        $ticket = $this->ticket(['mode' => 'blank', 'template_id' => 'report-handover']);
        $document = app(DocumentExports::class)->redeem($ticket);
        $this->assertSame('Teslim-tesellüm tutanağı', $document['title']);
        $this->assertStringNotContainsString('Şüpheli', $document['body']);
        $this->assertSame([['role' => 'Teslim eden', 'name' => null], ['role' => 'Teslim alan', 'name' => null]], $document['signers']);
        $this->assertArrayNotHasKey('recipient', array_filter($document));
    }

    public function test_export_limits_and_plain_text_escaping(): void
    {
        $this->asToken($this->createUser());
        foreach ([['body' => ''], ['body' => str_repeat('a', 16001)], ['document_date' => '2026-02-30'], ['signers' => []], ['signers' => [['role' => '', 'name' => 'Test']]], ['body' => "bad\x00text"], ['template_id' => 'missing']] as $override) {
            $this->postJson('/api/v1/document-exports', $this->input($override))->assertUnprocessable();
        }
        $document = $this->input(['body' => '<script>alert(1)</script><img src="file:///etc/passwd">']);
        $html = view('documents.pdf', ['document' => $document])->render();
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringNotContainsString('<img ', $html);
        $this->assertStringContainsString('&lt;script&gt;', $html);
    }

    public function test_viewer_has_csp_no_referrer_and_fragment_only_handoff(): void
    {
        $response = $this->get('/api/v1/document-exports/viewer')->assertOk()->assertHeader('Referrer-Policy', 'no-referrer')->assertHeader('Cache-Control', 'no-store, private');
        $this->assertStringContainsString("default-src 'none'", $response->headers->get('Content-Security-Policy'));
        $response->assertSee('src="/api/v1/document-exports/viewer.js"', false)->assertSee('method="post"', false);
        $this->get('/api/v1/document-exports/viewer.js')->assertOk()->assertHeader('Content-Type', 'application/javascript; charset=UTF-8')->assertSee('history.replaceState', false);
    }

    public function test_templates_use_our_own_fillable_text_without_institution_sources(): void
    {
        foreach (app(DocumentTemplates::class)->all() as $template) {
            $this->assertSame([], $template['sources']);
            $this->assertSame('2026-10-28.2', $template['version']);
            $this->assertDoesNotMatchRegularExpression('/https?:|Üniversitesi|Emniyet Müdürlüğü/', $template['body']);
            $blank = app(DocumentTemplates::class)->draft($template, [], true);
            $this->assertDoesNotMatchRegularExpression('/\{[a-z_]+\}/', $blank);
            $this->assertNotEmpty($blank);
        }
        $template = app(DocumentTemplates::class)->find('petition-leave');
        $blank = app(DocumentTemplates::class)->draft($template, [], true);
        $this->assertStringContainsString('../../.... - ../../.... tarihleri arasında izin kullanmak istiyorum.', $blank);
    }

    public function test_document_dates_display_day_month_year_and_keep_old_clients_compatible(): void
    {
        $this->asToken($this->createUser());
        foreach (['28/10/2026', '2026-10-28'] as $date) {
            $ticket = $this->ticket(['document_date' => $date]);
            $document = app(DocumentExports::class)->redeem($ticket);
            $this->assertSame('2026-10-28', $document['document_date']);
            $html = view('documents.pdf', ['document' => $document])->render();
            $this->assertStringContainsString('28/10/2026', $html);
            $this->assertStringNotContainsString('28.10.2026', $html);
        }
        $this->assertSame('2024-02-29', DocumentDates::normalize('29/02/2024'));
        foreach (['31/04/2026', '29/02/2025', '1/2/2026', '28.10.2026', '00/01/2026', '01/01/0000', "bad\x00date"] as $invalid) {
            $this->assertNull(DocumentDates::normalize($invalid));
        }
        $this->postJson('/api/v1/document-exports', $this->input(['document_date' => '31/04/2026']))->assertUnprocessable();
    }

    public function test_guided_dates_and_optional_time_are_rendered_without_inventing_information(): void
    {
        $this->asToken($this->createUser());
        $body = $this->postJson('/api/v1/documents/prepare', ['template_id' => 'report-incident', 'fields' => [
            'occurred' => '28/10/2026', 'place' => 'Sentetik kapı', 'description' => 'Sentetik olay açıklaması', 'actions' => 'Sentetik işlem',
        ]])->assertOk()->json('data.body');
        $this->assertStringContainsString('Olay / tespit tarihi: 28/10/2026', $body);
        $this->assertStringContainsString('Saat (biliniyorsa): ..:..', $body);
        $this->assertStringNotContainsString('2026-10-28', $body);
        $this->postJson('/api/v1/documents/prepare', ['template_id' => 'petition-leave', 'fields' => [
            'start_date' => '28/10/2026', 'end_date' => '29/10/2026', 'reason' => 'Sentetik açıklama',
        ]])->assertOk()->assertJsonFragment(['body' => "28/10/2026 - 29/10/2026 tarihleri arasında izin kullanmak istiyorum.\n\nİzin talebime ilişkin açıklamam:\nSentetik açıklama\n\nTalebimin değerlendirilmesini arz ederim."]);
    }

    public function test_invalid_guided_dates_times_and_reverse_leave_ranges_are_rejected(): void
    {
        $this->asToken($this->createUser());
        $fields = ['occurred' => '28/10/2026', 'time' => '12:30', 'place' => 'Sentetik yer', 'description' => 'Sentetik açıklama', 'actions' => 'Sentetik işlem'];
        foreach ([['occurred' => '31/04/2026'], ['time' => '24:01'], ['time' => '10:60']] as $override) {
            $this->postJson('/api/v1/documents/prepare', ['template_id' => 'report-incident', 'fields' => array_replace($fields, $override)])->assertUnprocessable();
        }
        $this->postJson('/api/v1/documents/prepare', ['template_id' => 'petition-leave', 'fields' => [
            'start_date' => '29/10/2026', 'end_date' => '28/10/2026', 'reason' => 'Sentetik açıklama',
        ]])->assertUnprocessable();
    }

    public function test_all_blank_templates_and_long_turkish_document_render_as_pdf(): void
    {
        $user = $this->createUser();
        $this->asToken($user);
        foreach (app(DocumentTemplates::class)->all() as $template) {
            $this->travel(7)->seconds();
            $ticket = $this->ticket(['template_id' => $template['id'], 'mode' => 'blank']);
            $document = app(DocumentExports::class)->redeem($ticket);
            $pdf = app(DocumentExports::class)->pdf($document);
            $this->assertStringStartsWith('%PDF-', $pdf);
            if ($path = getenv('DOCUMENT_PDF_ARTIFACTS')) {
                file_put_contents($path.'/'.$template['id'].'.pdf', $pdf);
            }
        }
        $document = $this->input(['title' => 'Türkçe karakter ve uzun metin kontrolü', 'body' => str_repeat("Özel güvenlik görevlisi: ç Ç ğ Ğ ı İ ö Ö ş Ş ü Ü.\nSentetik olay anlatımı; eşya güvenli biçimde teslim edildi.\n\n", 65)]);
        $pdf = app(DocumentExports::class)->pdf($document);
        $this->assertStringStartsWith('%PDF-', $pdf);
        if ($path = getenv('DOCUMENT_PDF_ARTIFACTS')) {
            file_put_contents($path.'/long-turkish.pdf', $pdf);
        }
    }
}
