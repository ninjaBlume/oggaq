import { ApiError } from '@oggaq/api-client';
import type { components } from '@oggaq/shared-types';
import bundledTemplates from './document-templates.json';

type Template = components['schemas']['DocumentTemplate'];

export async function readDocumentTemplates(signal: AbortSignal, fetch: () => Promise<{ data: Template[] }>): Promise<{ data: Template[] }> {
  try { return await fetch(); }
  catch (error) {
    if (signal.aborted || !(error instanceof ApiError && error.status === 0)) throw error;
    return { data: bundledTemplates as Template[] };
  }
}
