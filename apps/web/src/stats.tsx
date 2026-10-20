import { useQuery } from '@tanstack/react-query';
import type { components } from '@oggaq/shared-types';
import { Link } from 'react-router-dom';
import { api } from './api';
import { PageIntro, useStudyContext } from './App';
import { ErrorNotice, Loading } from './ui';

const percent = (value: number | null) => (value === null ? '—' : `%${value.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`);

export function Stats() {
  const context = useStudyContext();
  const stats = useQuery({ queryKey: ['stats', context.id], queryFn: ({ signal }) => api.request('get', '/api/v1/contexts/{context}/stats', { params: { context: context.id }, signal }) });
  return <>
    <PageIntro eyebrow="İLERLEMEN" title="Başarı durumum"><p>{context.name} alanında cevapladığın sorulardan hesaplanır. Boş cevaplar doğru sayılmaz.</p></PageIntro>
    {stats.isPending ? <Loading /> : stats.isError ? <ErrorNotice error={stats.error} retry={() => { void stats.refetch(); }} /> : stats.data.data.answers.total === 0 && stats.data.data.exams.completed === 0 ? <section className="card empty"><h2>Henüz istatistik yok</h2><p>Sınavlara girdikçe sonuçların burada görünür.</p><Link className="button primary" to={`/study/${context.id}/deneme`}>Sınava girmeye başla</Link></section> : <Summary stats={stats.data.data} />}
  </>;
}

function Summary({ stats }: { stats: components['schemas']['StudyStats'] }) {
  const { answers, exams, subjects } = stats;
  return <>
    <section className="stat-grid" aria-label="Genel özet">
      <div className="card stat"><span className="eyebrow">DOĞRULUK</span><strong>{percent(answers.accuracy_percent)}</strong><small>{answers.correct} doğru · {answers.incorrect} yanlış · {answers.blank} boş</small></div>
      <div className="card stat"><span className="eyebrow">CEVAPLANAN</span><strong>{answers.total}</strong><small>Tekrarlar ayrı sayılır</small></div>
      <div className="card stat"><span className="eyebrow">TAMAMLANAN DENEME</span><strong>{exams.completed}</strong><small>Ortalama {percent(exams.average_score_percent)}</small></div>
      <div className="card stat"><span className="eyebrow">EN İYİ DENEME</span><strong>{percent(exams.best_score_percent)}</strong><small>Doğru cevap yüzdesi</small></div>
    </section>
    <h2 className="section-title">Derslere göre</h2>
    <section className="subject-stats" aria-label="Ders bazlı başarı">{subjects.map((subject) => <div key={subject.subject_id} className="card subject-stat"><div className="subject-stat-head"><h3>{subject.name}</h3><span>{percent(subject.accuracy_percent)}</span></div><div className="bar" role="img" aria-label={`${subject.name}: ${subject.correct} doğru, ${subject.incorrect} yanlış, ${subject.blank} boş`}><span className="bar-correct" style={{ width: `${(subject.correct / Math.max(subject.total, 1)) * 100}%` }} /><span className="bar-incorrect" style={{ width: `${(subject.incorrect / Math.max(subject.total, 1)) * 100}%` }} /></div><small>{subject.correct} doğru · {subject.incorrect} yanlış · {subject.blank} boş</small></div>)}</section>
  </>;
}
