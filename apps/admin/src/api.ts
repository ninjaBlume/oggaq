import { ApiClient, cursorFromLink } from '@oggaq/api-client';
import type { Catalogs, Page } from '@oggaq/shared-types';
import { apiUrl } from './config';

export function xsrfCookie(cookie: string): string | null {
  const entry = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('XSRF-TOKEN='));
  if (!entry) return null;
  try { return decodeURIComponent(entry.slice('XSRF-TOKEN='.length)); }
  catch { return null; }
}

export const api = new ApiClient(apiUrl, {
  csrfToken: () => xsrfCookie(document.cookie),
  onSessionExpired: () => window.dispatchEvent(new Event('session-expired')),
});

async function collect<T>(fetchPage: (cursor?: string) => Promise<Page<T>>): Promise<T[]> {
  const result: T[] = [];
  const seen = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await fetchPage(cursor);
    result.push(...page.data);
    cursor = cursorFromLink(page.links.next);
    if (cursor && seen.has(cursor)) throw new Error('Tekrarlanan sayfalama yanıtı.');
    if (cursor) seen.add(cursor);
  } while (cursor);
  return result;
}

export async function loadCatalogs(signal?: AbortSignal): Promise<Catalogs> {
  const [subjects, topics, examTypes, sources] = await Promise.all([
    collect((cursor) => api.request('get', '/api/v1/admin/subjects', { signal, query: { per_page: 100, cursor } })),
    collect((cursor) => api.request('get', '/api/v1/admin/topics', { signal, query: { per_page: 100, cursor } })),
    collect((cursor) => api.request('get', '/api/v1/admin/exam-types', { signal, query: { per_page: 100, cursor } })),
    collect((cursor) => api.request('get', '/api/v1/admin/question-sources', { signal, query: { per_page: 100, cursor } })),
  ]);
  return { subjects, topics, 'exam-types': examTypes, 'question-sources': sources };
}
