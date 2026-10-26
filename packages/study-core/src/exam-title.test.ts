import { describe, expect, it } from 'vitest';
import { examQuestionTitle } from './index';

describe('past-exam question list titles', () => {
  it('uses the actual education and exam number, independently of armed status or legacy titles', () => {
    expect(examQuestionTitle({ exam_number: '122', education_type: 'basic' })).toBe('122. Temel Eğitim Sınav Soruları');
    expect(examQuestionTitle({ exam_number: '98', education_type: 'renewal' })).toBe('98. Yenileme Sınav Soruları');
    expect(examQuestionTitle({ exam_number: '122', education_type: 'renewal' })).toBe('122. Yenileme Sınav Soruları');
    expect(examQuestionTitle({ exam_number: '104', education_type: 'weapon_difference' })).toBe('104. Silah Farkı Sınav Soruları');
  });
  it('preserves the legacy basic default without inventing missing numbers', () => {
    expect(examQuestionTitle({ exam_number: '122' })).toBe('122. Temel Eğitim Sınav Soruları');
    expect(examQuestionTitle({ exam_number: null, education_type: 'renewal' })).toBe('Yenileme Sınav Soruları');
    expect(examQuestionTitle({ exam_number: ' ', education_type: 'basic' })).toBe('Temel Eğitim Sınav Soruları');
  });
});
