import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError, cursorFromLink } from '@oggaq/api-client';
import { vocabulary } from '@oggaq/study-core';
import type { Catalogs, components } from '@oggaq/shared-types';
import { api, loadCatalogs } from '../api';
import { ErrorNotice, Field, Icon, Loading, Modal, dateLabel, useNotify } from '../ui';
import { ExamQuestionCard } from './ExamQuestionCard';
import { NewQuestionCard } from './NewQuestionCard';
import type { NewEntry } from './NewQuestionCard';

type OfficialExam = components['schemas']['AdminOfficialExam'];
type Entry = { questionId: string; versionId: string; stem: string; published: boolean; latestPublished: string | null };
type Form = { exam_type_id: string; weapon_status: '' | 'armed' | 'unarmed'; subject_id: string; source_id: string; title: string; year: string; term: string; exam_number: string; entries: Entry[] };

const emptyForm: Form = { exam_type_id: '', weapon_status: '', subject_id: '', source_id: '', title: '', year: String(new Date().getFullYear()), term: '', exam_number: '', entries: [] };
function toForm(exam?: OfficialExam): Form {
  if (!exam) return emptyForm;
  return {
    exam_type_id: exam.exam_type_id, weapon_status: exam.weapon_status ?? '', subject_id: exam.subject?.id ?? '', source_id: exam.source?.id ?? '', title: exam.title, year: String(exam.year), term: exam.term ?? '', exam_number: exam.exam_number ?? '',
    entries: (exam.questions ?? []).map((row) => ({ questionId: row.question_id, versionId: row.question.id, stem: row.question.stem, published: row.question.published_at !== null, latestPublished: row.published_version_id })),
  };
}
export function toInput(form: Form) {
  return {
    exam_type_id: form.exam_type_id, weapon_status: form.weapon_status || null, subject_id: form.subject_id || null, source_id: form.source_id || null, title: form.title.trim(), year: Number(form.year),
    term: form.term.trim() || null, exam_number: form.exam_number.trim() || null, question_version_ids: form.entries.map((entry) => entry.versionId),
  };
}

export function OfficialExamPage() {
  const { examId } = useParams();
  const catalogs = useQuery({ queryKey: ['catalogs'], queryFn: ({ signal }) => loadCatalogs(signal) });
  const exam = useQuery({ queryKey: ['official-exam', examId], enabled: !!examId, queryFn: ({ signal }) => api.request('get', '/api/v1/admin/official-exams/{officialExam}', { params: { officialExam: examId! }, signal }) });
  if (catalogs.isPending || (examId && exam.isPending)) return <Loading text="Editör hazırlanıyor…" />;
  if (catalogs.isError) return <ErrorNotice error={catalogs.error} retry={() => { void catalogs.refetch(); }} />;
  if (examId && exam.isError) return <><Link className="back-link" to="/deneme-sinavlari"><Icon name="back" size={16} />{vocabulary.deneme.title}</Link><ErrorNotice error={exam.error} retry={() => { void exam.refetch(); }} /></>;
  return <OfficialExamEditor key={examId ?? 'new'} exam={exam.data?.data} catalogs={catalogs.data} />;
}

