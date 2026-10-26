import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { calendarDate, calendarNotice, calendarPhase, calendarStaleNotice, calendarToday, calendarYears, vocabulary } from '@oggaq/study-core';
import { api } from './api';
import { PageIntro } from './App';
import { ErrorNotice, Field, Loading } from './ui';

export function ExamCalendarPage() {
  const current = Number(calendarToday().slice(0, 4));
  const [params, setParams] = useSearchParams();
  const requested = Number(params.get('year'));
  const year = Number.isInteger(requested) && requested >= 2020 && requested <= 2100 ? requested : current;
  const setYear = (value: number) => setParams({year: String(value)});
  const calendar = useQuery({ queryKey: ['exam-calendar', year], staleTime: 300000, queryFn: ({ signal }) => api.request('get', '/api/v1/exam-calendar', { signal, query: { year } }) });
  const data = calendar.data?.data;
  return <>
    <PageIntro eyebrow="RESMÎ TAKVİM" title={vocabulary.calendar.title}><p>Temel ve Yenileme sınav tarihleri ile eğitim bitiş günlerini takip et.</p></PageIntro>
    <div className="calendar-year"><Field label="Takvim yılı">{props => <select {...props} value={year} onChange={event => setYear(Number(event.target.value))}>{calendarYears(data, current).map(value => <option key={value} value={value}>{value}</option>)}</select>}</Field></div>
    {calendar.isPending ? <Loading /> : calendar.isError ? <ErrorNotice error={calendar.error} retry={() => { void calendar.refetch(); }} /> : data && <>
      {data.status === 'stale' && <p className="notice" role="status">{calendarStaleNotice}</p>}
      {data.entries.length === 0 ? <section className="card card-tone-blue empty"><h2>{year} takvimi henüz hazır değil</h2><p>Doğrulanmış resmî takvim alındığında burada görünecek.</p></section> : <section className="calendar-grid" aria-label={`${year} sınav takvimi`}>{data.entries.map(entry => <article className="card card-tone-blue calendar-entry" key={`${entry.basic_number}-${entry.renewal_number}`}>
        <span className="eyebrow">{calendarPhase(entry.exam_date)}</span><h2><time dateTime={entry.exam_date}>{calendarDate(entry.exam_date)}</time></h2>
        <div className="calendar-labels"><span className="chip">{entry.basic_number}. Temel</span><span className="chip">{entry.renewal_number}. Yenileme</span></div>
        <p className="muted">Eğitim bitişi: <time dateTime={entry.training_deadline}>{calendarDate(entry.training_deadline)}</time></p>
      </article>)}</section>}
      <section className="card card-tone-indigo calendar-source"><h2>Resmî kaynak</h2><p>{calendarNotice}</p>{data.verified_at && <p className="muted">Son doğrulama: {new Date(data.verified_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</p>}<a className="text-button" href={data.source_url} target="_blank" rel="noreferrer">EGM takvimini aç ↗</a></section>
    </>}
  </>;
}
