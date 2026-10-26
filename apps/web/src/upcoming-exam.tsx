import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { calendarDate, nextExamRefreshDelay, upcomingCountdown, type UpcomingExam } from '@oggaq/study-core';
import { api } from './api';
import { useStudyContext } from './App';
import { ErrorNotice } from './ui';

export function UpcomingExamCard() {
  const context = useStudyContext();
  const calendar = useQuery<{data: UpcomingExam}>({ queryKey: ['upcoming-exam'], staleTime: 60000, refetchOnWindowFocus: 'always', refetchInterval: query => query.state.error ? 300000 : nextExamRefreshDelay(query.state.data?.data.server_time), refetchIntervalInBackground: false, queryFn: ({signal}) => api.request('get', '/api/v1/exam-calendar/next', {signal}) });
  const data = calendar.data?.data;const entry = data?.entry;const to = `/study/${context.id}/calendar${entry ? `?year=${entry.exam_date.slice(0,4)}` : ''}`;
  if (!data) return <section className="card card-tone-blue upcoming-placeholder" aria-label="Sıradaki sınav"><h2>Sıradaki sınav</h2>{calendar.isError ? <ErrorNotice error={calendar.error} retry={() => { void calendar.refetch(); }} /> : <p role="status" className="muted">Sınav tarihi yükleniyor…</p>}<Link to={to}>Sınav takvimini gör →</Link></section>;
  if (!entry || data.days_remaining === null) return <section className="card card-tone-blue upcoming-placeholder"><h2>Sıradaki sınav</h2><p>Yaklaşan sınav tarihi henüz doğrulanmadı.</p><Link to={to}>Sınav takvimini gör →</Link>{calendar.isError && <ErrorNotice error={calendar.error} retry={() => { void calendar.refetch(); }} />}</section>;
  return <div className="upcoming-container"><Link to={to} className="card card-tone-blue upcoming-exam" data-testid="upcoming-exam">
    <div className="upcoming-details"><span className="eyebrow">Sıradaki sınav</span><h2><time dateTime={entry.exam_date}>{calendarDate(entry.exam_date)}</time></h2><p>{entry.basic_number}. Temel · {entry.renewal_number}. Yenileme</p>{(data.status === 'stale' || calendar.isError) && <small>Son doğrulanmış takvim</small>}<span className="upcoming-link">Sınav takvimini gör →</span></div>
    <div className="upcoming-count" aria-label={upcomingCountdown(data.days_remaining)}><strong>{data.days_remaining === 0 ? 'Bugün' : data.days_remaining}</strong>{data.days_remaining > 0 && <span>gün kaldı</span>}</div>
  </Link>{calendar.isError && <ErrorNotice error={calendar.error} retry={() => { void calendar.refetch(); }} />}</div>;
}
