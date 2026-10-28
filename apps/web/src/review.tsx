import { ResultRow } from './sinavlar';
import { cursorFromLink } from '@oggaq/api-client';
import { stageExamLaunch } from './exam-launch';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError } from '@oggaq/api-client';
import type { components } from '@oggaq/shared-types';
import { randomId, vocabulary } from '@oggaq/study-core';
import { api } from './api';
import { PageIntro, useStudyContext } from './App';
import { ErrorNotice, Field, Loading } from './ui';

type Kind = 'incorrect' | 'blank' | 'favorite';
type StartInput = components['schemas']['StartExamInput'];
const kinds: { id: Kind; label: string; hint: string; empty: string }[] = [
  { id: 'incorrect', label: 'Yanlışlarım', hint: 'Son cevabın yanlış olan sorular. Doğru çözdüğün soru listeden çıkar.', empty: 'Şu an tekrar edeceğin yanlış soru yok.' },
  { id: 'blank', label: 'Boş bıraktıklarım', hint: 'Son cevabın boş olan sorular. Çözdüğünde listeden çıkar.', empty: 'Boş bıraktığın soru yok.' },
  { id: 'favorite', label: 'Favorilerim', hint: 'Sınav sonucunda favoriye eklediğin sorular.', empty: 'Henüz favori soru eklemedin.' },
];

// Timed review uses the same engine but owns a separate history and does not count as an exam.
export function Review() {
  const context = useStudyContext();
  const [cursor, setCursor] = useState<string>();
  const history = useQuery({ queryKey: ["exams", context.id, "review", cursor], queryFn: ({ signal }) => api.request("get", "/api/v1/contexts/{context}/exam-attempts", { params: { context: context.id }, query: { scope: "review", per_page: 10, cursor }, signal }) });
  const summary = useQuery({ queryKey: ['review', context.id, 'summary'], queryFn: ({ signal }) => api.request('get', '/api/v1/contexts/{context}/review-summary', { params: { context: context.id }, signal }) });
  const reviews = history.data?.data.filter(item => item.review_kind != null) ?? [];
  return <>
    <PageIntro eyebrow="HATALARINDAN ÖĞREN" title={vocabulary.review.title}><p>Yanlış, boş ve favori sorularını yeniden çöz. Çözümlerin soru ve doğruluk istatistiğine katılır; deneme sayısını ve ortalamasını değiştirmez.</p></PageIntro>
    {summary.isPending ? <Loading /> : summary.isError ? <ErrorNotice error={summary.error} retry={() => { void summary.refetch(); }} /> : <div className="sinav-list">{kinds.map((kind) => <ReviewExam key={kind.id} kind={kind} count={summary.data.data[kind.id]} />)}</div>}
    <h2>Tekrar çalışmaların</h2>
    {history.isPending ? <Loading /> : history.isError ? <ErrorNotice error={history.error} retry={() => { void history.refetch(); }} /> : reviews.length === 0 ? <p>Tekrar çalışmaların ve kaldığın yer burada görünür.</p> : <section className="history-list" aria-label="Tekrar geçmişi">{reviews.map(item => <ResultRow key={item.id} exam={item} to={`/study/${context.id}/exams/${item.id}`} />)}</section>}
    {history.data && reviews.length > 0 && (history.data.links.prev || history.data.links.next) && <div className="pagination"><button className="button secondary" disabled={!history.data.links.prev} onClick={() => setCursor(cursorFromLink(history.data.links.prev))}>Önceki</button><button className="button secondary" disabled={!history.data.links.next} onClick={() => setCursor(cursorFromLink(history.data.links.next))}>Sonraki</button></div>}
  </>;
}

function ReviewExam({ kind, count }: { kind: (typeof kinds)[number]; count: number }) {
  const context = useStudyContext();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState(() => Math.min(count, 20));
  const [minutes, setMinutes] = useState(() => Math.max(5, Math.ceil(Math.min(count, 20) * 1.2)));
  const submission = useRef<StartInput | null>(null);
  const start = useMutation({
    mutationFn: (body: StartInput) => api.request('post', '/api/v1/contexts/{context}/exam-attempts', { params: { context: context.id }, body }),
    onSuccess: (response) => {
      stageExamLaunch(cache, context.id, response);
      void cache.invalidateQueries({ queryKey: ['exams', context.id] });
      navigate(`/study/${context.id}/exams/${response.data.id}`);
    },
    // A rejected start (409/422) is not a lost response: the next try is a new attempt id.
    onError: (error) => { if (error instanceof ApiError && [409, 422].includes(error.status)) submission.current = null; },
  });
  function begin() {
    submission.current ??= { id: randomId(), review_kind: kind.id, question_count: questions, duration_seconds: Math.round(minutes) * 60 };
    start.mutate(submission.current);
  }
  const locked = start.isPending || submission.current !== null;
  return <article className="card sinav-row card-tone-sand">
    <div className="sinav-main">
      <h2>{kind.label}</h2>
      <p>{count === 0 ? kind.empty : `${count} soru · ${kind.hint}`}</p>
    </div>
    <div className="sinav-action"><button type="button" className="button primary" disabled={count === 0} aria-expanded={open} onClick={() => setOpen(!open)}>Tekrar sınavına gir</button></div>
    {open && count > 0 && <form className="start-panel" onSubmit={(event) => { event.preventDefault(); begin(); }}>
      <fieldset disabled={locked}>
        <Field label="Soru sayısı" hint={`En çok ${Math.min(count, 100)} soru.`}>{(props) => <input {...props} type="number" min={1} max={Math.min(count, 100)} required value={questions} onChange={(event) => { const next = Number(event.target.value); setQuestions(next); setMinutes(Math.max(5, Math.ceil(next * 1.2))); }} />}</Field>
        <Field label="Süre (dakika)" hint="Soru başına 1,2 dakika önerilir.">{(props) => <input {...props} type="number" min={1} max={180} required value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />}</Field>
        <div className="actions"><button className="button primary" type="submit">{start.isPending ? 'Sınav hazırlanıyor…' : 'Sınavı başlat'}</button><button className="button secondary" type="button" onClick={() => setOpen(false)}>Vazgeç</button></div>
      </fieldset>
      {start.isError && <ErrorNotice error={start.error} retry={() => begin()} />}
    </form>}
  </article>;
}
