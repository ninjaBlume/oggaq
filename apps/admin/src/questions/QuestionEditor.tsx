import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router-dom';
import { ApiError, cursorFromLink } from '@oggaq/api-client';
import type { AdminQuestion, AdminQuestionVersion, Catalogs } from '@oggaq/shared-types';
import { api, loadCatalogs } from '../api';
import { ErrorNotice, Field, Icon, Loading, Modal, Status, dateLabel, useNotify } from '../ui';
import { initialEditor, publicationRequirements, removeOption, toQuestionInput } from './editor-state';
import type { EditorState } from './editor-state';
import { Preview, versionState } from './Preview';

export function QuestionPage() {
  const { questionId } = useParams();
  const catalogs = useQuery({ queryKey: ['catalogs'], queryFn: ({ signal }) => loadCatalogs(signal) });
  const question = useQuery({ queryKey: ['question', questionId], enabled: !!questionId, queryFn: ({ signal }) => api.request('get', '/api/v1/admin/questions/{question}', { params: { question: questionId! }, signal }) });
  if (catalogs.isPending || (questionId && question.isPending)) return <Loading text="Editör hazırlanıyor…" />;
  if (catalogs.isError) return <ErrorNotice error={catalogs.error} retry={() => { void catalogs.refetch(); }} />;
  if (questionId && question.isError) return <><Link className="back-link" to="/questions"><Icon name="back" size={16} />Soru bankası</Link><ErrorNotice error={question.error} retry={() => { void question.refetch(); }} /></>;
  return <QuestionEditor key={questionId ?? 'new'} question={question.data?.data} catalogs={catalogs.data} />;
}

