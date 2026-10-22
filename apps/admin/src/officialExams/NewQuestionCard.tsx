import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '@oggaq/api-client';
import type { Catalogs } from '@oggaq/shared-types';
import { api } from '../api';
import { ErrorNotice, Field, useNotify } from '../ui';
import { QuestionFields } from '../content/QuestionParts';
import { initialEditor, publicationRequirements, toQuestionInput } from '../questions/editor-state';
import type { EditorState } from '../questions/editor-state';

export type NewEntry = { questionId: string; versionId: string; stem: string };

// A brand-new question is written inside the exam it belongs to: saved, published and handed back as an entry of the exam.
export function NewQuestionCard({ catalogs, defaultSubject, defaultSource, onCreated, onCancel }: { catalogs: Catalogs; defaultSubject: string; defaultSource: string; onCreated: (entry: NewEntry) => void; onCancel: () => void }) {
  const [form, setForm] = useState<EditorState>(() => ({ ...initialEditor(), subject_id: defaultSubject, source_id: defaultSource }));
  const notify = useNotify();
  const missing = publicationRequirements(form);
  const create = useMutation({ mutationFn: async () => {
    const saved = (await api.request('post', '/api/v1/admin/questions', { body: toQuestionInput(form) })).data;
    const published = (await api.request('post', '/api/v1/admin/questions/{question}/publish', { params: { question: saved.id }, body: { base_version: saved.revision } })).data;
    return { questionId: published.id, versionId: published.published_version_id!, stem: form.stem };
  }, onSuccess: (entry) => { notify('Soru yazıldı ve yayımlandı; sınava eklendi.'); onCreated(entry); } });
  const fieldError = (name: string) => create.error instanceof ApiError ? create.error.field(name) : undefined;
  function submit(event: FormEvent) { event.preventDefault(); if (!create.isPending && missing.length === 0) create.mutate(); }
  return <article className="card question-card new-question" aria-label="Yeni soru">
    <header className="question-card-heading"><div className="question-card-meta"><strong>Yeni soru yaz</strong><span className="chip muted-chip">Kaydedilince yayımlanır ve bu sınava eklenir</span></div></header>
    <form onSubmit={submit} className="question-card-form"><fieldset disabled={create.isPending}>
      <QuestionFields form={form} setForm={setForm} catalogs={catalogs} idPrefix="yeni-soru" fieldError={fieldError} />
      <Field label="Kaynak" name="yeni-soru-source" error={fieldError('source_id')}>{(props) => <select {...props} required value={form.source_id} onChange={(event) => setForm((current) => ({ ...current, source_id: event.target.value }))}><option value="">Kaynak seçin</option>{catalogs['question-sources'].map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}</Field>
    </fieldset>
    {create.isError && <ErrorNotice error={create.error} />}
    {missing.length > 0 && <ul className="requirements">{missing.map((item) => <li key={item}>{item}</li>)}</ul>}
    <footer className="question-card-actions"><button type="submit" className="button primary small" disabled={create.isPending || missing.length > 0}>{create.isPending ? 'Kaydediliyor…' : 'Soruyu kaydet ve sınava ekle'}</button><button type="button" className="button secondary small" disabled={create.isPending} onClick={onCancel}>Vazgeç</button></footer></form>
  </article>;
}
