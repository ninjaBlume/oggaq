import { useState } from 'react';
import { Text, View } from 'react-native';
import type { components, User } from '@oggaq/shared-types';
import { ApiError, cursorFromLink } from '@oggaq/api-client';
import { jobApplicationStatusLabels, jobWeaponLabels, jobApplicationNotice } from '@oggaq/study-core';
import { api } from './api';
import { useResource, useTask } from './hooks';
import { Badge, Button, Card, EmptyState, ErrorNotice, Field, Loading, ScreenTitle, TextLink } from './ui';
import { Briefcase } from './icons';
import { useTheme } from './themeContext';
type Job = components['schemas']['JobPosting'];
type Application = components['schemas']['JobApplication'];
type Input = components['schemas']['ApplyForJobInput'];
const date = (value: string) => new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' }).format(new Date(value));

export function Jobs({ user }: { user: User }) {
  const [tab, setTab] = useState<'jobs' | 'applications'>('jobs');
  const [selected, setSelected] = useState<string | null>(null);
  function change(next: typeof tab) { setSelected(null); setTab(next); }
  return <><ScreenTitle title="İş Başvuruları" subtitle="ÖGG ilanlarını incele, başvur ve başvurularını takip et." />
    <View style={{ flexDirection: 'row', gap: 8 }}><View style={{ flex: 1 }}><Button compact secondary={tab !== 'jobs'} onPress={() => change('jobs')}>İlanlar</Button></View><View style={{ flex: 1 }}><Button compact secondary={tab !== 'applications'} onPress={() => change('applications')}>Başvurularım</Button></View></View>
    {selected ? <JobDetail key={selected} id={selected} user={user} back={() => setSelected(null)} applications={() => change('applications')} /> : tab === 'jobs' ? <JobList open={setSelected} /> : <MyApplications userId={user.id} />}
  </>;
}
function JobList({ open }: { open: (id: string) => void }) {
  const { styles } = useTheme(); const [cursor, setCursor] = useState<string>();
  const jobs = useResource((signal) => api.request('get', '/api/v1/job-postings', { signal, query: { per_page: 20, cursor } }), [cursor]);
  if (jobs.loading) return <Loading layout="list" label="İş ilanları yükleniyor" />;
  if (jobs.error) return <ErrorNotice error={jobs.error} retry={() => { void jobs.reload(); }} />;
  const page = jobs.data!;
  return <>{page.data.length === 0 ? <EmptyState icon={Briefcase} title="Henüz açık iş ilanı yok" message="Yayımlanan ÖGG ilanları burada görünecek." /> : page.data.map((job) => <Card key={job.id}><Text accessibilityRole="header" style={styles.heading}>{job.title}</Text><Text style={styles.muted}>{job.company_name} · {job.city}</Text><Text style={styles.text}>{jobWeaponLabels[job.weapon_requirement]}</Text>{job.expires_at && <Text style={styles.muted}>Son başvuru: {date(job.expires_at)}</Text>}{job.application_status && <Badge>{jobApplicationStatusLabels[job.application_status]}</Badge>}<Button secondary onPress={() => open(job.id)}>İlanı incele</Button></Card>)}<View style={styles.row}><Button compact secondary disabled={!page.links.prev} onPress={() => setCursor(cursorFromLink(page.links.prev))}>Önceki ilanlar</Button><Button compact secondary disabled={!page.links.next} onPress={() => setCursor(cursorFromLink(page.links.next))}>Sonraki ilanlar</Button></View></>;
}
function JobDetail({ id, user, back, applications }: { id: string; user: User; back: () => void; applications: () => void }) {
  const { styles } = useTheme();
  const job = useResource((signal) => api.request('get', '/api/v1/job-postings/{job}', { signal, params: { job: id } }), [id]);
  return <><TextLink onPress={back}>İlanlara dön</TextLink>{job.loading ? <Loading /> : job.error ? <ErrorNotice error={job.error} retry={() => { void job.reload(); }} /> : <><Card><Text accessibilityRole="header" style={styles.heading}>{job.data!.data.title}</Text><Text style={styles.muted}>{job.data!.data.company_name} · {job.data!.data.city}</Text><Text style={styles.text}>{jobWeaponLabels[job.data!.data.weapon_requirement]}</Text>{job.data!.data.expires_at && <Text style={styles.muted}>Son başvuru: {date(job.data!.data.expires_at!)}</Text>}<Text style={styles.text}>{job.data!.data.description}</Text></Card><ApplicationForm job={job.data!.data} user={user} applications={applications} /></>}</>;
}
function ApplicationForm({ job, user, applications }: { job: Job; user: User; applications: () => void }) {
  const { palette, styles } = useTheme(); const [sent, setSent] = useState(false);
  const [input, setInput] = useState<Input>({ contact_name: user.name, contact_email: user.email, phone: '', cover_letter: '' });
  const task = useTask<{ data: Application }>();
  if (sent || job.application_id) return <Card><Text accessibilityRole="header" style={styles.heading}>{sent ? 'Başvurun alındı.' : 'Bu ilana başvurdun.'}</Text><Text style={styles.muted}>Başvurunun durumunu Başvurularım bölümünden takip edebilirsin.</Text><Button secondary onPress={applications}>Başvurularımı gör</Button></Card>;
  const errors = task.error instanceof ApiError ? task.error : null;
  function submit() { void task.run(() => api.request('post', '/api/v1/job-postings/{job}/applications', { params: { job: job.id }, body: input }), () => setSent(true)); }
  const fields = [{ key: 'contact_name', label: 'Ad soyad', max: 100 }, { key: 'contact_email', label: 'E-posta adresi', max: 254 }, { key: 'phone', label: 'Telefon', max: 30 }, { key: 'cover_letter', label: 'Kısa ön yazı (isteğe bağlı)', max: 2000 }] as const;
  return <Card><Text accessibilityRole="header" style={styles.heading}>Başvuru bilgilerin</Text>{fields.map(({ key, label, max }) => <View key={key} style={{ gap: 6 }}><Field label={label} value={input[key] ?? ''} onChange={(value) => setInput((old) => ({ ...old, [key]: value }))} editable={!task.pending} email={key === 'contact_email'} phone={key === 'phone'} multiline={key === 'cover_letter'} maxLength={max} outlined />{errors?.field(key) && <Text style={{ color: palette.red }}>{errors.field(key)}</Text>}</View>)}<Text style={styles.muted}>{jobApplicationNotice}</Text>{errors?.field('job_posting_id') && <Text style={{ color: palette.red }}>{errors.field('job_posting_id')}</Text>}<ErrorNotice error={task.error} /><Button disabled={task.pending || !input.contact_name || !input.contact_email || !input.phone} onPress={submit}>{task.pending ? 'Başvuruluyor…' : 'Başvur'}</Button></Card>;
}
function MyApplications({ userId }: { userId: string }) {
  const { styles } = useTheme(); const [cursor, setCursor] = useState<string>();
  const applications = useResource((signal) => api.request('get', '/api/v1/me/job-applications', { signal, query: { per_page: 20, cursor } }), [userId, cursor]);
  if (applications.loading) return <Loading layout="list" label="Başvuruların yükleniyor" />;
  if (applications.error) return <ErrorNotice error={applications.error} retry={() => { void applications.reload(); }} />;
  const page = applications.data!;
  return <><TextLink onPress={() => { void applications.reload(); }}>Başvuruları yenile</TextLink>{page.data.length === 0 ? <EmptyState icon={Briefcase} title="Henüz iş başvurun yok" message="Bir ilanı inceleyip başvurduğunda burada takip edebilirsin." /> : page.data.map((item) => <Card key={item.id}><Badge>{jobApplicationStatusLabels[item.status]}</Badge><Text accessibilityRole="header" style={styles.heading}>{item.job.title}</Text><Text style={styles.muted}>{item.job.company_name} · {item.job.city}</Text><Text style={styles.muted}>Başvuru: {date(item.created_at)}</Text><Text style={styles.text}>{item.contact_name}</Text><Text style={styles.muted}>{item.contact_email} · {item.phone}</Text>{item.cover_letter && <Text style={styles.text}>{item.cover_letter}</Text>}</Card>)}<View style={styles.row}><Button compact secondary disabled={!page.links.prev} onPress={() => setCursor(cursorFromLink(page.links.prev))}>Önceki başvurular</Button><Button compact secondary disabled={!page.links.next} onPress={() => setCursor(cursorFromLink(page.links.next))}>Sonraki başvurular</Button></View></>;
}
