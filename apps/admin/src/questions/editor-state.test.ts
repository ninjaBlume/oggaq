import { describe, expect, it } from 'vitest';
import { initialEditor, publicationRequirements, removeOption, toQuestionInput } from './editor-state';
import { xsrfCookie } from '../api';

describe('soru editörü', () => {
  it('seçenek silindiğinde doğru cevabı aynı seçenekte tutar', () => {
    const state = { ...initialEditor(), options: ['A', 'B', 'C'].map((text) => ({ key: text, text })), correct: 2 };
    const next = removeOption(state, 0);
    expect(next.options.map((option) => option.text)).toEqual(['B', 'C']);
    expect(toQuestionInput(next).correct_option_position).toBe(2);
  });
  it('doğru seçenek silinirse cevabı temizler', () => {
    expect(removeOption({ ...initialEditor(), correct: 0 }, 0).correct).toBeNull();
  });
  it('opsiyonel sınıflandırmaları null gönderir ve UI anahtarlarını göndermez', () => {
    const body = toQuestionInput(initialEditor());
    expect(body.topic_id).toBeNull();
    expect(body.source_id).toBeNull();
    expect(body.correct_option_position).toBeNull();
    expect(body.options).toEqual(['', '']);
  });
  it('taslak hazır olsa bile kaynak ve doğru cevap olmadan yayını engeller', () => {
    const state = { ...initialEditor(), subject_id: 'test', stem: 'Sentetik soru', options: [{ key: 'a', text: 'A' }, { key: 'b', text: 'B' }] };
    expect(publicationRequirements(state)).toEqual(['Doğru cevap seçilmeli', 'Kaynak seçilmeli']);
    expect(publicationRequirements({ ...state, correct: 0, source_id: 'test-source' })).toEqual([]);
  });
  it('tek seçenekli bir taslağı yayımlamaya hazır saymaz', () => {
    const state = { ...initialEditor(), subject_id: 'test', source_id: 'source', stem: 'Soru', correct: 0, options: [{ key: 'a', text: 'A' }] };
    expect(publicationRequirements(state)).toContain('En az iki dolu seçenek olmalı');
  });
});

describe('CSRF cookie çözümü', () => {
  it('yalnız XSRF değerini bulur ve URL decode eder', () => {
    expect(xsrfCookie('other=value; XSRF-TOKEN=one%2Btwo%3D; another=value')).toBe('one+two=');
    expect(xsrfCookie('other=value')).toBeNull();
    expect(xsrfCookie('XSRF-TOKEN=%broken')).toBeNull();
  });
});
