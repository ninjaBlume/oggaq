import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ files: new Set<string>(), platform: 'ios', environment: 'standalone', available: true, cancel: false, failPrint: false,
  print: vi.fn(), share: vi.fn(), toFile: vi.fn() }));
vi.mock('react-native', () => ({ Platform: { get OS() { return state.platform; } } }));
vi.mock('expo', () => ({ isRunningInExpoGo: () => state.environment === 'storeClient' }));
vi.mock('expo-crypto', () => ({ randomUUID: () => '12345678-1234-1234-1234-123456789012' }));
vi.mock('expo-file-system', () => {
  class File {
    uri: string;
    constructor(parent: string | { uri: string }, name?: string) { this.uri = (typeof parent === 'string' ? parent : parent.uri) + (name ? '/'+name : ''); }
    get name() { return this.uri.split('/').at(-1)!; }
    get exists() { return state.files.has(this.uri); }
    delete() { state.files.delete(this.uri); }
    async move(target: File) { await Promise.resolve(); state.files.delete(this.uri); state.files.add(target.uri); this.uri = target.uri; }
  }
  class Directory extends File {
    get exists() { return [...state.files].some(uri => uri.startsWith(this.uri+'/')); }
    create() {}
    list() { return [...state.files].filter(uri => uri.startsWith(this.uri+'/')).map(uri => new File(uri)); }
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
  expect(state.files.has(args[0] as string)).toBe(true);
  state.share(...args);
  if (state.cancel) throw new Error('Cancelled');
} }));
import { clearDocumentFiles, documentShareGraceMs, outputDocument } from './document-output.native';
const doc = { title: 'Dilekçe', body: 'Türkçe: çğıöşü', signers: [{ role: 'Başvuran', name: 'Örnek' }] };
beforeEach(() => { state.files.clear(); state.platform = 'ios'; state.environment = 'standalone'; state.available = true; state.cancel = false; state.failPrint = false; vi.clearAllMocks(); });
afterEach(() => vi.useRealTimers());
describe('on-device PDF', () => {
  it('shares only a local PDF and removes temporary output afterward', async () => {
    await outputDocument(doc, 'share');
    expect(state.share).toHaveBeenCalledWith(expect.stringMatching(/^file:\/\/\/cache\/oggsor-documents\/oggsor-belge-\d+-[a-f0-9-]+\.pdf$/), expect.objectContaining({ mimeType: 'application/pdf' }));
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
  it('uses the system Save as PDF sheet in Android Expo Go without creating an inaccessible spool file', async () => {
    state.platform = 'android'; state.environment = 'storeClient';
    await outputDocument(doc, 'share');
    expect(state.print).toHaveBeenCalledOnce();
    expect(state.toFile).not.toHaveBeenCalled();
    expect(state.share).not.toHaveBeenCalled();
  });
  it('rejects invalid fields before invoking native rendering', async () => {
    await expect(outputDocument({ ...doc, document_date: '31/02/2026' }, 'share')).rejects.toThrow();
    expect(state.toFile).not.toHaveBeenCalled();
  });
  it('keeps Android handoffs readable after the chooser resolves, expires them and preserves concurrent recipient files', async () => {
    vi.useFakeTimers(); state.platform = 'android';
    await outputDocument(doc, 'share');
    const first = state.share.mock.calls[0]![0] as string;
    expect(state.files.has(first)).toBe(true);
    clearDocumentFiles();
    expect(state.files.has(first)).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await outputDocument(doc, 'share');
    const second = state.share.mock.calls[1]![0] as string;
    expect(second).not.toBe(first);
    expect(state.files.has(first)).toBe(true);
    expect(state.files.has(second)).toBe(true);
    await vi.advanceTimersByTimeAsync(documentShareGraceMs);
    expect(state.files.size).toBe(0);
  });
  it('clears expired Android leftovers on restart, including renderer failures', () => {
    vi.useFakeTimers(); state.platform = 'android';
    const expired = `file:///cache/oggsor-documents/oggsor-belge-${Date.now()-documentShareGraceMs}-1234.pdf`;
    const current = `file:///cache/oggsor-documents/oggsor-belge-${Date.now()}-5678.pdf`;
    state.files.add(expired); state.files.add(current); state.files.add('file:///cache/Print/interrupted.pdf');
    clearDocumentFiles();
    expect([...state.files]).toEqual([current]);
  });

});
