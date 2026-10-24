import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, cursorFromLink } from '@oggaq/api-client';
import type { components, User } from '@oggaq/shared-types';
import { jobApplicationStatusLabels, jobWeaponLabels, jobApplicationNotice } from '@oggaq/study-core';
import { api } from './api';
import { useSession } from './auth';
import { PageIntro } from './App';
import { ErrorNotice, Field, Loading, dateLabel } from './ui';
import { Icon } from './icons';
type Job = components['schemas']['JobPosting'];
type ApplicationInput = components['schemas']['ApplyForJobInput'];

export function Jobs() {
  const user = useSession().data!;
  const [tab, setTab] = useState<'jobs' | 'applications'>('jobs');
  const [selected, setSelected] = useState<string | null>(null);
  const jobs = useInfiniteQuery({ queryKey: ['jobs'], initialPageParam: undefined as string | undefined, enabled: tab === 'jobs' && !selected, queryFn: ({ signal, pageParam }) => api.request('get', '/api/v1/job-postings', { signal, query: { per_page: 20, cursor: pageParam } }), getNextPageParam: (p) => cursorFromLink(p.links.next) });
  const applications = useInfiniteQuery({ queryKey: ['my-job-applications', user.id], initialPageParam: undefined as string | undefined, enabled: tab === 'applications', staleTime: 0, queryFn: ({ signal, pageParam }) => api.request('get', '/api/v1/me/job-applications', { signal, query: { per_page: 20, cursor: pageParam } }), getNextPageParam: (p) => cursorFromLink(p.links.next) });
  const detail = useQuery({ queryKey: ['job', selected], enabled: !!selected, staleTime: 0, queryFn: ({ signal }) => api.request('get', '/api/v1/job-postings/{job}', { signal, params: { job: selected! } }) });
  function change(next: typeof tab) { setSelected(null); setTab(next); }
  return <><PageIntro eyebrow="ÖGG İŞ İLANLARI" title="İş Başvuruları"><p>Özel güvenlik ilanlarını incele, uygulama içinden başvur ve başvurularını takip et.</p></PageIntro>
    <nav className="tab-bar" aria-label="İş başvurusu bölümü"><button className={`tab-button${tab === 'jobs' ? ' active' : ''}`} aria-pressed={tab === 'jobs'} onClick={() => change('jobs')}>İlanlar</button><button className={`tab-button${tab === 'applications' ? ' active' : ''}`} aria-pressed={tab === 'applications'} onClick={() => change('applications')}>Başvurularım</button></nav>
    {selected ? <><button className="text-button" onClick={() => setSelected(null)}>← İlanlara dön</button>{detail.isPending ? <Loading /> : detail.isError ? <ErrorNotice error={detail.error} retry={() => { void detail.refetch(); }} /> : <JobDetail key={selected} job={detail.data.data} user={user} applications={() => change('applications')} />}</> : tab === 'jobs' ? <>
      {jobs.isPending ? <Loading /> : jobs.isError && !jobs.data ? <ErrorNotice error={jobs.error} retry={() => { void jobs.refetch(); }} /> : <>
        {!jobs.data?.pages.some((p) => p.data.length) ? <section className="card empty"><Icon name="briefcase" size={32} /><h2>Henüz açık iş ilanı yok</h2><p>Yayımlanan ÖGG ilanları burada görünecek.</p></section> : <div className="job-grid">{jobs.data.pages.flatMap((p) => p.data).map((job) => <article className="card job-card" key={job.id}><div className="exam-mark"><Icon name="briefcase" size={22} /></div><h2>{job.title}</h2><p className="muted">{job.company_name} · {job.city}</p><p>{jobWeaponLabels[job.weapon_requirement]}</p>{job.expires_at && <p className="muted">Son başvuru: {dateLabel(job.expires_at)}</p>}{job.application_status && <span className="chip">{jobApplicationStatusLabels[job.application_status]}</span>}<button className="button secondary" onClick={() => setSelected(job.id)}>İlanı incele</button></article>)}</div>}
        {jobs.hasNextPage && <button className="button secondary" disabled={jobs.isFetchingNextPage} onClick={() => { void jobs.fetchNextPage(); }}>Daha fazla ilan</button>}{jobs.isFetchNextPageError && <ErrorNotice error={jobs.error} retry={() => { void jobs.fetchNextPage(); }} />}{jobs.isError && jobs.data && !jobs.isFetchNextPageError && <ErrorNotice error={jobs.error} retry={() => { void jobs.refetch(); }} />}
      </>}
    </> : <>
      <button className="text-button" disabled={applications.isFetching} onClick={() => { void applications.refetch(); }}>Başvuruları yenile</button>{applications.isPending ? <Loading /> : applications.isError && !applications.data ? <ErrorNotice error={applications.error} retry={() => { void applications.refetch(); }} /> : <>
        {!applications.data?.pages.some((p) => p.data.length) ? <section className="card empty"><h2>Henüz iş başvurun yok</h2><p>Bir ilanı inceleyip başvurduğunda burada takip edebilirsin.</p></section> : <div className="job-grid">{applications.data.pages.flatMap((p) => p.data).map((item) => <article className="card job-card" key={item.id}><span className="chip">{jobApplicationStatusLabels[item.status]}</span><h2>{item.job.title}</h2><p className="muted">{item.job.company_name} · {item.job.city}</p><p className="muted">Başvuru: {dateLabel(item.created_at)}</p><details><summary>Başvuru bilgilerim</summary><p>{item.contact_name}</p><p>{item.contact_email}</p><p>{item.phone}</p>{item.cover_letter && <p className="job-description">{item.cover_letter}</p>}</details></article>)}</div>}
        {applications.hasNextPage && <button className="button secondary" disabled={applications.isFetchingNextPage} onClick={() => { void applications.fetchNextPage(); }}>Daha fazla başvuru</button>}{applications.isFetchNextPageError && <ErrorNotice error={applications.error} retry={() => { void applications.fetchNextPage(); }} />}{applications.isError && applications.data && !applications.isFetchNextPageError && <ErrorNotice error={applications.error} retry={() => { void applications.refetch(); }} />}
      </>}
    </>}
  </>;
}
function JobDetail({ job, user, applications }: { job: Job; user: User; applications: () => void }) {
  const cache = useQueryClient();
  const [input, setInput] = useState<ApplicationInput>({ contact_name: user.name, contact_email: user.email, phone: '', cover_letter: '' });
  const apply = useMutation({ mutationFn: () => api.request('post', '/api/v1/job-postings/{job}/applications', { params: { job: job.id }, body: input }), onSuccess: () => { void cache.invalidateQueries({ queryKey: ['my-job-applications'] }); void cache.invalidateQueries({ queryKey: ['jobs'] }); void cache.invalidateQueries({ queryKey: ['job', job.id] }); } });
  const error = (field: string) => apply.error instanceof ApiError ? apply.error.field(field) : undefined;
  return <section className="card job-detail"><h2>{job.title}</h2><p className="muted">{job.company_name} · {job.city} · {jobWeaponLabels[job.weapon_requirement]}</p>{job.expires_at && <p>Son başvuru: {dateLabel(job.expires_at)}</p>}<p className="job-description">{job.description}</p>
    {apply.isSuccess || job.application_id ? <div className="notice"><p role="status">{apply.isSuccess ? 'Başvurun alındı.' : 'Bu ilana başvurdun.'}</p><button className="text-button" onClick={applications}>Başvurularımı gör</button></div> : <form onSubmit={(event) => { event.preventDefault(); apply.mutate(); }}><h3>Başvuru bilgilerin</h3><fieldset disabled={apply.isPending}>
      <Field label="Ad soyad" error={error('contact_name')}>{(p) => <input {...p} autoComplete="name" required maxLength={100} value={input.contact_name} onChange={(e) => setInput({ ...input, contact_name: e.target.value })} />}</Field>
      <Field label="E-posta adresi" error={error('contact_email')}>{(p) => <input {...p} type="email" autoComplete="email" required maxLength={254} value={input.contact_email} onChange={(e) => setInput({ ...input, contact_email: e.target.value })} />}</Field>
      <Field label="Telefon" error={error('phone')}>{(p) => <input {...p} type="tel" autoComplete="tel" required minLength={7} maxLength={30} value={input.phone} onChange={(e) => setInput({ ...input, phone: e.target.value })} />}</Field>
      <Field label="Kısa ön yazı (isteğe bağlı)" error={error('cover_letter')}>{(p) => <textarea {...p} rows={4} maxLength={2000} value={input.cover_letter ?? ''} onChange={(e) => setInput({ ...input, cover_letter: e.target.value })} />}</Field>
      <p className="muted job-sharing">{jobApplicationNotice}</p><button className="button primary" type="submit">{apply.isPending ? 'Başvuruluyor…' : 'Başvur'}</button>
    </fieldset></form>}{apply.isError && <><ErrorNotice error={apply.error} />{error('job_posting_id') && <p role="alert">{error('job_posting_id')}</p>}</>}
  </section>;
}
