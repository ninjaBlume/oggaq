import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';
import type { User } from '@oggaq/shared-types';
import { ApiError } from '@oggaq/api-client';
import { api } from './api';
import { brand } from './config';
import { verificationInput } from './verification';
import { ErrorNotice, Field, Loading } from './ui';

const sessionKey = ['session'] as const;
export async function replaceSession(cache: QueryClient, user: User | null) {
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
export function SessionEvents({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  useEffect(() => {
    const expired = () => { void replaceSession(cache, null); };
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, [cache]);
  return children;
}
function AuthFrame({ children }: { children: ReactNode }) {
  return <main className="auth-layout"><section className="auth-story"><Link to="/" className="brand">{brand.name}<span className="brand-dot" /></Link><div><span className="eyebrow">HER GÜN BİR ADIM DAHA</span><h1>Hazırlığına<br />buradan devam et.</h1><p>Dersini seç, soruları çöz, cevabın ardından açıklamayı incele. Çalışmaların hesabında saklansın.</p></div><small>{brand.description}</small></section><section className="auth-content"><div className="auth-card">{children}</div></section></main>;
}
export function Login() {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const cache = useQueryClient();
  const mutation = useMutation({ mutationFn: async () => {
    await api.csrf();
    if (mode === 'register') { await api.request('post', '/api/v1/auth/register', { body: { name, email, password, password_confirmation: confirmation } }); return null; }
    if (mode === 'forgot') { await api.request('post', '/api/v1/auth/forgot-password', { body: { email } }); return null; }
    return (await api.request('post', '/api/v1/auth/login', { body: { email, password } })).data;
  }, onSuccess: async (user) => {
    setPassword(''); setConfirmation('');
    if (user) await replaceSession(cache, user);
    else if (mode === 'register') { setMode('login'); setMessage('Hesabınız oluşturuldu. Giriş yapıp e-posta adresinizi doğrulayın.'); }
    else setMessage('Hesap mevcutsa parola sıfırlama bağlantısı gönderildi.');
  } });
  const fieldError = (field: string) => mutation.error instanceof ApiError ? mutation.error.field(field) : undefined;
  function changeMode(next: typeof mode) { setMode(next); setMessage(''); setPassword(''); setConfirmation(''); mutation.reset(); }
  function submit(event: FormEvent) { event.preventDefault(); mutation.mutate(); }
  return <AuthFrame><span className="eyebrow">ÜCRETSİZ ÖĞRENCİ HESABI</span><h2>{mode === 'register' ? 'Birlikte başlayalım' : mode === 'forgot' ? 'Parolanı yenile' : 'Hoş geldin'}</h2><p className="muted">{mode === 'login' ? 'Çalışmalarına kaldığın yerden devam et.' : mode === 'register' ? 'Bir kuruma bağlı olmadan da çalışabilirsin.' : 'E-posta adresine sıfırlama bağlantısı gönderelim.'}</p>{message && <p role="status" className="notice success">{message}</p>}{mutation.isError && <ErrorNotice error={mutation.error} />}<form onSubmit={submit}><fieldset disabled={mutation.isPending}>
    {mode === 'register' && <Field label="Ad soyad" error={fieldError('name')}>{(props) => <input {...props} required maxLength={100} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />}</Field>}
    <Field label="E-posta adresi" error={fieldError('email')}>{(props) => <input {...props} required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />}</Field>
    {mode !== 'forgot' && <Field label="Parola" error={fieldError('password')} hint={mode === 'register' ? 'En az 12 karakter; büyük/küçük harf, rakam ve sembol.' : undefined}>{(props) => <input {...props} required type="password" minLength={mode === 'register' ? 12 : undefined} maxLength={128} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} />}</Field>}
    {mode === 'register' && <Field label="Parola tekrar" error={fieldError('password_confirmation')}>{(props) => <input {...props} required type="password" autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />}</Field>}
    <button className="button primary full" type="submit">{mutation.isPending ? 'İşlem yapılıyor…' : mode === 'register' ? 'Hesap oluştur' : mode === 'forgot' ? 'Bağlantı gönder' : 'Giriş yap'}</button>
  </fieldset></form><div className="auth-links"><button disabled={mutation.isPending} onClick={() => changeMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Hesap oluştur' : 'Girişe dön'}</button>{mode === 'login' && <button disabled={mutation.isPending} onClick={() => changeMode('forgot')}>Parolamı unuttum</button>}</div></AuthFrame>;
}
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useSession();
  const logout = useLogout();
  const [message, setMessage] = useState('');
  const resend = useMutation({ mutationFn: () => api.request('post', '/api/v1/auth/email-verification-notification', {}), onSuccess: (response) => setMessage(response.data.message) });
  if (session.isPending) return <main className="center"><Loading /></main>;
  if (session.isError) return <main className="center"><ErrorNotice error={session.error} retry={() => { void session.refetch(); }} /></main>;
  if (!session.data) return <Login />;
  if (!session.data.email_verified_at) return <AuthFrame><span className="eyebrow">SON BİR ADIM</span><h2>E-postanı doğrula</h2><p>{session.data.email} adresine gelen bağlantıyı aç, ardından buradan devam et.</p>{message && <p role="status" className="notice success">{message}</p>}{resend.isError && <ErrorNotice error={resend.error} />}{logout.isError && <ErrorNotice error={logout.error} />}<div className="stack"><button className="button primary" disabled={resend.isPending} onClick={() => resend.mutate()}>Doğrulama e-postası gönder</button><button className="button secondary" onClick={() => { void session.refetch(); }}>Doğrulamayı kontrol et</button><button className="text-button" disabled={logout.isPending} onClick={() => logout.mutate()}>Çıkış yap</button></div></AuthFrame>;
  return children;
}
export function ResetPassword() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [email, setEmail] = useState(search.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const token = search.get('token');
  const reset = useMutation({ mutationFn: async () => {
    await api.csrf();
    return api.request('post', '/api/v1/auth/reset-password', { body: { email, token: token ?? '', password, password_confirmation: confirmation } });
  }, onSuccess: async () => { setPassword(''); setConfirmation(''); await replaceSession(cache, null); navigate('/reset-password?completed=1', { replace: true }); } });
  if (search.has('completed')) return <AuthFrame><h2>Parolan yenilendi</h2><p>Yeni parolanla giriş yapabilirsin.</p><Link className="button primary" to="/">Girişe dön</Link></AuthFrame>;
  return <AuthFrame><h2>Yeni parola belirle</h2>{!token ? <><p className="notice error" role="alert">Parola sıfırlama bağlantısı eksik. Yeni bir bağlantı iste.</p><Link to="/">Girişe dön</Link></> : <form onSubmit={(event) => { event.preventDefault(); reset.mutate(); }}>{reset.isError && <ErrorNotice error={reset.error} />}<fieldset disabled={reset.isPending}><Field label="E-posta adresi">{(props) => <input {...props} type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />}</Field><Field label="Yeni parola" hint="En az 12 karakter; büyük/küçük harf, rakam ve sembol." error={reset.error instanceof ApiError ? reset.error.field('password') : undefined}>{(props) => <input {...props} type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />}</Field><Field label="Parola tekrar">{(props) => <input {...props} type="password" required autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />}</Field><button type="submit" className="button primary full">{reset.isPending ? 'Kaydediliyor…' : 'Parolayı yenile'}</button></fieldset></form>}</AuthFrame>;
}
export function VerifyEmail() {
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const input = verificationInput(search);
  const session = useSession();
  const [verified, setVerified] = useState(false);
  const verify = useMutation({ mutationFn: () => api.request('get', '/api/v1/auth/verify-email/{id}/{hash}', { params: { id: input?.id ?? '', hash: input?.hash ?? '' }, query: { expires: input?.expires ?? 0, signature: input?.signature ?? '' } }), onSuccess: async () => { setVerified(true); await session.refetch(); navigate('/verify-email?completed=1', { replace: true }); } });
  if (session.isPending) return <main className="center"><Loading /></main>;
  if (session.isError) return <main className="center"><ErrorNotice error={session.error} retry={() => { void session.refetch(); }} /></main>;
  if (!session.data) return <Login />;
  return <AuthFrame><h2>{verified || session.data.email_verified_at ? 'E-postan doğrulandı' : 'E-postanı doğrula'}</h2>{verified || session.data.email_verified_at ? <Link to="/" className="button primary">Çalışmaya başla</Link> : <><p>{input ? 'Gelen bağlantının bu hesaba ait olduğunu doğrulayalım.' : 'Doğrulama bağlantısı eksik veya geçersiz. Yeni bir bağlantı iste.'}</p>{verify.isError && <ErrorNotice error={verify.error} />}<button className="button primary" disabled={verify.isPending || !input} onClick={() => verify.mutate()}>{verify.isPending ? 'Doğrulanıyor…' : 'E-postamı doğrula'}</button></>}</AuthFrame>;
}
