import type { LocalDocument } from '@oggaq/study-core';
import { documentHtml, DocumentValidationError } from '@oggaq/study-core';

export function clearDocumentFiles(): void { /* Web preview keeps no local PDF files. */ }

// Web/Device Hub preview: a local, sandboxed document. No content in URLs or HTTP requests.
export async function outputDocument(doc: LocalDocument, _action: 'share' | 'print'): Promise<void> {
  const html = documentHtml(doc);
  const popup = window.open('about:blank', '_blank');
  if (!popup) throw new DocumentValidationError('Belge penceresi açılamadı. Açılır pencereye izin verip yeniden dene.');
  popup.opener = null;
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  popup.print();
}
