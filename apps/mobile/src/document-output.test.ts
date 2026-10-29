import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ files: new Set<string>(), available: true, cancel: false, failPrint: false,
  print: vi.fn(), share: vi.fn(), toFile: vi.fn() }));
vi.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(parent: string | { uri: string }, name?: string) { this.uri = (typeof parent === 'string' ? parent : parent.uri) + (name ? '/'+name : ''); }
    get exists() { return state.files.has(this.uri); }
    delete() { state.files.delete(this.uri); }
    move(target: File) { state.files.delete(this.uri); state.files.add(target.uri); this.uri = target.uri; }
  }
  class Directory extends File {
    get exists() { return [...state.files].some(uri => uri.startsWith(this.uri+'/')); }
    create() {}
    delete() { for (const uri of state.files) if (uri.startsWith(this.uri+'/')) state.files.delete(uri); }
  }
  return { File, Directory, Paths: { cache: 'file:///cache' } };
});
vi.mock('expo-print', () => ({
  printAsync: state.print,
  printToFileAsync: async (options: unknown) => {
    state.toFile(options); state.files.add('file:///cache/Print/output.pdf');
    if (state.failPrint) throw new Error('Print failed');
    return { uri: 'file:///cache/Print/output.pdf' };
  },
}));
vi.mock('expo-sharing', () => ({ isAvailableAsync: async () => state.available, shareAsync: async (...args: unknown[]) => {
  state.share(...args);
  if (state.cancel) throw new Error('Cancelled');
} }));
import { clearDocumentFiles, outputDocument } from './document-output.native';
const doc = { title: 'Dilekçe', body: 'Türkçe: çğıöşü', signers: [{ role: 'Başvuran', name: 'Örnek' }] };
beforeEach(() => { state.files.clear(); state.available = true; state.cancel = false; state.failPrint = false; vi.clearAllMocks(); });
describe('on-device PDF', () => {
  it('shares only a local PDF and removes temporary output afterward', async () => {
    await outputDocument(doc, 'share');
    expect(state.share).toHaveBeenCalledWith('file:///cache/oggsor-documents/oggsor-belge.pdf', expect.objectContaining({ mimeType: 'application/pdf' }));
    expect(state.files.size).toBe(0);
    expect(state.toFile).toHaveBeenCalledWith(expect.objectContaining({ html: expect.stringContaining('Türkçe') }));
  });
  it('cleans failed/cancelled exports and stale spool files on next startup', async () => {
    state.cancel = true;
    await expect(outputDocument(doc, 'share')).rejects.toThrow('Cancelled');
    expect(state.files.size).toBe(0);
    state.failPrint = true;
    await expect(outputDocument(doc, 'share')).rejects.toThrow('Print failed');
    expect(state.files.size).toBe(0);
    state.files.add('file:///cache/Print/interrupted.pdf');
    state.files.add('file:///cache/oggsor-documents/interrupted.pdf');
    state.files.add('file:///cache/unrelated-file');
    clearDocumentFiles();
    expect([...state.files]).toEqual(['file:///cache/unrelated-file']);
  });
  it('supports system printing, and does not create PDF when sharing is unavailable', async () => {
    await outputDocument(doc, 'print');
    expect(state.print).toHaveBeenCalledOnce();
    expect(state.toFile).not.toHaveBeenCalled();
    state.available = false;
    await expect(outputDocument(doc, 'share')).rejects.toThrow('paylaşımı');
    expect(state.toFile).not.toHaveBeenCalled();
  });
  it('rejects invalid fields before invoking native rendering', async () => {
    await expect(outputDocument({ ...doc, document_date: '31/02/2026' }, 'share')).rejects.toThrow();
    expect(state.toFile).not.toHaveBeenCalled();
  });
});
