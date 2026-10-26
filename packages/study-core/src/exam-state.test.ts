import { describe, expect, it } from 'vitest';
import type { ExamAttempt, ExamAnswerState } from '@oggaq/shared-types';
import { mergeExamAnswerState } from './exam-state';
const exam = { id:'exam', context_id:'personal', status:'active', revision:2, question_count:2, questions:[{id:'q1',selected_option_id:'a',feedback:null,question:{stem:'Sabit birinci soru'}},{id:'q2',selected_option_id:null,feedback:null,question:{stem:'Sabit ikinci soru'}}] } as ExamAttempt;
const state = { ...exam, revision:3, answers:[{id:'q1',selected_option_id:'a',feedback:null},{id:'q2',selected_option_id:'b',feedback:null}] } as ExamAnswerState;
describe('canonical compact exam state', () => {
 it('keeps immutable text and merges another writer’s selections without mutating the previous state', () => {
  const merged=mergeExamAnswerState(exam,state);
  expect(merged.questions.map(q=>q.selected_option_id)).toEqual(['a','b']);
  expect(merged.questions[0]).toBe(exam.questions[0]); expect(merged.questions[1]!.question).toBe(exam.questions[1]!.question);
  expect(exam.questions[1]!.selected_option_id).toBeNull();expect(merged.revision).toBe(3);
 });
 it('merges canonical feedback without exposing other answer keys or changing fixed content',()=>{
  const feedback={outcome:'incorrect' as const,correct_option_id:'right',explanation:'Sunucu açıklaması'};
  const merged=mergeExamAnswerState(exam,{...state,answers:[{id:'q1',selected_option_id:'a',feedback},{id:'q2',selected_option_id:null,feedback:null}]});
  expect(merged.questions[0]!.feedback).toEqual(feedback);expect(merged.questions[1]!.feedback).toBeNull();
  expect(merged.questions[0]!.question).toBe(exam.questions[0]!.question);
 });
 it('ignores a late old revision',()=>expect(mergeExamAnswerState(exam,{...state,revision:1})).toBe(exam));
 it('requires a fresh full detail for another context, another exam, expiry or missing/duplicate selections',()=>{
  for(const patch of [{context_id:'other'},{id:'other'},{status:'completed' as const},{answers:state.answers.slice(0,1)},{answers:[state.answers[0]!,state.answers[0]!]}])expect(()=>mergeExamAnswerState(exam,{...state,...patch})).toThrow();
 });
});
