import type { LocalDocument } from '@oggaq/study-core';
import { documentHtml, DocumentValidationError } from '@oggaq/study-core';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Directory, Paths } from 'expo-file-system';

const pending = new Set<string>();
function remove(uri: string): void {
  const file = new File(uri);
  if (file.exists) file.delete();
  pending.delete(uri);
}

// Only files created here are removed, including leftovers from an interrupted share.
export function clearDocumentFiles(): void {
  for (const uri of pending) remove(uri);
  const directory = new Directory(Paths.cache, 'oggsor-documents');
  if (directory.exists) directory.delete();
  // Expo Print writes here before its result is moved. This app uses Print only for these documents.
  const spool = new Directory(Paths.cache, 'Print');
  if (spool.exists) spool.delete();
}

export async function outputDocument(doc: LocalDocument, action: 'share' | 'print'): Promise<void> {
  const html = documentHtml(doc);
  clearDocumentFiles();
  if (action === 'print') {
    await Print.printAsync({ html, width: 595, height: 842 });
    return;
  }
  if (!await Sharing.isAvailableAsync()) throw new DocumentValidationError('Bu cihazda dosya paylaşımı kullanılamıyor. Yazdır seçeneğini kullanabilirsin.');
  try {
    const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
    pending.add(uri);
    const directory = new Directory(Paths.cache, 'oggsor-documents');
    directory.create({ intermediates: true, idempotent: true });
    const original = new File(uri);
    const pdf = new File(directory, 'oggsor-belge.pdf');
    original.move(pdf);
    pending.delete(uri);
    pending.add(pdf.uri);
    await Sharing.shareAsync(pdf.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'PDF kaydet veya paylaş' });
  } finally {
    clearDocumentFiles();
  }
}
