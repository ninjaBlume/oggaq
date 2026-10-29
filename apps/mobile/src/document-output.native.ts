import type { LocalDocument } from '@oggaq/study-core';
import { documentHtml, DocumentValidationError } from '@oggaq/study-core';
import { Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { isRunningInExpoGo } from 'expo';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { File, Directory, Paths } from 'expo-file-system';

export const documentShareGraceMs = 5 * 60_000;
let exporting = false;
const spool = () => new Directory(Paths.cache, 'Print');
function remove(file: File | undefined): void {
  if (file?.exists) file.delete();
}

// Android resolves the chooser before the receiver has necessarily read the URI.
// Keep each successful handoff private and unique for five minutes; iOS has a completion callback.
export function clearDocumentFiles(): void {
  if (exporting) return;
  const directory = new Directory(Paths.cache, 'oggsor-documents');
  if (directory.exists) {
    for (const entry of directory.list()) {
      const created = /^oggsor-belge-(\d{13})-[a-f0-9-]+\.pdf$/.exec(entry.name)?.[1];
      const age = created ? Date.now() - Number(created) : Infinity;
      if (Platform.OS !== 'android' || age < 0 || age >= documentShareGraceMs) entry.delete();
    }
  }
  // This app uses Expo Print only for these documents. Interrupted renderer output is never shared.
  const pendingSpool = spool();
  if (pendingSpool.exists) pendingSpool.delete();
}

export async function outputDocument(doc: LocalDocument, action: 'share' | 'print'): Promise<void> {
  const html = documentHtml(doc);
  if (exporting) throw new DocumentValidationError('Önce açık belge işlemini tamamla.');
  clearDocumentFiles();
  exporting = true;
  let generated: File | undefined;
  let pdf: File | undefined;
  let retained = false;
  try {
    // Expo Go's Android Print module writes outside its scoped FileSystem cache.
    // Use the system Save as PDF sheet there; installed builds use file sharing.
    if (action === 'print' || (Platform.OS === 'android' && isRunningInExpoGo())) {
      await Print.printAsync({ html, width: 595, height: 842 });
      return;
    }
    if (!await Sharing.isAvailableAsync()) throw new DocumentValidationError('Bu cihazda dosya paylaşımı kullanılamıyor. Yazdır seçeneğini kullanabilirsin.');
    const { uri } = await Print.printToFileAsync({ html, width: 595, height: 842 });
    generated = new File(uri);
    const directory = new Directory(Paths.cache, 'oggsor-documents');
    directory.create({ intermediates: true, idempotent: true });
    pdf = new File(directory, `oggsor-belge-${Date.now()}-${randomUUID()}.pdf`);
    await generated.move(pdf);
    await Sharing.shareAsync(pdf.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'PDF kaydet veya paylaş' });
    if (Platform.OS === 'android') {
      retained = true;
      const handedOff = pdf;
      setTimeout(() => {
        try { remove(handedOff); }
        catch { console.warn('Geçici PDF temizlenemedi; sonraki açılışta yeniden denenecek.'); }
      }, documentShareGraceMs);
    }
  } finally {
    // move() updates generated.uri to its destination too, so never delete it after a retained handoff.
    try {
      if (!retained) { remove(generated); remove(pdf); }
      const pendingSpool = spool();
      if (pendingSpool.exists) pendingSpool.delete();
    } finally { exporting = false; }
  }
}
