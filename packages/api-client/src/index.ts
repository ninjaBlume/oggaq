import type { paths, Problem } from '@oggaq/shared-types';

type Method = 'get' | 'post' | 'patch' | 'delete';
type AvailableMethod<P extends keyof paths> = { [M in Method]: NonNullable<paths[P][M]> extends never ? never : M }[Method];
type Operation<P extends keyof paths, M extends Method> = M extends keyof paths[P] ? NonNullable<paths[P][M]> : never;
type ResponseOf<O> = O extends { responses: infer R }
  ? R extends { 200: { content: { 'application/json': infer T } } } ? T
    : R extends { 201: { content: { 'application/json': infer T } } } ? T
    : void
  : never;
type BodyOf<O> = O extends { requestBody: { content: { 'application/json': infer T } } } ? T : never;
type QueryOf<O> = O extends { parameters: { query?: infer T } } ? NonNullable<T> : never;
type PathOf<O> = O extends { parameters: { path?: infer T } } ? NonNullable<T> : never;
type RequestOptions<O> = { signal?: AbortSignal } &
  (BodyOf<O> extends never ? { body?: never } : { body: BodyOf<O> }) &
  (QueryOf<O> extends never ? { query?: never } : { query?: QueryOf<O> }) &
  (PathOf<O> extends never ? { params?: never } : { params: PathOf<O> });

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly problem: Partial<Problem>) {
    super(problem.detail || 'İşlem tamamlanamadı. Lütfen yeniden deneyin.');
    this.name = 'ApiError';
  }
  field(name: string): string | undefined { return this.problem.errors?.[name]?.[0]; }
}

interface ClientOptions {
  csrfToken: () => string | null;
  onSessionExpired?: () => void;
  fetch?: typeof fetch;
}

export class ApiClient {
  private readonly base: string;
  private readonly fetcher: typeof fetch;
  constructor(baseUrl: string, private readonly options: ClientOptions) {
    this.base = baseUrl.replace(/\/$/, '');
    this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  async csrf(): Promise<void> {
    await this.send('GET', '/sanctum/csrf-cookie');
  }

  async request<P extends keyof paths, M extends Method & AvailableMethod<P>>(
    method: M, path: P, options: RequestOptions<Operation<P, M>>,
  ): Promise<ResponseOf<Operation<P, M>>> {
    let urlPath: string = path;
    const parameters = options.params as Record<string, string> | undefined;
    for (const [key, value] of Object.entries(parameters ?? {})) {
      urlPath = urlPath.replace(`{${key}}`, encodeURIComponent(value));
    }
    if (urlPath.includes('{')) throw new Error('Eksik API yol parametresi.');
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(options.query ?? {})) {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
    }
    const suffix = query.size ? `?${query.toString()}` : '';
    return this.send(method.toUpperCase(), urlPath + suffix, options.body, options.signal) as Promise<ResponseOf<Operation<P, M>>>;
  }

  private async send(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      const token = this.options.csrfToken();
      if (token) headers['X-XSRF-TOKEN'] = token;
    }
    let response: Response;
    try {
      response = await this.fetcher(this.base + path, {
        method, credentials: 'include', cache: 'no-store', headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...(signal ? { signal } : {}),
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new ApiError(0, { code: 'network_error', detail: 'Sunucuya ulaşılamıyor. Bağlantınızı kontrol edip yeniden deneyin.' });
    }
    if (response.status === 204) return undefined;
    let payload: unknown;
    try { payload = await response.json(); }
    catch { throw new ApiError(response.status, { code: 'invalid_response', detail: 'Sunucudan geçerli bir yanıt alınamadı.' }); }
    if (!response.ok) {
      if (response.status === 401 && path !== '/api/v1/me' && !path.startsWith('/api/v1/auth/')) this.options.onSessionExpired?.();
      throw new ApiError(response.status, isProblem(payload) ? payload : {});
    }
    return payload;
  }
}

function isProblem(value: unknown): value is Partial<Problem> {
  return typeof value === 'object' && value !== null && 'detail' in value && typeof value.detail === 'string';
}

export function cursorFromLink(link: string | null | undefined): string | undefined {
  if (!link) return undefined;
  // Only copy the cursor; never send cookies to a server-supplied URL.
  return new URL(link, 'http://pagination.invalid').searchParams.get('cursor') ?? undefined;
}

export function xsrfCookie(cookie: string): string | null {
  const entry = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('XSRF-TOKEN='));
  if (!entry) return null;
  try { return decodeURIComponent(entry.slice('XSRF-TOKEN='.length)); }
  catch { return null; }
}
