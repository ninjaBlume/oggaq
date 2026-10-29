import { describe, expect, it } from 'vitest';
import catalog from '../../../backend/resources/document-templates.json';
import type { components } from '@oggaq/shared-types';
import { blankDocument, documentDate, documentHtml, draftDocument } from './documents';
const templates = catalog as components['schemas']['DocumentTemplate'][];

describe('local documents', () => {
  it('renders all original templates without names in blank copies', () => {
    for (const template of templates) {
      const doc = blankDocument(template);
      expect(doc.body).not.toMatch(/\{[a-z_]+\}/);
      expect(doc.signers?.every(s => s.name === null)).toBe(true);
      expect(documentHtml(doc)).toContain('Tarih: ../../....');
    }
  });
  it('validates actual dates and optional times without silently correcting them', () => {
    expect(documentDate('29/02/2024')).toBe('2024-02-29');
    for (const value of ['29/02/2026', '31/04/2026', '00/01/2026', '01/13/2026', '01/01/0000', '2026-10-29']) expect(() => documentDate(value)).toThrow();
    const incident = templates.find(t => t.id === 'report-incident')!;
    const fields = { occurred: '29/10/2026', place: 'Örnek yer', description: 'Gözlem', actions: 'İşlem' };
    expect(draftDocument(incident, fields)).toContain('..:..');
    expect(() => draftDocument(incident, { ...fields, time: '24:00' })).toThrow();
    const leave = templates.find(t => t.id === 'petition-leave')!;
    expect(() => draftDocument(leave, { start_date: '29/10/2026', end_date: '28/10/2026', description: 'Test', reason: 'Test' })).toThrow();
  });
  it('inserts text once; does not interpret user placeholders as template data', () => {
    const template = templates.find(t => t.id === 'petition-general')!;
    expect(draftDocument(template, { request: '{reason}', reason: 'Gizli gerekçe' })).toContain('Başvuru konusu: {reason}');
    expect(() => draftDocument(template, { request: 'a'.repeat(6001), reason: 'test' })).toThrow();
    expect(() => draftDocument(template, { request: 'a\u0000b', reason: 'test' })).toThrow();
  });
  it('escapes every editable area; contains no executable content or remote resources', () => {
    const doc = blankDocument(templates[0]!);
    const attack = '<img src="https://example.test/pixel"><script>alert(1)</script>';
    const html = documentHtml({ ...doc, title: attack, body: attack, recipient: attack, address: attack, contact: attack, attachments: attack, signers: [{ role: attack.slice(0, 50), name: attack }] });
    expect(html).not.toMatch(/<img|<script|<iframe/);
    expect(html).toContain('&lt;img');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain('lang="tr"');
    expect(html).toContain('@page{size:A4');
  });
});
