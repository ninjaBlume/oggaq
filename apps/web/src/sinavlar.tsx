import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, cursorFromLink } from '@oggaq/api-client';
import type { components } from '@oggaq/shared-types';
import { randomId, scoreBand, suggestedMinutes, vocabulary } from '@oggaq/study-core';
import { api } from './api';
import { Icon } from './icons';
import { PageIntro, useStudyContext } from './App';
import { dateLabel, ErrorNotice, Field, Loading, percent } from './ui';

type OfficialExam = components['schemas']['OfficialExam'];
type Summary = components['schemas']['ExamSummary'];
type StartInput = components['schemas']['StartExamInput'];

async function collect<T>(fetchPage: (cursor?: string) => Promise<{ data: T[]; links: { next: string | null } }>): Promise<T[]> {
  const result: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await fetchPage(cursor);
    result.push(...page.data);
    const next = cursorFromLink(page.links.next);
    if (next && next === cursor) throw new Error('Tekrarlanan sayfalama yanıtı.');
    cursor = next;
  } while (cursor);
  return result;
}

// The two kinds of exam of the institution: a Deneme Sınavı is a whole exam (no subject), a Ders Sınavı belongs to one subject.
function useOfficialExams(filters: { scope: 'whole' | 'subject'; weapon_status?: 'armed' | 'unarmed'; subject_id?: string }, enabled = true) {
  return useQuery({ queryKey: ['official-exams', filters], enabled, queryFn: ({ signal }) => collect((cursor) => api.request('get', '/api/v1/official-exams', { signal, query: { ...filters, per_page: 100, cursor } })) });
}
function useSubjects() {
  return useQuery({ queryKey: ['subjects', 'exam-counts'], queryFn: ({ signal }) => collect((cursor) => api.request('get', '/api/v1/subjects', { signal, query: { per_page: 100, cursor, with_exam_counts: true } })) });
}
function useRecentAttempts() {
  const context = useStudyContext();
  return useQuery({ queryKey: ['exams', context.id, 'recent'], queryFn: ({ signal }) => api.request('get', '/api/v1/contexts/{context}/exam-attempts', { params: { context: context.id }, query: { per_page: 100 }, signal }) });
}

function progressOf(attempts: Summary[], examId: string) {
  const mine = attempts.filter((attempt) => attempt.official_exam?.id === examId);
  const open = mine.find((attempt) => attempt.status === 'active');
  const finished = mine.filter((attempt) => attempt.status === 'completed' && attempt.result);
  return { open, runs: finished.length, best: finished.length ? Math.max(...finished.map((attempt) => attempt.result!.score_percent)) : null };
}

// One exam row: what the student did before, and the way in (start with a duration, or continue the open attempt).
function ExamRow({ exam, title, attempts }: { exam: OfficialExam; title: string; attempts: Summary[] }) {
  const context = useStudyContext();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [minutes, setMinutes] = useState(() => suggestedMinutes(exam));
  const submission = useRef<StartInput | null>(null);
  const progress = progressOf(attempts, exam.id);
  const start = useMutation({
    mutationFn: (body: StartInput) => api.request('post', '/api/v1/contexts/{context}/exam-attempts', { params: { context: context.id }, body }),
    onSuccess: (response) => {
      cache.setQueryData(['exam', context.id, response.data.id], response);
      void cache.invalidateQueries({ queryKey: ['exams', context.id] });
      navigate(`/study/${context.id}/exams/${response.data.id}`);
    },
    // A rejected start (409/422) is not a lost response: the next try is a new attempt id.
    onError: (error) => { if (error instanceof ApiError && [409, 422].includes(error.status)) submission.current = null; },
  });
  function begin() {
    submission.current ??= { id: randomId(), official_exam_id: exam.id, duration_seconds: Math.round(minutes) * 60 };
    start.mutate(submission.current);
  }
  const locked = start.isPending || submission.current !== null;
  const expired = progress.open && Date.parse(progress.open.deadline_at) <= Date.parse(progress.open.server_time);
  return <article className="card sinav-row">
    <div className="sinav-main">
      <div className="sinav-title"><span className="exam-mark"><Icon name="book" size={22} /></span><h2>{title}</h2></div>
      <p>{[exam.term ? `${exam.term} ${exam.year}` : String(exam.year), `${exam.question_count} soru`, `önerilen süre ${suggestedMinutes(exam)} dk`].join(' · ')}</p>
      <p className="sinav-progress">{progress.runs === 0 && !progress.open ? 'Henüz girmedin' : [progress.open ? (expired ? 'Süresi dolmuş deneme var' : 'Devam eden denemen var') : null, progress.runs > 0 ? `${progress.runs} kez tamamlandı · en iyi %${progress.best}` : null].filter(Boolean).join(' · ')}</p>
    </div>
    <div className="sinav-action">
      {progress.open ? <Link className="button primary" to={`/study/${context.id}/exams/${progress.open.id}`}>{expired ? 'Sonucu gör' : 'Devam et'}</Link>
        : <button type="button" className="button secondary" aria-expanded={open} onClick={() => setOpen(!open)}>{progress.runs > 0 ? 'Tekrar gir' : 'Sınava gir'}</button>}
    </div>
    {open && !progress.open && <form className="start-panel" onSubmit={(event) => { event.preventDefault(); begin(); }}>
      <fieldset disabled={locked}>
        <Field label="Süre (dakika)" hint={`Sınav başlayınca süre işler; süre dolunca sınav kendiliğinden biter. Önerilen: ${suggestedMinutes(exam)} dakika.`}>{(props) => <input {...props} type="number" min={1} max={180} required value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />}</Field>
        <div className="actions"><button className="button primary" type="submit">{start.isPending ? 'Sınav hazırlanıyor…' : 'Sınavı başlat'}</button><button className="button secondary" type="button" onClick={() => setOpen(false)}>Vazgeç</button></div>
      </fieldset>
      {start.isError && <ErrorNotice error={start.error} retry={() => begin()} />}
    </form>}
  </article>;
}

