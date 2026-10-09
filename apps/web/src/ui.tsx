import type { ReactNode } from 'react';
import { useId } from 'react';
import { ApiError } from '@oggaq/api-client';

export function Loading() { return <div role="status" className="loading">Yükleniyor…</div>; }
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="notice error" role="alert"><p>{error instanceof ApiError ? error.message : 'İşlem tamamlanamadı. Yeniden deneyin.'}</p>{retry && <button className="button secondary" onClick={retry}>Yeniden dene</button>}</div>;
}
export function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode }) {
  const id = useId();
  return <div className="field"><label htmlFor={id}>{label}</label>{children({ id, 'aria-invalid': !!error, 'aria-describedby': error || hint ? `${id}-help` : undefined })}{(error || hint) && <span id={`${id}-help`} className={error ? 'field-error' : 'muted'}>{error || hint}</span>}</div>;
}
export function dateLabel(value: string) { return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
export const outcomeLabel = { pending: 'Devam ediyor', correct: 'Doğru', incorrect: 'Yanlış', skipped: 'Boş bırakıldı' } as const;
