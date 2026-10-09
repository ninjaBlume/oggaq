import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { User } from '@oggaq/shared-types';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { ApiError } from '@oggaq/api-client';
import { api } from './api';
import { brand } from './config';
import { ErrorNotice, Field, Icon, Loading, useNotify } from './ui';

export const sessionKey = ['session'] as const;

async function replaceSession(cache: QueryClient, user: User | null) {
  await cache.cancelQueries();
  cache.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' });
  cache.setQueryData(sessionKey, user);
}

export function useSession() {
  return useQuery({ queryKey: sessionKey, retry: false, queryFn: async ({ signal }) => {
    try { return (await api.request('get', '/api/v1/me', { signal })).data; }
    catch (error) { if (error instanceof ApiError && error.status === 401) return null; throw error; }
  } });
}

export function useLogout() {
  const cache = useQueryClient();
  return useMutation({ mutationFn: async () => {
    try { await api.request('post', '/api/v1/auth/logout', {}); }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
  }, onSuccess: () => replaceSession(cache, null) });
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const cache = useQueryClient();
  const login = useMutation({ mutationFn: async () => {
    await api.csrf();
    return (await api.request('post', '/api/v1/auth/login', { body: { email, password } })).data;
  }, onSuccess: async (user) => { setPassword(''); await replaceSession(cache, user); } });
  function submit(event: FormEvent) { event.preventDefault(); login.mutate(); }
  return <div className="login-page"><section className="login-story"><div className="brand"><span className="brand-symbol"><Icon name="book" size={24} /></span><span>{brand.name}</span></div><div><span className="eyebrow light">MERKEZİ İÇERİK YÖNETİMİ</span><h1>İyi bir hazırlık,<br />güvenilir içerikle<br />başlar.</h1><p>Soru bankasını düzenleyin, sürümleri koruyun ve hazır içerikleri öğrencilerle buluşturun.</p></div><span className="login-footer">{brand.description}</span></section>
    <main className="login-main"><div className="login-card"><span className="eyebrow">YÖNETİM PANELİ</span><h2>Tekrar hoş geldiniz</h2><p className="muted">Platform yöneticisi hesabınızla giriş yapın.</p>{login.isError && <ErrorNotice error={login.error} />}<form onSubmit={submit}><fieldset disabled={login.isPending}>
      <Field label="E-posta adresi" name="email" error={login.error instanceof ApiError ? login.error.field('email') : undefined}>{(props) => <input {...props} type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="E-posta adresiniz" />}</Field>
      <Field label="Parola" name="password" error={login.error instanceof ApiError ? login.error.field('password') : undefined}>{(props) => <input {...props} type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Parolanız" />}</Field>
      <button className="button primary full" type="submit">{login.isPending ? 'Giriş yapılıyor…' : 'Giriş yap'}<Icon name="arrow" size={18} /></button>
    </fieldset></form><div className="login-access"><Icon name="shield" size={18} /><span>Yalnız yetkili platform yöneticileri erişebilir.</span></div></div></main></div>;
}

export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const cache = useQueryClient();
  const logout = useLogout();
  const notify = useNotify();
  const resend = useMutation({ mutationFn: () => api.request('post', '/api/v1/auth/email-verification-notification', {}), onSuccess: (response) => notify(response.data.message) });
  useEffect(() => {
    function expired() { void replaceSession(cache, null); }
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, [cache]);
  if (session.isPending) return <main className="center-page"><Loading text="Oturum kontrol ediliyor…" /></main>;
  if (session.isError) return <main className="center-page"><div className="card"><ErrorNotice error={session.error} retry={() => { void session.refetch(); }} /></div></main>;
  if (!session.data) return <Login />;
  if (session.data.platform_role !== 'platform_admin' || !session.data.email_verified_at) {
    const unverified = session.data.platform_role === 'platform_admin' && !session.data.email_verified_at;
    return <main className="center-page"><section className="card access-card"><Icon name="shield" size={36} /><h1>{unverified ? 'E-postanızı doğrulayın' : 'Bu panel için yetkiniz yok'}</h1><p className="muted">{unverified ? 'Yönetim paneline erişmek için e-posta adresinizi doğrulayın.' : 'Merkezi içerik yönetimi yalnız platform yöneticilerine açıktır.'}</p>{logout.isError && <ErrorNotice error={logout.error} />}{resend.isError && <ErrorNotice error={resend.error} />}<div className="actions">{unverified && <><button className="button primary" disabled={resend.isPending} onClick={() => resend.mutate()}>Doğrulama e-postası gönder</button><button className="button secondary" onClick={() => { void session.refetch(); }}>Doğrulamayı kontrol et</button></>}<button className="button secondary" disabled={logout.isPending} onClick={() => logout.mutate()}>Çıkış yap</button></div></section></main>;
  }
  return children;
}
