import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, cursorFromLink } from '@oggaq/api-client';
import type { Catalogs, components } from '@oggaq/shared-types';
import { api, loadCatalogs } from '../api';
import { ErrorNotice, Field, Icon, Loading, Modal, dateLabel, useNotify } from '../ui';

type OfficialExam = components['schemas']['AdminOfficialExam'];
type Entry = { questionId: string; versionId: string; stem: string };
type Form = { exam_type_id: string; source_id: string; title: string; year: string; term: string; exam_number: string; entries: Entry[] };

const emptyForm: Form = { exam_type_id: '', source_id: '', title: '', year: String(new Date().getFullYear()), term: '', exam_number: '', entries: [] };
function toForm(exam?: OfficialExam): Form {
  if (!exam) return emptyForm;
  return {
    exam_type_id: exam.exam_type_id, source_id: exam.source?.id ?? '', title: exam.title, year: String(exam.year), term: exam.term ?? '', exam_number: exam.exam_number ?? '',
    entries: (exam.questions ?? []).map((row) => ({ questionId: row.question_id, versionId: row.question.id, stem: row.question.stem })),
  };
}
export function toInput(form: Form) {
  return {
    exam_type_id: form.exam_type_id, source_id: form.source_id || null, title: form.title.trim(), year: Number(form.year),
    term: form.term.trim() || null, exam_number: form.exam_number.trim() || null, question_version_ids: form.entries.map((entry) => entry.versionId),
  };
}

export function OfficialExamPage() {
  const { examId } = useParams();
  const catalogs = useQuery({ queryKey: ['catalogs'], queryFn: ({ signal }) => loadCatalogs(signal) });
  const exam = useQuery({ queryKey: ['official-exam', examId], enabled: !!examId, queryFn: ({ signal }) => api.request('get', '/api/v1/admin/official-exams/{officialExam}', { params: { officialExam: examId! }, signal }) });
  if (catalogs.isPending || (examId && exam.isPending)) return <Loading text="Editör hazırlanıyor…" />;
  if (catalogs.isError) return <ErrorNotice error={catalogs.error} retry={() => { void catalogs.refetch(); }} />;
  if (examId && exam.isError) return <><Link className="back-link" to="/official-exams"><Icon name="back" size={16} />Çıkmış sınavlar</Link><ErrorNotice error={exam.error} retry={() => { void exam.refetch(); }} /></>;
  return <OfficialExamEditor key={examId ?? 'new'} exam={exam.data?.data} catalogs={catalogs.data} />;
}

