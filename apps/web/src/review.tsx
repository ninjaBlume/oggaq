import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Question } from '@oggaq/shared-types';
import { cursorFromLink } from '@oggaq/api-client';
import { api } from './api';
import { PageIntro, useStudyContext } from './App';
import { QuestionCard } from './study';
import { ErrorNotice, Loading } from './ui';

type Kind = 'incorrect' | 'blank' | 'favorite';
const kinds: { id: Kind; label: string; empty: string; hint: string }[] = [
  { id: 'incorrect', label: 'Yanlışlarım', empty: 'Şu an tekrar edeceğin yanlış soru yok.', hint: 'Son cevabın yanlış olan sorular. Doğru çözdüğün soru listeden çıkar.' },
  { id: 'blank', label: 'Boş bıraktıklarım', empty: 'Boş bıraktığın soru yok.', hint: 'Son cevabın boş olan sorular. Çözdüğünde listeden çıkar.' },
  { id: 'favorite', label: 'Favorilerim', empty: 'Henüz favori soru eklemedin.', hint: 'Bir soruyu çözerken favoriye ekleyebilirsin.' },
];

export function Review() {
  const context = useStudyContext();
  const [kind, setKind] = useState<Kind>('incorrect');
  const [cursor, setCursor] = useState<string>();
  const current = kinds.find((item) => item.id === kind) ?? kinds[0]!;
  const subjects = useQuery({ queryKey: ['subjects', undefined], queryFn: ({ signal }) => api.request('get', '/api/v1/subjects', { signal, query: { per_page: 100 } }) });
  const list = useQuery({ queryKey: ['review', context.id, kind, cursor], queryFn: ({ signal }) => api.request('get', '/api/v1/contexts/{context}/review-questions', { params: { context: context.id }, query: { kind, per_page: 12, cursor }, signal }) });
  return <>
    <PageIntro eyebrow="TEKRAR ET" title="Tekrar listelerim"><p>{context.name} alanındaki cevaplarından oluşur. {current.hint}</p></PageIntro>
    <nav className="tab-bar" aria-label="Tekrar listeleri">{kinds.map((item) => <button key={item.id} className={`tab-button${item.id === kind ? ' active' : ''}`} aria-pressed={item.id === kind} onClick={() => { setKind(item.id); setCursor(undefined); }}>{item.label}</button>)}</nav>
    {list.isPending ? <Loading /> : list.isError ? <ErrorNotice error={list.error} retry={() => { void list.refetch(); }} /> : list.data.data.length === 0 ? <section className="card empty"><h2>{current.empty}</h2><p>Soru çözdükçe bu liste güncellenir.</p><Link className="button primary" to={`/study/${context.id}/questions`}>Soru çözmeye git</Link></section> : <>
      <div className="question-grid">{list.data.data.map((question) => <ReviewItem key={`${kind}-${question.id}-${question.version.id}`} question={question} kind={kind} subjectName={subjects.data?.data.find((item) => item.id === question.version.subject_id)?.name} refresh={() => { void list.refetch(); }} />)}</div>
      <nav className="pagination" aria-label="Sayfalama"><button className="button secondary" disabled={!list.data.links.prev} onClick={() => setCursor(cursorFromLink(list.data.links.prev))}>← Önceki sayfa</button><button className="button secondary" disabled={!list.data.links.next} onClick={() => setCursor(cursorFromLink(list.data.links.next))}>Sonraki sayfa →</button></nav>
    </>}
  </>;
}

function ReviewItem({ question, kind, subjectName, refresh }: { question: Question; kind: Kind; subjectName?: string; refresh: () => void }) {
  const context = useStudyContext();
  const cache = useQueryClient();
  const remove = useMutation({ mutationFn: () => api.request('delete', '/api/v1/contexts/{context}/favorites/{question}', { params: { context: context.id, question: question.id } }), onSuccess: () => { void cache.invalidateQueries({ queryKey: ['review', context.id] }); } });
  return <div className="review-item"><QuestionCard question={question} subjectName={subjectName} refresh={refresh} />{kind === 'favorite' && <><button className="text-button" disabled={remove.isPending} onClick={() => remove.mutate()}>{remove.isPending ? 'Çıkarılıyor…' : '★ Favorilerden çıkar'}</button>{remove.isError && <ErrorNotice error={remove.error} retry={() => remove.mutate()} />}</>}</div>;
}
