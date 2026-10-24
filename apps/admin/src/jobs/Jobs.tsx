import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, cursorFromLink } from '@oggaq/api-client';
import type { components } from '@oggaq/shared-types';
import { jobStatusLabels, jobWeaponLabels, jobApplicationStatusLabels } from '@oggaq/study-core';
import { api } from '../api';
import { ErrorNotice, Field, Loading, dateLabel, useNotify } from '../ui';

type Job = components['schemas']['JobPosting'];
type Application = components['schemas']['JobApplication'];
type Input = components['schemas']['SaveJobPostingInput'];

export function JobList() {
  const [cursor, setCursor] = useState<string>();
  const jobs = useQuery({ queryKey: ['jobs-admin', cursor], queryFn: ({ signal }) => api.request('get', '/api/v1/admin/job-postings', { signal, query: { per_page: 20, cursor } }) });
  return <><header className="page-heading"><div><span className="eyebrow">İŞ İLANLARI</span><h1>İş İlanları</h1><p className="muted">ÖGG ilanlarını yayımla, başvuruları incele ve durumlarını güncelle.</p></div><Link to="/is-ilanlari/yeni" className="button primary">İlan ekle</Link></header>
    {jobs.isPending ? <Loading /> : jobs.isError ? <ErrorNotice error={jobs.error} retry={() => { void jobs.refetch(); }} /> : <>
      {jobs.data.data.length === 0 ? <section className="card empty-state"><h2>Henüz iş ilanı yok</h2><p>Yeni bir ilan ekleyerek başla.</p></section> : <div className="job-admin-list">{jobs.data.data.map((job) => <Link key={job.id} to={`/is-ilanlari/${job.id}`} className="card job-admin-row"><div><span className="badge">{job.status === 'published' && !job.is_open ? 'Süresi doldu' : jobStatusLabels[job.status]}</span><h2>{job.title}</h2><p className="muted">{job.company_name} · {job.city} · {jobWeaponLabels[job.weapon_requirement]}</p></div><span>{job.applications_count ?? 0} başvuru →</span></Link>)}</div>}
      <div className="pagination"><button className="button secondary" disabled={!jobs.data.links.prev} onClick={() => setCursor(cursorFromLink(jobs.data.links.prev))}>Önceki</button><button className="button secondary" disabled={!jobs.data.links.next} onClick={() => setCursor(cursorFromLink(jobs.data.links.next))}>Sonraki</button></div>
    </>}
  </>;
}

export function JobEditor() {
  const { jobId } = useParams();
  const job = useQuery({ queryKey: ['job-admin', jobId], enabled: !!jobId, queryFn: ({ signal }) => api.request('get', '/api/v1/admin/job-postings/{job}', { signal, params: { job: jobId! } }) });
  if (jobId && job.isPending) return <Loading />;
  if (jobId && job.isError) return <ErrorNotice error={job.error} retry={() => { void job.refetch(); }} />;
  return <><Link className="text-button" to="/is-ilanlari">← İlanlara dön</Link><header className="page-heading"><div><h1>{jobId ? 'İlanı düzenle' : 'İlan ekle'}</h1><p className="muted">Yayımlanan ve süresi dolmamış ilanlar öğrencilerin İş İlanları bölümünde görünür.</p></div></header><JobForm key={`${jobId ?? 'new'}-${job.data?.data.revision ?? 0}`} job={job.data?.data} />{jobId && <JobApplications id={jobId} />}</>;
}

