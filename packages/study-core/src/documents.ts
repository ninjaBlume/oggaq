import type { components } from '@oggaq/shared-types';

type Template = components['schemas']['DocumentTemplate'];
export type LocalDocument = Pick<components['schemas']['DocumentExportInput'], 'title' | 'body' | 'recipient' | 'document_date' | 'address' | 'contact' | 'attachments' | 'signers'>;
export class DocumentValidationError extends Error {}
const forbidden = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const plain = (value: string, limit: number) => {
  if ([...value].length > limit || forbidden.test(value)) throw new DocumentValidationError('Metin çok uzun veya desteklenmeyen karakter içeriyor.');
  return value;
};

export function documentDate(value: string): string {
  const parts = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!parts) throw new DocumentValidationError('Tarihi gg/aa/yyyy biçiminde, geçerli bir gün olarak girin.');
  const [, d, m, y] = parts;
  const date = new Date(0);
  date.setUTCFullYear(Number(y), Number(m) - 1, Number(d));
  if (Number(y) < 1 || date.getUTCFullYear() !== Number(y) || date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) throw new DocumentValidationError('Tarihi gg/aa/yyyy biçiminde, geçerli bir gün olarak girin.');
  return `${y}-${m}-${d}`;
}

export function draftDocument(template: Template, fields: Record<string, string>, blank = false): string {
  const replacements: Record<string, string> = {};
  for (const field of template.fields) {
    const value = plain((fields[field.key] ?? '').trim(), 6000);
    if (!blank && !value && !field.optional) throw new DocumentValidationError(`${field.label} alanını doldurun.`);
    if (!blank && value && field.format === 'date') documentDate(value);
    if (!blank && value && field.format === 'time' && !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new DocumentValidationError('Saati ss:dd biçiminde girin.');
    replacements[field.key] = blank || !value ? field.format === 'date' ? '../../....' : field.format === 'time' ? '..:..' : field.multiline ? '............................................................\n............................................................' : '................................................' : value;
  }
  if (!blank && template.id === 'petition-leave' && documentDate(fields.end_date ?? '') < documentDate(fields.start_date ?? '')) throw new DocumentValidationError('İzin bitiş tarihi başlangıç tarihinden önce olamaz.');
  // A single substitution pass: user text containing {another_field} stays literal.
  return plain(template.body.replace(/\{([a-z_]+)\}/g, (original, key: string) => replacements[key] ?? original), 16000);
}

export function blankDocument(template: Template): LocalDocument {
  return { title: template.title, body: draftDocument(template, {}, true), recipient: template.kind === 'petition' ? '................................................................................' : null,
    address: template.kind === 'petition' ? '................................................................................\n................................................................................' : null,
    contact: template.kind === 'petition' ? '................................................................................' : null,
    signers: template.signer_roles.map(role => ({ role, name: null })) };
}

export function documentHtml(doc: LocalDocument): string {
  const escape = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
  const text = (value: string | null | undefined, limit: number) => escape(plain(value ?? '', limit)).replace(/\n/g, '<br>');
  if (!doc.title?.trim() || !doc.body?.trim() || !doc.signers?.length || doc.signers.length > 6) throw new DocumentValidationError('Belge başlığını, metnini ve imza alanlarını kontrol et.');
  if (doc.document_date) documentDate(doc.document_date);
  const signers = doc.signers.map(s => {
    if (!s.role.trim()) throw new DocumentValidationError('İmza rolünü doldurun.');
    return `<div class="signer"><b>${text(s.role, 80)}</b><br>${text(s.name || 'Adı soyadı: ................................', 150)}<div class="signature">İmza</div></div>`;
  }).join('');
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><title>ÖGGSor belge</title><style>
  @page{size:A4;margin:22mm 22mm 24mm}body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.5;color:#111;overflow-wrap:anywhere}h1{font-size:15pt;text-align:center;margin:0 0 22pt}.date{text-align:right;margin-bottom:18pt}.recipient{text-align:center;font-weight:bold;margin-bottom:22pt}p{margin:0 0 10pt}.signer{display:inline-block;vertical-align:top;width:45%;margin:20pt 3% 16pt 0;text-align:center;break-inside:avoid;page-break-inside:avoid}.signature{margin-top:12pt;height:32pt}.details{margin-top:18pt;font-size:10pt}
  </style></head><body><h1>${text(doc.title, 150)}</h1><div class="date">Tarih: ${text(doc.document_date || '../../....', 10)}</div>${doc.recipient ? `<div class="recipient">${text(doc.recipient, 300)}</div>` : ''}${plain(doc.body, 16000).split('\n\n').map(p => `<p>${text(p, 16000)}</p>`).join('')}${doc.attachments ? `<div class="details"><b>Ekler</b><br>${text(doc.attachments, 1500)}</div>` : ''}${signers}<div class="details">${doc.address ? `<p>Adres: ${text(doc.address, 600)}</p>` : ''}${doc.contact ? `<p>İletişim: ${text(doc.contact, 200)}</p>` : ''}</div></body></html>`;
}
