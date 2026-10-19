import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { cursorFromLink } from '@oggaq/api-client';
import { api } from '../api';
import { ErrorNotice, Icon, Loading, dateLabel } from '../ui';

export function OfficialExamList() {
  const [status, setStatus] = useState<'' | 'draft' | 'published'>('');
  const [cursor, setCursor] = useState<string | undefined>();
  const exams = useQuery({ queryKey: ['official-exams', status, cursor], queryFn: ({ signal }) => api.request('get', '/api/v1/admin/official-exams', { signal, query: { per_page: 20, cursor, ...(status ? { status } : {}) } }) });
  return <><header className="page-heading"><div><span className="eyebrow">MERKEZİ İÇERİK</span><h1>Çıkmış sınavlar</h1><p className="muted">Yayımlanmış soru sürümlerinden orijinal sıralı sınav şablonları hazırlayın. Yayımlanan şablon değiştirilemez.</p></div><Link className="button primary" to="/official-exams/new"><Icon name="plus" size={18} />Yeni çıkmış sınav</Link></header>
    <section className="card question-table"><div className="table-toolbar"><div><h2>Tüm çıkmış sınavlar</h2><span className="muted small-text">Bu sayfada {exams.data?.data.length ?? '—'} kayıt</span></div><div className="filters"><label><span>Durum</span><select aria-label="Durum" value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setCursor(undefined); }}><option value="">Tüm durumlar</option><option value="draft">Taslak</option><option value="published">Yayımlanmış</option></select></label></div></div>
      {exams.isPending ? <Loading text="Çıkmış sınavlar yükleniyor…" /> : exams.isError ? <div className="table-padding"><ErrorNotice error={exams.error} retry={() => { void exams.refetch(); }} /></div> : !exams.data.data.length ? <div className="empty-state"><span className="empty-icon"><Icon name="book" size={30} /></span><h3>Henüz çıkmış sınav yok</h3><p>Önce yayımlanmış sorular hazırlayın, sonra bunları sınav sırasına dizin.</p><Link className="button primary" to="/official-exams/new"><Icon name="plus" size={18} />İlk çıkmış sınavı oluştur</Link></div> : <>
        <div className="table-scroll"><table><thead><tr><th>Sınav</th><th>Tür</th><th>Silah</th><th>Yıl / dönem</th><th>Soru</th><th>Durum</th><th>Yayın</th></tr></thead><tbody>{exams.data.data.map((exam) => <tr key={exam.id}><td><Link className="question-link" to={`/official-exams/${exam.id}`}>{exam.title}</Link>{exam.exam_number && <span className="row-caption">Sınav no {exam.exam_number}</span>}</td><td>{exam.exam_type?.name ?? '—'}</td><td>{exam.weapon_status === 'armed' ? 'Silahlı' : exam.weapon_status === 'unarmed' ? 'Silahsız' : '—'}</td><td>{exam.year}{exam.term ? ` · ${exam.term}` : ''}</td><td>{exam.question_count}</td><td><span className={`badge ${exam.status === 'published' ? 'green' : 'amber'}`}><span />{exam.status === 'published' ? 'Yayında' : 'Taslak'}</span></td><td className="muted nowrap">{dateLabel(exam.published_at)}</td></tr>)}</tbody></table></div>
        <div className="pagination"><button className="button secondary small" disabled={!exams.data.links.prev} onClick={() => setCursor(cursorFromLink(exams.data.links.prev))}>Önceki</button><button className="button secondary small" disabled={!exams.data.links.next} onClick={() => setCursor(cursorFromLink(exams.data.links.next))}>Sonraki</button></div></>}
    </section></>;
}