function JobForm({ job }: { job?: Job }) {
  const cache = useQueryClient(); const navigate = useNavigate(); const notify = useNotify();
  const [input, setInput] = useState<Input>(() => ({ title: job?.title ?? '', company_name: job?.company_name ?? '', city: job?.city ?? '', description: job?.description ?? '', weapon_requirement: job?.weapon_requirement ?? 'any', status: job?.status ?? 'draft', expires_at: job?.expires_at ?? null }));
  const [saved, setSaved] = useState(false);
  const save = useMutation({ mutationFn: () => job ? api.request('patch', '/api/v1/admin/job-postings/{job}', { params: { job: job.id }, body: { ...input, base_version: job.revision } }) : api.request('post', '/api/v1/admin/job-postings', { body: input }), onSuccess: (response) => {
    cache.setQueryData(['job-admin', response.data.id], response); void cache.invalidateQueries({ queryKey: ['jobs-admin'] }); setSaved(true); notify('İlan kaydedildi.'); if (!job) navigate(`/is-ilanlari/${response.data.id}`, { replace: true });
  } });
  const error = (name: string) => save.error instanceof ApiError ? save.error.field(name) : undefined;
  function change<K extends keyof Input>(key: K, value: Input[K]) { setSaved(false); setInput((old) => ({ ...old, [key]: value })); }
  return <section className="card job-editor"><form onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><fieldset disabled={save.isPending}>
    <Field label="İlan başlığı" name="title" error={error('title')}>{(p) => <input {...p} required maxLength={240} value={input.title} onChange={(e) => change('title', e.target.value)} />}</Field>
    <div className="job-form-grid"><Field label="Firma adı" name="company" error={error('company_name')}>{(p) => <input {...p} required maxLength={200} value={input.company_name} onChange={(e) => change('company_name', e.target.value)} />}</Field><Field label="Şehir / konum" name="city" error={error('city')}>{(p) => <input {...p} required maxLength={100} value={input.city} onChange={(e) => change('city', e.target.value)} />}</Field></div>
    <Field label="İlan açıklaması" name="description" error={error('description')}>{(p) => <textarea {...p} rows={7} required maxLength={10000} value={input.description} onChange={(e) => change('description', e.target.value)} />}</Field>
    <div className="job-form-grid"><Field label="ÖGG kart türü" name="weapon" error={error('weapon_requirement')}>{(p) => <select {...p} value={input.weapon_requirement} onChange={(e) => change('weapon_requirement', e.target.value as Input['weapon_requirement'])}>{Object.entries(jobWeaponLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>}</Field><Field label="Yayın durumu" name="status" error={error('status')}>{(p) => <select {...p} value={input.status} onChange={(e) => change('status', e.target.value as Input['status'])}>{Object.entries(jobStatusLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select>}</Field></div>
    <Field label="Son başvuru tarihi (isteğe bağlı)" name="deadline" error={error('expires_at')}>{(p) => <input {...p} type="datetime-local" value={input.expires_at ? localDate(input.expires_at) : ''} onChange={(e) => change('expires_at', e.target.value ? new Date(e.target.value).toISOString() : null)} />}</Field>
    <button className="button primary" type="submit">{save.isPending ? 'Kaydediliyor…' : 'İlanı kaydet'}</button>
  </fieldset></form>{save.isError && <ErrorNotice error={save.error} retry={() => { void cache.invalidateQueries({ queryKey: ['job-admin', job?.id] }); }} />}{saved && <p role="status">İlan kaydedildi.</p>}</section>;
}
function localDate(value: string) { const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }

function JobApplications({ id }: { id: string }) {
  const [cursor, setCursor] = useState<string>();
  const list = useQuery({ queryKey: ['job-applications-admin', id, cursor], queryFn: ({ signal }) => api.request('get', '/api/v1/admin/job-postings/{job}/applications', { signal, params: { job: id }, query: { per_page: 20, cursor } }) });
  return <section className="job-applications"><h2>Başvurular</h2><p className="muted">İletişim bilgileri yalnız platform yöneticilerine ve başvuru sahibine açıktır.</p>{list.isPending ? <Loading /> : list.isError ? <ErrorNotice error={list.error} retry={() => { void list.refetch(); }} /> : <>{list.data.data.length === 0 ? <div className="card"><p>Henüz başvuru yok.</p></div> : list.data.data.map((item) => <ApplicationRow key={`${item.id}-${item.revision}`} item={item} />)}<div className="pagination"><button className="button secondary" disabled={!list.data.links.prev} onClick={() => setCursor(cursorFromLink(list.data.links.prev))}>Önceki başvurular</button><button className="button secondary" disabled={!list.data.links.next} onClick={() => setCursor(cursorFromLink(list.data.links.next))}>Sonraki başvurular</button></div></>}</section>;
}
function ApplicationRow({ item }: { item: Application }) {
  const cache = useQueryClient(); const [status, setStatus] = useState(item.status);
  const review = useMutation({ mutationFn: () => api.request('patch', '/api/v1/admin/job-applications/{application}', { params: { application: item.id }, body: { status, base_version: item.revision } }), onSuccess: () => { void cache.invalidateQueries({ queryKey: ['job-applications-admin'] }); } });
  return <article className="card job-application"><h3>{item.contact_name}</h3><p>{item.contact_email} · {item.phone}</p><p className="muted">{dateLabel(item.created_at)}</p>{item.cover_letter && <p className="job-description">{item.cover_letter}</p>}<div className="actions"><label>Başvuru durumu<select aria-label={`${item.contact_name} başvuru durumu`} value={status} disabled={review.isPending} onChange={(e) => setStatus(e.target.value as Application['status'])}>{Object.entries(jobApplicationStatusLabels).map(([v, label]) => <option key={v} value={v}>{label}</option>)}</select></label><button type="button" className="button secondary" disabled={review.isPending || status === item.status} onClick={() => review.mutate()}>{review.isPending ? 'Kaydediliyor…' : 'Durumu kaydet'}</button></div>{review.isError && <ErrorNotice error={review.error} retry={() => { void cache.invalidateQueries({ queryKey: ['job-applications-admin'] }); }} />}</article>;
}
