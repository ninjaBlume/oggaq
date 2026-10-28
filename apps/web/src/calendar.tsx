import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { calendarDate, calendarDaysRemaining, calendarNotice, calendarRules, calendarStaleNotice, calendarToday, calendarYears, orderedCalendarEntries, upcomingCountdown } from '@oggaq/study-core';
import { api } from './api';
import { PageIntro, useStudyContext } from './App';
import { Icon } from './icons';
import { ErrorNotice, Field, Loading } from './ui';

const ruleIcons = { unarmed: 'book', armed: 'shield', shooting: 'target', renewal: 'cap' } as const;

export function ExamCalendarPage() {
  const context = useStudyContext();
  const today = calendarToday();const current = Number(today.slice(0, 4));
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('year'));
  const year = Number.isInteger(requested) && requested >= 2020 && requested <= 2100 ? requested : current;
  const setYear = (value: number) => setParams({year: String(value)});
  const calendar = useQuery({ queryKey: ['exam-calendar', year], staleTime: 300000, queryFn: ({ signal }) => api.request('get', '/api/v1/exam-calendar', { signal, query: { year } }) });
  const data = calendar.data?.data;const entries = orderedCalendarEntries(data?.entries ?? [], today);
  return <div className="calendar-page">
    <Link to={`/study/${context.id}/deneme`} className="calendar-back"><Icon name="arrowLeft" size={18} />Ana sayfaya dön</Link>
    <PageIntro eyebrow="RESMÎ TAKVİM" title="Sınav tarihleri ve kurallar"><p>Hazırlığını resmî takvime göre planla.</p></PageIntro>
    <section className="card card-tone-indigo calendar-rules" data-testid="calendar-rules" aria-labelledby="calendar-rules-title">
      <div className="calendar-card-heading"><span className="calendar-symbol"><Icon name="rules" size={26} /></span><h2 id="calendar-rules-title">{calendarRules.title}</h2></div>
      <ul className="calendar-rule-list">{calendarRules.items.map(rule => <li key={rule.id}><Icon name={ruleIcons[rule.id]} /><div><h3>{rule.title}</h3><p>{rule.text}</p></div></li>)}</ul>
      <p className="muted">{calendarRules.note}</p>
      <div className="calendar-rule-links"><a className="button primary" href={calendarRules.sourceUrl} target="_blank" rel="noreferrer"><Icon name="external" size={18} />Resmî EGM sayfası</a><a href={calendarRules.regulationUrl} target="_blank" rel="noreferrer">Güncel yönetmeliği incele ↗</a></div>
    </section>
    <div className="calendar-section-heading"><h2>Sınav takvimi ve eğitim bitişleri</h2><div className="calendar-year"><Field label="Takvim yılı">{props => <select {...props} value={year} onChange={event => setYear(Number(event.target.value))}>{calendarYears(data, current).map(value => <option key={value} value={value}>{value}</option>)}</select>}</Field></div></div>
    {calendar.isPending ? <Loading /> : calendar.isError ? <ErrorNotice error={calendar.error} retry={() => { void calendar.refetch(); }} /> : data && <>
      {data.status === 'stale' && <p className="notice" role="status">{calendarStaleNotice}</p>}
      {entries.length === 0 ? <section className="card card-tone-blue empty"><h2>{year} takvimi henüz hazır değil</h2><p>Doğrulanmış resmî takvim alındığında burada görünecek.</p></section> : <section className="calendar-grid" aria-label={`${year} sınav takvimi`}>{entries.map((entry, index) => {
        const days = calendarDaysRemaining(entry.exam_date, today);const next = index === 0 && days !== null;
        return <article className={`card calendar-entry${next ? ' card-tone-blue calendar-entry-next' : ''}`} data-testid="calendar-entry" key={`${entry.basic_number}-${entry.renewal_number}`}>
          <div className="calendar-card-heading"><span className="calendar-symbol"><Icon name="calendar" size={22} /></span><div className="calendar-entry-name"><span className="eyebrow">{next ? 'Sıradaki sınav' : days === null ? 'Geçmiş sınav' : 'Yaklaşan sınav'}</span><h3><span>{entry.basic_number}. Temel</span><span> · </span><span>{entry.renewal_number}. Yenileme</span></h3></div>{days !== null && <span className="chip calendar-countdown">{upcomingCountdown(days)}</span>}</div>
          <div className="calendar-exam-date"><span className="muted">Sınav tarihi</span><time dateTime={entry.exam_date}>{calendarDate(entry.exam_date, false)}</time></div>
          <p className="muted">Eğitim bitişi: <time dateTime={entry.training_deadline}>{calendarDate(entry.training_deadline, false)}</time></p>
        </article>;
      })}</section>}
      <footer className="calendar-source"><p>{calendarNotice}</p><a href={data.source_url} target="_blank" rel="noreferrer">EGM takvimini aç ↗</a></footer>
    </>}
  </div>;
}
