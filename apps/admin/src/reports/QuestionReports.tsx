import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, cursorFromLink } from '@oggaq/api-client';
import type { components } from '@oggaq/shared-types';
import { reportNoteLimit, reportReasonLabel, vocabulary } from '@oggaq/study-core';
import { api } from '../api';
import { ErrorNotice, Field, Icon, Loading, Modal, dateLabel, useNotify } from '../ui';

type Group = components['schemas']['QuestionReportGroup'];
type Status = 'open' | 'fixed' | 'dismissed';
const tabs: { status: Status; label: string }[] = [{ status: 'open', label: 'Açık' }, { status: 'fixed', label: 'Çözüldü' }, { status: 'dismissed', label: 'Geçersiz' }];

export function useReportSummary() {
  return useQuery({ queryKey: ['question-report-summary'], queryFn: ({ signal }) => api.request('get', '/api/v1/admin/question-reports/summary', { signal }), refetchInterval: 60_000 });
}

// Closing is one decision for the whole question: every open report of it is fixed or does not hold.
function ResolveDialog({ group, status, onClose }: { group: Group; status: 'fixed' | 'dismissed'; onClose: () => void }) {
  const [note, setNote] = useState('');
  const cache = useQueryClient();
  const notify = useNotify();
  const resolve = useMutation({
    mutationFn: async () => (await api.request('post', '/api/v1/admin/question-reports/{question}/resolve', { params: { question: group.question_id }, body: { status, resolution_note: note.trim() === '' ? null : note.trim() } })).data,
    onSuccess: (result) => {
      void cache.invalidateQueries({ queryKey: ['question-reports'] });
      void cache.invalidateQueries({ queryKey: ['question-report-summary'] });
      notify(`${result.closed_reports} bildirim ${status === 'fixed' ? 'düzeltildi olarak' : 'geçersiz olarak'} kapatıldı.`);
      onClose();
    },
    // Someone else closed it meanwhile: the list is stale, not the action wrong.
    onError: (error) => { if (error instanceof ApiError && error.status === 409) { void cache.invalidateQueries({ queryKey: ['question-reports'] }); void cache.invalidateQueries({ queryKey: ['question-report-summary'] }); } },
  });
  const title = status === 'fixed' ? 'Düzeltildi olarak kapat' : 'Geçersiz say';
  return <Modal title={title} onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); if (!resolve.isPending) resolve.mutate(); }}>
      <div className="modal-body">
        <p>{status === 'fixed' ? 'Sorunun açık bildirimleri düzeltildi olarak kapanır.' : 'Sorunun açık bildirimleri geçersiz sayılarak kapanır.'} Kapanan bildirimler geçmişte okunur kalır.</p>
        <p className="report-dialog-stem">{group.stem_excerpt}</p>
        <Field label="Not (isteğe bağlı)" name="resolution-note" hint={`${note.length}/${reportNoteLimit}`} error={resolve.error instanceof ApiError ? resolve.error.field('resolution_note') : undefined}>{(props) => <textarea {...props} rows={3} maxLength={reportNoteLimit} value={note} onChange={(event) => setNote(event.target.value)} />}</Field>
        {resolve.isError && <ErrorNotice error={resolve.error} />}
      </div>
      <footer className="modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={resolve.isPending}>Vazgeç</button><button type="submit" className="button primary" disabled={resolve.isPending}>{resolve.isPending ? 'Kapatılıyor…' : title}</button></footer>
    </form>
  </Modal>;
}

