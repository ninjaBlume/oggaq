import type { ExamAttempt, ExamAnswerState } from '@oggaq/shared-types';

// The server owns every selection/revision. Retain only the immutable question content locally.
export function mergeExamAnswerState(exam: ExamAttempt, state: ExamAnswerState): ExamAttempt {
  if (state.id !== exam.id || state.context_id !== exam.context_id || state.status !== 'active') throw new Error('Sınav durumu yeniden yüklenmeli.');
  if (state.revision < exam.revision) return exam;
  const selections = new Map(state.answers.map(answer => [answer.id, answer.selected_option_id]));
  if (selections.size !== exam.questions.length || state.answers.length !== exam.questions.length || state.question_count !== exam.question_count || exam.questions.some(question => !selections.has(question.id))) throw new Error('Sınav cevapları yeniden yüklenmeli.');
  const { answers: _, ...summary } = state;
  return { ...exam, ...summary, questions: exam.questions.map(question => {
    const selected = selections.get(question.id)!;
    return question.selected_option_id === selected ? question : { ...question, selected_option_id: selected };
  }) };
}
