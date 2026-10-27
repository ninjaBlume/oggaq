<?php

namespace App\Modules\Documents\Http\Controllers;

use App\Modules\Documents\Actions\DocumentExports;
use App\Modules\Documents\Actions\DocumentTemplates;
use App\Modules\Documents\Http\Requests\ExportDocumentRequest;
use App\Modules\Documents\Http\Requests\PrepareDocumentRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class DocumentController
{
    public function index(DocumentTemplates $templates): JsonResponse
    {
        return response()->json(['data' => $templates->all()]);
    }

    public function prepare(PrepareDocumentRequest $request, DocumentTemplates $templates): JsonResponse
    {
        $input = $request->validated();
        $template = $templates->find($input['template_id']);

        return response()->json(['data' => ['title' => $template['title'], 'body' => $templates->draft($template, $input['fields'])]]);
    }

    public function export(ExportDocumentRequest $request, DocumentExports $exports): JsonResponse
    {
        return response()->json(['data' => $exports->create($request->user(), $request->validated())], 201);
    }

    public function viewer(): Response
    {
        $nonce = base64_encode(random_bytes(18));

        return response()->view('documents.viewer', compact('nonce'))->withHeaders([
            'Content-Security-Policy' => "default-src 'none'; script-src 'nonce-{$nonce}'; style-src 'nonce-{$nonce}'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
            'Referrer-Policy' => 'no-referrer', 'Cache-Control' => 'no-store', 'X-Robots-Tag' => 'noindex, nofollow',
        ]);
    }

    public function viewerScript(): Response
    {
        return response(file_get_contents(resource_path('documents/viewer.js')))->withHeaders([
            'Content-Type' => 'application/javascript; charset=UTF-8', 'X-Robots-Tag' => 'noindex, nofollow',
        ]);
    }

    public function open(Request $request, DocumentExports $exports): Response
    {
        $token = $request->input('ticket');
        $document = is_string($token) ? $exports->redeem($token) : null;
        if (! $document) {
            return response('PDF bağlantısı sona ermiş veya kullanılmış. Uygulamaya dönüp PDF’yi yeniden oluşturabilirsin.', 410)
                ->withHeaders(['Content-Type' => 'text/plain; charset=UTF-8', 'Referrer-Policy' => 'no-referrer']);
        }

        return response($exports->pdf($document))->withHeaders([
            'Content-Type' => 'application/pdf', 'Content-Disposition' => 'inline; filename="oggsor-belge.pdf"',
            'Referrer-Policy' => 'no-referrer', 'X-Robots-Tag' => 'noindex, nofollow',
        ]);
    }
}
