import { ApiError } from '@oggaq/api-client';
import { describe, expect, it } from 'vitest';
import { readDocumentTemplates } from './documentTemplates';

describe('document templates offline fallback', () => {
  it('uses bundled templates on a network failure', async () => {
    const result = await readDocumentTemplates(new AbortController().signal, async () => { throw new ApiError(0, {}); });
    expect(result.data.some(template => template.kind === 'petition')).toBe(true);
    expect(result.data.some(template => template.kind === 'report')).toBe(true);
  });
  it('does not disguise authorization failures or cancelled requests as offline success', async () => {
    const forbidden = new ApiError(403, {});
    await expect(readDocumentTemplates(new AbortController().signal, async () => { throw forbidden; })).rejects.toBe(forbidden);
    const cancelled = new AbortController(); cancelled.abort();
    const error = new ApiError(0, {});
    await expect(readDocumentTemplates(cancelled.signal, async () => { throw error; })).rejects.toBe(error);
  });
});
