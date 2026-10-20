import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PracticeAttempt, Question, QuestionVersion } from '@oggaq/shared-types';
import { examLabel, examSummary } from '@oggaq/study-core';
import { ApiError } from '@oggaq/api-client';
import { api } from './api';
import { Disclosure, PageIntro, useStudyContext } from './App';
import { ErrorNotice, Loading, outcomeLabel } from './ui';

export function QuestionCard({ question, subjectName, refresh }: { question: Question; subjectName?: string; refresh: () => void }) {
  const context = useStudyContext();
  const navigate = useNavigate();
  const id = useRef<string | null>(null);
  const start = useMutation({ mutationFn: () => {
    id.current ??= crypto.randomUUID();
    return api.request('post', '/api/v1/contexts/{context}/practice-attempts', { params: { context: context.id }, body: { id: id.current, question_id: question.id, question_version_id: question.version.id } });
  }, onSuccess: (response) => navigate(`/study/${context.id}/attempts/${response.data.id}`) });
  const changed = start.error instanceof ApiError && start.error.problem.code === 'question_changed';
  return <article className="question-card"><div className="question-meta"><span>Ders: {subjectName ?? '—'}</span><small>{question.version.options.length} seçenek</small></div><p className="question-exams" title={question.exams.map((item) => item.title).join('\n')}>Sınav: {examSummary(question.exams)}</p><h3>{question.version.stem}</h3><div className="question-card-bottom"><span>Sürüm {question.version.version}</span><button className="button primary" disabled={start.isPending || changed} onClick={() => start.mutate()}>{start.isPending ? 'Açılıyor…' : 'Soruyu çöz'}<span aria-hidden="true">→</span></button></div>{start.isError && <ErrorNotice error={start.error} retry={changed ? refresh : () => start.mutate()} />}</article>;
}
export function Practice() {
  const context = useStudyContext();
  const { attempt: id = '' } = useParams();
  const query = useQuery({ queryKey: ['attempt', context.id, id], queryFn: ({ signal }) => api.request('get', '/api/v1/contexts/{context}/practice-attempts/{attempt}', { params: { context: context.id, attempt: id }, signal }) });
  if (query.isPending) return <Loading />;
  if (query.isError) return <><Link className="back-link" to={`/study/${context.id}/review`}>← Tekrar listelerime dön</Link><ErrorNotice error={query.error} retry={() => { void query.refetch(); }} /></>;
  return <PracticeQuestion key={query.data.data.id} attempt={query.data.data} reload={() => { void query.refetch(); }} />;
}
function PracticeQuestion({ attempt, reload }: { attempt: PracticeAttempt; reload: () => void }) {
  const context = useStudyContext();
  const cache = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmSkip, setConfirmSkip] = useState(false);
  const subjects = useQuery({ queryKey: ['subjects', undefined], queryFn: ({ signal }) => api.request('get', '/api/v1/subjects', { signal, query: { per_page: 100 } }) });
  const subjectName = subjects.data?.data.find((item) => item.id === attempt.question.subject_id)?.name;
  // After an uncertain network result, retries retain exactly the submitted selection.
  const [submission, setSubmission] = useState<{ option: string | null } | null>(null);
  const answered = attempt.outcome !== 'pending';
  const answer = useMutation({ mutationFn: (option: string | null) => api.request('post', '/api/v1/contexts/{context}/practice-attempts/{attempt}/answer', { params: { context: context.id, attempt: attempt.id }, body: { selected_option_id: option } }), onSuccess: (response) => {
    cache.setQueryData(['attempt', context.id, attempt.id], response);
    void cache.invalidateQueries({ queryKey: ['history', context.id] });
    void cache.invalidateQueries({ queryKey: ['stats', context.id] });
    void cache.invalidateQueries({ queryKey: ['review', context.id] });
    setSubmission(null); setConfirmSkip(false);
  } });
  // Favorite state belongs to the study context and is idempotent on the server.
  const favorite = useMutation({ mutationFn: (next: boolean) => next
    ? api.request('put', '/api/v1/contexts/{context}/favorites/{question}', { params: { context: context.id, question: attempt.question_id } })
    : api.request('delete', '/api/v1/contexts/{context}/favorites/{question}', { params: { context: context.id, question: attempt.question_id } }),
  onSuccess: (response) => {
    cache.setQueryData<{ data: PracticeAttempt }>(['attempt', context.id, attempt.id], (old) => old && { data: { ...old.data, is_favorite: response.data.favorite } });
    void cache.invalidateQueries({ queryKey: ['review', context.id] });
  } });
  function submit(option: string | null) { setSubmission({ option }); answer.mutate(option); }
  const locked = answered || answer.isPending || submission !== null;
  const conflict = answer.error instanceof ApiError && answer.error.status === 409;
  return <><Link className="back-link" to={`/study/${context.id}/review`}>← Tekrar listelerime dön</Link><PageIntro eyebrow={context.name.toLocaleUpperCase('tr')} title={answered ? 'Çözümünü incele' : 'Bir soru, bir adım'}><p>{answered ? 'Bu sonuç, çalıştığın soru sürümüyle birlikte saklandı.' : 'Bir seçenek seç. Cevabını gönderdiğinde sonucu ve açıklamayı görebilirsin.'}</p></PageIntro><div className="practice-layout"><section className="card practice-card"><div className="question-meta"><span>Ders: {subjectName ?? '—'}</span><span>Sürüm {attempt.question.version}</span></div><div className="exam-chips" aria-label="Çıkmış sınavlar"><span>Sınav:</span>{attempt.exams.length === 0 ? <span className="muted">Çıkmış sınavlarda yok</span> : attempt.exams.map((item) => <span key={item.id} className="chip" title={`${item.title} — soru ${item.position}`}>{examLabel(item)}</span>)}</div><div className="favorite-row"><button className="text-button" aria-pressed={attempt.is_favorite} disabled={favorite.isPending} onClick={() => favorite.mutate(!attempt.is_favorite)}>{attempt.is_favorite ? '★ Favorilerde' : '☆ Favoriye ekle'}</button></div>{favorite.isError && <ErrorNotice error={favorite.error} retry={() => favorite.mutate(!attempt.is_favorite)} />}<h2 className="question-stem">{attempt.question.stem}</h2><fieldset className="answer-options" disabled={locked}><legend className="sr-only">Cevap seçenekleri</legend>{attempt.question.options.map((option) => {
    const correct = answered && attempt.feedback?.correct_option_id === option.id;
    const picked = answered ? attempt.selected_option_id === option.id : selected === option.id;
    return <label key={option.id} className={`answer-option ${correct ? 'correct-option' : picked && answered ? 'incorrect-option' : picked ? 'selected-option' : ''}`}><input type="radio" name="answer" value={option.id} checked={picked} onChange={() => setSelected(option.id)} /><span className="option-letter">{String.fromCharCode(64 + option.position)}</span><span className="option-text">{option.text}</span>{answered && <span className="option-note">{correct ? 'Doğru cevap' : picked ? 'Senin cevabın' : ''}</span>}</label>;
  })}</fieldset>{!answered && <div className="answer-actions"><button className="button primary" disabled={!selected || locked} onClick={() => submit(selected)}>{answer.isPending ? 'Kaydediliyor…' : 'Cevabımı kontrol et'}</button><button className="text-button" disabled={locked} onClick={() => setConfirmSkip(true)}>Boş bırak</button></div>}{confirmSkip && !answered && <div className="notice skip-confirm"><p>Bu soruyu boş bırakarak tamamlamak istiyor musun?</p><div className="actions"><button className="button secondary" disabled={locked} onClick={() => setConfirmSkip(false)}>Soruyu çözmeye devam et</button><button className="button primary" disabled={locked} onClick={() => submit(null)}>Boş olarak kaydet</button></div></div>}{answer.isError && <><ErrorNotice error={answer.error} retry={conflict ? reload : submission ? () => answer.mutate(submission.option) : undefined} />{!conflict && <p className="muted">Cevap sunucuya ulaşmış olabilir. Aynı cevabı yeniden gönder veya kaydı yenileyerek sonucu kontrol et.</p>}<button className="text-button" onClick={reload}>Kaydı yenile</button></>}{answered && <section className={`feedback ${attempt.outcome}`} role="status"><span className="eyebrow">CEVABININ SONUCU</span><h3>{outcomeLabel[attempt.outcome]}</h3><p>{attempt.outcome === 'correct' ? 'Güzel bir adım. Açıklamayı inceleyerek pekiştir.' : attempt.outcome === 'skipped' ? 'Doğru cevabı ve açıklamayı inceleyerek öğrenmeye devam et.' : 'Bu sorudan öğrenebilirsin. Doğru seçenek yukarıda işaretli.'}</p>{attempt.feedback?.explanation && <><h4>Açıklama</h4><p className="explanation">{attempt.feedback.explanation}</p></>}</section>}</section><aside className="practice-aside"><div className="card"><span className="eyebrow">ÇALIŞMAN KAYITLI</span><h3>Kendi hızında ilerle</h3><p>{answered ? 'Sonucun kaydedildi; tekrar listelerin buna göre güncellenir.' : 'Bu çalışma açıldı. Sayfadan ayrılsan da tekrar listenden aynı soruya dönebilirsin.'}</p><Link className="button primary full" to={`/study/${context.id}/review`}>Tekrar listeme dön</Link><Link className="button secondary full" to={`/study/${context.id}/deneme`}>Sınavlara git</Link></div><Source question={attempt.question} /></aside></div></>;
}
function Source({ question }: { question: QuestionVersion }) {
  if (!question.source) return null;
  return <div className="card source-card"><Disclosure title="Soru kaynağı"><p>{question.source.title}</p>{question.source.citation && <p className="muted">{question.source.citation}</p>}{question.source.url && <a href={question.source.url} target="_blank" rel="noreferrer">Kaynağı aç ↗</a>}</Disclosure></div>;
}
