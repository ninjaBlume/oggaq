import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PracticeAttempt, Question, QuestionVersion } from '@oggaq/shared-types';
import { ApiError, cursorFromLink } from '@oggaq/api-client';
import { api } from './api';
import { Disclosure, PageIntro, useStudyContext } from './App';
import { dateLabel, ErrorNotice, Loading, outcomeLabel } from './ui';

export function QuestionList() {
  const context = useStudyContext();
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [cursor, setCursor] = useState<string>();
  const [catalogCursor, setCatalogCursor] = useState<string>();
  const subjects = useQuery({ queryKey: ['subjects', catalogCursor], queryFn: ({ signal }) => api.request('get', '/api/v1/subjects', { signal, query: { per_page: 100, cursor: catalogCursor } }) });
  const [topicCursor, setTopicCursor] = useState<string>();
  const topics = useQuery({ queryKey: ['topics', subject, topicCursor], enabled: !!subject, queryFn: ({ signal }) => api.request('get', '/api/v1/subjects/{subject}/topics', { params: { subject }, query: { per_page: 100, cursor: topicCursor }, signal }) });
  const questions = useQuery({ queryKey: ['questions', subject, topic, cursor], queryFn: ({ signal }) => api.request('get', '/api/v1/questions', { signal, query: { subject_id: subject || undefined, topic_id: topic || undefined, per_page: 12, cursor } }) });
  return <><PageIntro eyebrow="DERS VE KONU ÇALIŞMASI" title="Bugün ne çalışalım?"><p>Dersini seç, bir soru aç. Cevabın ardından açıklamayı gör ve çalışmana devam et.</p></PageIntro><section className="filter-panel" aria-label="Soru filtreleri"><div className="filter-fields"><label>Ders<select aria-label="Ders" value={subject} onChange={(event) => { setSubject(event.target.value); setTopic(''); setCursor(undefined); setTopicCursor(undefined); }}><option value="">Tüm dersler</option>{subjects.data?.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Konu / alt konu<select aria-label="Konu / alt konu" disabled={!subject || topics.isPending} value={topic} onChange={(event) => { setTopic(event.target.value); setCursor(undefined); }}><option value="">Tüm konular</option>{topics.data?.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><span className="filter-note">{context.name}<small>Geçmişin bu çalışma alanında saklanır.</small></span></div>{subjects.isError && <ErrorNotice error={subjects.error} retry={() => { void subjects.refetch(); }} />}{topics.isError && <ErrorNotice error={topics.error} retry={() => { void topics.refetch(); }} />}{subjects.data && <CatalogPages label="Ders listesi" links={subjects.data.links} change={(next) => { setCatalogCursor(next); setSubject(''); setTopic(''); setCursor(undefined); }} />}{topics.data && <CatalogPages label="Konu listesi" links={topics.data.links} change={(next) => { setTopicCursor(next); setTopic(''); setCursor(undefined); }} />}</section>
    {questions.isPending ? <Loading /> : questions.isError ? <ErrorNotice error={questions.error} retry={() => { void questions.refetch(); }} /> : questions.data.data.length === 0 ? <section className="empty card"><span className="empty-symbol">◇</span><h2>Henüz yayımlanmış soru yok</h2><p>Bu seçimde soru bulunamadı. Başka bir ders seçebilir veya içerik yayımlandığında tekrar gelebilirsin.</p><button className="button secondary" onClick={() => { void questions.refetch(); }}>Listeyi yenile</button></section> : <><div className="section-heading"><h2>Çalışmaya hazır sorular</h2><span>Bu sayfada {questions.data.data.length} soru</span></div><div className="question-grid">{questions.data.data.map((question) => <QuestionCard key={`${context.id}-${question.id}-${question.version.id}`} question={question} refresh={() => { void questions.refetch(); }} subjectName={subjects.data?.data.find((item) => item.id === question.version.subject_id)?.name} />)}</div><Pagination links={questions.data.links} change={setCursor} /></>}
  </>;
}
function CatalogPages({ label, links, change }: { label: string; links: { prev: string | null; next: string | null }; change: (cursor?: string) => void }) {
  if (!links.prev && !links.next) return null;
  return <div className="catalog-pages"><span>{label}</span><button disabled={!links.prev} onClick={() => change(cursorFromLink(links.prev))}>Önceki kayıtlar</button><button disabled={!links.next} onClick={() => change(cursorFromLink(links.next))}>Sonraki kayıtlar</button></div>;
}
function QuestionCard({ question, subjectName, refresh }: { question: Question; subjectName?: string; refresh: () => void }) {
  const context = useStudyContext();
  const navigate = useNavigate();
  const id = useRef<string | null>(null);
  const start = useMutation({ mutationFn: () => {
    id.current ??= crypto.randomUUID();
    return api.request('post', '/api/v1/contexts/{context}/practice-attempts', { params: { context: context.id }, body: { id: id.current, question_id: question.id, question_version_id: question.version.id } });
  }, onSuccess: (response) => navigate(`/study/${context.id}/attempts/${response.data.id}`) });
  const changed = start.error instanceof ApiError && start.error.problem.code === 'question_changed';
  return <article className="question-card"><div className="question-meta"><span>{subjectName ?? 'Ders çalışması'}</span><small>{question.version.options.length} seçenek</small></div><h3>{question.version.stem}</h3><div className="question-card-bottom"><span>Sürüm {question.version.version}</span><button className="button primary" disabled={start.isPending || changed} onClick={() => start.mutate()}>{start.isPending ? 'Açılıyor…' : 'Soruyu çöz'}<span aria-hidden="true">→</span></button></div>{start.isError && <ErrorNotice error={start.error} retry={changed ? refresh : () => start.mutate()} />}</article>;
}
function Pagination({ links, change }: { links: { prev: string | null; next: string | null }; change: (cursor?: string) => void }) {
  return <nav className="pagination" aria-label="Sayfalama"><button className="button secondary" disabled={!links.prev} onClick={() => change(cursorFromLink(links.prev))}>← Önceki sayfa</button><button className="button secondary" disabled={!links.next} onClick={() => change(cursorFromLink(links.next))}>Sonraki sayfa →</button></nav>;
}
export function History() {
  const context = useStudyContext();
  const [cursor, setCursor] = useState<string>();
  const history = useQuery({ queryKey: ['history', context.id, cursor], queryFn: ({ signal }) => api.request('get', '/api/v1/contexts/{context}/practice-attempts', { params: { context: context.id }, query: { per_page: 20, cursor }, signal }) });
  return <><PageIntro eyebrow="ADIM ADIM İLERLE" title="Çalışma geçmişim"><p>{context.name} alanındaki çalışmaların. Yarım kalan soruna dön veya önceki cevabını incele.</p></PageIntro>{history.isPending ? <Loading /> : history.isError ? <ErrorNotice error={history.error} retry={() => { void history.refetch(); }} /> : history.data.data.length === 0 ? <section className="card empty"><h2>İlk çalışmana hazır mısın?</h2><p>Çözdüğün sorular ve yarım kalan çalışmaların burada görünecek.</p><Link className="button primary" to={`/study/${context.id}/questions`}>Soru çözmeye başla</Link></section> : <><section className="history-list" aria-label="Çözüm geçmişi">{history.data.data.map((attempt) => <Link key={attempt.id} to={`/study/${context.id}/attempts/${attempt.id}`} className="history-row"><span className={`result-pill ${attempt.outcome}`}>{outcomeLabel[attempt.outcome]}</span><div><h2>{attempt.question.stem}</h2><p>{dateLabel(attempt.answered_at ?? attempt.created_at)} · Sürüm {attempt.question.version}</p></div><span aria-hidden="true">→</span></Link>)}</section><Pagination links={history.data.links} change={setCursor} /></>}</>;
}
export function Practice() {
  const context = useStudyContext();
  const { attempt: id = '' } = useParams();
  const query = useQuery({ queryKey: ['attempt', context.id, id], queryFn: ({ signal }) => api.request('get', '/api/v1/contexts/{context}/practice-attempts/{attempt}', { params: { context: context.id, attempt: id }, signal }) });
  if (query.isPending) return <Loading />;
  if (query.isError) return <><Link className="back-link" to={`/study/${context.id}/questions`}>← Sorulara dön</Link><ErrorNotice error={query.error} retry={() => { void query.refetch(); }} /></>;
  return <PracticeQuestion key={query.data.data.id} attempt={query.data.data} reload={() => { void query.refetch(); }} />;
}
function PracticeQuestion({ attempt, reload }: { attempt: PracticeAttempt; reload: () => void }) {
  const context = useStudyContext();
  const cache = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmSkip, setConfirmSkip] = useState(false);
  // After an uncertain network result, retries retain exactly the submitted selection.
  const [submission, setSubmission] = useState<{ option: string | null } | null>(null);
  const answered = attempt.outcome !== 'pending';
  const answer = useMutation({ mutationFn: (option: string | null) => api.request('post', '/api/v1/contexts/{context}/practice-attempts/{attempt}/answer', { params: { context: context.id, attempt: attempt.id }, body: { selected_option_id: option } }), onSuccess: (response) => {
    cache.setQueryData(['attempt', context.id, attempt.id], response);
    void cache.invalidateQueries({ queryKey: ['history', context.id] });
    setSubmission(null); setConfirmSkip(false);
  } });
  function submit(option: string | null) { setSubmission({ option }); answer.mutate(option); }
  const locked = answered || answer.isPending || submission !== null;
  const conflict = answer.error instanceof ApiError && answer.error.status === 409;
  return <><Link className="back-link" to={`/study/${context.id}/questions`}>← Sorulara dön</Link><PageIntro eyebrow={context.name.toLocaleUpperCase('tr')} title={answered ? 'Çözümünü incele' : 'Bir soru, bir adım'}><p>{answered ? 'Bu sonuç, çalıştığın soru sürümüyle birlikte saklandı.' : 'Bir seçenek seç. Cevabını gönderdiğinde sonucu ve açıklamayı görebilirsin.'}</p></PageIntro><div className="practice-layout"><section className="card practice-card"><div className="question-meta"><span>Ders çalışması</span><span>Sürüm {attempt.question.version}</span></div><h2 className="question-stem">{attempt.question.stem}</h2><fieldset className="answer-options" disabled={locked}><legend className="sr-only">Cevap seçenekleri</legend>{attempt.question.options.map((option) => {
    const correct = answered && attempt.feedback?.correct_option_id === option.id;
    const picked = answered ? attempt.selected_option_id === option.id : selected === option.id;
    return <label key={option.id} className={`answer-option ${correct ? 'correct-option' : picked && answered ? 'incorrect-option' : picked ? 'selected-option' : ''}`}><input type="radio" name="answer" value={option.id} checked={picked} onChange={() => setSelected(option.id)} /><span className="option-letter">{String.fromCharCode(64 + option.position)}</span><span className="option-text">{option.text}</span>{answered && <span className="option-note">{correct ? 'Doğru cevap' : picked ? 'Senin cevabın' : ''}</span>}</label>;
  })}</fieldset>{!answered && <div className="answer-actions"><button className="button primary" disabled={!selected || locked} onClick={() => submit(selected)}>{answer.isPending ? 'Kaydediliyor…' : 'Cevabımı kontrol et'}</button><button className="text-button" disabled={locked} onClick={() => setConfirmSkip(true)}>Boş bırak</button></div>}{confirmSkip && !answered && <div className="notice skip-confirm"><p>Bu soruyu boş bırakarak tamamlamak istiyor musun?</p><div className="actions"><button className="button secondary" disabled={locked} onClick={() => setConfirmSkip(false)}>Soruyu çözmeye devam et</button><button className="button primary" disabled={locked} onClick={() => submit(null)}>Boş olarak kaydet</button></div></div>}{answer.isError && <><ErrorNotice error={answer.error} retry={conflict ? reload : submission ? () => answer.mutate(submission.option) : undefined} />{!conflict && <p className="muted">Cevap sunucuya ulaşmış olabilir. Aynı cevabı yeniden gönder veya kaydı yenileyerek sonucu kontrol et.</p>}<button className="text-button" onClick={reload}>Kaydı yenile</button></>}{answered && <section className={`feedback ${attempt.outcome}`} role="status"><span className="eyebrow">CEVABININ SONUCU</span><h3>{outcomeLabel[attempt.outcome]}</h3><p>{attempt.outcome === 'correct' ? 'Güzel bir adım. Açıklamayı inceleyerek pekiştir.' : attempt.outcome === 'skipped' ? 'Doğru cevabı ve açıklamayı inceleyerek öğrenmeye devam et.' : 'Bu sorudan öğrenebilirsin. Doğru seçenek yukarıda işaretli.'}</p>{attempt.feedback?.explanation && <><h4>Açıklama</h4><p className="explanation">{attempt.feedback.explanation}</p></>}</section>}</section><aside className="practice-aside"><div className="card"><span className="eyebrow">ÇALIŞMAN KAYITLI</span><h3>Kendi hızında ilerle</h3><p>{answered ? 'Sonucun çalışma geçmişinde. Yeni bir soruyla devam edebilirsin.' : 'Bu çalışma açıldı. Sayfadan ayrılsan da geçmişinden aynı soruya dönebilirsin.'}</p><Link className="button primary full" to={`/study/${context.id}/questions`}>Başka soru seç</Link><Link className="button secondary full" to={`/study/${context.id}/history`}>Geçmişimi aç</Link></div><Source question={attempt.question} /></aside></div></>;
}
function Source({ question }: { question: QuestionVersion }) {
  if (!question.source) return null;
  return <div className="card source-card"><Disclosure title="Soru kaynağı"><p>{question.source.title}</p>{question.source.citation && <p className="muted">{question.source.citation}</p>}{question.source.url && <a href={question.source.url} target="_blank" rel="noreferrer">Kaynağı aç ↗</a>}</Disclosure></div>;
}