function QuestionEditor({ question, catalogs }: { question?: AdminQuestion; catalogs: Catalogs }) {
  const [snapshot, setSnapshot] = useState(question);
  const [form, setForm] = useState(() => initialEditor(question?.latest_version));
  const [baseline, setBaseline] = useState(() => JSON.stringify(toQuestionInput(form)));
  const [preview, setPreview] = useState<'preview' | 'publish' | null>(null);
  const [confirmReload, setConfirmReload] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyPreview, setHistoryPreview] = useState<AdminQuestionVersion | null>(null);
  const allowNavigation = useRef(false);
  const cache = useQueryClient();
  const navigate = useNavigate();
  const notify = useNotify();
  const dirty = JSON.stringify(toQuestionInput(form)) !== baseline;
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && !allowNavigation.current && currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload((event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

  function accept(record: AdminQuestion) {
    const next = initialEditor(record.latest_version);
    setSnapshot(record); setForm(next); setBaseline(JSON.stringify(toQuestionInput(next)));
    cache.setQueryData(['question', record.id], { data: record });
    void cache.invalidateQueries({ queryKey: ['questions'] });
    void cache.invalidateQueries({ queryKey: ['question-history', record.id] });
  }

  const save = useMutation({ mutationFn: async () => {
    const body = toQuestionInput(form);
    return snapshot
      ? (await api.request('patch', '/api/v1/admin/questions/{question}', { params: { question: snapshot.id }, body: { ...body, base_version: snapshot.revision } })).data
      : (await api.request('post', '/api/v1/admin/questions', { body })).data;
  }, onSuccess: (record) => {
    accept(record); notify(snapshot ? 'Yeni taslak sürümü kaydedildi.' : 'Soru taslağı oluşturuldu.');
    if (!snapshot) { allowNavigation.current = true; void navigate(`/questions/${record.id}`, { replace: true }); }
  } });
  const publish = useMutation({ mutationFn: async () => (await api.request('post', '/api/v1/admin/questions/{question}/publish', {
    params: { question: snapshot!.id }, body: { base_version: snapshot!.revision },
  })).data, onSuccess: (record) => { accept(record); setPreview(null); notify('Soru yayımlandı.'); }, onError: () => setPreview(null) });
  const reload = useMutation({ mutationFn: async () => (await api.request('get', '/api/v1/admin/questions/{question}', { params: { question: snapshot!.id } })).data,
    onSuccess: (record) => { accept(record); save.reset(); publish.reset(); setConfirmReload(false); notify('Sunucudaki son sürüm yüklendi.'); },
  });
  const history = useInfiniteQuery({ queryKey: ['question-history', snapshot?.id], enabled: !!snapshot && historyOpen,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => api.request('get', '/api/v1/admin/questions/{question}/versions', { params: { question: snapshot!.id }, signal, query: { per_page: 20, cursor: pageParam } }),
    getNextPageParam: (page) => cursorFromLink(page.links.next),
  });
  const busy = save.isPending || publish.isPending || reload.isPending;
  const mutationError = save.error ?? publish.error ?? reload.error;
  const conflict = mutationError instanceof ApiError && mutationError.status === 409;
  const fieldError = (name: string) => mutationError instanceof ApiError ? mutationError.field(name) : undefined;
  const missing = publicationRequirements(form);
  const topics = catalogs.topics.filter((topic) => topic.subject_id === form.subject_id);
  function patch<K extends keyof EditorState>(key: K, value: EditorState[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function submit(event: FormEvent) { event.preventDefault(); if (!busy) { publish.reset(); reload.reset(); save.mutate(); } }
  const canPublish = !!snapshot && !dirty && snapshot.has_pending_changes && missing.length === 0;

  return <><Link className="back-link" to="/questions"><Icon name="back" size={16} />Soru bankasına dön</Link><header className="page-heading editor-heading"><div><span className="eyebrow">SORU EDİTÖRÜ</span><h1>{snapshot ? 'Soruyu düzenle' : 'Yeni soru oluştur'}</h1><p className="muted">{snapshot ? `Son taslak: sürüm ${snapshot.latest_version.version} · ${dateLabel(snapshot.updated_at)}` : 'Bir taslak hazırlayın; hazır olduğunda ayrı olarak yayımlayın.'}</p></div>{snapshot && <Status published={snapshot.status === 'published'} pending={snapshot.has_pending_changes} />}</header>
    {mutationError && <ErrorNotice error={mutationError} />}{conflict && <div className="notice conflict"><div><strong>Yazdıklarınız editörde korunuyor.</strong><p>Başka bir işlem bu soruyu güncelledi. Son sürümü yüklemek yerel değişikliklerinizi kaldırır.</p></div><button className="button secondary" onClick={() => setConfirmReload(true)}>Sunucudaki sürümü yükle</button></div>}
    {!catalogs.subjects.length && <div className="notice info"><p>Soru hazırlamak için önce bir ders oluşturun.</p><Link className="button secondary small" to="/catalogs">Kataloglara git</Link></div>}
    <form onSubmit={submit} className="editor-layout"><fieldset className="editor-main" disabled={busy}>
      <section className="card editor-card"><div className="section-title"><span className="step-number">1</span><div><h2>Sınıflandırma</h2><p className="muted small-text">Sorunun bulunacağı ders ve konu.</p></div></div><div className="form-grid">
        <Field label="Ders" name="subject_id" error={fieldError('subject_id')}>{(props) => <select {...props} required value={form.subject_id} onChange={(event) => setForm((current) => ({ ...current, subject_id: event.target.value, topic_id: '' }))}><option value="">Ders seçin</option>{catalogs.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
        <Field label="Konu / alt konu" name="topic_id" error={fieldError('topic_id')}>{(props) => <select {...props} value={form.topic_id} disabled={!form.subject_id} onChange={(event) => patch('topic_id', event.target.value)}><option value="">Konu seçilmedi</option>{topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.parent_id ? `${topics.find((parent) => parent.id === topic.parent_id)?.name ?? 'Üst konu'} / ` : ''}{topic.name}</option>)}</select>}</Field>
        <Field label="Sınav türü" name="exam_type_id" error={fieldError('exam_type_id')}>{(props) => <select {...props} value={form.exam_type_id} onChange={(event) => patch('exam_type_id', event.target.value)}><option value="">Sınav türü seçilmedi</option>{catalogs['exam-types'].map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
        <Field label="Kaynak" name="source_id" error={fieldError('source_id')} hint="Yayımlamak için kaynak seçilmesi gerekir.">{(props) => <select {...props} value={form.source_id} onChange={(event) => patch('source_id', event.target.value)}><option value="">Kaynak seçilmedi</option>{catalogs['question-sources'].map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}</Field>
      </div></section>
      <section className="card editor-card"><div className="section-title"><span className="step-number">2</span><div><h2>Soru ve seçenekler</h2><p className="muted small-text">Tek bir doğru cevap belirleyin.</p></div></div><Field label="Soru metni" name="stem" error={fieldError('stem')}>{(props) => <textarea {...props} required rows={5} maxLength={20000} value={form.stem} onChange={(event) => patch('stem', event.target.value)} placeholder="Soruyu buraya yazın…" />}</Field>
        <div className="options-heading"><h3>Cevap seçenekleri</h3><span className="muted small-text">{form.options.length} / 10</span></div><div className="option-editor">{form.options.map((option, index) => <div className="option-row" key={option.key}><label className="answer-radio" title="Doğru cevap"><input type="radio" name="correct-answer" aria-label={`${String.fromCharCode(65 + index)} seçeneği doğru cevap`} checked={form.correct === index} onChange={() => patch('correct', index)} /><span>{String.fromCharCode(65 + index)}</span></label><Field label={`${String.fromCharCode(65 + index)} seçeneği`} name={`options.${index}`} error={fieldError(`options.${index}`)}>{(props) => <input {...props} required maxLength={4000} value={option.text} onChange={(event) => patch('options', form.options.map((value, position) => position === index ? { ...value, text: event.target.value } : value))} placeholder="Seçenek metni" />}</Field><button type="button" className="icon-button remove-option" aria-label={`${String.fromCharCode(65 + index)} seçeneğini sil`} onClick={() => setForm((current) => removeOption(current, index))}><Icon name="close" size={18} /></button></div>)}</div>
        {fieldError('options') && <p className="field-error">{fieldError('options')}</p>}{fieldError('correct_option_position') && <p className="field-error">{fieldError('correct_option_position')}</p>}<div className="option-footer"><button type="button" className="button secondary small" disabled={form.options.length >= 10} onClick={() => patch('options', [...form.options, { key: crypto.randomUUID(), text: '' }])}><Icon name="plus" size={16} />Seçenek ekle</button><span className="muted small-text">Doğru cevabı soldaki daireden seçin.</span></div>
      </section><section className="card editor-card"><div className="section-title"><span className="step-number">3</span><div><h2>Cevap açıklaması</h2><p className="muted small-text">Yönetici önizlemesi için açıklama ekleyebilirsiniz.</p></div></div><Field label="Açıklama" name="explanation" error={fieldError('explanation')}>{(props) => <textarea {...props} rows={4} maxLength={20000} value={form.explanation} onChange={(event) => patch('explanation', event.target.value)} placeholder="Doğru cevabın gerekçesi…" />}</Field></section>
    </fieldset><aside className="editor-aside"><section className="card publish-card"><span className="eyebrow">YAYIN KONTROLÜ</span><h2>{snapshot?.status === 'published' ? 'Güncel yayını koruyun' : 'Taslağınızı hazırlayın'}</h2><p className="muted small-text">{snapshot?.status === 'published' ? 'Düzenlemeler yeni bir taslak sürümü olarak kaydedilir. Öğrenciler mevcut yayını görmeye devam eder.' : 'Kaydetmek soruyu öğrencilere açmaz. Yayımlama ayrı bir adımdır.'}</p><div className="save-status"><span className={dirty ? 'status-dot amber-dot' : 'status-dot'} /><span>{dirty ? 'Kaydedilmemiş değişiklikler' : snapshot ? 'Tüm değişiklikler kaydedildi' : 'Yeni taslak'}</span></div><button type="submit" className="button primary full" disabled={busy || !catalogs.subjects.length || (!!snapshot && !dirty)}>{save.isPending ? 'Kaydediliyor…' : 'Taslağı kaydet'}</button><button type="button" className="button secondary full" disabled={busy} onClick={() => setPreview('preview')}><Icon name="eye" size={18} />Önizle</button><div className="publish-divider" /><button type="button" className="button publish full" disabled={busy || !canPublish} onClick={() => { save.reset(); publish.reset(); setPreview('publish'); }}><Icon name="check" size={18} />Yayımla</button>{dirty ? <p className="field-hint">Yayımlamadan önce değişikliklerinizi kaydedin.</p> : missing.length ? <ul className="requirements">{missing.map((item) => <li key={item}>{item}</li>)}</ul> : !snapshot ? <p className="field-hint">Önce taslağı kaydedin.</p> : !snapshot.has_pending_changes ? <p className="field-hint">Son sürüm zaten yayında.</p> : <p className="field-hint">Yayımlamak için hazır.</p>}</section>
      {snapshot && <section className="card history-card"><button type="button" className="history-toggle" aria-expanded={historyOpen} onClick={() => setHistoryOpen(!historyOpen)}><Icon name="history" size={18} /><strong>Sürüm geçmişi</strong><span>{historyOpen ? '−' : '+'}</span></button>{historyOpen && <div className="history-body">{history.isPending ? <Loading /> : history.isError ? <ErrorNotice error={history.error} retry={() => { void history.refetch(); }} /> : <>{history.data.pages.flatMap((page) => page.data).map((version) => <button type="button" className="history-item" key={version.id} onClick={() => setHistoryPreview(version)}><div><strong>Sürüm {version.version}</strong><span>{dateLabel(version.created_at)}</span></div><span className={`mini-status ${version.published_at ? 'green-text' : ''}`}>{version.published_at ? 'Yayımlandı' : 'Taslak'}</span></button>)}{history.hasNextPage && <button type="button" className="button secondary small full" disabled={history.isFetchingNextPage} onClick={() => { void history.fetchNextPage(); }}>Daha eski sürümler</button>}</>}</div>}</section>}
    </aside></form>
    {preview && <Preview state={form} catalogs={catalogs} title={preview === 'publish' ? 'Yayımlamadan önce son kontrol' : 'Soru önizlemesi'} onClose={() => { if (!publish.isPending) setPreview(null); }}>{preview === 'publish' && <div className="modal-actions"><p className="muted small-text">Bu sürüm öğrencilerin erişimine açılacak.</p><div className="actions"><button className="button secondary" disabled={publish.isPending} onClick={() => setPreview(null)}>Vazgeç</button><button className="button primary" disabled={publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? 'Yayımlanıyor…' : 'Son sürümü yayımla'}</button></div></div>}</Preview>}
    {historyPreview && <Preview state={versionState(historyPreview)} catalogs={catalogs} title={`Sürüm ${historyPreview.version} · ${historyPreview.published_at ? 'Yayımlandı' : 'Taslak'}`} onClose={() => setHistoryPreview(null)} />}
    {confirmReload && <Modal title="Son sürümü yükle?" onClose={() => { if (!reload.isPending) setConfirmReload(false); }}><div className="modal-body"><p>Kaydetmediğiniz yerel değişiklikler kaldırılacak. Sunucudaki güncel sürüm editöre yüklenecek.</p>{reload.isError && <ErrorNotice error={reload.error} />}</div><div className="modal-actions"><button className="button secondary" disabled={reload.isPending} onClick={() => setConfirmReload(false)}>Değişikliklerimi koru</button><button className="button primary" disabled={reload.isPending} onClick={() => reload.mutate()}>Son sürümü yükle</button></div></Modal>}
    {blocker.state === 'blocked' && <Modal title="Kaydedilmemiş değişiklikler var" onClose={() => blocker.reset()}><div className="modal-body"><p>Bu sayfadan ayrılırsanız kaydetmediğiniz değişiklikler kaybolacak.</p></div><div className="modal-actions"><button className="button secondary" onClick={() => blocker.reset()}>Düzenlemeye devam et</button><button className="button primary" onClick={() => blocker.proceed()}>Kaydetmeden ayrıl</button></div></Modal>}
  </>;
}
