import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ExamAttempt, components } from '@oggaq/shared-types';
import { ApiError } from '@oggaq/api-client';
import { randomId } from '@oggaq/study-core';
import { api } from './api';
import { PageIntro } from './App';
import { ErrorNotice, Loading } from './ui';
type Period = components['schemas']['ScoringPeriod'];
type Counts = components['schemas']['ScoreCounts'];
type Score = components['schemas']['CalculatedScore'];
type Result = components['schemas']['ScoreResult'];
const educationLabels = { basic: 'Temel eğitim', renewal: 'Yenileme eğitimi', weapon_difference: 'Silah farkı' } as const;
const empty: Counts = { general_correct: 0, general_wrong: 0, weapon_correct: 0, weapon_wrong: 0, shooting_hits: null, previous_general_score: null };
const number = (value: number) => value.toLocaleString('tr-TR', { maximumFractionDigits: 4 });
export function ScoreCalculator() {
  const periods = useQuery({ queryKey: ['scoring-periods'], queryFn: ({ signal }) => api.request('get', '/api/v1/scoring-periods', { signal }) });
  const [education, setEducation] = useState<keyof typeof educationLabels>('basic');
  const [weapon, setWeapon] = useState<'armed' | 'unarmed'>('unarmed');
  const [periodId, setPeriodId] = useState('');
  const available = periods.data?.data.filter((p) => p.education_type === education && p.weapon_status === (education === 'weapon_difference' ? 'armed' : weapon)) ?? [];
  const period = available.find((p) => p.id === periodId) ?? available[0];
  return <>
    <PageIntro eyebrow="DİĞER SEÇENEKLER" title="Puan hesapla"><p>Sınav dönemini seç; doğru, yanlış ve atış bilgilerini kaydırarak puanını hesapla.</p></PageIntro>
    <section className="card score-settings"><h2>Sınavını seç</h2><div className="score-selectors">
      <label>Eğitim türü<select aria-label="Eğitim türü" value={education} onChange={(e) => { setEducation(e.target.value as typeof education); setPeriodId(''); }}>{Object.entries(educationLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {education !== 'weapon_difference' && <label>Sınav seçeneği<select aria-label="Sınav seçeneği" value={weapon} onChange={(e) => { setWeapon(e.target.value as typeof weapon); setPeriodId(''); }}><option value="unarmed">Silahsız</option><option value="armed">Silahlı</option></select></label>}
      <label>Sınav dönemi<select aria-label="Sınav dönemi" disabled={!period} value={period?.id ?? ''} onChange={(e) => setPeriodId(e.target.value)}>{available.length === 0 && <option value="">Doğrulanmış dönem yok</option>}{available.map((p) => <option key={p.id} value={p.id}>{p.number}. {educationLabels[p.education_type]} · {new Date(`${p.exam_date}T12:00:00`).toLocaleDateString('tr-TR')}</option>)}</select></label>
    </div>{education === 'weapon_difference' && <p className="muted">Silahsız sertifikadan silahlıya geçiş içindir. MYO mezunlarına özel fark sınavı bu hesabın kapsamında değildir; yalnız doğrulanmış dönemler listelenir.</p>}</section>
    {periods.isPending ? <Loading /> : periods.isError ? <ErrorNotice error={periods.error} retry={() => { void periods.refetch(); }} /> : period ? <ManualScore key={`${period.id}:${period.rule.id}`} period={period} /> : <div className="card"><h2>Bu seçenek için doğrulanmış dönem yok</h2><p>Resmî kaynağı doğrulanmış bir kural tanımlandığında burada görünecek.</p></div>}
    <ScoreHistory />
  </>;
}
function ManualScore({ period }: { period: Period }) {
  const [counts, setCounts] = useState<Counts>(empty);
  const [saved, setSaved] = useState(false);
  const cache = useQueryClient();
  const operation = useRef<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{ score: Score | null; pending: boolean; error: unknown }>({ score: null, pending: true, error: null });
  const key = JSON.stringify(counts);
  useEffect(() => {
    const controller = new AbortController(); setState({ score: null, pending: true, error: null }); setSaved(false); operation.current = null;
    const timer = setTimeout(() => {
      void api.request('post', '/api/v1/me/score-calculations/preview', { signal: controller.signal, body: { period_id: period.id, expected_rule_id: period.rule.id, ...counts } }).then(({ data }) => { if (!controller.signal.aborted) setState({ score: data, pending: false, error: null }); }).catch((error: unknown) => { if (!controller.signal.aborted) setState({ score: null, pending: false, error }); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [period.id, key, retry]);
  const save = useMutation({ mutationFn: () => { operation.current ??= randomId(); return api.request('post', '/api/v1/me/score-calculations', { body: { id: operation.current, period_id: period.id, expected_rule_id: state.score?.rule_id, ...counts } }); }, onSuccess: () => { setSaved(true); void cache.invalidateQueries({ queryKey: ['score-history'] }); } });
  return <div className="score-layout"><section className="card score-inputs"><h2>Cevapların</h2><p className="muted">Yanlışlar doğruları götürmez. Kalan sorular boş olarak gösterilir.</p><CountControls period={period} counts={counts} change={(next) => { setCounts(next); save.reset(); }} disabled={save.isPending} /></section><div className="score-aside">
    {state.pending ? <div className="card" role="status">Puan hesaplanıyor…</div> : state.error ? <ErrorNotice error={state.error} retry={() => { void cache.refetchQueries({ queryKey: ['scoring-periods'] }).then(() => setRetry((n) => n + 1)); }} /> : state.score && <ScoreBreakdown score={state.score} />}
    <button className="button primary" disabled={state.pending || !!state.error || save.isPending || saved} onClick={() => save.mutate()}>{saved ? 'Hesaplama kaydedildi' : save.isPending ? 'Kaydediliyor…' : 'Hesaplamayı kaydet'}</button>{save.isError && <ErrorNotice error={save.error} retry={() => { if(save.error instanceof ApiError && save.error.status===409) void cache.refetchQueries({ queryKey: ['scoring-periods'] }); else save.mutate(); }} />}
  </div></div>;
}
function Range({ label, value, max, change, disabled }: { label: string; value: number; max: number; change: (n: number) => void; disabled?: boolean }) {
  return <label className="score-range"><span>{label}<strong>{value} <small>/ {max}</small></strong></span><input type="range" aria-label={label} min={0} max={max} step={1} value={value} disabled={disabled} onChange={(e) => change(Number(e.target.value))} /><span className="score-range-limits"><small>0</small><small>{max}</small></span></label>;
}
export function CountControls({ period, counts, change, disabled }: { period: Period; counts: Counts; change: (c: Counts) => void; disabled?: boolean }) {
  const c = period.rule.configuration;
  return <div className="score-controls">{(['general', 'weapon'] as const).map((section) => {
    const max = c[`${section}_count`]; if (!max) return null;
    const correct = counts[`${section}_correct`], wrong = counts[`${section}_wrong`], title = section === 'general' ? 'Genel bilgi' : 'Silah bilgisi';
    return <fieldset className="score-section" key={section}><legend>{title} · {max} soru</legend><Range label={`${title} doğru`} value={correct} max={max} change={(n) => change({ ...counts, [`${section}_correct`]: n, [`${section}_wrong`]: Math.min(wrong, max - n) })} disabled={disabled} /><Range label={`${title} yanlış`} value={wrong} max={max - correct} change={(n) => change({ ...counts, [`${section}_wrong`]: n })} disabled={disabled} /><p className="muted">{max - correct - wrong} boş</p></fieldset>;
  })}
  {c.requires_previous && <label>Önceki silahsız temel sınav puanı<input type="number" aria-label="Önceki silahsız temel sınav puanı" min={0} max={100} step="0.01" value={counts.previous_general_score ?? ''} disabled={disabled} onChange={(e) => change({ ...counts, previous_general_score: e.target.value === '' ? null : Number(e.target.value) })} /></label>}
  {c.shooting_count > 0 && <fieldset className="score-section"><legend>Uygulamalı atış</legend><label className="score-check"><input type="checkbox" checked={counts.shooting_hits !== null} disabled={disabled} onChange={(e) => change({ ...counts, shooting_hits: e.target.checked ? 0 : null })} />Atış sonucumu biliyorum</label>{counts.shooting_hits !== null ? <Range label="Atış isabet sayısı" value={counts.shooting_hits} max={c.shooting_count} change={(n) => change({ ...counts, shooting_hits: n })} disabled={disabled} /> : <p className="muted">Atış sonucu girilene kadar kesin puan ve başarı kararı hesaplanmaz.</p>}</fieldset>}
  </div>;
}
export function ScoreBreakdown({ score }: { score: Score }) {
  return <section className="card score-breakdown" aria-label="ÖGG puan hesabı" aria-live="polite"><span className="eyebrow">{score.final_score === null ? 'OLASI PUAN ARALIĞI' : score.decision_mode === 'level' ? 'SEVİYE TESPİT PUANI' : score.decision_mode === 'unverified' ? 'TAHMİNİ ÖGG PUANI' : 'ÖGG PUANI'}</span><strong className="score-value">{score.final_score === null ? `${number(score.minimum_score)}–${number(score.maximum_score)}` : number(score.final_score)}<small>/100</small></strong><h2>{score.status_label}</h2>
    <dl className="score-parts">{score.sections.map((part) => <div key={part.key}><dt>{part.label}{part.count > 0 && <small>{part.correct ?? '—'} {part.key === 'shooting' ? 'isabet' : 'doğru'}</small>}</dt><dd>{part.score === null ? 'Bekleniyor' : `${number(part.score)} / ${part.maximum}`}</dd></div>)}</dl>
    <div className="score-checks">{score.checks.map((check) => <p key={check.section} data-met={String(check.met)}>{check.label} ≥ {check.minimum}: <strong>{check.met === null ? 'Bekleniyor' : check.met ? 'Sağlandı' : 'Sağlanmadı'}</strong></p>)}</div><details><summary>Hesaplama yöntemi ve kaynaklar</summary><p>{score.title} · sürüm {score.rule_version}</p><p>{score.formula}</p>{score.checks.length > 0 && <p>Koşullar yuvarlanmamış puanla değerlendirilir.</p>}<p>{score.verification_note}</p>{score.source_urls.map((url, i) => <a key={url} href={url} target="_blank" rel="noreferrer" className="text-button">Resmî kaynak {i + 1} ↗</a>)}</details><p className="muted small-text">{score.notice}</p>
  </section>;
}
function ScoreHistory() {
  const results = useQuery({ queryKey: ['score-history'], queryFn: ({ signal }) => api.request('get', '/api/v1/me/score-calculations', { signal, query: { per_page: 10 } }) });
  const [selected, setSelected] = useState<Result | null>(null);
  return <section className="score-history"><h2>Son hesaplamaların</h2>{results.isPending ? <Loading /> : results.isError ? <ErrorNotice error={results.error} retry={() => { void results.refetch(); }} /> : results.data.data.length === 0 ? <p className="muted">Kaydettiğin puan hesaplamaları burada görünür.</p> : <div className="score-history-grid">{results.data.data.map((r) => <button key={r.id} className="card score-history-item" onClick={() => setSelected(selected?.id === r.id ? null : r)}><strong>{r.output.title}</strong><span>{r.output.final_score === null ? 'Eksik bilgi' : `${number(r.output.final_score)} puan`} · {r.output.status_label}</span><small>{new Date(r.created_at).toLocaleString('tr-TR')}</small></button>)}</div>}{selected && <div className="score-saved-detail"><h3>Kaydedilen hesaplama</h3><ScoreBreakdown score={selected.output} /></div>}</section>;
}
export function ExamScorePanel({ exam, contextId }: { exam: ExamAttempt; contextId: string }) {
  const [result, setResult] = useState<Result | null>(exam.score_result ?? null);
  const [hits, setHits] = useState<number | null>(result?.input.shooting_hits ?? null);
  const [previous, setPrevious] = useState<string>(result?.input.previous_general_score?.toString() ?? '');
  const operation = useRef<string | null>(null);
  const [editing, setEditing] = useState(false);
  const save = useMutation({ mutationFn: () => { operation.current ??= randomId(); return api.request('post', '/api/v1/contexts/{context}/exam-attempts/{exam}/score', { params: { context: contextId, exam: exam.id }, body: { id: operation.current, shooting_hits: hits, previous_general_score: previous === '' ? null : Number(previous) } }); }, onSuccess: ({ data }) => { setResult(data); setEditing(false); operation.current = null; } });
  if (!exam.scoring_available && !result) return null;
  const shooting = result?.output.sections.find((p) => p.key === 'shooting');
  const needsPrevious = result?.output.sections.some((p) => p.key === 'previous_general');
  return <div className="exam-score-panel">{result ? <><ScoreBreakdown score={result.output} />{(shooting || needsPrevious) && <button className="button secondary" onClick={() => setEditing(!editing)}>{editing ? 'Vazgeç' : 'Atış / puan bilgisini güncelle'}</button>}</> : <section className="card"><h2>ÖGG sınav puanın</h2><p>Önceki sonucun korunarak ÖGG puanın ayrıca hesaplanır. Atış bilgini sonradan ekleyebilirsin.</p><button className="button primary" disabled={save.isPending} onClick={() => save.mutate()}>ÖGG puanını hesapla</button></section>}
    {editing && result && <section className="card score-inputs"><h2>Atış bilgini ekle</h2><p className="muted">Yeni hesaplama ayrı kaydedilir; önceki sonuç korunur.</p>{shooting && <><label className="score-check"><input type="checkbox" disabled={save.isPending} checked={hits !== null} onChange={(e) => { setHits(e.target.checked ? 0 : null); operation.current = null; }} />Atış sonucumu biliyorum</label>{hits !== null && <Range label="Atış isabet sayısı" value={hits} max={shooting.count} change={(n) => { setHits(n); operation.current = null; }} disabled={save.isPending} />}</>}{needsPrevious && <label>Önceki silahsız temel sınav puanı<input aria-label="Önceki silahsız temel sınav puanı" type="number" min={0} max={100} step="0.01" value={previous} onChange={(e) => { setPrevious(e.target.value); operation.current = null; }} /></label>}<button className="button primary" disabled={save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Kaydediliyor…' : 'Puanı güncelle'}</button></section>}{save.isError && <ErrorNotice error={save.error} retry={() => save.mutate()} />}
  </div>;
}
