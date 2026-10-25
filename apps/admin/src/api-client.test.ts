import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError, cursorFromLink } from '@oggaq/api-client';

describe('cookie API istemcisi', () => {
  it('mutasyonda credentials ve CSRF kullanır', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ data: { message: 'Ok' } }), { status: 200 }));
    const client = new ApiClient('http://127.0.0.1:8000', { csrfToken: () => 'synthetic-csrf', fetch: fetcher });
    await client.request('post', '/api/v1/auth/logout', {});
    expect(fetcher).toHaveBeenCalledWith('http://127.0.0.1:8000/api/v1/auth/logout', expect.objectContaining({ credentials: 'include', method: 'POST', headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'synthetic-csrf' }) }));
  });
  it('alan hatalarını korur ve bir yazmayı otomatik tekrar etmez', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: 422, code: 'validation_failed', detail: 'Giriş geçersiz.', errors: { code: ['Kod kullanılıyor.'] } }), { status: 422 }));
    const client = new ApiClient('http://127.0.0.1:8000', { csrfToken: () => null, fetch: fetcher });
    try { await client.request('post', '/api/v1/admin/subjects', { body: { name: 'Ders', code: 'course' } }); expect.fail(); }
    catch (error) { expect(error).toBeInstanceOf(ApiError); expect((error as ApiError).field('code')).toBe('Kod kullanılıyor.'); }
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('korumalı 401 yanıtında oturumu düşürür, yanlış girişte düşürmez', async () => {
    const expired = vi.fn();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async () => new Response(JSON.stringify({ detail: 'Oturum yok.' }), { status: 401 }));
    const client = new ApiClient('http://127.0.0.1:8000', { csrfToken: () => null, fetch: fetcher, onSessionExpired: expired });
    await expect(client.request('get', '/api/v1/admin/subjects', {})).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledTimes(1);
    await expect(client.request('post', '/api/v1/auth/login', { body: { email: 'synthetic@example.test', password: 'invalid' } })).rejects.toBeInstanceOf(ApiError);
    expect(expired).toHaveBeenCalledTimes(1);
  });
  it('ağ hatasını kullanıcıya anlaşılır gösterir ve iptali ağ hatasına çevirmez', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('fetch failed'));
    const client = new ApiClient('http://127.0.0.1:8000', { csrfToken: () => null, fetch: fetcher });
    await expect(client.request('get', '/api/v1/me', {})).rejects.toMatchObject({ status: 0, problem: { code: 'network_error' } });
    const controller = new AbortController(); controller.abort();
    await expect(client.request('get', '/api/v1/me', { signal: controller.signal })).rejects.toBeInstanceOf(TypeError);
  });
  it('pagination URL yerine sadece cursor kullanır', () => {
    expect(cursorFromLink('https://untrusted.example/path?cursor=abc%2B123')).toBe('abc+123');
    expect(cursorFromLink(null)).toBeUndefined();
  });
});

describe('API bekleme sınırı', () => {
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  for (const auth of ['cookie', 'bearer'] as const) {
    it(`${auth}: takılan yazmayı 20 saniyede sonlandırır; otomatik tekrar ve çıkış yapmaz`, async () => {
      vi.useFakeTimers();
      let requestSignal: AbortSignal | null = null;
      const expired = vi.fn();
      const fetcher = vi.fn<typeof fetch>().mockImplementation((_url, init) => new Promise((_resolve, reject) => {
        requestSignal = init!.signal!;
        requestSignal.addEventListener('abort', () => reject(requestSignal!.reason), { once: true });
      }));
      const client = new ApiClient('https://api.example.test', {
        ...(auth === 'cookie' ? { csrfToken: () => null } : { auth, accessToken: () => 'synthetic' }),
        fetch: fetcher, onSessionExpired: expired,
      });
      const request = client.request('post', '/api/v1/auth/logout', {});
      const rejected = expect(request).rejects.toMatchObject({ status: 0, problem: { code: 'request_timeout' } });
      await vi.advanceTimersByTimeAsync(19_999);
      expect(requestSignal!.aborted).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      await rejected;
      expect(requestSignal!.aborted).toBe(true);
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(expired).not.toHaveBeenCalled();
      expect(vi.getTimerCount()).toBe(0);
    });
  }
  it('yanıt başlıkları gelse bile takılan gövdeyi beklemeye devam etmez', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => ({
      status: 200, ok: true,
      json: () => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true })),
    }) as Response);
    const client = new ApiClient('https://api.example.test', { csrfToken: () => null, fetch: fetcher, timeoutMs: 100 });
    const rejected = expect(client.request('get', '/api/v1/me', {})).rejects.toMatchObject({ problem: { code: 'request_timeout' } });
    await vi.advanceTimersByTimeAsync(100);
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('ekran kapanınca hem fetch hem gövde iptalini korur; timeout ya da bozuk JSON hatası göstermez', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => ({
      status: 200, ok: true,
      json: () => new Promise((_resolve, reject) => init!.signal!.addEventListener('abort', () => reject(init!.signal!.reason), { once: true })),
    }) as Response);
    const client = new ApiClient('https://api.example.test', { csrfToken: () => null, fetch: fetcher });
    const request = client.request('get', '/api/v1/me', { signal: controller.signal });
    const rejected = expect(request).rejects.toBeInstanceOf(DOMException);
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await rejected;
    expect(vi.getTimerCount()).toBe(0);
  });
  it('başarıdan sonra timer ve iptal dinleyicisini temizler', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const remove = vi.spyOn(controller.signal, 'removeEventListener');
    let requestSignal: AbortSignal | null = null;
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
      requestSignal = init!.signal!;
      return new Response(null, { status: 204 });
    });
    const client = new ApiClient('https://api.example.test', { csrfToken: () => null, fetch: fetcher });
    await client.request('get', '/api/v1/me', { signal: controller.signal });
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith('abort', expect.any(Function));
    controller.abort();
    await vi.advanceTimersByTimeAsync(20_000);
    expect(requestSignal!.aborted).toBe(false);
  });
});
