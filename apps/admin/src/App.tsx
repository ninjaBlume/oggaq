import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { vocabulary } from '@oggaq/study-core';
import { AuthGate, useLogout, useSession } from './auth';
import { ThemeSwitch } from './theme';
import { brand } from './config';
import { ErrorNotice, Icon } from './ui';
import { QuestionPage } from './questions/QuestionEditor';
import { CatalogPage } from './catalogs/CatalogPage';
import { OfficialExamList } from './officialExams/OfficialExamList';
import { OfficialExamPage } from './officialExams/OfficialExamEditor';
import { JobList, JobEditor } from './jobs/Jobs';
import { QuestionReportsPage, useReportSummary } from './reports/QuestionReports';

function Layout() {
  const session = useSession();
  const logout = useLogout();
  const openReports = useReportSummary().data?.data.open_questions ?? 0;
  return <div className="app-shell"><a className="skip-link" href="#main-content">İçeriğe geç</a><aside className="sidebar"><NavLink to="/deneme-sinavlari" className="brand"><span className="brand-symbol"><Icon name="book" /></span><span>{brand.name}<small>{brand.title}</small></span></NavLink><span className="nav-label">ÇALIŞMA ALANI</span><nav aria-label="Ana menü"><NavLink to="/deneme-sinavlari"><Icon name="history" /><span>{vocabulary.deneme.title}</span></NavLink><NavLink to="/ders-sinavlari"><Icon name="book" /><span>{vocabulary.ders.title}</span></NavLink><NavLink to="/bildirimler"><Icon name="flag" /><span>{vocabulary.reports.title}</span>{openReports > 0 && <span className="nav-badge" aria-label={`${openReports} açık bildirim`}>{openReports}</span>}</NavLink><NavLink to="/is-ilanlari"><Icon name="briefcase" /><span>{vocabulary.jobs.title}</span></NavLink><NavLink to="/catalogs"><Icon name="grid" /><span>Kataloglar</span></NavLink></nav><div className="sidebar-note"><span className="status-dot" /><span>Merkezi içerik alanı</span></div><div className="sidebar-theme"><ThemeSwitch /></div><div className="user-area"><span className="avatar">{session.data?.name.charAt(0).toLocaleUpperCase('tr-TR')}</span><div><strong>{session.data?.name}</strong><small>Platform yöneticisi</small></div><button className="icon-button" aria-label="Çıkış yap" disabled={logout.isPending} onClick={() => logout.mutate()}><Icon name="logout" /></button></div></aside>
    <div className="main-shell"><header className="topbar"><span>{brand.tagline}</span><span className="topbar-label"><Icon name="shield" size={16} /> Yönetim</span></header><main id="main-content" className="content">{logout.isError && <ErrorNotice error={logout.error} />}<Routes><Route path="/questions" element={<Navigate to="/deneme-sinavlari" replace />} /><Route path="/subjects/*" element={<Navigate to="/ders-sinavlari" replace />} /><Route path="/questions/:questionId" element={<QuestionPage />} /><Route path="/deneme-sinavlari" element={<OfficialExamList kind="deneme" />} /><Route path="/ders-sinavlari" element={<OfficialExamList kind="ders" />} /><Route path="/official-exams" element={<Navigate to="/deneme-sinavlari" replace />} /><Route path="/official-exams/new" element={<OfficialExamPage />} /><Route path="/official-exams/:examId" element={<OfficialExamPage />} /><Route path="/bildirimler" element={<QuestionReportsPage />} /><Route path="/is-ilanlari" element={<JobList />} /><Route path="/is-ilanlari/yeni" element={<JobEditor />} /><Route path="/is-ilanlari/:jobId" element={<JobEditor />} /><Route path="/catalogs" element={<CatalogPage />} /><Route path="*" element={<Navigate to="/deneme-sinavlari" replace />} /></Routes></main><footer className="page-footer">{brand.name} · {brand.title}</footer></div></div>;
}

export function App() { return <AuthGate><Layout /></AuthGate>; }