function OfficialExamEditor({ exam, catalogs }: { exam?: OfficialExam; catalogs: Catalogs }) {
  const [snapshot, setSnapshot] = useState(exam);
  const [form, setForm] = useState(() => toForm(exam));
  const [picker, setPicker] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const cache = useQueryClient();
  const navigate = useNavigate();
  const notify = useNotify();
  const published = snapshot?.status === 'published';
  function accept(record: OfficialExam) {
    setSnapshot(record); setForm(toForm(record));
    cache.setQueryData(['official-exam', record.id], { data: record });
    void cache.invalidateQueries({ queryKey: ['official-exams'] });
  }
  const save = useMutation({ mutationFn: async () => snapshot
    ? (await api.request('put', '/api/v1/admin/official-exams/{officialExam}', { params: { officialExam: snapshot.id }, body: toInput(form) })).data
    : (await api.request('post', '/api/v1/admin/official-exams', { body: toInput(form) })).data,
  onSuccess: (record) => { accept(record); notify(snapshot ? 'Taslak güncellendi.' : 'Çıkmış sınav taslağı oluşturuldu.'); if (!snapshot) void navigate(`/official-exams/${record.id}`, { replace: true }); } });
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
  function submit(event: FormEvent) { event.preventDefault(); if (!busy && complete) { publish.reset(); save.mutate(); } }

  return <><Link className="back-link" to="/official-exams"><Icon name="back" size={16} />Çıkmış sınavlara dön</Link>
    <header className="page-heading editor-heading"><div><span className="eyebrow">ÇIKMIŞ SINAV</span><h1>{snapshot ? snapshot.title : 'Yeni çıkmış sınav'}</h1><p className="muted">{published ? `Yayımlandı: ${dateLabel(snapshot?.published_at)}. Yayımlanan şablon değiştirilemez.` : 'Soru sırası orijinal sınav sırasıdır. Kaydetmek sınavı öğrencilere açmaz.'}</p></div>{snapshot && <span className={`badge ${published ? 'green' : 'amber'}`}><span />{published ? 'Yayında' : 'Taslak'}</span>}</header>
    {mutationError && <ErrorNotice error={mutationError} />}
    <form onSubmit={submit} className="editor-layout"><fieldset className="editor-main" disabled={busy || published}>
      <section className="card editor-card"><div className="section-title"><span className="step-number">1</span><div><h2>Sınav bilgileri</h2><p className="muted small-text">Sınav türü, yıl, dönem ve numara birlikte tekil olmalıdır.</p></div></div><div className="form-grid">
        <Field label="Sınav türü" name="exam_type_id" error={fieldError('exam_type_id')}>{(props) => <select {...props} required value={form.exam_type_id} onChange={(event) => patch('exam_type_id', event.target.value)}><option value="">Sınav türü seçin</option>{catalogs['exam-types'].map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
        <Field label="Kaynak" name="source_id" error={fieldError('source_id')} hint="Sınavın duyurulduğu belge veya yayın (isteğe bağlı).">{(props) => <select {...props} value={form.source_id} onChange={(event) => patch('source_id', event.target.value)}><option value="">Kaynak seçilmedi</option>{catalogs['question-sources'].map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>}</Field>
        <Field label="Başlık" name="title" error={fieldError('title')}>{(props) => <input {...props} required maxLength={240} value={form.title} onChange={(event) => patch('title', event.target.value)} />}</Field>
        <Field label="Yıl" name="year" error={fieldError('year')}>{(props) => <input {...props} type="number" required min={1990} max={2200} value={form.year} onChange={(event) => patch('year', event.target.value)} />}</Field>
        <Field label="Dönem" name="term" error={fieldError('term')}>{(props) => <input {...props} maxLength={80} value={form.term} onChange={(event) => patch('term', event.target.value)} />}</Field>
        <Field label="Sınav numarası" name="exam_number" error={fieldError('exam_number')}>{(props) => <input {...props} maxLength={40} value={form.exam_number} onChange={(event) => patch('exam_number', event.target.value)} />}</Field>
      </div></section>
      <section className="card editor-card"><div className="section-title"><span className="step-number">2</span><div><h2>Sorular ve sıra</h2><p className="muted small-text">Yalnız yayımlanmış sürümler eklenebilir; cevap anahtarı o sürümden gelir.</p></div></div>
        {fieldError('question_version_ids') && <p className="field-error">{fieldError('question_version_ids')}</p>}
        {form.entries.length === 0 ? <p className="muted small-text">Henüz soru eklenmedi.</p> : <ol className="exam-entries">{form.entries.map((entry, index) => <li key={entry.versionId}><span className="step-number">{index + 1}</span><span className="exam-entry-stem">{entry.stem}</span><span className="exam-entry-actions"><button type="button" className="icon-button" aria-label={`${index + 1}. soruyu yukarı taşı`} disabled={index === 0} onClick={() => move(index, -1)}>↑</button><button type="button" className="icon-button" aria-label={`${index + 1}. soruyu aşağı taşı`} disabled={index === form.entries.length - 1} onClick={() => move(index, 1)}>↓</button><button type="button" className="icon-button" aria-label={`${index + 1}. soruyu çıkar`} onClick={() => patch('entries', form.entries.filter((_, position) => position !== index))}><Icon name="close" size={16} /></button></span></li>)}</ol>}
        <div className="option-footer"><button type="button" className="button secondary small" onClick={() => setPicker(true)}><Icon name="plus" size={16} />Soru ekle</button><span className="muted small-text">{form.entries.length} / 200 soru</span></div>
      </section>
    </fieldset><aside className="editor-aside"><section className="card publish-card"><span className="eyebrow">YAYIN KONTROLÜ</span><h2>{published ? 'Yayımlandı' : 'Taslağınızı hazırlayın'}</h2><p className="muted small-text">{published ? 'Öğrenciler bu sınavı orijinal sırasıyla çözebilir.' : 'Yayımlamadan sonra künye ve soru listesi değiştirilemez.'}</p>
      {!published && <><button type="submit" className="button primary full" disabled={busy || !complete || (!!snapshot && !dirty)}>{save.isPending ? 'Kaydediliyor…' : 'Taslağı kaydet'}</button><div className="publish-divider" /><button type="button" className="button publish full" disabled={busy || !snapshot || dirty} onClick={() => { save.reset(); setConfirmPublish(true); }}><Icon name="check" size={18} />Yayımla</button>{!snapshot ? <p className="field-hint">Önce taslağı kaydedin.</p> : dirty ? <p className="field-hint">Yayımlamadan önce değişikliklerinizi kaydedin.</p> : <p className="field-hint">Yayımlamak için hazır.</p>}</>}
    </section></aside></form>
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
    {questions.isPending ? <Loading /> : questions.isError ? <ErrorNotice error={questions.error} retry={() => { void questions.refetch(); }} /> : !questions.data.data.length ? <p className="muted">Yayımlanmış soru bulunamadı.</p> : <ul className="picker-list">{questions.data.data.map((question) => <li key={question.id}><div><strong>{question.latest_version.stem}</strong><span className="row-caption">{catalogs.subjects.find((item) => item.id === question.latest_version.subject_id)?.name ?? '—'}{question.has_pending_changes ? ' · Yayındaki sürümden farklı taslak var; yayındaki sürüm eklenir' : ''}</span></div><button type="button" className="button secondary small" disabled={selected.has(question.id) || !question.published_version_id} onClick={() => onAdd({ questionId: question.id, versionId: question.published_version_id!, stem: question.latest_version.stem })}>{selected.has(question.id) ? 'Eklendi' : 'Ekle'}</button></li>)}</ul>}
    {questions.data && <div className="pagination"><button type="button" className="button secondary small" disabled={!questions.data.links.prev} onClick={() => setCursor(cursorFromLink(questions.data.links.prev))}>Önceki</button><button type="button" className="button secondary small" disabled={!questions.data.links.next} onClick={() => setCursor(cursorFromLink(questions.data.links.next))}>Sonraki</button></div>}
  </div><div className="modal-actions"><button type="button" className="button primary" onClick={onClose}>Tamam</button></div></Modal>;
}
