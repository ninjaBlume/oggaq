import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { cursorFromLink } from '@oggaq/api-client';
import type { Catalogs, components } from '@oggaq/shared-types';
import { api, loadCatalogs } from '../api';
import { ErrorNotice, Icon, Loading } from '../ui';
import { BankQuestionCard } from './BankQuestionCard';
import { useQuestionStats } from './SubjectList';

type Status = '' | 'draft' | 'published';
type ExamStat = components['schemas']['SubjectExamStat'];

// A page of a subject's questions as full, editable cards. `examId` narrows to one exam ("none" = in no exam).
function QuestionStream({ subjectId, topic = '', status, examId = '', catalogs, onChanged }: { subjectId: string; topic?: string; status: Status; examId?: string; catalogs: Catalogs; onChanged: () => void }) {
  const questions = useInfiniteQuery({ queryKey: ['questions', 'subject', subjectId, topic, status, examId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => api.request('get', '/api/v1/admin/questions', { signal, query: { per_page: 20, cursor: pageParam, subject_id: subjectId, ...(topic ? { topic_id: topic } : {}), ...(status ? { status } : {}), ...(examId ? { official_exam_id: examId } : {}) } }),
    getNextPageParam: (page) => cursorFromLink(page.links.next) });
  const all = questions.data?.pages.flatMap((page) => page.data) ?? [];
  if (questions.isPending) return <Loading text="Sorular yükleniyor…" />;
  if (questions.isError) return <ErrorNotice error={questions.error} retry={() => { void questions.refetch(); }} />;
  if (!all.length) return <div className="card empty-state"><span className="empty-icon"><Icon name="book" size={30} /></span><h3>Bu filtrelerde soru yok</h3><p>Konuyu veya durumu değiştirin ya da yeni bir soru ekleyin.</p></div>;
  return <div className="question-stack">{all.map((question) => <BankQuestionCard key={question.id} question={question} catalogs={catalogs} onChanged={onChanged} />)}
    <div className="load-more"><span className="muted small-text">{all.length} soru gösteriliyor{questions.hasNextPage ? '' : ' (hepsi)'}</span>{questions.hasNextPage && <button type="button" className="button secondary" disabled={questions.isFetchingNextPage} onClick={() => { void questions.fetchNextPage(); }}>{questions.isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla soru yükle'}</button>}</div></div>;
}

type ExamGroup = { key: string; typeId: string; number: string | null; year: number; term: string | null; variants: ExamStat[]; best: ExamStat };

// Armed and unarmed exams of one number share their general questions; the variant with the most of this subject's questions represents the group.
export function groupSubjectExams(stats: ExamStat[]): ExamGroup[] {
  const groups = new Map<string, ExamStat[]>();
  for (const stat of stats) {
    const key = `${stat.exam_type_id}|${stat.year}|${stat.exam_number ?? stat.title}|${stat.term ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), stat]);
  }
  return [...groups.entries()].map(([key, variants]) => ({ key, typeId: variants[0]!.exam_type_id, number: variants[0]!.exam_number, year: variants[0]!.year, term: variants[0]!.term, variants, best: [...variants].sort((a, b) => b.total - a.total)[0]! }))
    .sort((a, b) => b.year - a.year || (Number(b.number) || 0) - (Number(a.number) || 0));
}

const weaponLabel = (status: ExamStat['weapon_status']) => status === 'armed' ? 'Silahlı' : status === 'unarmed' ? 'Silahsız' : 'Belirtilmemiş';

function ExamSection({ title, caption, count, draft, children }: { title: string; caption?: string; count: number; draft?: number; children: () => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <section className="card exam-section"><button type="button" className="exam-section-toggle" aria-expanded={open} onClick={() => setOpen(!open)}><span><strong>{title}</strong>{caption && <small>{caption}</small>}</span><span className="exam-section-count">{draft ? <span className="exam-attention">{draft} taslak</span> : null}<span className="chip muted-chip">{count} soru</span><span aria-hidden="true">{open ? '−' : '+'}</span></span></button>{open && <div className="exam-section-body">{children()}</div>}</section>;
}

function ExamView({ subjectId, status, catalogs, onChanged }: { subjectId: string; status: Status; catalogs: Catalogs; onChanged: () => void }) {
  const stats = useQuery({ queryKey: ['subject-exam-stats', subjectId], queryFn: ({ signal }) => api.request('get', '/api/v1/admin/subjects/{subject}/exam-stats', { params: { subject: subjectId }, signal }) });
  if (stats.isPending) return <Loading text="Sınavlar yükleniyor…" />;
  if (stats.isError) return <ErrorNotice error={stats.error} retry={() => { void stats.refetch(); }} />;
  const groups = groupSubjectExams(stats.data.data);
  return <div className="exam-view">
    {catalogs['exam-types'].map((type) => { const own = groups.filter((group) => group.typeId === type.id); return <div key={type.id}>
      <h2 className="exam-type-heading">{type.name}<small>{own.length} sınav</small></h2>
      {own.length === 0 ? <p className="muted small-text exam-type-empty">Bu dersin {type.name} içinde sorusu yok.</p> : <div className="question-stack">{own.map((group) => <ExamSection key={group.key} title={`${group.number ? `${group.number}. ` : ''}${type.name}`} caption={`${group.year}${group.term ? ` · ${group.term}` : ''} · ${group.variants.map((variant) => `${weaponLabel(variant.weapon_status)} ${variant.total}`).join(' · ')}`} count={group.best.total} draft={group.best.draft}>{() => <QuestionStream subjectId={subjectId} status={status} examId={group.best.official_exam_id} catalogs={catalogs} onChanged={onChanged} />}</ExamSection>)}</div>}
    </div>; })}
    {stats.data.without_exam > 0 && <div><h2 className="exam-type-heading">Hiçbir sınavda olmayan sorular<small>{stats.data.without_exam} soru</small></h2><ExamSection title="Sınava bağlı olmayan sorular" count={stats.data.without_exam}>{() => <QuestionStream subjectId={subjectId} status={status} examId="none" catalogs={catalogs} onChanged={onChanged} />}</ExamSection></div>}
  </div>;
}

// One subject, two ways to walk it: by topic, or by exam (Deneme / Ders exams, then exam number). Every question is shown in full and edited in place.
export function SubjectPage() {
  const { subjectId = '' } = useParams();
  const [view, setView] = useState<'topic' | 'exam'>('topic');
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<Status>('');
  const cache = useQueryClient();
  const catalogs = useQuery({ queryKey: ['catalogs'], queryFn: ({ signal }) => loadCatalogs(signal) });
  const stats = useQuestionStats();
  if (catalogs.isPending) return <Loading text="Ders yükleniyor…" />;
  if (catalogs.isError) return <ErrorNotice error={catalogs.error} retry={() => { void catalogs.refetch(); }} />;
  const subject = catalogs.data.subjects.find((item) => item.id === subjectId);
  if (!subject) return <><Link className="back-link" to="/subjects"><Icon name="back" size={16} />Derslere dön</Link><div className="card empty-state"><h3>Ders bulunamadı</h3></div></>;
  const rows = stats.data?.data.filter((row) => row.subject_id === subjectId) ?? [];
  const sum = (picked: typeof rows) => picked.reduce((total, row) => total + row.total, 0);
  const topics = catalogs.data.topics.filter((item) => item.subject_id === subjectId);
  const refresh = () => { for (const key of ['questions', 'question-stats', 'subject-exam-stats', 'official-exams', 'official-exam']) void cache.invalidateQueries({ queryKey: [key] }); };
  const chips: { key: string; label: string; count: number }[] = [{ key: '', label: 'Tümü', count: sum(rows) }, ...topics.map((item) => ({ key: item.id, label: item.name, count: sum(rows.filter((row) => row.topic_id === item.id)) })), { key: 'none', label: 'Konusuz', count: sum(rows.filter((row) => row.topic_id === null)) }];
  const total = rows.reduce((value, row) => ({ published: value.published + row.published, draft: value.draft + row.draft, pending: value.pending + row.pending }), { published: 0, draft: 0, pending: 0 });
  return <><Link className="back-link" to="/subjects"><Icon name="back" size={16} />Derslere dön</Link>
    <header className="page-heading"><div><span className="eyebrow">DERS</span><h1>{subject.name}</h1><p className="muted">{sum(rows)} soru · {total.published} yayımlanmış · {total.draft} taslak · {total.pending} bekleyen değişiklik</p></div><Link className="button primary" to={`/questions/new?subject=${subject.id}`}><Icon name="plus" size={18} />Yeni soru</Link></header>
    <div className="view-toggle" role="group" aria-label="Görünüm"><button type="button" className={view === 'topic' ? 'active' : ''} aria-pressed={view === 'topic'} onClick={() => setView('topic')}>Konuya göre</button><button type="button" className={view === 'exam' ? 'active' : ''} aria-pressed={view === 'exam'} onClick={() => setView('exam')}>Sınava göre</button>
      <label className="topic-status"><span className="sr-only">Yayın durumu</span><select aria-label="Yayın durumu" value={status} onChange={(event) => setStatus(event.target.value as Status)}><option value="">Tüm durumlar</option><option value="draft">Taslak</option><option value="published">Yayımlanmış</option></select></label></div>
    {view === 'topic' ? <>
      <div className="topic-bar" role="group" aria-label="Konu filtresi">{chips.filter((chip) => chip.key === '' || chip.count !== 0 || chip.key === topic).map((chip) => <button type="button" key={chip.key || 'all'} className={`topic-chip ${topic === chip.key ? 'active' : ''}`} aria-pressed={topic === chip.key} onClick={() => setTopic(chip.key)}>{chip.label}<small>{chip.count}</small></button>)}</div>
      <QuestionStream subjectId={subjectId} topic={topic} status={status} catalogs={catalogs.data} onChanged={refresh} />
    </> : <ExamView subjectId={subjectId} status={status} catalogs={catalogs.data} onChanged={refresh} />}
  </>;
}
