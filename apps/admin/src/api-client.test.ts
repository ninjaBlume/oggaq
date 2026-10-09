import { describe, expect, it, vi } from 'vitest';
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