function byNewest(a: OfficialExam, b: OfficialExam) {
  return b.year - a.year || (Number(b.exam_number) || 0) - (Number(a.exam_number) || 0);
}

export function DenemeSinavlari() {
  const attempts = useRecentAttempts();
  const [params, setParams] = useSearchParams();
  const weapon = params.get('silah') === 'unarmed' ? 'unarmed' : 'armed';
  const exams = useOfficialExams({ scope: 'whole', weapon_status: weapon });
  const list = (exams.data ?? []).filter((exam) => !exam.subject && exam.weapon_status === weapon).sort(byNewest);
  return <>
    <PageIntro eyebrow="SINAVA GİR" title={vocabulary.deneme.title}><p>Geçmiş sınavın tamamını gerçek sınav düzeninde ve süreyle çöz. Silahlı sınav 125, silahsız sınav 100 sorudur; sonuçların kaydedilir.</p></PageIntro>
    <nav className="tab-bar" aria-label="Silah durumu">{([['armed', 'Silahlı sınav'], ['unarmed', 'Silahsız sınav']] as const).map(([value, label]) => <button key={value} type="button" className={`tab-button${weapon === value ? ' active' : ''}`} aria-pressed={weapon === value} onClick={() => setParams({ silah: value })}>{label}</button>)}</nav>
    {exams.isPending ? <Loading /> : exams.isError ? <ErrorNotice error={exams.error} retry={() => { void exams.refetch(); }} /> : list.length === 0 ? <section className="card empty"><h2>Henüz deneme sınavı yok</h2><p>Yayımlanmış bir deneme sınavı olduğunda burada görünür.</p></section>
      : <>{attempts.isError && <ErrorNotice error={attempts.error} retry={() => { void attempts.refetch(); }} />}<div className="sinav-list">{list.map((exam) => <ExamRow key={exam.id} exam={exam} title={`${exam.exam_number ? `${exam.exam_number}. ` : ''}Deneme Sınavı`} attempts={attempts.data?.data ?? []} />)}</div></>}
  </>;
}

export function DersSinavlari() {
  const subjects = useSubjects();
  const attempts = useRecentAttempts();
  const [params, setParams] = useSearchParams();
  const withExams = (subjects.data ?? []).filter((subject) => (subject.published_exam_count ?? 0) > 0);
  const selected = withExams.find((subject) => subject.id === params.get('ders')) ?? withExams[0];
  const exams = useOfficialExams({ scope: 'subject', subject_id: selected?.id }, !!selected);
  const list = [...(exams.data ?? [])].sort(byNewest);
  return <>
    <PageIntro eyebrow="DERS DERS ÇALIŞ" title={vocabulary.ders.title}><p>Bir ders seç ve o dersin geçmiş sınavlardaki sorularını sınav olarak çöz. Her sınav numarasının her dersi ayrı bir sınavdır.</p></PageIntro>
    {(!!selected && exams.isPending) || subjects.isPending ? <Loading /> : exams.isError || subjects.isError ? <ErrorNotice error={exams.error ?? subjects.error} retry={() => { if (selected) void exams.refetch(); void subjects.refetch(); }} /> : withExams.length === 0 ? <section className="card empty"><h2>Henüz ders sınavı yok</h2><p>Yayımlanmış bir ders sınavı olduğunda burada görünür.</p></section>
      : <>
        <nav className="tab-bar" aria-label="Ders">{withExams.map((subject) => <button key={subject.id} type="button" className={`tab-button${selected?.id === subject.id ? ' active' : ''}`} aria-pressed={selected?.id === subject.id} onClick={() => setParams({ ders: subject.id })}>{subject.name}<small> {subject.published_exam_count}</small></button>)}</nav>
        {attempts.isError && <ErrorNotice error={attempts.error} retry={() => { void attempts.refetch(); }} />}
        <div className="sinav-list">{list.map((exam) => <ExamRow key={exam.id} exam={exam} title={`${exam.exam_number ? `${exam.exam_number}. ` : ''}Ders Sınavı`} attempts={attempts.data?.data ?? []} />)}</div>
      </>}
  </>;
}

