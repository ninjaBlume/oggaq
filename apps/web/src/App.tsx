import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { StudyContext } from '@oggaq/shared-types';
import { api } from './api';
import { AuthGate, ResetPassword, useLogout, useSession, VerifyEmail } from './auth';
import { brand } from './config';
import { ErrorNotice, Loading } from './ui';
import { QuestionList, Practice, History } from './study';

const Context = createContext<StudyContext | null>(null);
export function useStudyContext() {
  const context = useContext(Context);
  if (!context) throw new Error('Çalışma bağlamı bulunamadı.');
  return context;
}
function StudyLayout() {
  const params = useParams();
  const navigate = useNavigate();
  const session = useSession();
  const logout = useLogout();
  const contexts = useQuery({ queryKey: ['contexts'], queryFn: async ({ signal }) => (await api.request('get', '/api/v1/me/contexts', { signal })).data });
  if (contexts.isPending) return <main className="center"><Loading /></main>;
  if (contexts.isError) return <main className="center"><ErrorNotice error={contexts.error} retry={() => { void contexts.refetch(); }} /></main>;
  const context = contexts.data.find((item) => item.id === params.context);
  const first = contexts.data.find((item) => item.kind === 'personal') ?? contexts.data[0];
  if (!params.context && first) return <Navigate to={`/study/${first.id}/questions`} replace />;
  if (!context) return <main className="center"><div className="card"><h1>Bu çalışmaya erişilemiyor</h1><p>Çalışma hesabına ait olmayabilir veya kurum üyeliğin sona ermiş olabilir.</p><Link className="button primary" to="/">Çalışmalarıma dön</Link></div></main>;
  const path = `/study/${context.id}`;
  return <Context.Provider value={context}><div className="app-shell"><header className="site-header"><Link to={`${path}/questions`} className="brand">{brand.name}<span className="brand-dot" /></Link><nav aria-label="Ana menü"><NavLink to={`${path}/questions`}>Soru çöz</NavLink><NavLink to={`${path}/history`}>Çalışma geçmişim</NavLink></nav><div className="user-menu"><span>{session.data?.name}</span><button className="text-button" disabled={logout.isPending} onClick={() => logout.mutate()}>Çıkış yap</button></div></header><div className="context-bar"><div className="context-inner"><span>{brand.description}</span><label>Çalışma alanı<select aria-label="Çalışma alanı" value={context.id} onChange={(event) => navigate(`/study/${event.target.value}/questions`)}>{contexts.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div></div><main className="content">{logout.isError && <ErrorNotice error={logout.error} />}<Routes><Route path="questions" element={<QuestionList key={context.id} />} /><Route path="history" element={<History key={context.id} />} /><Route path="attempts/:attempt" element={<Practice key={`${context.id}-${params['*']}`} />} /><Route path="*" element={<Navigate to={`${path}/questions`} replace />} /></Routes></main><footer className="site-footer">{brand.name} · Kendi hızında çalış, her sorudan öğren.</footer></div></Context.Provider>;
}
export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <div className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{children}</div>;
}
export function App() {
  // Auth routes preserve signed link/reset parameters until the server accepts them.
  return <Routes><Route path="reset-password" element={<ResetPassword />} /><Route path="verify-email" element={<VerifyEmail />} /><Route path="study/:context/*" element={<AuthGate><StudyLayout /></AuthGate>} /><Route path="*" element={<AuthGate><StudyLayout /></AuthGate>} /></Routes>;
}
export function Disclosure({ title, children }: { title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <section className="disclosure"><button className="text-button" aria-expanded={open} onClick={() => setOpen(!open)}>{title} {open ? '−' : '+'}</button>{open && <div>{children}</div>}</section>;
}
