import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@oggaq/api-client';
import { deleteAccountConfirmation, vocabulary } from '@oggaq/study-core';
import { api } from './api';
import { AuthFrame, Login, replaceSession, useLogout, useSession } from './auth';
import { brand } from './config';
import { Icon } from './icons';
import { ThemeSwitch } from './theme';
import { dateLabel, ErrorNotice, Field, Loading } from './ui';
import { verificationInput } from './verification';
import { SiteFooter } from './legal';

// The newest sessions are shown first; the rest sit behind a toggle so a long list never buries the page.
const visibleSessions = 5;
const sessionsKey = ['account', 'sessions'] as const;
const fieldError = (error: unknown, name: string) => (error instanceof ApiError ? error.field(name) : undefined);

function Section({ title, intro, children, danger }: { title: string; intro?: string; children: ReactNode; danger?: boolean }) {
  return <section className={`card account-section${danger ? ' danger-zone' : ''}`}><h2>{title}</h2>{intro && <p className="muted">{intro}</p>}{children}</section>;
}

function PasswordField({ label = 'Mevcut parola', value, onChange, error }: { label?: string; value: string; onChange: (value: string) => void; error?: string }) {
  return <Field label={label} error={error}>{(props) => <input {...props} required type="password" maxLength={128} autoComplete="current-password" value={value} onChange={(event) => onChange(event.target.value)} />}</Field>;
}

function ChangeEmail({ pending }: { pending: string | null }) {
  const cache = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const change = useMutation({
    mutationFn: async () => { await api.request('post', '/api/v1/me/email', { body: { email, current_password: password } }); },
    onSuccess: async () => { setPassword(''); await cache.invalidateQueries({ queryKey: ['session'] }); },
  });
  return <Section title="E-posta adresini değiştir" intro="Yeni adrese bir doğrulama bağlantısı gönderilir. Bağlantıyı açana kadar adresin değişmez; eski adresine de haber verilir.">
    {pending && <p className="notice" role="status">Doğrulama bekleyen adres: <strong>{pending}</strong>. Bağlantıyı bu hesapla giriş yaptığın tarayıcıda aç.</p>}
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); change.mutate(); }}>
      <fieldset disabled={change.isPending}>
        {change.isSuccess && <p className="notice success" role="status">Adres uygunsa doğrulama bağlantısı yeni adrese gönderildi.</p>}
        {change.isError && !(fieldError(change.error, 'email') || fieldError(change.error, 'current_password')) && <ErrorNotice error={change.error} />}
        <Field label="Yeni e-posta adresi" error={fieldError(change.error, 'email')}>{(props) => <input {...props} required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />}</Field>
        <PasswordField value={password} onChange={setPassword} error={fieldError(change.error, 'current_password')} />
        <button className="button primary" type="submit">{change.isPending ? 'Gönderiliyor…' : 'Doğrulama bağlantısı gönder'}</button>
      </fieldset>
    </form>
  </Section>;
}

function ChangePassword() {
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const cache = useQueryClient();
  const change = useMutation({
    mutationFn: async () => { await api.request('post', '/api/v1/me/password', { body: { current_password: current, password, password_confirmation: confirmation } }); },
    onSuccess: async () => { setCurrent(''); setPassword(''); setConfirmation(''); await cache.invalidateQueries({ queryKey: sessionsKey }); },
  });
  return <Section title="Parolayı değiştir" intro="Parolayı değiştirince bu tarayıcı dışındaki bütün cihazların oturumu kapanır.">
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); change.mutate(); }}>
      <fieldset disabled={change.isPending}>
        {change.isSuccess && <p className="notice success" role="status">Parolan değiştirildi; diğer cihazlardaki oturumlar kapatıldı.</p>}
        {change.isError && !['current_password', 'password'].some((name) => fieldError(change.error, name)) && <ErrorNotice error={change.error} />}
        <PasswordField value={current} onChange={setCurrent} error={fieldError(change.error, 'current_password')} />
        <Field label="Yeni parola" error={fieldError(change.error, 'password')} hint="En az 12 karakter; büyük/küçük harf, rakam ve sembol.">{(props) => <input {...props} required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />}</Field>
        <Field label="Yeni parola tekrar">{(props) => <input {...props} required type="password" maxLength={128} autoComplete="new-password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />}</Field>
        <button className="button primary" type="submit">{change.isPending ? 'Kaydediliyor…' : 'Parolayı değiştir'}</button>
      </fieldset>
    </form>
  </Section>;
}

