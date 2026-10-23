import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { Link, Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { StudyContext } from '@oggaq/shared-types';
import { vocabulary } from '@oggaq/study-core';
import { api } from './api';
import { AuthGate, ResetPassword, useLogout, useSession, VerifyEmail } from './auth';
import { brand } from './config';
import { ErrorNotice, Loading } from './ui';
import { Exam } from './exams';
import { DenemeSinavlari, DersSinavlari, Sonuclarim } from './sinavlar';
import { Review } from './review';
import { Stats } from './stats';
import { ThemeSwitch } from './theme';

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
  if (!params.context && first) return <Navigate to={`/study/${first.id}/deneme`} replace />;
  if (!context) return <main className="center"><div className="card"><h1>Bu çalışmaya erişilemiyor</h1><p>Çalışma hesabına ait olmayabilir veya kurum üyeliğin sona ermiş olabilir.</p><Link className="button primary" to="/">Çalışmalarıma dön</Link></div></main>;
  const path = `/study/${context.id}`;
  return <Context.Provider value={context}><div className="app-shell"><header className="site-header"><Link to={`${path}/deneme`} className="brand">{brand.name}<span className="brand-dot" /></Link><nav aria-label="Ana menü"><NavLink to={`${path}/deneme`}>{vocabulary.deneme.title}</NavLink><NavLink to={`${path}/ders`}>{vocabulary.ders.title}</NavLink><NavLink to={`${path}/sonuclar`}>{vocabulary.results.title}</NavLink><NavLink to={`${path}/review`}>{vocabulary.review.title}</NavLink><NavLink to={`${path}/stats`}>{vocabulary.stats.title}</NavLink></nav><div className="user-menu"><span>{session.data?.name}</span><ThemeSwitch /><button className="text-button" disabled={logout.isPending} onClick={() => logout.mutate()}>Çıkış yap</button></div></header><div className="context-bar"><div className="context-inner"><span>{brand.description}</span><label>Çalışma alanı<select aria-label="Çalışma alanı" value={context.id} onChange={(event) => navigate(`/study/${event.target.value}/deneme`)}>{contexts.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div></div><main className="content">{logout.isError && <ErrorNotice error={logout.error} />}<Routes><Route path="deneme" element={<DenemeSinavlari key={context.id} />} /><Route path="ders" element={<DersSinavlari key={context.id} />} /><Route path="sonuclar" element={<Sonuclarim key={context.id} />} /><Route path="exams/:exam" element={<Exam key={`${context.id}-${params['*']}`} />} /><Route path="review" element={<Review key={context.id} />} /><Route path="stats" element={<Stats key={context.id} />} /><Route path="questions" element={<Navigate to={`${path}/deneme`} replace />} /><Route path="exams" element={<Navigate to={`${path}/sonuclar`} replace />} /><Route path="history" element={<Navigate to={`${path}/sonuclar`} replace />} /><Route path="attempts/:attempt" element={<Navigate to={`${path}/review`} replace />} /><Route path="*" element={<Navigate to={`${path}/deneme`} replace />} /></Routes></main><footer className="site-footer">{brand.name} · Kendi hızında çalış, her sorudan öğren.</footer></div></Context.Provider>;
}
export function PageIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <div className="page-intro"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1>{children}</div>;
}
export function App() {
  // Auth routes preserve signed link/reset parameters until the server accepts them.
  return <Routes><Route path="reset-password" element={<ResetPassword />} /><Route path="verify-email" element={<VerifyEmail />} /><Route path="study/:context/*" element={<AuthGate><StudyLayout /></AuthGate>} /><Route path="*" element={<AuthGate><StudyLayout /></AuthGate>} /></Routes>;
}
