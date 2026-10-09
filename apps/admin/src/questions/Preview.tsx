import type { AdminQuestionVersion, Catalogs } from '@oggaq/shared-types';
import { Modal } from '../ui';
import type { EditorState } from './editor-state';

export function Preview({ state, catalogs, title, onClose, children }: { state: EditorState; catalogs: Catalogs; title: string; onClose: () => void; children?: React.ReactNode }) {
  return <Modal title={title} onClose={onClose} wide><div className="preview"><span className="eyebrow">{catalogs.subjects.find((subject) => subject.id === state.subject_id)?.name ?? 'Ders seçilmedi'}</span><p className="preview-stem">{state.stem || 'Soru metni henüz yazılmadı.'}</p><ol className="preview-options">{state.options.map((option, index) => <li key={option.key} className={state.correct === index ? 'correct' : ''}><span className="option-letter">{String.fromCharCode(65 + index)}</span><span>{option.text || 'Boş seçenek'}</span>{state.correct === index && <small>Doğru cevap</small>}</li>)}</ol>{state.explanation && <div className="preview-explanation"><strong>Açıklama</strong><p>{state.explanation}</p></div>}<p className="muted small-text">Kaynak: {catalogs['question-sources'].find((source) => source.id === state.source_id)?.title ?? 'Henüz seçilmedi'}</p></div>{children}</Modal>;
}

export function versionState(version: AdminQuestionVersion): EditorState {
  return { subject_id: version.subject_id, topic_id: version.topic_id ?? '', exam_type_id: version.exam_type_id ?? '', source_id: version.source?.id ?? '', stem: version.stem, explanation: version.explanation ?? '', options: version.options.map((option) => ({ key: option.id, text: option.text })), correct: version.correct_option_id ? version.options.findIndex((option) => option.id === version.correct_option_id) : null };
}