function Sessions() {
  const cache = useQueryClient();
  const list = useQuery({ queryKey: sessionsKey, queryFn: async ({ signal }) => (await api.request('get', '/api/v1/me/sessions', { signal })).data });
  const [asking, setAsking] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [password, setPassword] = useState('');
  const revoke = useMutation({
    mutationFn: async (id: string) => { await api.request('delete', '/api/v1/me/sessions/{session}', { params: { session: id } }); },
    onSuccess: () => cache.invalidateQueries({ queryKey: sessionsKey }),
  });
  const revokeOthers = useMutation({
    mutationFn: () => api.request('post', '/api/v1/me/sessions/revoke-others', { body: { current_password: password } }),
    onSuccess: async () => { setPassword(''); setAsking(false); await cache.invalidateQueries({ queryKey: sessionsKey }); },
  });
  const others = (list.data ?? []).filter((item) => !item.current);
  return <Section title="Cihazlar ve oturumlar" intro="Hesabına giriş yapılmış yerler. Tanımadığın bir oturumu kapat ve gerekirse parolanı değiştir.">
    {list.isPending ? <Loading /> : list.isError ? <ErrorNotice error={list.error} retry={() => { void list.refetch(); }} /> : <>
      <ul className="session-list" aria-label="Açık oturumlar">{(showAll ? list.data : list.data.slice(0, visibleSessions)).map((item) => <li key={item.id} className="session-row">
        <div><strong>{item.label}</strong>{item.current && <span className="chip">Bu cihaz</span>}<p className="muted">{item.kind === 'mobile' ? 'Mobil uygulama' : 'Tarayıcı'} · {item.last_used_at ? `son kullanım ${dateLabel(item.last_used_at)}` : 'şu an açık'}</p></div>
        {!item.current && <button type="button" className="button secondary" disabled={revoke.isPending} aria-label={`${item.label} oturumunu kapat`} onClick={() => revoke.mutate(item.id)}>Çıkış yap</button>}
      </li>)}</ul>
      {list.data.length > visibleSessions && <button type="button" className="text-button" aria-expanded={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? 'Daha az göster' : `Tümünü göster (${list.data.length})`}</button>}
      {others.length === 0 && <p className="muted">Başka açık oturum yok.</p>}
      {revoke.isError && <ErrorNotice error={revoke.error} />}
      {others.length > 0 && !asking && <button type="button" className="button secondary" onClick={() => setAsking(true)}>Diğer tüm cihazlardan çıkış yap</button>}
      {asking && <form onSubmit={(event: FormEvent) => { event.preventDefault(); revokeOthers.mutate(); }}>
        <fieldset disabled={revokeOthers.isPending}>
          {revokeOthers.isError && !fieldError(revokeOthers.error, 'current_password') && <ErrorNotice error={revokeOthers.error} />}
          <PasswordField value={password} onChange={setPassword} error={fieldError(revokeOthers.error, 'current_password')} />
          <div className="actions"><button className="button primary" type="submit">{revokeOthers.isPending ? 'Kapatılıyor…' : 'Diğer cihazlardan çıkış yap'}</button><button className="button secondary" type="button" onClick={() => { setAsking(false); setPassword(''); revokeOthers.reset(); }}>Vazgeç</button></div>
        </fieldset>
      </form>}
    </>}
  </Section>;
}

