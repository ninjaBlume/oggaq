import { Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ExamAttempt } from '@oggaq/shared-types';
import { api } from './api';
import { PageIntro } from './App';
import { ErrorNotice } from './ui';
import { ExamScorePanel } from './scoring';
import { ReportQuestion } from './report';

type Row = ExamAttempt['questions'][number];
export function CompletedExam({ exam, contextId }: { exam: ExamAttempt; contextId: string }) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' }); }, [exam.id]);
  return <>
    <Link className="back-link" to={`/study/${contextId}/sonuclar`}>← Sonuçlarıma dön</Link>
    <PageIntro eyebrow="DENEME TAMAMLANDI" title="Deneme sonucun"><p>Cevapların, başladığın soru sürümlerinden değerlendirildi.</p></PageIntro>
    {exam.result && <section className="card exam-result" role="status"><div><span className="eyebrow">DOĞRU YÜZDESİ</span><strong>%{exam.result.score_percent}</strong></div><p><b>{exam.result.correct}</b> doğru · <b>{exam.result.incorrect}</b> yanlış · <b>{exam.result.blank}</b> boş</p><p>{exam.finish_reason === 'expired' ? 'Süre dolduğunda tamamlandı.' : 'Denemeyi sen bitirdin.'} Çalışma puanı; geçme / kalma kararı değildir.</p></section>}
    <ExamScorePanel exam={exam} contextId={contextId} />
    <section className="exam-review" aria-label="Sınav soruları ve cevapların"><header><h2>Cevaplarını incele</h2><p className="muted">{exam.question_count} sorunun tamamı aşağıda. Cevaplarını ve açıklamaları kaydırarak inceleyebilirsin.</p></header>
      {exam.questions.map((row) => <ResultQuestion key={row.id} row={row} contextId={contextId} examId={exam.id} total={exam.question_count} />)}
    </section>
  </>;
}
function ResultQuestion({ row, contextId, examId, total }: { row: Row; contextId: string; examId: string; total: number }) {
  const cache = useQueryClient();
  const favorite = useMutation({
    mutationFn: (next: boolean) => api.request(next ? 'put' : 'delete', '/api/v1/contexts/{context}/favorites/{question}', { params: { context: contextId, question: row.question_id } }),
    onSuccess: (response) => {
      cache.setQueryData<{ data: ExamAttempt }>(['exam', contextId, examId], (old) => old && { data: { ...old.data, questions: old.data.questions.map((item) => item.question_id === response.data.question_id ? { ...item, is_favorite: response.data.favorite } : item) } });
      void cache.invalidateQueries({ queryKey: ['review', contextId] });
    },
  });
  const feedback = row.feedback;
  return <article className="card practice-card result-question" data-testid={`result-question-${row.position}`} aria-labelledby={`result-question-title-${row.id}`}>
    <div className="question-meta"><span>Soru {row.position} / {total}</span><span className={`result-outcome ${feedback?.outcome ?? ''}`}>{feedback?.outcome === 'correct' ? 'Doğru' : feedback?.outcome === 'incorrect' ? 'Yanlış' : 'Boş bırakıldı'}</span></div>
    <h3 className="question-stem" id={`result-question-title-${row.id}`}>{row.question.stem}</h3>
    <fieldset className="answer-options" disabled><legend className="sr-only">{row.position}. sorunun cevap seçenekleri</legend>{row.question.options.map((option) => {
      const selected = row.selected_option_id === option.id; const correct = feedback?.correct_option_id === option.id;
      return <label className={`answer-option ${correct ? 'correct-option' : selected ? 'incorrect-option' : ''}`} key={option.id}><input type="radio" name={`result-answer-${row.id}`} checked={selected} readOnly /><span className="option-letter">{String.fromCharCode(64 + option.position)}</span><span className="option-text">{option.text}</span>{(correct || selected) && <span className="option-note">{correct && selected ? 'Doğru cevap · Senin cevabın' : correct ? 'Doğru cevap' : 'Senin cevabın'}</span>}</label>;
    })}</fieldset>
    {feedback?.explanation && <section className="result-explanation"><h4>Açıklama</h4><p>{feedback.explanation}</p></section>}
    <div className="result-actions"><button className="text-button" aria-pressed={row.is_favorite} disabled={favorite.isPending} onClick={() => favorite.mutate(!row.is_favorite)}>{row.is_favorite ? '★ Favorilerde' : '☆ Favoriye ekle'}</button><ReportQuestion contextId={contextId} examId={examId} row={row} /></div>
    {favorite.isError && <ErrorNotice error={favorite.error} retry={() => favorite.mutate(!row.is_favorite)} />}
  </article>;
}
