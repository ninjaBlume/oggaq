import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, loadCatalogs } from '../api';
import { ErrorNotice, Icon, Loading } from '../ui';

export function useQuestionStats() {
  return useQuery({ queryKey: ['question-stats'], queryFn: ({ signal }) => api.request('get', '/api/v1/admin/question-stats', { signal }) });
}

// Subject-based entry to the question content: counts per subject so editors can see where work remains.
export function SubjectList() {
  const catalogs = useQuery({ queryKey: ['catalogs'], queryFn: ({ signal }) => loadCatalogs(signal) });
  const stats = useQuestionStats();
  if (catalogs.isPending || stats.isPending) return <Loading text="Dersler yükleniyor…" />;
  const error = catalogs.error ?? stats.error;
  const retry = () => { void catalogs.refetch(); void stats.refetch(); };
  const totals = (subjectId: string) => stats.data?.data.filter((row) => row.subject_id === subjectId).reduce((sum, row) => ({ total: sum.total + row.total, published: sum.published + row.published, draft: sum.draft + row.draft, pending: sum.pending + row.pending }), { total: 0, published: 0, draft: 0, pending: 0 }) ?? { total: 0, published: 0, draft: 0, pending: 0 };
  return <><header className="page-heading"><div><span className="eyebrow">MERKEZİ İÇERİK</span><h1>Dersler</h1><p className="muted">Soruları derse ve konuya göre izleyin; her soru yerinde düzenlenir. Sınav bazlı görünüm için Sınavlar'ı kullanın.</p></div><Link className="button primary" to="/questions/new"><Icon name="plus" size={18} />Yeni soru</Link></header>
    {error && <ErrorNotice error={error} retry={retry} />}
    {catalogs.data && !catalogs.data.subjects.length ? <div className="card empty-state"><span className="empty-icon"><Icon name="book" size={30} /></span><h3>Henüz ders yok</h3><p>Soru hazırlamak için önce Kataloglar'dan bir ders oluşturun.</p><Link className="button primary" to="/catalogs">Kataloglara git</Link></div>
      : catalogs.data && <section className="card question-table"><div className="table-scroll"><table><thead><tr><th>Ders</th><th>Toplam soru</th><th>Yayımlanmış</th><th>Taslak</th><th>Bekleyen değişiklik</th></tr></thead><tbody>{catalogs.data.subjects.map((subject) => { const count = totals(subject.id); return <tr key={subject.id}><td><Link className="question-link" to={`/subjects/${subject.id}`}>{subject.name}</Link></td><td>{count.total}</td><td>{count.published}</td><td>{count.draft > 0 ? <span className="badge amber"><span />{count.draft}</span> : 0}</td><td>{count.pending > 0 ? <span className="badge amber"><span />{count.pending}</span> : 0}</td></tr>; })}</tbody></table></div></section>}
  </>;
}
