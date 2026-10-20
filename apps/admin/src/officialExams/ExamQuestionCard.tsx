import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '@oggaq/api-client';
import type { Catalogs, components } from '@oggaq/shared-types';
import { api } from '../api';
import { ErrorNotice, Field, Icon, useNotify } from '../ui';
import { initialEditor, publicationRequirements, removeOption, toQuestionInput } from '../questions/editor-state';
import type { EditorState } from '../questions/editor-state';

type OfficialExam = components['schemas']['AdminOfficialExam'];
export type ExamRow = components['schemas']['AdminOfficialExamQuestion'];

interface Props {
  row: ExamRow;
  number: number;
  examId: string;
  examPublished: boolean;
  catalogs: Catalogs;
  // Draft-exam list controls; omitted for published exams.
  actions?: { canMoveUp: boolean; canMoveDown: boolean; onMove: (by: -1 | 1) => void; onRemove: () => void };
  onExamUpdated: (record: OfficialExam) => void;
}

// One question of an exam, shown in full. Editing happens in place: the question gets a new version, which is
// published and pinned to this exam in one step (a published exam only takes a newer published version).
export function ExamQuestionCard({ row, number, examId, examPublished, catalogs, actions, onExamUpdated }: Props) {
  const [editing, setEditing] = useState(false);
  const [revision, setRevision] = useState(row.question_revision);
  const [form, setForm] = useState<EditorState>(() => initialEditor(row.latest_version ?? row.question));
  const [note, setNote] = useState('');
  const notify = useNotify();
  const version = row.question;
  const subject = catalogs.subjects.find((item) => item.id === version.subject_id);
  const topic = catalogs.topics.find((item) => item.id === version.topic_id);
  const newerPublished = row.published_version_id !== null && row.published_version_id !== version.id;
  const unpublishedDraft = row.latest_version !== null && row.latest_version.published_at === null;
  const missing = publicationRequirements(form);

  const pin = useMutation({ mutationFn: (versionId: string) => pinVersion(versionId), onSuccess: (record) => { onExamUpdated(record); notify(`${number}. soru sınavda güncellendi.`); } });

  const save = useMutation({ mutationFn: async (apply: boolean) => {
    // Step 1: new draft version of the question.
    const saved = (await api.request('patch', '/api/v1/admin/questions/{question}', { params: { question: row.question_id }, body: { ...toQuestionInput(form), base_version: revision } })).data;
    setRevision(saved.revision);
    if (apply && missing.length === 0) {
      // Step 2: publish it, step 3: pin it to this exam.
      const published = (await api.request('post', '/api/v1/admin/questions/{question}/publish', { params: { question: row.question_id }, body: { base_version: saved.revision } })).data;
      setRevision(published.revision);
      return { exam: await pinVersion(published.published_version_id!), applied: true };
    }
    // Draft only: a draft exam keeps the unfinished version pinned; a published exam cannot use it, so it is only reloaded.
    const exam = examPublished
      ? (await api.request('get', '/api/v1/admin/official-exams/{officialExam}', { params: { officialExam: examId } })).data
      : await pinVersion(saved.latest_version.id);
    return { exam, applied: false };
  }, onSuccess: ({ exam, applied }) => {
    onExamUpdated(exam);
    if (applied || !examPublished) { setEditing(false); setNote(''); notify(applied ? `${number}. soru kaydedildi, yayımlandı ve sınavda güncellendi.` : `${number}. soru taslak olarak kaydedildi.`); return; }
    setNote('Taslak kaydedildi; yayımlanana kadar bu sınavda kullanılmaz.');
  } });

  async function pinVersion(versionId: string) {
    return (await api.request('put', '/api/v1/admin/official-exams/{officialExam}/questions/{question}', { params: { officialExam: examId, question: row.question_id }, body: { question_version_id: versionId } })).data;
  }

  const busy = save.isPending || pin.isPending;
  const mutationError = save.error ?? pin.error;
  const fieldError = (name: string) => mutationError instanceof ApiError ? mutationError.field(name) : undefined;
  const topics = catalogs.topics.filter((item) => item.subject_id === form.subject_id);
  const dirty = JSON.stringify(toQuestionInput(form)) !== JSON.stringify(toQuestionInput(initialEditor(row.latest_version ?? row.question)));
  function patch<K extends keyof EditorState>(key: K, value: EditorState[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function start() { save.reset(); pin.reset(); setNote(''); setForm(initialEditor(row.latest_version ?? row.question)); setRevision(row.question_revision); setEditing(true); }
  function submit(event: FormEvent) { event.preventDefault(); if (!busy) save.mutate(true); }

  return <article className={`card question-card ${version.published_at === null ? 'is-draft' : ''}`} id={`soru-${number}`} tabIndex={-1}>
    <header className="question-card-heading">
      <span className="step-number">{number}</span>
      <div className="question-card-meta">
        {subject && <span className="chip">{subject.name}</span>}{topic && <span className="chip muted-chip">{topic.name}</span>}
        <span className="chip muted-chip">Sınavdaki sürüm {version.version}</span>
        {version.published_at === null && <span className="badge amber"><span />Taslak sürüm</span>}
        {newerPublished && <span className="badge green"><span />Daha yeni yayımlanmış sürüm var</span>}
        {unpublishedDraft && <span className="badge amber"><span />Yayımlanmamış taslak değişiklik</span>}
      </div>
      <div className="exam-entry-actions">
        {actions && <>
          <button type="button" className="icon-button" aria-label={`${number}. soruyu yukarı taşı`} disabled={!actions.canMoveUp} onClick={() => actions.onMove(-1)}>↑</button>
          <button type="button" className="icon-button" aria-label={`${number}. soruyu aşağı taşı`} disabled={!actions.canMoveDown} onClick={() => actions.onMove(1)}>↓</button>
          <button type="button" className="icon-button" aria-label={`${number}. soruyu sınavdan çıkar`} onClick={actions.onRemove}><Icon name="close" size={16} /></button>
        </>}
      </div>
    </header>
    {!editing ? <>
      <p className="question-stem">{version.stem}</p>
      <ol className="question-options">{version.options.map((option, index) => <li key={option.id} className={option.id === version.correct_option_id ? 'correct' : undefined}><span>{String.fromCharCode(65 + index)}</span><span>{option.text}</span>{option.id === version.correct_option_id && <small>Doğru cevap</small>}</li>)}</ol>
      {version.explanation && <p className="muted small-text question-explanation"><strong>Açıklama:</strong> {version.explanation}</p>}
      {mutationError && <ErrorNotice error={mutationError} />}
      <footer className="question-card-actions">
        <button type="button" className="button secondary small" disabled={busy} onClick={start}>Düzenle</button>
        {newerPublished && <button type="button" className="button secondary small" disabled={busy} onClick={() => { pin.reset(); pin.mutate(row.published_version_id!); }}>{pin.isPending ? 'Uygulanıyor…' : 'Güncel yayımlanmış sürümü sınavda kullan'}</button>}
      </footer>
    </> : <form onSubmit={submit} className="question-card-form">
      <fieldset disabled={busy}>
        <div className="form-grid">
          <Field label="Ders" name={`subject-${number}`} error={fieldError('subject_id')}>{(props) => <select {...props} required value={form.subject_id} onChange={(event) => setForm((current) => ({ ...current, subject_id: event.target.value, topic_id: '' }))}><option value="">Ders seçin</option>{catalogs.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
          <Field label="Konu / alt konu" name={`topic-${number}`} error={fieldError('topic_id')}>{(props) => <select {...props} value={form.topic_id} disabled={!form.subject_id} onChange={(event) => patch('topic_id', event.target.value)}><option value="">Konu seçilmedi</option>{topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
        </div>
        <Field label="Soru metni" name={`stem-${number}`} error={fieldError('stem')}>{(props) => <textarea {...props} required rows={4} maxLength={20000} value={form.stem} onChange={(event) => patch('stem', event.target.value)} />}</Field>
        <div className="option-editor">{form.options.map((option, index) => <div className="option-row" key={option.key}>
          <label className="answer-radio" title="Doğru cevap"><input type="radio" name={`correct-${number}`} aria-label={`${String.fromCharCode(65 + index)} seçeneği doğru cevap`} checked={form.correct === index} onChange={() => patch('correct', index)} /><span>{String.fromCharCode(65 + index)}</span></label>
          <Field label={`${String.fromCharCode(65 + index)} seçeneği`} name={`option-${number}-${index}`} error={fieldError(`options.${index}`)}>{(props) => <input {...props} required maxLength={4000} value={option.text} onChange={(event) => patch('options', form.options.map((value, position) => position === index ? { ...value, text: event.target.value } : value))} placeholder="Seçenek metni" />}</Field>
          <button type="button" className="icon-button remove-option" aria-label={`${String.fromCharCode(65 + index)} seçeneğini sil`} onClick={() => setForm((current) => removeOption(current, index))}><Icon name="close" size={18} /></button>
        </div>)}</div>
        {(fieldError('options') || fieldError('correct_option_position')) && <p className="field-error">{fieldError('options') ?? fieldError('correct_option_position')}</p>}
        <div className="option-footer"><button type="button" className="button secondary small" disabled={form.options.length >= 10} onClick={() => patch('options', [...form.options, { key: crypto.randomUUID(), text: '' }])}><Icon name="plus" size={16} />Seçenek ekle</button><span className="muted small-text">Doğru cevabı soldaki daireden seçin.</span></div>
        <Field label="Cevap açıklaması" name={`explanation-${number}`} error={fieldError('explanation')}>{(props) => <textarea {...props} rows={2} maxLength={20000} value={form.explanation} onChange={(event) => patch('explanation', event.target.value)} />}</Field>
      </fieldset>
      {mutationError && <ErrorNotice error={mutationError} />}
      {note && <div className="notice info" role="status"><p>{note}</p></div>}
      {missing.length > 0 && <ul className="requirements">{missing.map((item) => <li key={item}>{item}</li>)}</ul>}
      <footer className="question-card-actions">
        <button type="submit" className="button primary small" disabled={busy || !dirty || missing.length > 0}>{save.isPending ? 'Kaydediliyor…' : examPublished ? 'Kaydet, yayımla ve sınavda güncelle' : 'Kaydet ve yayımla'}</button>
        <button type="button" className="button secondary small" disabled={busy || !dirty} onClick={() => save.mutate(false)}>Yalnız taslak kaydet</button>
        <button type="button" className="button secondary small" disabled={busy} onClick={() => setEditing(false)}>Vazgeç</button>
      </footer>
    </form>}
  </article>;
}
