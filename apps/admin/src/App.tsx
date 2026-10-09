import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { AuthGate, useLogout, useSession } from './auth';
import { brand } from './config';
import { ErrorNotice, Icon } from './ui';
import { QuestionList } from './questions/QuestionList';
import { QuestionPage } from './questions/QuestionEditor';
import { CatalogPage } from './catalogs/CatalogPage';

function Layout() {
  const session = useSession();
  const logout = useLogout();
  return <div className="app-shell"><a className="skip-link" href="#main-content">İçeriğe geç</a><aside className="sidebar"><NavLink to="/questions" className="brand"><span className="brand-symbol"><Icon name="book" /></span><span>{brand.name}<small>{brand.title}</small></span></NavLink><span className="nav-label">ÇALIŞMA ALANI</span><nav aria-label="Ana menü"><NavLink to="/questions"><Icon name="book" /><span>Soru bankası</span></NavLink><NavLink to="/catalogs"><Icon name="grid" /><span>Kataloglar</span></NavLink></nav><div className="sidebar-note"><span className="status-dot" /><span>Merkezi içerik alanı</span></div><div className="user-area"><span className="avatar">{session.data?.name.charAt(0).toLocaleUpperCase('tr-TR')}</span><div><strong>{session.data?.name}</strong><small>Platform yöneticisi</small></div><button className="icon-button" aria-label="Çıkış yap" disabled={logout.isPending} onClick={() => logout.mutate()}><Icon name="logout" /></button></div></aside>
    <div className="main-shell"><header className="topbar"><span>{brand.description}</span><span className="topbar-label"><Icon name="shield" size={16} /> Yönetim</span></header><main id="main-content" className="content">{logout.isError && <ErrorNotice error={logout.error} />}<Routes><Route path="/questions" element={<QuestionList />} /><Route path="/questions/new" element={<QuestionPage />} /><Route path="/questions/:questionId" element={<QuestionPage />} /><Route path="/catalogs" element={<CatalogPage />} /><Route path="*" element={<Navigate to="/questions" replace />} /></Routes></main><footer className="page-footer">{brand.name} · {brand.title}</footer></div></div>;
}

export function App() { return <AuthGate><Layout /></AuthGate>; }
