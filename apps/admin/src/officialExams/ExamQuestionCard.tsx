import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '@oggaq/api-client';
import type { Catalogs, components } from '@oggaq/shared-types';
import { api } from '../api';
import { ErrorNotice, Icon, useNotify } from '../ui';
import { QuestionBody, QuestionFields } from '../content/QuestionParts';
import { initialEditor, publicationRequirements, toQuestionInput } from '../questions/editor-state';
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
  // A corrected question is usually used by several exams (armed and unarmed share their general questions).
  const [applyAll, setApplyAll] = useState(true);
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
      if (applyAll && row.exam_count > 1) {
        await api.request('post', '/api/v1/admin/questions/{question}/apply-to-exams', { params: { question: row.question_id }, body: { question_version_id: published.published_version_id! } });
        return { exam: (await api.request('get', '/api/v1/admin/official-exams/{officialExam}', { params: { officialExam: examId } })).data, applied: true };
      }
      return { exam: await pinVersion(published.published_version_id!), applied: true };
    }
    // Draft only: a draft exam keeps the unfinished version pinned; a published exam cannot use it, so it is only reloaded.
    const exam = examPublished
      ? (await api.request('get', '/api/v1/admin/official-exams/{officialExam}', { params: { officialExam: examId } })).data
      : await pinVersion(saved.latest_version.id);
    return { exam, applied: false };
  }, onSuccess: ({ exam, applied }) => {
    onExamUpdated(exam);
    if (applied || !examPublished) { setEditing(false); setNote(''); notify(applied ? (applyAll && row.exam_count > 1 ? `${number}. soru kaydedildi, yayımlandı ve kullanıldığı ${row.exam_count} sınavda güncellendi.` : `${number}. soru kaydedildi, yayımlandı ve sınavda güncellendi.`) : `${number}. soru taslak olarak kaydedildi.`); return; }
    setNote('Taslak kaydedildi; yayımlanana kadar bu sınavda kullanılmaz.');
  } });

  async function pinVersion(versionId: string) {
    return (await api.request('put', '/api/v1/admin/official-exams/{officialExam}/questions/{question}', { params: { officialExam: examId, question: row.question_id }, body: { question_version_id: versionId } })).data;
  }

  const busy = save.isPending || pin.isPending;
  const mutationError = save.error ?? pin.error;
  const fieldError = (name: string) => mutationError instanceof ApiError ? mutationError.field(name) : undefined;
  const dirty = JSON.stringify(toQuestionInput(form)) !== JSON.stringify(toQuestionInput(initialEditor(row.latest_version ?? row.question)));
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
      <QuestionBody version={version} />
      {mutationError && <ErrorNotice error={mutationError} />}
      <footer className="question-card-actions">
        <button type="button" className="button secondary small" disabled={busy} onClick={start}>Düzenle</button>
        {newerPublished && <button type="button" className="button secondary small" disabled={busy} onClick={() => { pin.reset(); pin.mutate(row.published_version_id!); }}>{pin.isPending ? 'Uygulanıyor…' : 'Güncel yayımlanmış sürümü sınavda kullan'}</button>}
      </footer>
    </> : <form onSubmit={submit} className="question-card-form">
      <fieldset disabled={busy}>
        <QuestionFields form={form} setForm={setForm} catalogs={catalogs} idPrefix={`soru-${number}`} fieldError={fieldError} />
      </fieldset>
      {mutationError && <ErrorNotice error={mutationError} />}
      {note && <div className="notice info" role="status"><p>{note}</p></div>}
      {missing.length > 0 && <ul className="requirements">{missing.map((item) => <li key={item}>{item}</li>)}</ul>}
      {row.exam_count > 1 && <label className="check-row"><input type="checkbox" checked={applyAll} onChange={(event) => setApplyAll(event.target.checked)} />Bu soruyu kullanan tüm sınavlarda güncelle ({row.exam_count} sınav)</label>}
      <footer className="question-card-actions">
        <button type="submit" className="button primary small" disabled={busy || !dirty || missing.length > 0}>{save.isPending ? 'Kaydediliyor…' : examPublished ? 'Kaydet, yayımla ve sınavda güncelle' : 'Kaydet ve yayımla'}</button>
        <button type="button" className="button secondary small" disabled={busy || !dirty} onClick={() => save.mutate(false)}>Yalnız taslak kaydet</button>
        <button type="button" className="button secondary small" disabled={busy} onClick={() => setEditing(false)}>Vazgeç</button>
      </footer>
    </form>}
  </article>;
}
