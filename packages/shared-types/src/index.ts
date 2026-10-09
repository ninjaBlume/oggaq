import type { components } from './api';

export type User = components['schemas']['User'];
export type Subject = components['schemas']['Subject'];
export type Topic = components['schemas']['Topic'];
export type ExamType = components['schemas']['ExamType'];
export type QuestionSource = components['schemas']['QuestionSource'];
export type AdminQuestion = components['schemas']['AdminQuestion'];
export type AdminQuestionVersion = components['schemas']['AdminQuestionVersion'];
export type QuestionInput = components['schemas']['QuestionInput'];
export type QuestionUpdateInput = components['schemas']['QuestionUpdateInput'];
export type Problem = components['schemas']['Problem'];
export type { paths, components } from './api';

export interface Resource<T> { data: T }
export interface Page<T> {
  data: T[];
  links: { first?: string | null; last?: string | null; prev: string | null; next: string | null };
  meta: { next_cursor?: string | null; prev_cursor?: string | null; per_page?: number };
}
export interface Catalogs {
  subjects: Subject[];
  topics: Topic[];
  'exam-types': ExamType[];
  'question-sources': QuestionSource[];
}
export type CatalogName = keyof Catalogs;

export type Question = components['schemas']['Question'];
export type QuestionVersion = components['schemas']['QuestionVersion'];
export type PracticeAttempt = components['schemas']['PracticeAttempt'];
export type StudyContext = components['schemas']['Context'];

export type ExamAttempt = components['schemas']['ExamAttempt'];
export type ExamSummary = components['schemas']['ExamSummary'];
export type ExamQuestion = components['schemas']['ExamQuestion'];