function ExportData() {
  const [password, setPassword] = useState('');
  const download = useMutation({
    mutationFn: async () => {
      const data = await api.request('post', '/api/v1/me/export', { body: { current_password: password } });
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `oggaq-verilerim-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
    onSuccess: () => setPassword(''),
  });
  return <Section title="Verilerimi indir" intro="Profilin, çalışma geçmişin, sınav sonuçların, favorilerin ve soru bildirimlerin tek bir JSON dosyası olarak iner. Günde en fazla 3 kez indirebilirsin.">
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); download.mutate(); }}>
      <fieldset disabled={download.isPending}>
        {download.isSuccess && <p className="notice success" role="status">Dosya indirildi.</p>}
        {download.isError && !fieldError(download.error, 'current_password') && <ErrorNotice error={download.error} />}
        <PasswordField value={password} onChange={setPassword} error={fieldError(download.error, 'current_password')} />
        <button className="button primary" type="submit">{download.isPending ? 'Hazırlanıyor…' : 'Verilerimi indir'}</button>
      </fieldset>
    </form>
  </Section>;
}

function DeleteAccount() {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [password, setPassword] = useState('');
  const [phrase, setPhrase] = useState('');
  const remove = useMutation({
    mutationFn: async () => { await api.request('delete', '/api/v1/me', { body: { current_password: password, confirmation: phrase as typeof deleteAccountConfirmation } }); },
    onSuccess: async () => {
      // The confirmation screen is public: leave this page before the session disappears.
      navigate('/account-deleted', { replace: true });
      await replaceSession(cache, null);
    },
  });
  const blocked = remove.error instanceof ApiError && ['admin_account', 'last_company_admin'].includes(remove.error.problem.code ?? '');
  return <Section danger title="Hesabı sil" intro="Bu işlem geri alınamaz.">
    <ul className="plain-list">
      <li>Silinir: hesabın, çalışma geçmişin, sınav denemelerin ve sonuçların, favorilerin, kurum üyeliklerin ve bütün oturumların.</li>
      <li>Kalır: soru bildirimlerin soruya ait kayıt olarak durur, ancak sana bağlantısı ve yazdığın not silinir. Sistem kayıtlarında adın ve e-postan tutulmaz.</li>
      <li>Yedeklerde silinen hesabın verisi, yedek dönemi dolana kadar bulunabilir.</li>
    </ul>
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); remove.mutate(); }}>
      <fieldset disabled={remove.isPending}>
        {remove.isError && (blocked || !['current_password', 'confirmation'].some((name) => fieldError(remove.error, name))) && <ErrorNotice error={remove.error} />}
        <PasswordField value={password} onChange={setPassword} error={fieldError(remove.error, 'current_password')} />
        <Field label={`Onay için “${deleteAccountConfirmation}” yaz`} error={fieldError(remove.error, 'confirmation')}>{(props) => <input {...props} required autoComplete="off" autoCapitalize="characters" value={phrase} onChange={(event) => setPhrase(event.target.value)} />}</Field>
        <button className="button danger" type="submit" disabled={phrase !== deleteAccountConfirmation}>{remove.isPending ? 'Siliniyor…' : 'Hesabımı kalıcı olarak sil'}</button>
      </fieldset>
    </form>
  </Section>;
}

// A page of its own, outside any study context: the account belongs to the person, not to a workspace.
export function AccountPage() {
  const session = useSession();
  const logout = useLogout();
  const user = session.data;
  if (!user) return null;
  return <div className="app-shell"><header className="site-header"><Link to="/" className="brand"><span className="brand-mark"><Icon name="shield" size={24} /></span><span>{brand.name}<small>{brand.subtitle}</small></span></Link><nav aria-label="Ana menü"><Link to="/">← Çalışmaya dön</Link></nav><div className="user-menu"><span>{user.name}</span><ThemeSwitch /><button className="text-button" disabled={logout.isPending} onClick={() => logout.mutate()}>Çıkış yap</button></div></header>
    <main className="content account-page">
      <div className="page-intro"><span className="eyebrow">HESAP VE GİZLİLİK</span><h1>{vocabulary.account.title}</h1><p>{user.name} · {user.email}{user.email_verified_at ? '' : ' (doğrulanmadı)'}</p></div>
      <div className="account-grid">
        <ChangeEmail pending={user.pending_email} />
        <ChangePassword />
        <Sessions />
        <ExportData />
        <DeleteAccount />
      </div>
    </main>
    <SiteFooter /></div>;
}

export function AccountDeleted() {
  return <AuthFrame><h2>Hesabın silindi</h2><p>Hesabın ve çalışma geçmişin silindi. Eski e-posta adresine bir onay mesajı gönderdik.</p><Link to="/" className="button primary">Girişe dön</Link></AuthFrame>;
}

// The signed link of the mail sent to the NEW address; the account owner opens it signed in.
export function ConfirmEmailChange() {
  const [search] = useSearchParams();
  const input = verificationInput(search);
  const session = useSession();
  const cache = useQueryClient();
  const confirm = useMutation({
    mutationFn: () => api.request('get', '/api/v1/auth/confirm-email-change/{id}/{hash}', { params: { id: input?.id ?? '', hash: input?.hash ?? '' }, query: { expires: input?.expires ?? 0, signature: input?.signature ?? '' } }),
    onSuccess: (response) => cache.setQueryData(['session'], response.data),
  });
  if (session.isPending) return <main className="center"><Loading /></main>;
  if (session.isError) return <main className="center"><ErrorNotice error={session.error} retry={() => { void session.refetch(); }} /></main>;
  if (!session.data) return <Login />;
  return <AuthFrame>{confirm.isSuccess ? <><h2>E-posta adresin güncellendi</h2><p>Yeni adresin <strong>{confirm.data.data.email}</strong> olarak doğrulandı. Eski adresine de haber verdik.</p><Link to="/account" className="button primary">Hesabıma dön</Link></>
    : <><h2>Yeni e-posta adresini onayla</h2>{input ? <><p>Bu bağlantı, hesabının e-posta adresini yeni adrese taşır.</p>{confirm.isError && <ErrorNotice error={confirm.error} />}<button className="button primary" disabled={confirm.isPending} onClick={() => confirm.mutate()}>{confirm.isPending ? 'Onaylanıyor…' : 'Yeni adresi onayla'}</button></>
      : <p className="notice error" role="alert">Doğrulama bağlantısı eksik veya bozuk. Hesabım sayfasından yeni bir bağlantı iste.</p>}<Link to="/account">Hesabım</Link></>}</AuthFrame>;
}
