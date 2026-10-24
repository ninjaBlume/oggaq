import type { ReactNode } from 'react';
import { useId, useState } from 'react';
import { ApiError } from '@oggaq/api-client';
import { Icon } from './icons';

export function Loading() { return <div role="status" className="loading"><span className="sr-only">Yükleniyor…</span><div className="loading-skeleton" aria-hidden="true">{[0, 1, 2].map((row) => <div key={row} className="skeleton-row"><span /><div><i /><i /></div></div>)}</div></div>; }
export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="notice error" role="alert"><p>{error instanceof ApiError ? error.message : 'İşlem tamamlanamadı. Yeniden deneyin.'}</p>{retry && <button type="button" className="button secondary" onClick={retry}>Yeniden dene</button>}</div>;
}
export function Field({ label, error, hint, labelAction, children }: { label: string; error?: string; hint?: string; labelAction?: ReactNode; children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode }) {
  const id = useId();
  return <div className="field"><div className="field-label"><label htmlFor={id}>{label}</label>{labelAction}</div>{children({ id, 'aria-invalid': !!error, 'aria-describedby': error || hint ? `${id}-help` : undefined })}{(error || hint) && <span id={`${id}-help`} className={error ? 'field-error' : 'muted'}>{error || hint}</span>}</div>;
}
export function PasswordField({ label = 'Parola', value, onChange, error, hint, labelAction, newPassword = false }: { label?: string; value: string; onChange: (value: string) => void; error?: string; hint?: string; labelAction?: ReactNode; newPassword?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <Field label={label} error={error} hint={hint} labelAction={labelAction}>{(props) => <div className="input-shell">
    <Icon name="lock" />
    <input {...props} required type={visible ? 'text' : 'password'} minLength={newPassword ? 12 : undefined} maxLength={128} autoComplete={newPassword ? 'new-password' : 'current-password'} value={value} onChange={(event) => onChange(event.target.value)} />
    <button className="password-toggle" type="button" aria-label={visible ? `${label}: parolayı gizle` : `${label}: parolayı göster`} aria-pressed={visible} onClick={() => setVisible(!visible)}><Icon name={visible ? 'eyeOff' : 'eye'} /></button>
  </div>}</Field>;
}
export function dateLabel(value: string) { return new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
export const outcomeLabel = { pending: 'Devam ediyor', correct: 'Doğru', incorrect: 'Yanlış', skipped: 'Boş bırakıldı' } as const;

export const percent = (value: number | null) => (value === null ? '—' : `%${value.toLocaleString('tr-TR', { maximumFractionDigits: 1 })}`);
