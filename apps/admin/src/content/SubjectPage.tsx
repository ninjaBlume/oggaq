import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cursorFromLink } from '@oggaq/api-client';
import { api, loadCatalogs } from '../api';
import { ErrorNotice, Icon, Loading } from '../ui';
import { BankQuestionCard } from './BankQuestionCard';
import { useQuestionStats } from './SubjectList';

type Status = '' | 'draft' | 'published';

// One subject: filter by topic (including "no topic") and status, every question in full and editable in place.
export function SubjectPage() {
  const { subjectId = '' } = useParams();
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<Status>('');
  const cache = useQueryClient();
  const catalogs = useQuery({ queryKey: ['catalogs'], queryFn: ({ signal }) => loadCatalogs(signal) });
  const stats = useQuestionStats();
  const questions = useInfiniteQuery({ queryKey: ['questions', 'subject', subjectId, topic, status], enabled: !!subjectId,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => api.request('get', '/api/v1/admin/questions', { signal, query: { per_page: 20, cursor: pageParam, subject_id: subjectId, ...(topic ? { topic_id: topic } : {}), ...(status ? { status } : {}) } }),
    getNextPageParam: (page) => cursorFromLink(page.links.next) });
  if (catalogs.isPending) return <Loading text="Ders yükleniyor…" />;
  if (catalogs.isError) return <ErrorNotice error={catalogs.error} retry={() => { void catalogs.refetch(); }} />;
  const subject = catalogs.data.subjects.find((item) => item.id === subjectId);
  if (!subject) return <><Link className="back-link" to="/subjects"><Icon name="back" size={16} />Derslere dön</Link><div className="card empty-state"><h3>Ders bulunamadı</h3></div></>;
  const rows = stats.data?.data.filter((row) => row.subject_id === subjectId) ?? [];
  const sum = (picked: typeof rows) => picked.reduce((total, row) => total + row.total, 0);
  const topics = catalogs.data.topics.filter((item) => item.subject_id === subjectId);
  const noTopic = sum(rows.filter((row) => row.topic_id === null));
  const all = questions.data?.pages.flatMap((page) => page.data) ?? [];
  const refresh = () => { void cache.invalidateQueries({ queryKey: ['questions'] }); void cache.invalidateQueries({ queryKey: ['question-stats'] }); void cache.invalidateQueries({ queryKey: ['official-exams'] }); void cache.invalidateQueries({ queryKey: ['official-exam'] }); };
  const chips: { key: string; label: string; count: number | null }[] = [{ key: '', label: 'Tümü', count: sum(rows) }, ...topics.map((item) => ({ key: item.id, label: item.name, count: sum(rows.filter((row) => row.topic_id === item.id)) })), { key: 'none', label: 'Konusuz', count: noTopic }];
  const total = rows.reduce((sumValue, row) => ({ published: sumValue.published + row.published, draft: sumValue.draft + row.draft, pending: sumValue.pending + row.pending }), { published: 0, draft: 0, pending: 0 });
  return <><Link className="back-link" to="/subjects"><Icon name="back" size={16} />Derslere dön</Link>
    <header className="page-heading"><div><span className="eyebrow">DERS</span><h1>{subject.name}</h1><p className="muted">{sum(rows)} soru · {total.published} yayımlanmış · {total.draft} taslak · {total.pending} bekleyen değişiklik</p></div><Link className="button primary" to={`/questions/new?subject=${subject.id}`}><Icon name="plus" size={18} />Yeni soru</Link></header>
    <div className="topic-bar" role="group" aria-label="Konu filtresi">{chips.filter((chip) => chip.key === '' || chip.count !== 0 || chip.key === topic).map((chip) => <button type="button" key={chip.key || 'all'} className={`topic-chip ${topic === chip.key ? 'active' : ''}`} aria-pressed={topic === chip.key} onClick={() => setTopic(chip.key)}>{chip.label}{chip.count !== null && <small>{chip.count}</small>}</button>)}
      <label className="topic-status"><span className="sr-only">Yayın durumu</span><select aria-label="Yayın durumu" value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="">Tüm durumlar</option><option value="draft">Taslak</option><option value="published">Yayımlanmış</option></select></label></div>
    {questions.isPending ? <Loading text="Sorular yükleniyor…" /> : questions.isError ? <ErrorNotice error={questions.error} retry={() => { void questions.refetch(); }} /> : !all.length ? <div className="card empty-state"><span className="empty-icon"><Icon name="book" size={30} /></span><h3>Bu filtrelerde soru yok</h3><p>Konuyu veya durumu değiştirin ya da yeni bir soru ekleyin.</p></div>
      : <div className="question-stack">{all.map((question) => <BankQuestionCard key={question.id} question={question} catalogs={catalogs.data} onChanged={refresh} />)}
        <div className="load-more"><span className="muted small-text">{all.length} soru gösteriliyor{questions.hasNextPage ? '' : ' (hepsi)'}</span>{questions.hasNextPage && <button type="button" className="button secondary" disabled={questions.isFetchingNextPage} onClick={() => { void questions.fetchNextPage(); }}>{questions.isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla soru yükle'}</button>}</div></div>}
  </>;
}
