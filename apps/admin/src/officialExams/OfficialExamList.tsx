import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { components } from '@oggaq/shared-types';
import { examDisplayTitle, vocabulary } from '@oggaq/study-core';
import { api, collect, loadCatalogs } from '../api';
import { ErrorNotice, Icon, Loading } from '../ui';

type Exam = components['schemas']['AdminOfficialExam'];
type Group = { key: string; number: string | null; year: number; term: string | null; armed?: Exam; unarmed?: Exam };

const needsAttention = (exam: Exam) => exam.status === 'draft' || exam.draft_question_count > 0 || exam.outdated_question_count > 0;
const byNewest = (a: Exam, b: Exam) => b.year - a.year || (Number(b.exam_number) || 0) - (Number(a.exam_number) || 0);

// One row per exam number with its armed and unarmed variants side by side, so the work left is visible at a glance.
export function groupWholeExams(exams: Exam[]): Group[] {
  const groups = new Map<string, Group>();
  for (const exam of exams) {
    const key = `${exam.year}|${exam.exam_number ?? exam.title}|${exam.term ?? ''}`;
    const group = groups.get(key) ?? { key, number: exam.exam_number, year: exam.year, term: exam.term };
    if (exam.weapon_status === 'unarmed') group.unarmed ??= exam; else group.armed ??= exam;
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.year - a.year || (Number(b.number) || 0) - (Number(a.number) || 0));
}

function ExamCell({ exam, caption }: { exam?: Exam; caption?: string }) {
  if (!exam) return <span className="muted">—</span>;
  return <Link className="exam-cell-link" to={`/official-exams/${exam.derived_from_id ?? exam.id}`} aria-label={`${examDisplayTitle(exam.title)} sınavını aç`}>
    <span className={`badge ${exam.status === 'published' ? 'green' : 'amber'}`}><span />{exam.status === 'published' ? 'Yayında' : 'Taslak'}</span><strong>{exam.question_count} soru</strong>{caption && <span className="exam-cell-meta">{caption}</span>}
    {(exam.draft_question_count > 0 || exam.outdated_question_count > 0) && <span className="exam-cell-meta">{exam.draft_question_count > 0 && <span className="exam-attention">{exam.draft_question_count} taslak soru</span>}{exam.outdated_question_count > 0 && <span className="exam-attention">{exam.outdated_question_count} güncellenmemiş</span>}</span>}
  </Link>;
}

