import type { AdminQuestionVersion, QuestionInput } from '@oggaq/shared-types';

export interface EditorOption { key: string; text: string }
export interface EditorState {
  subject_id: string; topic_id: string; exam_type_id: string; source_id: string;
  stem: string; explanation: string; options: EditorOption[]; correct: number | null;
}

export function initialEditor(version?: AdminQuestionVersion): EditorState {
  return {
    subject_id: version?.subject_id ?? '', topic_id: version?.topic_id ?? '', exam_type_id: version?.exam_type_id ?? '', source_id: version?.source?.id ?? '',
    stem: version?.stem ?? '', explanation: version?.explanation ?? '',
    options: version ? version.options.map((option) => ({ key: option.id, text: option.text })) : [0, 1].map(() => ({ key: crypto.randomUUID(), text: '' })),
    correct: version?.correct_option_id ? version.options.findIndex((option) => option.id === version.correct_option_id) : null,
  };
}

export function toQuestionInput(state: EditorState): QuestionInput {
  return {
    subject_id: state.subject_id, topic_id: state.topic_id || null, exam_type_id: state.exam_type_id || null, source_id: state.source_id || null,
    stem: state.stem, explanation: state.explanation || null, options: state.options.map((option) => option.text),
    correct_option_position: state.correct === null ? null : state.correct + 1,
  };
}

export function removeOption(state: EditorState, index: number): EditorState {
  return {
    ...state, options: state.options.filter((_, position) => position !== index),
    correct: state.correct === index ? null : state.correct !== null && state.correct > index ? state.correct - 1 : state.correct,
  };
}

export function publicationRequirements(state: EditorState): string[] {
  const missing: string[] = [];
  if (!state.subject_id) missing.push('Ders seçilmeli');
  if (!state.stem.trim()) missing.push('Soru metni yazılmalı');
  if (state.options.length < 2 || state.options.some((option) => !option.text.trim())) missing.push('En az iki dolu seçenek olmalı');
  if (state.correct === null || !state.options[state.correct]) missing.push('Doğru cevap seçilmeli');
  if (!state.source_id) missing.push('Kaynak seçilmeli');
  return missing;
}