// One attempt of the history: the score first, then what the exam was, then how the answers split.
function ResultRow({ exam, to }: { exam: Summary; to: string }) {
  const result = exam.result;
  const expired = Date.parse(exam.deadline_at) <= Date.parse(exam.server_time);
  const title = exam.official_exam ? exam.official_exam.title : `${exam.question_count} soruluk deneme`;
  const kind = exam.official_exam ? (/Ders Sınavı/.test(exam.official_exam.title) ? 'DERS SINAVI' : 'DENEME SINAVI') : 'DENEME';
  const tone = result ? scoreBand(result.score_percent) : 'pending';
  const minutes = Math.round((result ? result.elapsed_seconds : exam.duration_seconds) / 60);
  return <Link className="history-row" to={to}>
    <span className={`result-score ${tone}`}>{result ? percent(result.score_percent) : expired ? 'Sonucu gör' : 'Devam et'}</span>
    <div className="history-main"><span className="eyebrow">{kind}</span><h3>{title}</h3><p>{dateLabel(exam.started_at)} · {minutes} dk · {exam.question_count} soru</p></div>
    <span className="history-arrow" aria-hidden="true">→</span>
    {result && <div className="history-split">
      <div className="bar" role="img" aria-label={`${result.correct} doğru, ${result.incorrect} yanlış, ${result.blank} boş`}><span className="bar-correct" style={{ width: `${(result.correct / exam.question_count) * 100}%` }} /><span className="bar-incorrect" style={{ width: `${(result.incorrect / exam.question_count) * 100}%` }} /></div>
      <ul className="legend"><li className="correct">{result.correct} doğru</li><li className="incorrect">{result.incorrect} yanlış</li><li className="blank">{result.blank} boş</li></ul>
    </div>}
  </Link>;
}

// Every exam the student entered, newest first; an open attempt continues, a finished one shows its result.
export function Sonuclarim() {
  const context = useStudyContext();
  const [cursor, setCursor] = useState<string>();
  const history = useQuery({ queryKey: ['exams', context.id, cursor], queryFn: ({ signal }) => api.request('get', '/api/v1/contexts/{context}/exam-attempts', { params: { context: context.id }, query: { cursor, per_page: 20 }, signal }) });
  return <>
    <PageIntro eyebrow="GİRDİĞİN SINAVLAR" title={vocabulary.results.title}><p>{context.kind === 'personal' ? 'Girdiğin deneme ve ders sınavları.' : `${context.name} alanında girdiğin deneme ve ders sınavları.`} Bir sınavı açıp tüm sorularını ve cevaplarını kaydırarak inceleyebilirsin.</p></PageIntro>
    {history.isPending ? <Loading /> : history.isError ? <ErrorNotice error={history.error} retry={() => { void history.refetch(); }} /> : history.data.data.length === 0 ? <section className="card empty"><h2>Henüz bir sınava girmedin</h2><p>Girdiğin sınavlar ve sonuçların burada saklanır.</p><Link className="button primary" to={`/study/${context.id}/deneme`}>Deneme sınavlarına git</Link></section>
      : <>
        <section className="history-list" aria-label="Sınav sonuçları">{history.data.data.map((exam) => <ResultRow key={exam.id} exam={exam} to={`/study/${context.id}/exams/${exam.id}`} />)}</section>
        <div className="pagination"><button className="button secondary" disabled={!history.data.links.prev} onClick={() => setCursor(cursorFromLink(history.data.links.prev))}>Önceki</button><button className="button secondary" disabled={!history.data.links.next} onClick={() => setCursor(cursorFromLink(history.data.links.next))}>Sonraki</button></div>
      </>}
  </>;
}