function GroupCard({ group, status }: { group: Group; status: Status }) {
  const [dialog, setDialog] = useState<'fixed' | 'dismissed' | null>(null);
  const edited = group.current_version > group.reported_version;
  return <article className="card report-card" aria-label={`${group.report_count} bildirim: ${group.stem_excerpt}`}>
    <header className="report-card-head">
      <div className="report-card-meta">
        {group.subject && <span className="chip">{group.subject.name}</span>}
        <span className="badge amber"><span />{group.report_count} bildirim</span>
        {edited && <span className="badge green"><span />Bildirimden sonra düzenlendi (sürüm {group.reported_version} → {group.current_version})</span>}
      </div>
      <span className="muted small-text">{group.first_reported_at === group.last_reported_at ? dateLabel(group.last_reported_at) : `${dateLabel(group.first_reported_at)} – ${dateLabel(group.last_reported_at)}`}</span>
    </header>
    <p className="report-stem">{group.stem_excerpt}</p>
    <ul className="report-reasons" aria-label="Bildirim nedenleri">{Object.entries(group.reasons).map(([reason, count]) => <li key={reason} className="chip muted-chip">{reportReasonLabel(reason)} · {count}</li>)}</ul>
    {group.notes.length > 0 && <ul className="report-notes" aria-label="Öğrenci notları">{group.notes.map((item, index) => <li key={index}><blockquote>{item.note}</blockquote><span className="muted small-text">{reportReasonLabel(item.reason)} · {dateLabel(item.created_at)}</span></li>)}</ul>}
    <div className="report-used"><strong className="small-text">Kullanıldığı sınavlar</strong>{group.exams.length === 0 ? <span className="muted small-text">Hiçbir sınavda kullanılmıyor.</span> : <ul>{group.exams.map((exam) => <li key={exam.id}><Link to={`/official-exams/${exam.id}#soru-${exam.position}`}>{exam.title} · {exam.position}. soru</Link>{exam.status === 'draft' && <span className="badge amber"><span />Taslak</span>}</li>)}</ul>}</div>
    {group.resolution && <p className="report-resolution"><span className={`badge ${group.resolution.status === 'fixed' ? 'green' : 'amber'}`}><span />{group.resolution.status === 'fixed' ? 'Düzeltildi' : 'Geçersiz sayıldı'}</span> <span className="muted small-text">{dateLabel(group.resolution.resolved_at)}</span>{group.resolution.note && <span className="report-resolution-note">{group.resolution.note}</span>}</p>}
    <footer className="question-card-actions">
      {status === 'open' && <><button type="button" className="button primary small" onClick={() => setDialog('fixed')}><Icon name="check" size={16} />Düzeltildi</button><button type="button" className="button secondary small" onClick={() => setDialog('dismissed')}>Geçersiz say</button></>}
      <Link className="button secondary small" to={`/questions/${group.question_id}`}>Sürüm geçmişi</Link>
    </footer>
    {dialog && <ResolveDialog group={group} status={dialog} onClose={() => setDialog(null)} />}
  </article>;
}

export function QuestionReportsPage() {
  const [params, setParams] = useSearchParams();
  const status: Status = tabs.some((tab) => tab.status === params.get('durum')) ? (params.get('durum') as Status) : 'open';
  const summary = useReportSummary();
  const list = useInfiniteQuery({
    queryKey: ['question-reports', status], initialPageParam: undefined as string | undefined,
    queryFn: ({ signal, pageParam }) => api.request('get', '/api/v1/admin/question-reports', { signal, query: { status, per_page: 20, cursor: pageParam } }),
    getNextPageParam: (page) => cursorFromLink(page.links.next),
  });
  const groups = list.data?.pages.flatMap((page) => page.data) ?? [];
  // Read before the narrowing below: a failed "more" page keeps the earlier pages and offers a retry.
  const moreFailed = list.isFetchNextPageError;
  const fetchMore = () => { void list.fetchNextPage(); };
  const moreError = list.error;
  return <>
    <header className="page-heading"><div><span className="eyebrow">MERKEZİ İÇERİK</span><h1>{vocabulary.reports.title}</h1><p className="muted">Öğrencilerin sınav sonucundan “Soruyu bildir” ile gönderdikleri bildirimler soruya göre gruplanır. Bildirenin kimliği görünmez. Soruyu sınavda düzeltin, ardından bildirimi kapatın.</p></div></header>
    <div className="type-tabs" role="group" aria-label="Bildirim durumu">{tabs.map((tab) => <button type="button" key={tab.status} className={`topic-chip ${status === tab.status ? 'active' : ''}`} aria-pressed={status === tab.status} onClick={() => setParams(tab.status === 'open' ? {} : { durum: tab.status })}>{tab.label}{tab.status === 'open' && summary.data && <small>{summary.data.data.open_questions}</small>}</button>)}</div>
    {list.isPending ? <Loading text="Bildirimler yükleniyor…" /> : list.isError ? <ErrorNotice error={list.error} retry={() => { void list.refetch(); }} /> : groups.length === 0
      ? <section className="card"><div className="empty-state"><span className="empty-icon"><Icon name="check" size={30} /></span><h3>{status === 'open' ? 'Açık bildirim yok' : status === 'fixed' ? 'Çözülmüş bildirim yok' : 'Geçersiz sayılan bildirim yok'}</h3><p>{status === 'open' ? 'Öğrenciler bir sınav sonucunda soru bildirdiğinde burada görünür.' : 'Kapatılan bildirimler burada geçmiş olarak okunur.'}</p></div></section>
      : <div className="report-list">{groups.map((group) => <GroupCard key={`${status}-${group.question_id}`} group={group} status={status} />)}
        {list.hasNextPage && <div className="report-more"><button type="button" className="button secondary" disabled={list.isFetchingNextPage} onClick={fetchMore}>{list.isFetchingNextPage ? 'Yükleniyor…' : 'Daha fazla göster'}</button></div>}
        {moreFailed && <ErrorNotice error={moreError} retry={fetchMore} />}</div>}
  </>;
}
