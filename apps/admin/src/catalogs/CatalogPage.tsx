import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError } from '@oggaq/api-client';
import type { CatalogName, Catalogs } from '@oggaq/shared-types';
import { api, loadCatalogs } from '../api';
import { ErrorNotice, Field, Icon, Loading, useNotify } from '../ui';

const definitions: Record<CatalogName, { name: string; singular: string; description: string }> = {
  subjects: { name: 'Dersler', singular: 'Ders', description: 'Soruların ana ders sınıflandırmaları.' },
  topics: { name: 'Konular', singular: 'Konu', description: 'Derslere bağlı konular ve alt konular.' },
  'exam-types': { name: 'Sınav türleri', singular: 'Sınav türü', description: 'Soruları sınıflandırmak için esnek sınav türleri.' },
  'question-sources': { name: 'Kaynaklar', singular: 'Kaynak', description: 'İçeriğin geldiği yayın, belge veya bağlantı.' },
};

export function slugify(value: string): string {
  return value.toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

export function CatalogPage() {
  const [selected, setSelected] = useState<CatalogName>('subjects');
  const catalogs = useQuery({ queryKey: ['catalogs'], queryFn: ({ signal }) => loadCatalogs(signal) });
  return <><header className="page-heading"><div><span className="eyebrow">İÇERİK DÜZENİ</span><h1>Kataloglar</h1><p className="muted">Soru bankasının derslerini, konularını ve kaynaklarını yönetin.</p></div></header><div className="catalog-tabs" role="group" aria-label="Katalog türü">{(Object.keys(definitions) as CatalogName[]).map((name) => <button key={name} className={selected === name ? 'active' : ''} aria-pressed={selected === name} onClick={() => setSelected(name)}>{definitions[name].name}<span>{catalogs.data?.[name].length ?? '—'}</span></button>)}</div>
    {catalogs.isPending ? <Loading text="Kataloglar yükleniyor…" /> : catalogs.isError ? <ErrorNotice error={catalogs.error} retry={() => { void catalogs.refetch(); }} /> : <CatalogSection key={selected} selected={selected} catalogs={catalogs.data} />}</>;
}

function CatalogSection({ selected, catalogs }: { selected: CatalogName; catalogs: Catalogs }) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [subject, setSubject] = useState('');
  const [parent, setParent] = useState('');
  const [url, setUrl] = useState('');
  const [citation, setCitation] = useState('');
  const cache = useQueryClient();
  const notify = useNotify();
  const definition = definitions[selected];
  const entries = catalogs[selected];
  const create = useMutation({ mutationFn: async () => {
    switch (selected) {
      case 'subjects': return api.request('post', '/api/v1/admin/subjects', { body: { name, code } });
      case 'topics': return api.request('post', '/api/v1/admin/topics', { body: { name, code, subject_id: subject, parent_id: parent || null } });
      case 'exam-types': return api.request('post', '/api/v1/admin/exam-types', { body: { name, code } });
      case 'question-sources': return api.request('post', '/api/v1/admin/question-sources', { body: { title: name, url: url || null, citation: citation || null } });
    }
  }, onSuccess: () => {
    setName(''); setCode(''); setCodeTouched(false); setUrl(''); setCitation(''); setParent('');
    void cache.invalidateQueries({ queryKey: ['catalogs'] });
    notify(`${definition.singular} oluşturuldu.`);
  } });
  const fieldError = (field: string) => create.error instanceof ApiError ? create.error.field(field) : undefined;
  function submit(event: FormEvent) { event.preventDefault(); if (!create.isPending) create.mutate(); }
  return <div className="catalog-layout"><section className="card catalog-list"><div className="table-toolbar"><div><h2>{definition.name}</h2><p className="muted small-text">{definition.description}</p></div><span className="count-badge">{entries.length}</span></div>{!entries.length ? <div className="empty-state compact"><span className="empty-icon"><Icon name="grid" size={28} /></span><h3>Henüz kayıt yok</h3><p>İlk {definition.singular.toLocaleLowerCase('tr-TR')} kaydını yandaki formdan ekleyin.</p></div> : <ul className="catalog-entries">{entries.map((entry) => <li key={entry.id}><span className="catalog-entry-icon"><Icon name={selected === 'question-sources' ? 'book' : 'grid'} size={18} /></span><div><strong>{'title' in entry ? entry.title : entry.name}</strong><span>{'subject_id' in entry ? `${catalogs.subjects.find((item) => item.id === entry.subject_id)?.name ?? 'Ders'}${entry.parent_id ? ` · ${catalogs.topics.find((topic) => topic.id === entry.parent_id)?.name ?? 'Üst konu'}` : ''}` : 'code' in entry ? entry.code : entry.url || entry.citation || 'Kaynak referansı'}</span></div></li>)}</ul>}</section>
    <section className="card catalog-form"><span className="eyebrow">YENİ KAYIT</span><h2>{definition.singular} ekle</h2>{create.isError && <ErrorNotice error={create.error} />}<form onSubmit={submit}><fieldset disabled={create.isPending}>
      {selected === 'topics' && <><Field label="Ders" name="subject_id" error={fieldError('subject_id')}>{(props) => <select {...props} required value={subject} onChange={(event) => { setSubject(event.target.value); setParent(''); }}><option value="">Ders seçin</option>{catalogs.subjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</Field><Field label="Üst konu" name="parent_id" error={fieldError('parent_id')} hint="Alt konu oluşturmak için bir üst konu seçin.">{(props) => <select {...props} value={parent} disabled={!subject} onChange={(event) => setParent(event.target.value)}><option value="">Üst konu yok</option>{catalogs.topics.filter((topic) => topic.subject_id === subject).map((topic) => <option key={topic.id} value={topic.id}>{topic.name}</option>)}</select>}</Field></>}
      <Field label={selected === 'question-sources' ? 'Kaynak başlığı' : `${definition.singular} adı`} name={selected === 'question-sources' ? 'title' : 'name'} error={fieldError(selected === 'question-sources' ? 'title' : 'name')}>{(props) => <input {...props} required maxLength={selected === 'question-sources' ? 240 : 160} value={name} onChange={(event) => { setName(event.target.value); if (!codeTouched) setCode(slugify(event.target.value)); }} />}</Field>
      {selected !== 'question-sources' ? <Field label="Kısa kod" name="code" error={fieldError('code')} hint="Küçük harf, rakam ve kısa çizgi kullanın.">{(props) => <input {...props} required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={80} value={code} onChange={(event) => { setCodeTouched(true); setCode(event.target.value); }} />}</Field> : <><Field label="Kaynak bağlantısı" name="url" error={fieldError('url')} hint="Varsa HTTP veya HTTPS bağlantısı.">{(props) => <input {...props} type="url" maxLength={2048} value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" />}</Field><Field label="Kaynak notu / referans" name="citation" error={fieldError('citation')}>{(props) => <textarea {...props} rows={4} maxLength={4000} value={citation} onChange={(event) => setCitation(event.target.value)} />}</Field></>}
      <button type="submit" className="button primary full" disabled={selected === 'topics' && !catalogs.subjects.length}><Icon name="plus" size={18} />{create.isPending ? 'Ekleniyor…' : 'Kaydı oluştur'}</button>
    </fieldset></form></section></div>;
}
