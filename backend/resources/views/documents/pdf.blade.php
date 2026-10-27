<!doctype html>
<html lang="tr"><head><meta charset="utf-8"><style>
@page { margin: 22mm 22mm 24mm; }
body { font-family: 'DejaVu Sans', sans-serif; font-size: 11pt; line-height: 1.55; color: #111; }
h1 { font-size: 15pt; text-align: center; margin: 0 0 22pt; }
.date { text-align: right; margin-bottom: 18pt; }
.recipient { text-align: center; font-weight: bold; margin-bottom: 22pt; }
p { margin: 0 0 10pt; overflow-wrap: break-word; }
.signer { display: inline-block; vertical-align: top; width: 45%; margin: 20pt 3% 16pt 0; text-align: center; page-break-inside: avoid; }
.signature { margin-top: 12pt; height: 32pt; }
.details { margin-top: 18pt; font-size: 10pt; }
</style></head><body>
<h1>{{ $document['title'] }}</h1>
<div class="date">{{ empty($document['document_date']) ? 'Tarih: .... / .... / ........' : \Carbon\CarbonImmutable::parse($document['document_date'])->format('d.m.Y') }}</div>
@if(!empty($document['recipient']))<div class="recipient">{!! nl2br(e($document['recipient'])) !!}</div>@endif
@foreach(explode("\n\n", $document['body']) as $paragraph)<p>{!! nl2br(e($paragraph)) !!}</p>@endforeach
@if(!empty($document['attachments']))<div class="details"><b>Ekler</b><br>{!! nl2br(e($document['attachments'])) !!}</div>@endif
@foreach($document['signers'] as $signer)<div class="signer"><b>{{ $signer['role'] }}</b><br>{{ $signer['name'] ?: 'Adı soyadı: ................................' }}<div class="signature">İmza</div></div>@endforeach
@if(!empty($document['address']) || !empty($document['contact']))<div class="details">
@if(!empty($document['address']))<p>Adres: {!! nl2br(e($document['address'])) !!}</p>@endif
@if(!empty($document['contact']))<p>İletişim: {{ $document['contact'] }}</p>@endif
</div>@endif
</body></html>
