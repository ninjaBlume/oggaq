import { createContext, useContext, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError } from '@oggaq/api-client';

const icons = {
  book: 'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4V4Zm9 3a3 3 0 0 1 3-3h5v14h-5a3 3 0 0 0-3 3',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  plus: 'M12 5v14M5 12h14', arrow: 'm9 5 7 7-7 7', back: 'm15 5-7 7 7 7',
  check: 'm5 12 4 4L19 6', logout: 'M9 4H4v16h5m5-4 4-4-4-4m-5 4h9',
  history: 'M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm13 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  close: 'm6 6 12 12M6 18 18 6', shield: 'M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6',
} satisfies Record<string, string>;

export function Icon({ name, size = 20 }: { name: keyof typeof icons; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={icons[name]} /></svg>;
}

export function Loading({ text = 'Yükleniyor…' }: { text?: string }) {
  return <div className="loading" role="status"><span className="spinner" />{text}</div>;
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : 'İşlem tamamlanamadı. Lütfen yeniden deneyin.';
}

export function ErrorNotice({ error, retry }: { error: unknown; retry?: () => void }) {
  return <div className="notice error" role="alert"><div><strong>İşlem tamamlanamadı</strong><p>{errorMessage(error)}</p></div>{retry && <button className="button secondary small" onClick={retry}>Yeniden dene</button>}</div>;
}

export function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: (attributes: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => ReactNode }) {
  const prefix = useId();
  const id = `${prefix}-${name}`;
  return <div className="field"><label htmlFor={id}>{label}</label>{children({ id, 'aria-invalid': !!error, 'aria-describedby': error || hint ? `${id}-help` : undefined })}{(error || hint) && <span id={`${id}-help`} className={error ? 'field-error' : 'field-hint'}>{error || hint}</span>}</div>;
}

export function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const id = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!previousFocus.current && document.activeElement instanceof HTMLElement) previousFocus.current = document.activeElement;
    element?.showModal();
    return () => { element?.close(); previousFocus.current?.focus({ preventScroll: true }); };
  }, []);
  return <dialog ref={dialog} className={`modal ${wide ? 'wide' : ''}`} aria-labelledby={id} onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <header className="modal-heading"><h2 id={id}>{title}</h2><button className="icon-button" aria-label="Pencereyi kapat" onClick={onClose}><Icon name="close" /></button></header>
    {children}
  </dialog>;
}

const NotificationContext = createContext<(message: string) => void>(() => {});
export function useNotify() { return useContext(NotificationContext); }
export function Notifications({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  return <NotificationContext.Provider value={setMessage}>{children}{message && <div className="toast" role="status"><Icon name="check" /><span>{message}</span><button className="icon-button" aria-label="Bildirimi kapat" onClick={() => setMessage('')}><Icon name="close" size={16} /></button></div>}</NotificationContext.Provider>;
}

export function Status({ published, pending }: { published: boolean; pending?: boolean }) {
  return <span className={`badge ${published && !pending ? 'green' : 'amber'}`}><span />{pending && published ? 'Değişiklik bekliyor' : published ? 'Yayında' : 'Taslak'}</span>;
}

export function dateLabel(value: string | null | undefined): string {
  return value ? new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Henüz yayımlanmadı';
}