// The two kinds of exam of the institution: Deneme (a whole exam, armed and unarmed) and Ders (one subject's exam of an exam number).
export function OfficialExamList({ kind }: { kind: 'deneme' | 'ders' }) {
  const [year, setYear] = useState('');
  const [onlyAttention, setOnlyAttention] = useState(false);
  const [params, setParams] = useSearchParams();
  const exams = useQuery({ queryKey: ['official-exams', 'all'], queryFn: ({ signal }) => collect((cursor) => api.request('get', '/api/v1/admin/official-exams', { signal, query: { per_page: 100, cursor } })) });
  const catalogs = useQuery({ queryKey: ['catalogs'], queryFn: ({ signal }) => loadCatalogs(signal) });
  const own = (exams.data ?? []).filter((exam) => kind === 'deneme' ? !exam.subject : !!exam.subject);
  const subjects = catalogs.data?.subjects ?? [];
  const selected = subjects.find((subject) => subject.id === params.get('ders')) ?? subjects.find((subject) => own.some((exam) => exam.subject?.id === subject.id)) ?? subjects[0];
  const scoped = kind === 'ders' ? own.filter((exam) => exam.subject?.id === selected?.id) : own;
  const years = [...new Set(own.map((exam) => exam.year))].sort((a, b) => b - a);
  const visible = scoped.filter((exam) => !year || exam.year === Number(year)).filter((exam) => !onlyAttention || needsAttention(exam));
  const summary = { total: scoped.length, published: scoped.filter((exam) => exam.status === 'published').length, attention: scoped.filter(needsAttention).length };
  const title = kind === 'deneme' ? vocabulary.deneme.title : vocabulary.ders.title;
  const newLink = kind === 'deneme' ? '/official-exams/new?tur=deneme' : `/official-exams/new?tur=ders${selected ? `&ders=${selected.id}` : ''}`;
  const rows = kind === 'deneme' ? groupWholeExams(visible) : [];
  return <><header className="page-heading"><div><span className="eyebrow">MERKEZİ İÇERİK</span><h1>{title}</h1><p className="muted">{kind === 'deneme' ? 'Tam sınavlarda 125 soruyu bir kez girin; ilk 100 soruluk silahsız seçenek otomatik oluşturulsun. Bir sınavı açınca bütün soruları alt alta görür, yerinde düzenler ve yeni soru yazarsınız.' : 'Bir ders seçin; o dersin her sınav numarasındaki sınavı listelenir. Sınavı açınca soruları alt alta görür ve yerinde düzenlersiniz.'}</p></div><Link className="button primary" to={newLink}><Icon name="plus" size={18} />{kind === 'deneme' ? 'Yeni deneme sınavı' : 'Yeni ders sınavı'}</Link></header>
    <div className="overview"><div><span className="overview-icon"><Icon name="history" /></span><div><strong>{exams.data ? summary.total : '—'}</strong><span>Sınav kaydı</span></div></div><div><span className="overview-icon"><Icon name="check" /></span><div><strong>{exams.data ? summary.published : '—'}</strong><span>Yayında</span></div></div><div><span className="overview-icon"><Icon name="eye" /></span><div><strong>{exams.data ? summary.attention : '—'}</strong><span>İlgilenilecek</span></div></div><div className="overview-tip"><strong>Taslak ve güncellenmemiş soru sayıları</strong><span>Turuncu etiketler, yayımlanmayı veya düzeltmenin sınava uygulanmasını bekleyen soruları gösterir.</span></div></div>
    {kind === 'ders' && <div className="type-tabs" role="group" aria-label="Ders">{subjects.map((subject) => <button type="button" key={subject.id} className={`topic-chip ${selected?.id === subject.id ? 'active' : ''}`} aria-pressed={selected?.id === subject.id} onClick={() => setParams({ ders: subject.id })}>{subject.name}<small>{(exams.data ?? []).filter((exam) => exam.subject?.id === subject.id).length}</small></button>)}</div>}
    <section className="card question-table"><div className="table-toolbar"><div><h2>{kind === 'deneme' ? 'Sınav listesi' : selected ? selected.name : 'Sınav listesi'}</h2><span className="muted small-text">{exams.data ? `${kind === 'deneme' ? rows.length : visible.length} sınav` : ''}</span></div><div className="filters exam-filters"><label><span>Yıl</span><select aria-label="Yıl" value={year} onChange={(event) => setYear(event.target.value)}><option value="">Tüm yıllar</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="check-row"><input type="checkbox" checked={onlyAttention} onChange={(event) => setOnlyAttention(event.target.checked)} />Yalnız ilgilenilecekler</label></div></div>
      {exams.isPending ? <Loading text="Sınavlar yükleniyor…" /> : exams.isError ? <div className="table-padding"><ErrorNotice error={exams.error} retry={() => { void exams.refetch(); }} /></div> : visible.length === 0 ? <div className="empty-state"><span className="empty-icon"><Icon name="book" size={30} /></span><h3>{own.length === 0 ? (kind === 'deneme' ? 'Henüz deneme sınavı yok' : 'Henüz ders sınavı yok') : 'Bu filtrelerde sınav yok'}</h3><p>{own.length === 0 ? 'İlk sınavı oluşturup soruları sınavın içinden yazabilir veya mevcut soruları ekleyebilirsiniz.' : 'Filtreleri değiştirerek diğer sınavları görebilirsiniz.'}</p>{own.length === 0 && <Link className="button primary" to={newLink}><Icon name="plus" size={18} />{kind === 'deneme' ? 'İlk deneme sınavını oluştur' : 'İlk ders sınavını oluştur'}</Link>}</div>
        : kind === 'deneme' ? <div className="table-scroll"><table className="exam-grid"><thead><tr><th>Sınav</th><th>Silahlı</th><th>Silahsız</th></tr></thead><tbody>{rows.map((group) => <tr key={group.key}><td><strong>{group.number ? `${group.number}. ` : ''}Deneme Sınavı</strong><span className="row-caption">{group.year}{group.term ? ` · ${group.term}` : ''}</span></td><td><ExamCell exam={group.armed} /></td><td><ExamCell exam={group.unarmed} /></td></tr>)}</tbody></table></div>
          : <div className="table-scroll"><table className="exam-grid"><thead><tr><th>Sınav</th><th>Durum</th></tr></thead><tbody>{[...visible].sort(byNewest).map((exam) => <tr key={exam.id}><td><strong>{exam.exam_number ? `${exam.exam_number}. ` : ''}Ders Sınavı</strong><span className="row-caption">{exam.year}{exam.term ? ` · ${exam.term}` : ''}</span></td><td><ExamCell exam={exam} /></td></tr>)}</tbody></table></div>}
    </section></>;
}
