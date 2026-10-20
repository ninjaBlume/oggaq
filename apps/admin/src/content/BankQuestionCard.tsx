import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '@oggaq/api-client';
import type { AdminQuestion, Catalogs } from '@oggaq/shared-types';
import { examLabel } from '@oggaq/study-core';
import { api } from '../api';
import { ErrorNotice, Status, useNotify } from '../ui';
import { initialEditor, publicationRequirements, toQuestionInput } from '../questions/editor-state';
import type { EditorState } from '../questions/editor-state';
import { QuestionBody, QuestionFields } from './QuestionParts';

interface Props { question: AdminQuestion; catalogs: Catalogs; onChanged: () => void }

// A question shown inside its subject: full text, the exams that use it, and in-place editing. Saving can publish the
// new version and move every exam that uses the question to it.
export function BankQuestionCard({ question, catalogs, onChanged }: Props) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditorState>(() => initialEditor(question.latest_version));
  const [revision, setRevision] = useState(question.revision);
  const [note, setNote] = useState('');
  const [applyAll, setApplyAll] = useState(true);
  const notify = useNotify();
  const version = question.latest_version;
  const topic = catalogs.topics.find((item) => item.id === version.topic_id);
  const exams = question.exams;
  const missing = publicationRequirements(form);
  const dirty = JSON.stringify(toQuestionInput(form)) !== JSON.stringify(toQuestionInput(initialEditor(version)));

  const save = useMutation({ mutationFn: async (publish: boolean) => {
    const saved = (await api.request('patch', '/api/v1/admin/questions/{question}', { params: { question: question.id }, body: { ...toQuestionInput(form), base_version: revision } })).data;
    setRevision(saved.revision);
    if (!publish || missing.length > 0) return { published: false, exams: 0 };
    const published = (await api.request('post', '/api/v1/admin/questions/{question}/publish', { params: { question: question.id }, body: { base_version: saved.revision } })).data;
    setRevision(published.revision);
    if (!applyAll || exams.length === 0) return { published: true, exams: 0 };
    const changed = (await api.request('post', '/api/v1/admin/questions/{question}/apply-to-exams', { params: { question: question.id }, body: { question_version_id: published.published_version_id! } })).data;
    return { published: true, exams: changed.length };
  }, onSuccess: (result) => {
    onChanged();
    if (result.published) { setEditing(false); setNote(''); notify(result.exams > 0 ? `Soru yayımlandı ve ${result.exams} sınavda güncellendi.` : 'Soru yayımlandı.'); return; }
    setNote('Taslak kaydedildi; yayımlanana kadar öğrencilere ve sınavlara yansımaz.');
  } });

  const busy = save.isPending;
  const fieldError = (name: string) => save.error instanceof ApiError ? save.error.field(name) : undefined;
  function start() { save.reset(); setNote(''); setForm(initialEditor(version)); setRevision(question.revision); setEditing(true); }
  function submit(event: FormEvent) { event.preventDefault(); if (!busy) save.mutate(true); }

  return <article className={`card question-card ${question.status === 'draft' ? 'is-draft' : ''}`} id={`soru-${question.id}`}>
    <header className="question-card-heading">
      <div className="question-card-meta">
        {topic && <span className="chip muted-chip">{topic.name}</span>}
        <span className="chip muted-chip">Sürüm {version.version}</span>
        <Status published={question.status === 'published'} pending={question.has_pending_changes} />
        {exams.map((item) => <span key={item.id} className="exam-tag" title={`${item.title}${item.status === 'draft' ? ' (taslak)' : ''} — soru ${item.position}`}>{examLabel(item)}{item.status === 'draft' ? '*' : ''}</span>)}
        {exams.length === 0 && <span className="muted small-text">Hiçbir sınavda yok</span>}
      </div>
      <Link className="button secondary small" to={`/questions/${question.id}`}>Sürüm geçmişi</Link>
    </header>
    {!editing ? <>
      <QuestionBody version={version} />
      <footer className="question-card-actions"><button type="button" className="button secondary small" onClick={start}>Düzenle</button></footer>
    </> : <form onSubmit={submit} className="question-card-form">
      <fieldset disabled={busy}><QuestionFields form={form} setForm={setForm} catalogs={catalogs} idPrefix={`q-${question.id}`} fieldError={fieldError} /></fieldset>
      {save.isError && <ErrorNotice error={save.error} />}
      {note && <div className="notice info" role="status"><p>{note}</p></div>}
      {missing.length > 0 && <ul className="requirements">{missing.map((item) => <li key={item}>{item}</li>)}</ul>}
      {exams.length > 0 && <label className="check-row"><input type="checkbox" checked={applyAll} onChange={(event) => setApplyAll(event.target.checked)} />Yayımlayınca bu soruyu kullanan sınavlarda da güncelle ({exams.length} sınav)</label>}
      <footer className="question-card-actions">
        <button type="submit" className="button primary small" disabled={busy || (!dirty && !question.has_pending_changes) || missing.length > 0}>{save.isPending ? 'Kaydediliyor…' : 'Kaydet ve yayımla'}</button>
        <button type="button" className="button secondary small" disabled={busy || !dirty} onClick={() => save.mutate(false)}>Yalnız taslak kaydet</button>
        <button type="button" className="button secondary small" disabled={busy} onClick={() => setEditing(false)}>Vazgeç</button>
      </footer>
    </form>}
  </article>;
}
