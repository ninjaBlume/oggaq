import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { components } from '@oggaq/shared-types';
import { api, collect } from '../api';
import { ErrorNotice, Icon, Loading } from '../ui';

type Exam = components['schemas']['AdminOfficialExam'];
type Group = { key: string; number: string | null; typeName: string; year: number; term: string | null; armed?: Exam; unarmed?: Exam; other: Exam[] };

const needsAttention = (exam: Exam) => exam.status === 'draft' || exam.draft_question_count > 0 || exam.outdated_question_count > 0;

// One row per exam (number, type, year) with its armed and unarmed variants side by side, so the work left is visible at a glance.
export function groupExams(exams: Exam[]): Group[] {
  const groups = new Map<string, Group>();
  for (const exam of exams) {
    const key = `${exam.exam_type_id}|${exam.year}|${exam.exam_number ?? exam.title}|${exam.term ?? ''}`;
    const group = groups.get(key) ?? { key, number: exam.exam_number, typeName: exam.exam_type?.name ?? '', year: exam.year, term: exam.term, other: [] };
    if (exam.weapon_status === 'armed' && !group.armed) group.armed = exam; else if (exam.weapon_status === 'unarmed' && !group.unarmed) group.unarmed = exam; else group.other.push(exam);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.year - a.year || (Number(b.number) || 0) - (Number(a.number) || 0));
}

function ExamCell({ exam }: { exam?: Exam }) {
  if (!exam) return <span className="muted">—</span>;
  return <Link className="exam-cell-link" to={`/official-exams/${exam.id}`} aria-label={`${exam.title} sınavını aç`}>
    <span className={`badge ${exam.status === 'published' ? 'green' : 'amber'}`}><span />{exam.status === 'published' ? 'Yayında' : 'Taslak'}</span><strong>{exam.question_count} soru</strong>
    {(exam.draft_question_count > 0 || exam.outdated_question_count > 0) && <span className="exam-cell-meta">{exam.draft_question_count > 0 && <span className="exam-attention">{exam.draft_question_count} taslak soru</span>}{exam.outdated_question_count > 0 && <span className="exam-attention">{exam.outdated_question_count} güncellenmemiş</span>}</span>}
  </Link>;
}

export function OfficialExamList() {
  const [typeId, setTypeId] = useState('');
  const [year, setYear] = useState('');
  const [onlyAttention, setOnlyAttention] = useState(false);
  const exams = useQuery({ queryKey: ['official-exams', 'all'], queryFn: ({ signal }) => collect((cursor) => api.request('get', '/api/v1/admin/official-exams', { signal, query: { per_page: 100, cursor } })) });
  const all = exams.data ?? [];
  const types = [...new Map(all.filter((exam) => exam.exam_type).map((exam) => [exam.exam_type_id, exam.exam_type!.name])).entries()];
  const years = [...new Set(all.map((exam) => exam.year))].sort((a, b) => b - a);
  const visible = all.filter((exam) => (!typeId || exam.exam_type_id === typeId) && (!year || exam.year === Number(year)));
  const groups = groupExams(visible).filter((group) => !onlyAttention || [group.armed, group.unarmed, ...group.other].some((exam) => exam && needsAttention(exam)));
  const summary = { total: visible.length, published: visible.filter((exam) => exam.status === 'published').length, attention: visible.filter(needsAttention).length };
  return <><header className="page-heading"><div><span className="eyebrow">MERKEZİ İÇERİK</span><h1>Sınavlar</h1><p className="muted">Çıkmış sınavları numarasına göre izleyin: silahlı ve silahsız sürümler yan yana. Bir sınavı açınca bütün soruları alt alta görür ve yerinde düzenlersiniz.</p></div><Link className="button primary" to="/official-exams/new"><Icon name="plus" size={18} />Yeni sınav</Link></header>
    <div className="overview"><div><span className="overview-icon"><Icon name="history" /></span><div><strong>{exams.data ? summary.total : '—'}</strong><span>Sınav kaydı</span></div></div><div><span className="overview-icon"><Icon name="check" /></span><div><strong>{exams.data ? summary.published : '—'}</strong><span>Yayında</span></div></div><div><span className="overview-icon"><Icon name="eye" /></span><div><strong>{exams.data ? summary.attention : '—'}</strong><span>İlgilenilecek</span></div></div><div className="overview-tip"><strong>Taslak ve güncellenmemiş soru sayıları</strong><span>Sınav hücresindeki turuncu etiketler, yayımlanmayı veya düzeltmenin sınava uygulanmasını bekleyen soruları gösterir.</span></div></div>
    <section className="card question-table"><div className="table-toolbar"><div><h2>Tüm sınavlar</h2><span className="muted small-text">{exams.data ? `${groups.length} sınav numarası` : ''}</span></div><div className="filters exam-filters"><label><span>Sınav türü</span><select aria-label="Sınav türü" value={typeId} onChange={(event) => setTypeId(event.target.value)}><option value="">Tüm türler</option>{types.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><label><span>Yıl</span><select aria-label="Yıl" value={year} onChange={(event) => setYear(event.target.value)}><option value="">Tüm yıllar</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="check-row"><input type="checkbox" checked={onlyAttention} onChange={(event) => setOnlyAttention(event.target.checked)} />Yalnız ilgilenilecekler</label></div></div>
      {exams.isPending ? <Loading text="Sınavlar yükleniyor…" /> : exams.isError ? <div className="table-padding"><ErrorNotice error={exams.error} retry={() => { void exams.refetch(); }} /></div> : !groups.length ? <div className="empty-state"><span className="empty-icon"><Icon name="book" size={30} /></span><h3>{all.length ? 'Bu filtrelerde sınav yok' : 'Henüz sınav yok'}</h3><p>{all.length ? 'Filtreleri değiştirerek diğer sınavları görebilirsiniz.' : 'Önce yayımlanmış sorular hazırlayın, sonra bunları sınav sırasına dizin.'}</p>{!all.length && <Link className="button primary" to="/official-exams/new"><Icon name="plus" size={18} />İlk sınavı oluştur</Link>}</div>
        : <div className="table-scroll"><table className="exam-grid"><thead><tr><th>Sınav</th><th>Silahlı</th><th>Silahsız</th><th>Diğer</th></tr></thead><tbody>{groups.map((group) => <tr key={group.key}><td><strong>{group.number ? `${group.number}. ` : ''}{group.typeName}</strong><span className="row-caption">{group.year}{group.term ? ` · ${group.term}` : ''}</span></td><td><ExamCell exam={group.armed} /></td><td><ExamCell exam={group.unarmed} /></td><td>{group.other.length ? group.other.map((exam) => <ExamCell key={exam.id} exam={exam} />) : <span className="muted">—</span>}</td></tr>)}</tbody></table></div>}
    </section></>;
}
