<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>ÖGG SOR · PDF</title>
<style nonce="{{ $nonce }}">body{font:16px system-ui;background:#f5f8fc;color:#132a49;margin:0;padding:32px 20px}main{max-width:480px;margin:12vh auto}button{background:#195cce;color:white;border:0;border-radius:12px;padding:14px 24px;font:inherit}p{line-height:1.5}</style></head>
<body><main><h1>Belgen hazır</h1><p>PDF’yi açtıktan sonra tarayıcının paylaş, kaydet veya yazdır seçeneklerini kullanabilirsin.</p>
<form method="post" action="/api/v1/document-exports/open"><input type="hidden" name="ticket" id="ticket"><button type="submit" id="open" disabled>PDF’yi aç</button></form><p id="status">Uygulamadaki PDF bağlantısını yeniden açman gerekebilir.</p>
</main><script nonce="{{ $nonce }}" src="/api/v1/document-exports/viewer.js"></script></body></html>
