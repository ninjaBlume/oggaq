import { describe, expect, it } from 'vitest';
import { examPeriodLabel } from './exam-date';

const renewal = { year: 2026, term: '08', exam_number: '98', education_type: 'renewal' as const };
const citation = (date: string) => ({ citation: `EGM 98. Yenileme Eğitim A kitapçığı, ${date}. İncelenmiş sentetik test kaynağı.` });

describe('exam card calendar dates', () => {
  it.each(['29.08.2026', '29/08/2026', '29-08-2026', '2026-08-29'])(
    'reads the complete legacy title date %s without moving it into the display title', date => {
      expect(examPeriodLabel({ year: 2026, term: '08', title: `Sentetik temel sınav (${date}) — Silahlı` })).toBe('29 Ağustos 2026');
    },
  );
  it('uses the reviewed booklet citation for renewal, unarmed and subject exam metadata', () => {
    expect(examPeriodLabel({ ...renewal, title: 'Sentetik yenileme ders sınavı', source: citation('2026-08-29') })).toBe('29 Ağustos 2026');
  });
  it('accepts matching source and title dates', () => {
    expect(examPeriodLabel({ ...renewal, title: 'Sentetik sınav (29.08.2026)', source: citation('2026-08-29') })).toBe('29 Ağustos 2026');
  });
  it.each(['2026-02-29', '2026-08-32', '2026-13-01', '2026-00-10', '2026-08-00', '2025-08-29', '2026-07-29'])(
    'does not normalize an invalid or contradictory date %s into an invented exam day', date => {
      expect(examPeriodLabel({ ...renewal, source: citation(date) })).toBe('Ağustos 2026');
    },
  );
  it('accepts a real leap day', () => {
    expect(examPeriodLabel({ year: 2024, term: '02', title: 'Sentetik sınav (29.02.2024)' })).toBe('29 Şubat 2024');
  });
  it('rejects conflicting title and source dates', () => {
    expect(examPeriodLabel({ ...renewal, title: 'Sentetik sınav (28.08.2026)', source: citation('2026-08-29') })).toBe('Ağustos 2026');
  });
  it('rejects a citation belonging to a different education or exam number', () => {
    expect(examPeriodLabel({ ...renewal, exam_number: '97', source: citation('2026-08-29') })).toBe('Ağustos 2026');
    expect(examPeriodLabel({ ...renewal, education_type: 'basic', source: citation('2026-08-29') })).toBe('Ağustos 2026');
  });
  it('does not mistake a download/publication date or a URL for the exam date', () => {
    expect(examPeriodLabel({ ...renewal, source: { citation: '2026-08-29 tarihinde indirildi: https://example.test/2026-08-29.pdf' } })).toBe('Ağustos 2026');
  });
  it('keeps incomplete or non-date metadata without inventing a day', () => {
    expect(examPeriodLabel({ year: 2026, term: '07' })).toBe('Temmuz 2026');
    expect(examPeriodLabel({ year: 2026, term: 'Ağustos' })).toBe('Ağustos 2026');
    expect(examPeriodLabel({ year: 2026, term: '1. dönem' })).toBe('1. dönem 2026');
    expect(examPeriodLabel({ year: 2026, term: null, source: null })).toBe('2026');
  });
});
