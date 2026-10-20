import type { AdminQuestionVersion, Catalogs } from '@oggaq/shared-types';
import { randomId } from '@oggaq/study-core';
import { Field, Icon } from '../ui';
import { removeOption } from '../questions/editor-state';
import type { EditorState } from '../questions/editor-state';

// Read-only view of a question version: stem, options with the key highlighted, explanation.
export function QuestionBody({ version }: { version: AdminQuestionVersion }) {
  return <>
    <p className="question-stem">{version.stem}</p>
    <ol className="question-options">{version.options.map((option, index) => <li key={option.id} className={option.id === version.correct_option_id ? 'correct' : undefined}><span>{String.fromCharCode(65 + index)}</span><span>{option.text}</span>{option.id === version.correct_option_id && <small>Doğru cevap</small>}</li>)}</ol>
    {version.explanation && <p className="muted small-text question-explanation"><strong>Açıklama:</strong> {version.explanation}</p>}
  </>;
}

interface FieldsProps { form: EditorState; setForm: (update: (current: EditorState) => EditorState) => void; catalogs: Catalogs; idPrefix: string; fieldError: (name: string) => string | undefined }

// The in-place editor shared by exam cards and subject cards: subject, topic, stem, options with the key, explanation.
export function QuestionFields({ form, setForm, catalogs, idPrefix, fieldError }: FieldsProps) {
  const topics = catalogs.topics.filter((item) => item.subject_id === form.subject_id);
  const patch = <K extends keyof EditorState>(key: K, value: EditorState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const letter = (index: number) => String.fromCharCode(65 + index);
  return <>
    <div className="form-grid">
      <Field label="Ders" name={`${idPrefix}-subject`} error={fieldError('subject_id')}>{(props) => <select {...props} required value={form.subject_id} onChange={(event) => setForm((current) => ({ ...current, subject_id: event.target.value, topic_id: '' }))}><option value="">Ders seçin</option>{catalogs.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
      <Field label="Konu / alt konu" name={`${idPrefix}-topic`} error={fieldError('topic_id')}>{(props) => <select {...props} value={form.topic_id} disabled={!form.subject_id} onChange={(event) => patch('topic_id', event.target.value)}><option value="">Konu seçilmedi</option>{topics.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field>
    </div>
    <Field label="Soru metni" name={`${idPrefix}-stem`} error={fieldError('stem')}>{(props) => <textarea {...props} required rows={4} maxLength={20000} value={form.stem} onChange={(event) => patch('stem', event.target.value)} />}</Field>
    <div className="option-editor">{form.options.map((option, index) => <div className="option-row" key={option.key}>
      <label className="answer-radio" title="Doğru cevap"><input type="radio" name={`${idPrefix}-correct`} aria-label={`${letter(index)} seçeneği doğru cevap`} checked={form.correct === index} onChange={() => patch('correct', index)} /><span>{letter(index)}</span></label>
      <Field label={`${letter(index)} seçeneği`} name={`${idPrefix}-option-${index}`} error={fieldError(`options.${index}`)}>{(props) => <input {...props} required maxLength={4000} value={option.text} onChange={(event) => patch('options', form.options.map((value, position) => position === index ? { ...value, text: event.target.value } : value))} placeholder="Seçenek metni" />}</Field>
      <button type="button" className="icon-button remove-option" aria-label={`${letter(index)} seçeneğini sil`} onClick={() => setForm((current) => removeOption(current, index))}><Icon name="close" size={18} /></button>
    </div>)}</div>
    {(fieldError('options') || fieldError('correct_option_position')) && <p className="field-error">{fieldError('options') ?? fieldError('correct_option_position')}</p>}
    <div className="option-footer"><button type="button" className="button secondary small" disabled={form.options.length >= 10} onClick={() => patch('options', [...form.options, { key: randomId(), text: '' }])}><Icon name="plus" size={16} />Seçenek ekle</button><span className="muted small-text">Doğru cevabı soldaki daireden seçin.</span></div>
    <Field label="Cevap açıklaması" name={`${idPrefix}-explanation`} error={fieldError('explanation')}>{(props) => <textarea {...props} rows={2} maxLength={20000} value={form.explanation} onChange={(event) => patch('explanation', event.target.value)} />}</Field>
  </>;
}