function OfficialExamEditor({ exam, catalogs }: { exam?: OfficialExam; catalogs: Catalogs }) {
  const [params] = useSearchParams();
  const { hash } = useLocation();
  const [snapshot, setSnapshot] = useState(exam);
  // A new exam opens as a Deneme or Ders Sınavı (?tur=deneme|ders&ders=<subject>): the matching exam type and subject are preselected.
  const [form, setForm] = useState(() => {
    if (exam) return toForm(exam);
    const wanted = params.get('tur') === 'ders' ? /^ders/i : /^deneme/i;
    return { ...emptyForm, exam_type_id: catalogs['exam-types'].find((type) => wanted.test(type.name))?.id ?? '', subject_id: params.get('tur') === 'ders' ? params.get('ders') ?? '' : '' };
  });
  const [picker, setPicker] = useState(false);
  const [writing, setWriting] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const cache = useQueryClient();
  const navigate = useNavigate();
  const notify = useNotify();
  const published = snapshot?.status === 'published';
  const isSubjectExam = snapshot ? !!snapshot.subject : form.subject_id !== '' || params.get('tur') === 'ders';
  function accept(record: OfficialExam) {
    setSnapshot(record); setForm(toForm(record));
    cache.setQueryData(['official-exam', record.id], { data: record });
    void cache.invalidateQueries({ queryKey: ['official-exams'] });
  }
  // A question edited inside the exam is already saved on the server; only that entry is refreshed so unsaved exam edits survive.
  function acceptRow(record: OfficialExam) {
    setSnapshot(record);
    cache.setQueryData(['official-exam', record.id], { data: record });
    void cache.invalidateQueries({ queryKey: ['official-exams'] });
    setForm((current) => ({ ...current, entries: current.entries.map((entry) => {
      const row = record.questions?.find((item) => item.question_id === entry.questionId);
      return row ? { ...entry, versionId: row.question.id, stem: row.question.stem, published: row.question.published_at !== null, latestPublished: row.published_version_id } : entry;
    }) }));
  }
  const save = useMutation({ mutationFn: async (entries?: Entry[]) => {
    const body = toInput(entries ? { ...form, entries } : form);
    return snapshot
      ? (await api.request('put', '/api/v1/admin/official-exams/{officialExam}', { params: { officialExam: snapshot.id }, body })).data
      : (await api.request('post', '/api/v1/admin/official-exams', { body })).data;
  },
  onSuccess: (record) => { accept(record); notify(snapshot ? 'Taslak güncellendi.' : 'Sınav taslağı oluşturuldu.'); if (!snapshot) void navigate(`/official-exams/${record.id}`, { replace: true }); } });
  const publish = useMutation({ mutationFn: async () => (await api.request('post', '/api/v1/admin/official-exams/{officialExam}/publish', { params: { officialExam: snapshot!.id } })).data,
    onSuccess: (record) => { accept(record); setConfirmPublish(false); notify('Çıkmış sınav yayımlandı.'); }, onError: () => setConfirmPublish(false) });
  const busy = save.isPending || publish.isPending;
  const mutationError = save.error ?? publish.error;
  const fieldError = (name: string) => mutationError instanceof ApiError ? mutationError.field(name) : undefined;
  const dirty = !!snapshot && JSON.stringify(toInput(form)) !== JSON.stringify(toInput(toForm(snapshot)));
  const complete = form.exam_type_id !== '' && form.title.trim() !== '' && form.entries.length > 0;
  function patch<K extends keyof Form>(key: K, value: Form[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function move(index: number, by: -1 | 1) {
    setForm((current) => {
      const entries = [...current.entries];
      const target = index + by;
      if (target < 0 || target >= entries.length) return current;
      [entries[index], entries[target]] = [entries[target]!, entries[index]!];
      return { ...current, entries };
    });
  }
  // Plain button + scrollIntoView instead of a #hash link, so it behaves the same in every browser and the target is highlighted.
  function goTo(id: string, flash = true) {
    const target = document.getElementById(id);
    if (!target) return;
    // Instant on purpose: a smooth scroll over a 125-question page takes seconds and looks like nothing happened.
    target.scrollIntoView({ behavior: 'auto', block: 'start' });
    if (!flash) return;
    target.focus({ preventScroll: true });
    target.classList.remove('flash'); void target.offsetWidth; target.classList.add('flash');
    window.setTimeout(() => target.classList.remove('flash'), 1800);
  }
  // A link such as /official-exams/<id>#soru-14 (from the report queue) opens the exam at that question.
  useEffect(() => {
    const match = /^#soru-(\d+)$/.exec(hash);
    if (match) goTo(`soru-${match[1]}`);
  }, [hash]);
  // A question written inside a saved draft exam is added and the draft is saved at once, so it shows up as a card.
  function added(entry: NewEntry) {
    const next = [...form.entries, { ...entry, published: true, latestPublished: entry.versionId }].slice(0, 200);
    patch('entries', next);
    setWriting(false);
    if (snapshot) save.mutate(next);
  }
  function submit(event: FormEvent) { event.preventDefault(); if (!busy && complete) { publish.reset(); save.mutate(undefined); } }

  return <><Link className="back-link" to={isSubjectExam ? '/ders-sinavlari' : '/deneme-sinavlari'}><Icon name="back" size={16} />{isSubjectExam ? 'Ders sınavlarına dön' : 'Deneme sınavlarına dön'}</Link>
    <header className="page-heading editor-heading"><div><span className="eyebrow">{isSubjectExam ? 'DERS SINAVI' : 'DENEME SINAVI'}</span><h1>{snapshot ? snapshot.title : isSubjectExam ? 'Yeni ders sınavı' : 'Yeni deneme sınavı'}</h1><p className="muted">{published ? `Yayımlandı: ${dateLabel(snapshot?.published_at)}. Künye, sıra ve soru listesi sabittir; soruları aşağıda düzenleyebilirsiniz.` : 'Soru sırası orijinal sınav sırasıdır. Kaydetmek sınavı öğrencilere açmaz.'}</p></div>{snapshot && <span className={`badge ${published ? 'green' : 'amber'}`}><span />{published ? 'Yayında' : 'Taslak'}</span>}</header>
    {mutationError && <ErrorNotice error={mutationError} />}
    <form onSubmit={submit} className="editor-layout"><fieldset className="editor-main" disabled={busy || published}>
      <details className="card editor-card info-card" open={!published}><summary className="section-title"><span className="step-number">1</span><div><h2>Sınav bilgileri</h2><p className="muted small-text">{published ? 'Yayımlanmış künye değiştirilemez; görmek için açın.' : 'Sınav türü, yıl, dönem ve numara birlikte tekil olmalıdır.'}</p></div></summary><div className="form-grid">
        <Field label="Sınav türü" name="exam_type_id" error={fieldError('exam_type_id')}>{(props) => <select {...props} required value={form.exam_type_id} onChange={(event) => patch('exam_type_id', event.target.value)}><option value="">Sınav türü seçin</option>{catalogs['exam-types'].map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
        <Field label="Silah durumu" name="weapon_status" error={fieldError('weapon_status')} hint="Sınav türünden (Deneme/Ders) ayrıdır; silahlı ve silahsız sınav ayrı kayıtlardır. Ders sınavında boş bırakılır.">{(props) => <select {...props} value={form.weapon_status} onChange={(event) => patch('weapon_status', event.target.value as Form['weapon_status'])}><option value="">Belirtilmedi</option><option value="armed">Silahlı</option><option value="unarmed">Silahsız</option></select>}</Field>
        <Field label="Ders" name="subject_id" error={fieldError('subject_id')} hint="Yalnız Ders Sınavı için: sınavın dersi. Deneme (tam) sınavda boş bırakın.">{(props) => <select {...props} value={form.subject_id} onChange={(event) => patch('subject_id', event.target.value)}><option value="">Ders yok (tam sınav)</option>{catalogs.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
        <Field label="Kaynak" name="source_id" error={fieldError('source_id')} hint="Sınavın duyurulduğu belge veya yayın (isteğe bağlı).">{(props) => <select {...props} value={form.source_id} onChange={(event) => patch('source_id', event.target.value)}><option value="">Kaynak seçilmedi</option>{catalogs['question-sources'].map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}</Field>
        <Field label="Başlık" name="title" error={fieldError('title')}>{(props) => <input {...props} required maxLength={240} value={form.title} onChange={(event) => patch('title', event.target.value)} />}</Field>
        <Field label="Yıl" name="year" error={fieldError('year')}>{(props) => <input {...props} type="number" required min={1990} max={2200} value={form.year} onChange={(event) => patch('year', event.target.value)} />}</Field>
        <Field label="Dönem" name="term" error={fieldError('term')}>{(props) => <input {...props} maxLength={80} value={form.term} onChange={(event) => patch('term', event.target.value)} />}</Field>
        <Field label="Sınav numarası" name="exam_number" error={fieldError('exam_number')}>{(props) => <input {...props} maxLength={40} value={form.exam_number} onChange={(event) => patch('exam_number', event.target.value)} />}</Field>
      </div></details>
    </fieldset><aside className="editor-aside"><section className="card publish-card"><span className="eyebrow">YAYIN KONTROLÜ</span><h2>{published ? 'Yayımlandı' : 'Taslağınızı hazırlayın'}</h2><p className="muted small-text">{published ? 'Öğrenciler bu sınavı orijinal sırasıyla çözebilir.' : 'Yayımlamadan sonra künye ve soru listesi değiştirilemez.'}</p>
      {!published && <><button type="submit" className="button primary full" disabled={busy || !complete || (!!snapshot && !dirty)}>{save.isPending ? 'Kaydediliyor…' : 'Taslağı kaydet'}</button><div className="publish-divider" /><button type="button" className="button publish full" disabled={busy || !snapshot || dirty || form.entries.some((entry) => !entry.published)} onClick={() => { save.reset(); setConfirmPublish(true); }}><Icon name="check" size={18} />Yayımla</button>{!snapshot ? <p className="field-hint">Önce taslağı kaydedin.</p> : dirty ? <p className="field-hint">Yayımlamadan önce değişikliklerinizi kaydedin.</p> : form.entries.some((entry) => !entry.published) ? <p className="field-hint">Taslak sürümde sorular var. Aşağıda soruyu tamamlayıp "Kaydet ve yayımla" deyin; sonra sınavı yayımlayabilirsiniz.</p> : <p className="field-hint">Yayımlamak için hazır.</p>}</>}
    </section></aside></form>
    <section className="exam-questions" aria-labelledby="exam-questions-title">
      <div className="exam-questions-heading"><div><h2 id="exam-questions-title">Sorular</h2><p className="muted small-text">{published ? 'Soruları burada düzenleyebilirsiniz. Kaydettiğiniz soru yeni sürümle yayımlanır ve sınavda aynı sırada güncellenir; önceki denemeler eski sürümüyle kalır.' : 'Sorular orijinal sınav sırasındadır. Her soru burada düzenlenebilir; yayımlanmış sürümler eklenebilir.'}</p></div><span className="muted small-text">{form.entries.length} / 200 soru</span></div>
      {fieldError('question_version_ids') && <p className="field-error">{fieldError('question_version_ids')}</p>}
      {form.entries.length > 1 && <><nav className="question-jump" id="soru-numaralari" aria-label="Soru numaraları">{form.entries.map((entry, index) => <button type="button" key={entry.questionId} className={entry.published ? undefined : 'is-draft'} aria-label={`${index + 1}. soruya git`} onClick={() => goTo(`soru-${index + 1}`)}>{index + 1}</button>)}</nav>
        <button type="button" className="button secondary small jump-top" onClick={() => goTo('soru-numaralari', false)}><Icon name="back" size={14} />Numaralara dön</button></>}
      {form.entries.length === 0 ? <p className="muted small-text">Henüz soru eklenmedi.</p> : <div className="question-stack">{form.entries.map((entry, index) => {
        const row = snapshot?.questions?.find((item) => item.question_id === entry.questionId);
        const actions = published ? undefined : { canMoveUp: index > 0, canMoveDown: index < form.entries.length - 1, onMove: (by: -1 | 1) => move(index, by), onRemove: () => patch('entries', form.entries.filter((_, position) => position !== index)) };
        if (!row) return <article className="card question-card" id={`soru-${index + 1}`} tabIndex={-1} key={entry.questionId}><header className="question-card-heading"><span className="step-number">{index + 1}</span><p className="question-stem">{entry.stem}</p>{actions && <div className="exam-entry-actions"><button type="button" className="icon-button" aria-label={`${index + 1}. soruyu yukarı taşı`} disabled={!actions.canMoveUp} onClick={() => actions.onMove(-1)}>↑</button><button type="button" className="icon-button" aria-label={`${index + 1}. soruyu aşağı taşı`} disabled={!actions.canMoveDown} onClick={() => actions.onMove(1)}>↓</button><button type="button" className="icon-button" aria-label={`${index + 1}. soruyu sınavdan çıkar`} onClick={actions.onRemove}><Icon name="close" size={16} /></button></div>}</header><p className="muted small-text">Eklendi; taslağı kaydedince tam metin görünür ve düzenlenebilir.</p></article>;
        return <ExamQuestionCard key={entry.questionId} row={row} number={index + 1} examId={snapshot!.id} examPublished={published} catalogs={catalogs} onExamUpdated={acceptRow} actions={actions} />;
            })}</div>}
      {!published && <>{writing && <NewQuestionCard catalogs={catalogs} defaultSubject={form.subject_id} defaultSource={form.source_id} onCreated={added} onCancel={() => setWriting(false)} />}<div className="option-footer"><button type="button" className="button primary small" disabled={busy || writing} onClick={() => setWriting(true)}><Icon name="plus" size={16} />Yeni soru yaz</button><button type="button" className="button secondary small" disabled={busy} onClick={() => setPicker(true)}><Icon name="plus" size={16} />Mevcut soruyu ekle</button></div></>}
    </section>
    {picker && <QuestionPicker catalogs={catalogs} selected={new Set(form.entries.map((entry) => entry.questionId))} onAdd={(entry) => patch('entries', [...form.entries, entry].slice(0, 200))} onClose={() => setPicker(false)} />}
    {confirmPublish && <Modal title="Çıkmış sınavı yayımla?" onClose={() => { if (!publish.isPending) setConfirmPublish(false); }}><div className="modal-body"><p>Yayımlandıktan sonra bu sınavın künyesi, soru sırası ve soru sürümleri değiştirilemez. Öğrenciler sınavı çözebilir.</p></div><div className="modal-actions"><button className="button secondary" disabled={publish.isPending} onClick={() => setConfirmPublish(false)}>Vazgeç</button><button className="button primary" disabled={publish.isPending} onClick={() => publish.mutate()}>{publish.isPending ? 'Yayımlanıyor…' : 'Yayımla'}</button></div></Modal>}
  </>;
}

function QuestionPicker({ catalogs, selected, onAdd, onClose }: { catalogs: Catalogs; selected: Set<string>; onAdd: (entry: Entry) => void; onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [cursor, setCursor] = useState<string | undefined>();
  const questions = useQuery({ queryKey: ['questions', 'picker', subject, cursor], queryFn: ({ signal }) => api.request('get', '/api/v1/admin/questions', { signal, query: { per_page: 10, status: 'published', cursor, ...(subject ? { subject_id: subject } : {}) } }) });
  return <Modal title="Yayımlanmış soru ekle" wide onClose={onClose}><div className="modal-body">
    <label className="field"><span>Ders filtresi</span><select aria-label="Ders filtresi" value={subject} onChange={(event) => { setSubject(event.target.value); setCursor(undefined); }}><option value="">Tüm dersler</option>{catalogs.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    {questions.isPending ? <Loading /> : questions.isError ? <ErrorNotice error={questions.error} retry={() => { void questions.refetch(); }} /> : !questions.data.data.length ? <p className="muted">Yayımlanmış soru bulunamadı.</p> : <ul className="picker-list">{questions.data.data.map((question) => <li key={question.id}><div><strong>{question.latest_version.stem}</strong><span className="row-caption">{catalogs.subjects.find((item) => item.id === question.latest_version.subject_id)?.name ?? '—'}{question.has_pending_changes ? ' · Yayındaki sürümden farklı taslak var; yayındaki sürüm eklenir' : ''}</span></div><button type="button" className="button secondary small" disabled={selected.has(question.id) || !question.published_version_id} onClick={() => onAdd({ questionId: question.id, versionId: question.published_version_id!, stem: question.latest_version.stem, published: true, latestPublished: question.published_version_id })}>{selected.has(question.id) ? 'Eklendi' : 'Ekle'}</button></li>)}</ul>}
    {questions.data && <div className="pagination"><button type="button" className="button secondary small" disabled={!questions.data.links.prev} onClick={() => setCursor(cursorFromLink(questions.data.links.prev))}>Önceki</button><button type="button" className="button secondary small" disabled={!questions.data.links.next} onClick={() => setCursor(cursorFromLink(questions.data.links.next))}>Sonraki</button></div>}
  </div><div className="modal-actions"><button type="button" className="button primary" onClick={onClose}>Tamam</button></div></Modal>;
}
